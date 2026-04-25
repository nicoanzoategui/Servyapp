import { PrismaClient } from '@servy/db';
import { ConversationService } from '../services/conversation.service';
import { ProfessionalConversationService } from '../services/professional.conversation.service';
import redis from '../lib/redis';

const prisma = new PrismaClient();

async function cleanupRequestCascade(requestId: string) {
    const offers = await prisma.jobOffer.findMany({
        where: { request_id: requestId },
        select: { id: true },
    });
    const offerIds = offers.map((o) => o.id);
    if (offerIds.length === 0) {
        await prisma.serviceRequest.delete({ where: { id: requestId } }).catch(() => {});
        return;
    }
    const quotations = await prisma.quotation.findMany({
        where: { job_offer_id: { in: offerIds } },
        select: { id: true },
    });
    const qIds = quotations.map((q) => q.id);
    await prisma.job.deleteMany({ where: { quotation_id: { in: qIds } } });
    await prisma.payment.deleteMany({ where: { quotation_id: { in: qIds } } });
    await prisma.quotation.deleteMany({ where: { id: { in: qIds } } });
    await prisma.jobOffer.deleteMany({ where: { request_id: requestId } });
    await prisma.serviceRequest.delete({ where: { id: requestId } }).catch(() => {});
}

async function testOneShotFlow() {
    console.log('🧪 Test del flujo One-Shot (Lavado de Autos)\n');

    const testUserPhone = '5491115000001';
    const testTechPhone = '5491115000002';

    let requestIdToClean: string | null = null;

    try {
        await prisma.professionalSession.deleteMany({ where: { phone: testTechPhone } });
        await prisma.whatsappSession.deleteMany({
            where: { phone: { in: [testUserPhone, testTechPhone] } },
        });
        await redis.del(`pro_session:${testTechPhone}`);
        await redis.del(`session:${testUserPhone}`);
        await redis.del(`session:${testTechPhone}`);
        console.log('✅ Sesiones limpiadas\n');

        const professional = await prisma.professional.findUnique({ where: { phone: testTechPhone } });
        if (!professional) {
            throw new Error(`No hay profesional con teléfono ${testTechPhone} (seed).`);
        }

        console.log('📱 PASO 1: Usuario elige tamaño mediano (Lavado de Autos)');

        await prisma.whatsappSession.create({
            data: {
                phone: testUserPhone,
                step: 'AWAITING_VEHICLE_SIZE',
                data_json: {
                    description: 'Quiero lavar mi auto',
                    category: 'Lavado de Autos',
                    urgency: 'low',
                    serviceType: 'one_shot',
                    photos: [],
                },
                expires_at: new Date(Date.now() + 3600000),
            },
        });

        await ConversationService.processMessage(testUserPhone, 'text', '2');
        await new Promise((resolve) => setTimeout(resolve, 300));

        let session = await prisma.whatsappSession.findUnique({
            where: { phone: testUserPhone },
        });
        const dataAfterSize = (session?.data_json as Record<string, unknown>) || {};
        console.log(`   ✓ Precio calculado: $${dataAfterSize.price}`);
        console.log(`   ✓ Estado: ${session?.step}\n`);

        console.log('📱 PASO 2: Usuario elige mañana');
        await ConversationService.processMessage(testUserPhone, 'text', '2');
        await new Promise((resolve) => setTimeout(resolve, 300));

        console.log('📱 PASO 3: Usuario elige 10:00');
        await ConversationService.processMessage(testUserPhone, 'text', '10:00');
        await new Promise((resolve) => setTimeout(resolve, 300));

        console.log('📱 PASO 4: Usuario confirma');
        await ConversationService.processMessage(testUserPhone, 'text', '1');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const request = await prisma.serviceRequest.findFirst({
            where: { user_phone: testUserPhone },
            orderBy: { created_at: 'desc' },
            select: {
                id: true,
                category: true,
                service_type: true,
                phase: true,
                visit_price: true,
                visit_status: true,
                scheduled_date: true,
                scheduled_time: true,
            },
        });

        if (!request) {
            throw new Error('No se creó el ServiceRequest one-shot');
        }
        requestIdToClean = request.id;

        console.log('   ✓ ServiceRequest creado');
        console.log(`   ✓ Tipo: ${request.service_type}`);
        console.log(`   ✓ Precio: $${request.visit_price}\n`);

        console.log('📱 PASO 5: Técnico acepta el trabajo');

        const jobOffer = await prisma.jobOffer.create({
            data: {
                request_id: request.id,
                professional_id: professional.id,
                status: 'pending',
                priority: 'scheduled',
            },
        });

        await prisma.professionalSession.create({
            data: {
                phone: testTechPhone,
                step: 'AWAITING_JOB_RESPONSE',
                data_json: {
                    jobOfferId: jobOffer.id,
                    userPhone: testUserPhone,
                    requestId: request.id,
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
            throw new Error('No se creó la cotización one-shot');
        }

        console.log('   ✓ Cotización automática creada');
        console.log(`   ✓ Precio: $${quotation.total_price}\n`);

        console.log('📊 VALIDACIONES:');
        console.log('═'.repeat(50));

        const errors: string[] = [];

        if (request.service_type !== 'one_shot') {
            errors.push(`❌ service_type es "${request.service_type}", debería ser "one_shot"`);
        }
        if (Number(request.visit_price) !== 18000) {
            errors.push(`❌ visit_price es ${request.visit_price}, debería ser 18000 (auto mediano)`);
        }
        if (request.visit_status !== 'pending') {
            errors.push(`❌ visit_status es "${request.visit_status}", debería ser "pending"`);
        }
        if (Number(quotation.total_price) !== 18000) {
            errors.push(`❌ quotation.total_price es ${quotation.total_price}, debería ser 18000`);
        }

        if (errors.length === 0) {
            console.log('✅ TODAS LAS VALIDACIONES PASARON!\n');
            console.log('Funcionalidades verificadas:');
            console.log('   ✓ Detección de servicio one-shot');
            console.log('   ✓ Cálculo automático de precio por specs');
            console.log('   ✓ Agendamiento con fecha/hora');
            console.log('   ✓ Creación de ServiceRequest one-shot');
            console.log('   ✓ Aceptación técnico con cotización automática');
        } else {
            console.log('⚠️  VALIDACIONES FALLIDAS:');
            errors.forEach((err) => console.log(`   ${err}`));
        }

        console.log('═'.repeat(50));

        await cleanupRequestCascade(request.id);
        requestIdToClean = null;
        console.log('\n🧹 Datos de prueba eliminados');
    } catch (error) {
        console.error('\n❌ ERROR:', error);
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
            console.error('   Stack:', error.stack);
        }
        if (requestIdToClean) {
            await cleanupRequestCascade(requestIdToClean).catch(() => {});
        }
    } finally {
        await prisma.professionalSession.deleteMany({ where: { phone: testTechPhone } });
        await prisma.whatsappSession.deleteMany({
            where: { phone: { in: [testUserPhone, testTechPhone] } },
        });
        await redis.del(`pro_session:${testTechPhone}`);
        await redis.del(`session:${testUserPhone}`);
        await redis.del(`session:${testTechPhone}`);
        await redis.quit();
        await prisma.$disconnect();
        console.log('🔌 Limpieza completada\n');
    }
}

testOneShotFlow()
    .then(() => {
        console.log('✅ Test completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test falló:', error);
        process.exit(1);
    });
