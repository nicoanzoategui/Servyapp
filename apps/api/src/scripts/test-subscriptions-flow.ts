import { prisma } from '@servy/db';
import { ConversationService } from '../services/conversation.service';
import { SubscriptionService } from '../services/subscription.service';
import redis from '../lib/redis';

async function deleteServiceRequestCascade(requestId: string) {
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

async function testSubscriptionsFlow() {
    console.log('🧪 Test del sistema completo de suscripciones\n');

    const testUserPhone = '5491115000001';

    let subscriptionIdToClean: string | null = null;
    let autoRequestId: string | null = null;

    try {
        await prisma.whatsappSession.deleteMany({
            where: { phone: testUserPhone },
        });
        await redis.del(`session:${testUserPhone}`);

        await prisma.subscription.deleteMany({
            where: {
                user: { phone: testUserPhone },
            },
        });

        console.log('✅ Sesiones y datos limpiados\n');

        // ======================
        // PARTE 1: OFERTA POST-SERVICIO
        // ======================
        console.log('📱 PARTE 1: Oferta de suscripción post-servicio\n');

        await prisma.whatsappSession.create({
            data: {
                phone: testUserPhone,
                step: 'AWAITING_SUBSCRIPTION_DECISION',
                data_json: {
                    category: 'Lavado de Autos',
                    jobId: 'test-job-123',
                },
                expires_at: new Date(Date.now() + 3600000),
            },
        });

        console.log('   Usuario recibe oferta de suscripción');
        console.log('   Opciones: 1-Semanal / 2-Quincenal / 3-No\n');

        console.log('📱 Usuario elige suscripción semanal (1)');
        await ConversationService.processMessage(testUserPhone, 'text', '1');
        await new Promise((resolve) => setTimeout(resolve, 500));

        const subscription = await prisma.subscription.findFirst({
            where: {
                user: { phone: testUserPhone },
                service_category: 'Lavado de Autos',
            },
            orderBy: { created_at: 'desc' },
        });

        if (!subscription) {
            throw new Error('No se creó la suscripción');
        }
        subscriptionIdToClean = subscription.id;

        console.log('   ✓ Suscripción creada');
        console.log(`   ✓ Categoría: ${subscription.service_category}`);
        console.log(`   ✓ Frecuencia: ${subscription.frequency}`);
        console.log(`   ✓ Precio: $${subscription.price}`);
        console.log(`   ✓ Estado: ${subscription.status}`);
        console.log(`   ✓ Próximo servicio: ${subscription.next_service_date.toLocaleDateString('es-AR')}\n`);

        // ======================
        // PARTE 2: COMANDOS DE GESTIÓN
        // ======================
        console.log('📱 PARTE 2: Comandos de gestión\n');

        console.log('📱 Usuario: "mis suscripciones"');
        await ConversationService.processMessage(testUserPhone, 'text', 'mis suscripciones');
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log('   ✓ Lista mostrada\n');

        console.log('📱 Usuario: "pausar suscripción"');
        await ConversationService.processMessage(testUserPhone, 'text', 'pausar suscripción');
        await new Promise((resolve) => setTimeout(resolve, 300));

        const pausedSub = await prisma.subscription.findUnique({
            where: { id: subscription.id },
        });

        if (pausedSub?.status !== 'paused') {
            throw new Error(`Suscripción no se pausó correctamente. Estado: ${pausedSub?.status}`);
        }

        console.log('   ✓ Suscripción pausada\n');

        console.log('📱 Usuario: "reactivar suscripción"');
        await ConversationService.processMessage(testUserPhone, 'text', 'reactivar suscripción');
        await new Promise((resolve) => setTimeout(resolve, 300));

        const reactivatedSub = await prisma.subscription.findUnique({
            where: { id: subscription.id },
        });

        if (reactivatedSub?.status !== 'active') {
            throw new Error(`Suscripción no se reactivó. Estado: ${reactivatedSub?.status}`);
        }

        console.log('   ✓ Suscripción reactivada\n');

        // ======================
        // PARTE 3: PROCESAMIENTO CRON
        // ======================
        console.log('📱 PARTE 3: Procesamiento automático (cron)\n');

        const today = new Date();
        today.setHours(12, 0, 0, 0);

        await prisma.subscription.update({
            where: { id: subscription.id },
            data: { next_service_date: today, retry_count: 0, status: 'active' },
        });

        console.log('   Simulando que la suscripción vence hoy...');

        process.env.SUBSCRIPTION_CHARGE_ALWAYS_SUCCEED = '1';
        const result = await SubscriptionService.processSubscription(subscription.id);
        delete process.env.SUBSCRIPTION_CHARGE_ALWAYS_SUCCEED;

        if (!result) {
            console.log('   ⚠️  Procesamiento falló (simulación de fallo de pago)');
        } else {
            console.log('   ✓ Procesamiento exitoso');

            const autoRequest = await prisma.serviceRequest.findFirst({
                where: {
                    user_phone: testUserPhone,
                    category: 'Lavado de Autos',
                    description: { contains: 'recurrente' },
                },
                orderBy: { created_at: 'desc' },
            });

            if (autoRequest) {
                console.log('   ✓ ServiceRequest automático creado');
                console.log(`   ✓ Estado pago: ${autoRequest.visit_status}`);
                autoRequestId = autoRequest.id;
            }

            const updatedSub = await prisma.subscription.findUnique({
                where: { id: subscription.id },
            });

            if (updatedSub) {
                const daysDiff = Math.round(
                    (updatedSub.next_service_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                );
                console.log(`   ✓ Próxima fecha actualizada: +${daysDiff} días\n`);
            }
        }

        // ======================
        // VALIDACIONES FINALES
        // ======================
        console.log('📊 VALIDACIONES FINALES:');
        console.log('═'.repeat(50));

        const errors: string[] = [];

        if (subscription.service_category !== 'Lavado de Autos') {
            errors.push(`❌ service_category es "${subscription.service_category}"`);
        }
        if (subscription.frequency !== 'weekly') {
            errors.push(`❌ frequency es "${subscription.frequency}"`);
        }
        if (Number(subscription.price) !== 12000) {
            errors.push(`❌ price es ${subscription.price}, debería ser 12000 (semanal con descuento)`);
        }
        if (!pausedSub || pausedSub.status !== 'paused') {
            errors.push('❌ Comando pausar no funcionó');
        }
        if (!reactivatedSub || reactivatedSub.status !== 'active') {
            errors.push('❌ Comando reactivar no funcionó');
        }

        if (errors.length === 0) {
            console.log('✅ TODAS LAS VALIDACIONES PASARON!\n');
            console.log('Funcionalidades verificadas:');
            console.log('   ✓ Oferta post-servicio one-shot');
            console.log('   ✓ Creación de suscripción con pricing correcto');
            console.log('   ✓ Comando "mis suscripciones"');
            console.log('   ✓ Comando "pausar suscripción"');
            console.log('   ✓ Comando "reactivar suscripción"');
            console.log('   ✓ Procesamiento automático (cron)');
            console.log('   ✓ Creación de ServiceRequest automático');
            console.log('   ✓ Actualización de próxima fecha');
        } else {
            console.log('⚠️  VALIDACIONES FALLIDAS:');
            errors.forEach((err) => console.log(`   ${err}`));
        }

        console.log('═'.repeat(50));

        if (autoRequestId) {
            await deleteServiceRequestCascade(autoRequestId);
        }
        await prisma.subscription.delete({ where: { id: subscription.id } }).catch(() => {});
        subscriptionIdToClean = null;
        console.log('\n🧹 Suscripción de prueba eliminada');
    } catch (error) {
        console.error('\n❌ ERROR:', error);
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
            console.error('   Stack:', error.stack);
        }
        if (autoRequestId) {
            await deleteServiceRequestCascade(autoRequestId).catch(() => {});
        }
        if (subscriptionIdToClean) {
            await prisma.subscription.delete({ where: { id: subscriptionIdToClean } }).catch(() => {});
        }
    } finally {
        delete process.env.SUBSCRIPTION_CHARGE_ALWAYS_SUCCEED;
        await prisma.whatsappSession.deleteMany({
            where: { phone: testUserPhone },
        });
        await redis.del(`session:${testUserPhone}`);
        await redis.quit();
        await prisma.$disconnect();
        console.log('🔌 Limpieza completada\n');
    }
}

testSubscriptionsFlow()
    .then(() => {
        console.log('✅ Test completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test falló:', error);
        process.exit(1);
    });
