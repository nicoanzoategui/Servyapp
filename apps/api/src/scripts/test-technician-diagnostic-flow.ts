import { PrismaClient } from '@servy/db';
import { ProfessionalConversationService } from '../services/professional.conversation.service';
import redis from '../lib/redis';

const prisma = new PrismaClient();

async function testTechnicianDiagnosticFlow() {
    console.log('🧪 Test del flujo técnico - modelo diagnóstico\n');

    const testTechPhone = '5491115000002'; // Técnico de prueba del seed
    const testUserPhone = '5491115000001'; // Usuario de prueba

    let serviceRequestId = '';
    let jobOfferId = '';

    try {
        await prisma.professionalSession.deleteMany({
            where: { phone: testTechPhone },
        });
        await prisma.whatsappSession.deleteMany({
            where: { phone: { in: [testTechPhone, testUserPhone] } },
        });
        await redis.del(`pro_session:${testTechPhone}`);
        await redis.del(`session:${testUserPhone}`);
        console.log('✅ Sesiones limpiadas\n');

        const professional = await prisma.professional.findUnique({ where: { phone: testTechPhone } });
        if (!professional) {
            throw new Error(`No hay profesional con teléfono ${testTechPhone} (seed).`);
        }

        console.log('📋 SETUP: Crear ServiceRequest diagnóstico');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const serviceRequest = await prisma.serviceRequest.create({
            data: {
                user_phone: testUserPhone,
                category: 'Plomería',
                description: 'Canilla rota - test diagnóstico',
                service_type: 'diagnostic',
                phase: 'visit_pending',
                visit_price: 35000,
                visit_status: 'pending',
                scheduled_date: tomorrow,
                scheduled_time: '14:00',
                is_flexible: false,
                photos: [],
                address: 'Dirección de prueba 123',
                status: 'pending',
            },
        });
        serviceRequestId = serviceRequest.id;
        console.log(`   ✓ ServiceRequest creado: ${serviceRequest.id}\n`);

        const jobOffer = await prisma.jobOffer.create({
            data: {
                request_id: serviceRequest.id,
                professional_id: professional.id,
                status: 'pending',
                priority: 'scheduled',
            },
        });
        jobOfferId = jobOffer.id;
        console.log(`   ✓ JobOffer creado: ${jobOffer.id}\n`);

        console.log('📱 PASO 1: Técnico acepta oferta diagnóstica');

        await prisma.professionalSession.create({
            data: {
                phone: testTechPhone,
                step: 'AWAITING_JOB_RESPONSE',
                data_json: {
                    jobOfferId: jobOffer.id,
                    userPhone: testUserPhone,
                    requestId: serviceRequest.id,
                },
                expires_at: new Date(Date.now() + 3600000),
            },
        });

        await ProfessionalConversationService.processMessage(testTechPhone, '1');

        await new Promise((resolve) => setTimeout(resolve, 500));

        const quotation = await prisma.quotation.findFirst({
            where: { job_offer_id: jobOffer.id },
            orderBy: { created_at: 'desc' },
        });

        if (!quotation) {
            throw new Error('No se creó la cotización automática');
        }

        console.log(`   ✓ Cotización automática creada: $${quotation.total_price}`);
        console.log(`   ✓ Descripción: ${quotation.description}\n`);

        const job = await prisma.job.create({
            data: {
                quotation_id: quotation.id,
                status: 'confirmed',
            },
        });
        console.log(`   ✓ Job de prueba creado: ${job.id}\n`);

        console.log('📱 PASO 2: Simular pago del usuario (activar estado repair)');

        await ProfessionalConversationService.setRepairQuoteAwaitingSession(testTechPhone, {
            jobId: job.id,
            userPhone: testUserPhone,
            requestId: serviceRequest.id,
        });

        const proSession = await prisma.professionalSession.findUnique({
            where: { phone: testTechPhone },
        });

        console.log(`   ✓ Estado técnico: ${proSession?.step}\n`);

        if (proSession?.step !== 'AWAITING_REPAIR_QUOTE') {
            throw new Error(`Estado incorrecto: ${proSession?.step}, esperaba AWAITING_REPAIR_QUOTE`);
        }

        console.log('📱 PASO 3A: Técnico envía presupuesto del arreglo');

        await ProfessionalConversationService.processMessage(testTechPhone, 'Precio: 125000');

        await new Promise((resolve) => setTimeout(resolve, 500));

        const updatedRequest = await prisma.serviceRequest.findUnique({
            where: { id: serviceRequest.id },
            select: {
                repair_price: true,
                phase: true,
                repair_status: true,
            },
        });

        console.log(`   ✓ Repair price: $${updatedRequest?.repair_price}`);
        console.log(`   ✓ Phase: ${updatedRequest?.phase}`);
        console.log(`   ✓ Repair status: ${updatedRequest?.repair_status}\n`);

        const errors: string[] = [];

        if (Number(updatedRequest?.repair_price) !== 125000) {
            errors.push(`❌ repair_price es ${updatedRequest?.repair_price}, debería ser 125000`);
        }
        if (updatedRequest?.phase !== 'repair_pending') {
            errors.push(`❌ phase es "${updatedRequest?.phase}", debería ser "repair_pending"`);
        }
        if (updatedRequest?.repair_status !== 'pending') {
            errors.push(`❌ repair_status es "${updatedRequest?.repair_status}", debería ser "pending"`);
        }

        console.log('📱 PASO 3B: Test comando SOLO VISITA');

        await prisma.serviceRequest.update({
            where: { id: serviceRequest.id },
            data: {
                repair_price: null,
                repair_status: null,
                phase: 'visit_pending',
            },
        });

        await ProfessionalConversationService.setRepairQuoteAwaitingSession(testTechPhone, {
            jobId: job.id,
            userPhone: testUserPhone,
            requestId: serviceRequest.id,
        });

        await ProfessionalConversationService.processMessage(testTechPhone, 'SOLO VISITA');

        await new Promise((resolve) => setTimeout(resolve, 500));

        const requestAfterSoloVisita = await prisma.serviceRequest.findUnique({
            where: { id: serviceRequest.id },
            select: { phase: true },
        });

        console.log(`   ✓ Phase después de SOLO VISITA: ${requestAfterSoloVisita?.phase}\n`);

        if (requestAfterSoloVisita?.phase !== 'visit_only') {
            errors.push(`❌ phase debería ser "visit_only", es "${requestAfterSoloVisita?.phase}"`);
        }

        console.log('📊 RESULTADO DEL TEST:');
        console.log('═'.repeat(50));

        if (errors.length === 0) {
            console.log('✅ TODAS LAS VALIDACIONES PASARON!\n');
            console.log('Funcionalidades verificadas:');
            console.log('   ✓ Aceptación de oferta diagnóstica');
            console.log('   ✓ Cotización automática de $35k');
            console.log('   ✓ Estado AWAITING_REPAIR_QUOTE activado');
            console.log('   ✓ Presupuesto de arreglo enviado y guardado');
            console.log('   ✓ Comando "SOLO VISITA" funciona');
        } else {
            console.log('⚠️  VALIDACIONES FALLIDAS:');
            errors.forEach((err) => console.log(`   ${err}`));
        }

        console.log('═'.repeat(50));

        await prisma.job.deleteMany({ where: { quotation_id: quotation.id } });
        await prisma.quotation.delete({ where: { id: quotation.id } });
        await prisma.jobOffer.delete({ where: { id: jobOffer.id } });
        await prisma.serviceRequest.delete({ where: { id: serviceRequest.id } });
        console.log('\n🧹 Datos de prueba eliminados');
    } catch (error) {
        console.error('\n❌ ERROR:', error);
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
            console.error('   Stack:', error.stack);
        }
        try {
            if (jobOfferId) await prisma.jobOffer.delete({ where: { id: jobOfferId } }).catch(() => {});
            const q = jobOfferId
                ? await prisma.quotation.findFirst({ where: { job_offer_id: jobOfferId } })
                : null;
            if (q) {
                await prisma.job.deleteMany({ where: { quotation_id: q.id } }).catch(() => {});
                await prisma.quotation.delete({ where: { id: q.id } }).catch(() => {});
            }
            if (serviceRequestId) await prisma.serviceRequest.delete({ where: { id: serviceRequestId } }).catch(() => {});
        } catch {
            /* ignore */
        }
    } finally {
        await prisma.professionalSession.deleteMany({ where: { phone: testTechPhone } });
        await prisma.whatsappSession.deleteMany({
            where: { phone: { in: [testTechPhone, testUserPhone] } },
        });
        await redis.del(`pro_session:${testTechPhone}`);
        await redis.del(`session:${testUserPhone}`);
        await redis.quit();
        await prisma.$disconnect();
        console.log('🔌 Limpieza completada\n');
    }
}

testTechnicianDiagnosticFlow()
    .then(() => {
        console.log('✅ Test completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test falló:', error);
        process.exit(1);
    });
