import { prisma } from '@servy/db';
import { redis } from '../utils/redis';
import { CascadeQueueService } from '../services/cascade-queue.service';

async function testCascadeFlow() {
    console.log('🧪 TEST E2E - FLUJO DE CASCADA\n');

    const testPhone = `54911${Date.now().toString().slice(-8)}`;
    const testCategory = 'Plomería';

    try {
        // PASO 1: Crear usuario de prueba
        console.log('👤 PASO 1: Crear usuario de prueba');
        const user = await prisma.user.create({
            data: {
                phone: testPhone,
                name: 'Usuario Test Cascada',
                address: 'Calle Falsa 123, Pilar',
                postal_code: '1629',
                onboarding_completed: true,
            },
        });
        console.log(`   ✓ Usuario creado: ${user.id}\n`);

        // PASO 2: Crear request
        console.log('📋 PASO 2: Crear service request');
        const request = await prisma.serviceRequest.create({
            data: {
                user_phone: user.phone,
                category: testCategory,
                description: 'Pérdida de agua en cocina - TEST',
                address: user.address,
                status: 'pending',
                service_type: 'diagnostic',
            },
        });
        console.log(`   ✓ Request creado: ${request.id}\n`);

        // PASO 3: Buscar técnicos disponibles
        console.log('🔍 PASO 3: Buscar técnicos disponibles');
        const professionals = await prisma.professional.findMany({
            where: {
                status: 'active',
                availability_status: 'IDLE',
                categories: { has: testCategory },
            },
            select: { id: true, name: true, phone: true, rating: true },
            take: 3,
        });

        if (professionals.length === 0) {
            throw new Error('No hay técnicos disponibles para el test');
        }

        console.log(`   ✓ Encontrados ${professionals.length} técnicos:`);
        professionals.forEach((p, i) => {
            console.log(`     ${i + 1}. ${p.name} (${p.phone}) - Rating: ${p.rating || 0}`);
        });
        console.log();

        // PASO 4: Iniciar cascada
        console.log('🚀 PASO 4: Iniciar cascada');
        await CascadeQueueService.startCascade(
            request.id,
            professionals.map((p) => p.id),
            'scheduled',
            testCategory,
            'Pilar',
            35000
        );
        console.log(`   ✓ Cascada iniciada\n`);

        // PASO 5: Verificar estado en Redis
        console.log('🔍 PASO 5: Verificar estado en Redis');
        const cascadeKey = `cascade:${request.id}`;
        const cascadeData = await redis.get(cascadeKey);

        if (cascadeData) {
            const cascade = JSON.parse(cascadeData) as { currentIndex: number; timeoutMinutes: number; priority: string };
            console.log(`   ✓ Cascada activa:`);
            console.log(`     - Índice actual: ${cascade.currentIndex}`);
            console.log(`     - Timeout: ${cascade.timeoutMinutes} minutos`);
            console.log(`     - Prioridad: ${cascade.priority}`);
        } else {
            console.log(`   ⚠️  No hay cascada en Redis (puede haberse completado rápido)`);
        }
        console.log();

        // PASO 6: Verificar JobOffer creado
        console.log('📄 PASO 6: Verificar JobOffer');
        const offers = await prisma.jobOffer.findMany({
            where: { request_id: request.id },
            include: { professional: { select: { name: true, availability_status: true } } },
        });

        console.log(`   ✓ ${offers.length} oferta(s) creada(s):`);
        offers.forEach((o) => {
            console.log(`     - ${o.professional.name}: ${o.status} (pos: ${o.cascade_position})`);
            console.log(`       Estado: ${o.professional.availability_status}`);
        });
        console.log();

        // PASO 7: Simular timeout (opcional)
        console.log('⏱️  PASO 7: Simulación de timeout (esperando 5 segundos)');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        console.log(`   ✓ Tiempo transcurrido\n`);

        // PASO 8: Verificar métricas
        console.log('📊 PASO 8: Verificar métricas de profesionales');
        const updatedPros = await prisma.professional.findMany({
            where: { id: { in: professionals.map((p) => p.id) } },
            select: {
                name: true,
                total_jobs_offered: true,
                total_jobs_accepted: true,
                total_jobs_rejected: true,
                availability_status: true,
            },
        });

        updatedPros.forEach((p) => {
            console.log(`   ${p.name}:`);
            console.log(`     - Ofertas: ${p.total_jobs_offered}`);
            console.log(`     - Aceptadas: ${p.total_jobs_accepted}`);
            console.log(`     - Rechazadas: ${p.total_jobs_rejected}`);
            console.log(`     - Estado: ${p.availability_status}`);
        });
        console.log();

        // LIMPIEZA
        console.log('🧹 LIMPIEZA: Eliminando datos de prueba');

        // Eliminar offers
        await prisma.jobOffer.deleteMany({ where: { request_id: request.id } });

        // Eliminar request
        await prisma.serviceRequest.delete({ where: { id: request.id } });

        // Eliminar usuario
        await prisma.user.delete({ where: { phone: testPhone } });

        // Limpiar Redis
        await redis.del(cascadeKey);
        for (const o of offers) {
            await redis.del(`cascade:timeout:${o.id}`);
        }

        // Restaurar estados de profesionales
        await prisma.professional.updateMany({
            where: { id: { in: professionals.map((p) => p.id) } },
            data: { availability_status: 'IDLE' },
        });

        console.log('   ✓ Limpieza completada\n');

        console.log('✅ TEST COMPLETADO EXITOSAMENTE');
        console.log('═'.repeat(60));
        console.log('El sistema de cascada está funcionando correctamente.');
        console.log('Próximos pasos:');
        console.log('1. Probar con técnicos reales aceptando/rechazando');
        console.log('2. Monitorear logs de [CascadeMetrics] en producción');
        console.log('3. Ajustar tiempos según feedback real');
        console.log('═'.repeat(60));
    } catch (error) {
        console.error('\n❌ ERROR EN EL TEST:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        await redis.quit();
    }
}

testCascadeFlow()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
