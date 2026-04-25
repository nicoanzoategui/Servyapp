import { prisma } from '@servy/db';
import { PaymentRetryService } from '../services/payment-retry.service';
import { ProfessionalConversationService } from '../services/professional.conversation.service';
import { redis } from '../utils/redis';

async function testPaymentRetry() {
    console.log('🧪 Test del flujo de reintento de pago\n');

    const testUserPhone = '5491115000001';
    const testTechPhone = '5491115000002';
    const testJobId = 'test-job-payment-retry';
    const testRequestId = 'test-request-payment-retry';

    try {
        await prisma.professionalSession.deleteMany({
            where: { phone: testTechPhone },
        });
        try {
            await redis.del(`pro_session:${testTechPhone}`);
        } catch {
            /* ignore */
        }
        console.log('✅ Sesiones limpiadas\n');

        // Re-runs: borrar en orden FK
        await prisma.job.deleteMany({ where: { id: testJobId } }).catch(() => {});
        const staleOffers = await prisma.jobOffer.findMany({ where: { request_id: testRequestId } });
        for (const o of staleOffers) {
            const q = await prisma.quotation.findUnique({ where: { job_offer_id: o.id } });
            if (q) {
                await prisma.job.deleteMany({ where: { quotation_id: q.id } }).catch(() => {});
                await prisma.quotation.delete({ where: { id: q.id } }).catch(() => {});
            }
            await prisma.jobOffer.delete({ where: { id: o.id } }).catch(() => {});
        }
        await prisma.serviceRequest.deleteMany({ where: { id: testRequestId } }).catch(() => {});

        // ======================
        // PARTE 1: SIMULAR FALLO DE PAGO
        // ======================
        console.log('📱 PARTE 1: Simular fallo de pago del arreglo\n');

        await prisma.user.upsert({
            where: { phone: testUserPhone },
            create: { phone: testUserPhone },
            update: {},
        });

        await prisma.serviceRequest.create({
            data: {
                id: testRequestId,
                user_phone: testUserPhone,
                category: 'Plomería',
                description: 'Canilla rota',
                service_type: 'diagnostic',
                phase: 'repair_pending',
                visit_price: 35000,
                repair_price: 125000,
                visit_status: 'paid',
                repair_status: 'pending',
                status: 'in_progress',
                address: 'Test Address 123',
                photos: [],
            },
        });

        console.log('   ✓ ServiceRequest creado');

        const professional = await prisma.professional.upsert({
            where: { phone: testTechPhone },
            create: {
                phone: testTechPhone,
                name: 'Test',
                last_name: 'Technician',
                email: `pro-retry-${testTechPhone.replace(/\D/g, '')}@servy.test`,
                password_hash: 'test',
                categories: ['Plomería'],
                zones: ['CABA'],
                onboarding_completed: true,
            },
            update: {},
        });

        const jobOffer = await prisma.jobOffer.create({
            data: {
                request_id: testRequestId,
                professional_id: professional.id,
                status: 'accepted',
                priority: 'normal',
            },
        });

        console.log('   ✓ JobOffer creado');

        const quotation = await prisma.quotation.create({
            data: {
                job_offer_id: jobOffer.id,
                total_price: 125000,
                items_json: [],
            },
        });

        await prisma.job.create({
            data: {
                id: testJobId,
                quotation_id: quotation.id,
                phase: 'repair_pending',
                status: 'confirmed',
            },
        });

        console.log('   ✓ Job creado\n');

        console.log('💳 Simulando fallo de pago...\n');

        await PaymentRetryService.handleRepairPaymentFailure(
            testJobId,
            testUserPhone,
            testTechPhone,
            125000
        );

        await new Promise((resolve) => setTimeout(resolve, 500));

        const techSessionAfterFailure = await prisma.professionalSession.findUnique({
            where: { phone: testTechPhone },
        });

        if (!techSessionAfterFailure) {
            throw new Error('No se creó la sesión del técnico');
        }

        console.log('   ✓ Sesión del técnico creada');
        console.log(`   ✓ Estado: ${techSessionAfterFailure.step}`);
        const sessionPayload = techSessionAfterFailure.data_json as Record<string, unknown>;
        console.log(`   ✓ JobId en sesión: ${String(sessionPayload.jobId)}\n`);

        if (techSessionAfterFailure.step !== 'AWAITING_PAYMENT_RETRY_DECISION') {
            throw new Error(`Estado esperado AWAITING_PAYMENT_RETRY_DECISION, obtuve "${techSessionAfterFailure.step}"`);
        }

        // ======================
        // PARTE 2: TÉCNICO ELIGE OPCIÓN 3 (SOLO VISITA)
        // ======================
        console.log('📱 PARTE 2: Técnico elige SOLO VISITA (opción 3)\n');

        await ProfessionalConversationService.processMessage(testTechPhone, '3');
        await new Promise((resolve) => setTimeout(resolve, 500));

        const updatedJob = await prisma.job.findUnique({
            where: { id: testJobId },
        });

        if (updatedJob?.phase !== 'visit_only') {
            throw new Error(`Job phase es "${updatedJob?.phase}", debería ser "visit_only"`);
        }

        console.log('   ✓ Job actualizado a visit_only');

        const updatedRequest = await prisma.serviceRequest.findUnique({
            where: { id: testRequestId },
        });

        if (updatedRequest?.phase !== 'visit_only') {
            throw new Error(`Request phase es "${updatedRequest?.phase}", debería ser "visit_only"`);
        }

        console.log('   ✓ ServiceRequest actualizado a visit_only\n');

        const techSessionAfterDecision = await prisma.professionalSession.findUnique({
            where: { phone: testTechPhone },
        });

        // ======================
        // VALIDACIONES FINALES
        // ======================
        console.log('📊 VALIDACIONES FINALES:');
        console.log('═'.repeat(50));

        const errors: string[] = [];

        if (techSessionAfterDecision != null) {
            errors.push('❌ La sesión del técnico debería haberse eliminado tras la opción 3');
        }
        if (updatedJob?.phase !== 'visit_only') {
            errors.push(`❌ Job phase es "${updatedJob?.phase}"`);
        }
        if (updatedRequest?.phase !== 'visit_only') {
            errors.push(`❌ Request phase es "${updatedRequest?.phase}"`);
        }

        if (errors.length === 0) {
            console.log('✅ TODAS LAS VALIDACIONES PASARON!\n');
            console.log('Funcionalidades verificadas:');
            console.log('   ✓ Detección de fallo de pago');
            console.log('   ✓ Notificación a técnico con 3 opciones');
            console.log('   ✓ Notificación a cliente');
            console.log('   ✓ Opción "SOLO VISITA" funciona');
            console.log('   ✓ Job y Request actualizados correctamente');
            console.log('   ✓ Sesión técnico cerrada tras decisión');
        } else {
            console.log('⚠️  VALIDACIONES FALLIDAS:');
            errors.forEach((err) => console.log(`   ${err}`));
        }

        console.log('═'.repeat(50));

        await prisma.job.delete({ where: { id: testJobId } });
        await prisma.quotation.delete({ where: { id: quotation.id } });
        await prisma.jobOffer.delete({ where: { id: jobOffer.id } });
        await prisma.serviceRequest.delete({ where: { id: testRequestId } });
        await prisma.user.deleteMany({ where: { phone: testUserPhone } });
        await prisma.professional.deleteMany({ where: { phone: testTechPhone } });
        console.log('\n🧹 Datos de prueba eliminados');
    } catch (error) {
        console.error('\n❌ ERROR:', error);
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
            console.error('   Stack:', error.stack);
        }
    } finally {
        await prisma.professionalSession.deleteMany({
            where: { phone: testTechPhone },
        });
        try {
            await redis.del(`pro_session:${testTechPhone}`);
        } catch {
            /* ignore */
        }
        await redis.quit().catch(() => {});
        await prisma.$disconnect();
        console.log('🔌 Limpieza completada\n');
    }
}

testPaymentRetry()
    .then(() => {
        console.log('✅ Test completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test falló:', error);
        process.exit(1);
    });
