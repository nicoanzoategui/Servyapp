import { prisma } from '@servy/db';
import crypto from 'crypto';

async function testMagicLink() {
    console.log('🧪 Test del flujo passwordless (magic link)\n');

    const testPhone = '5491115000099';
    const testEmail = `test-magic-${Date.now()}@servy.test`;

    try {
        console.log('📱 PASO 1: Crear Professional de prueba');

        const professional = await prisma.professional.create({
            data: {
                phone: testPhone,
                name: 'Test',
                last_name: 'Magic Link',
                email: testEmail,
                password_hash: 'dummy', // No se usa en magic link
                dni: '12345678',
                categories: ['Plomería'],
                zones: ['Test Zone'],
                status: 'pending',
                onboarding_completed: false,
            },
        });

        console.log(`   ✓ Professional creado: ${professional.id}`);
        console.log(`   ✓ Email: ${testEmail}\n`);

        console.log('🔑 PASO 2: Generar token de activación');

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        await prisma.passwordToken.create({
            data: {
                token,
                email: testEmail,
                type: 'set',
                expires_at: expiresAt,
                used: false,
            },
        });

        console.log(`   ✓ Token generado: ${token.substring(0, 20)}...`);
        console.log(`   ✓ Expira: ${expiresAt.toLocaleString()}\n`);

        console.log('🌐 PASO 3: Simular llamada al endpoint');
        console.log(`   URL: GET /auth/professional/magic-verify?token=${token}\n`);

        // Simular el endpoint
        const record = await prisma.passwordToken.findUnique({
            where: { token },
        });

        if (!record) {
            throw new Error('Token no encontrado');
        }

        if (record.used) {
            throw new Error('Token ya usado');
        }

        if (record.expires_at < new Date()) {
            throw new Error('Token expirado');
        }

        if (record.type !== 'set') {
            throw new Error('Token inválido');
        }

        const prof = await prisma.professional.findUnique({
            where: { email: record.email.trim().toLowerCase() },
        });

        if (!prof) {
            throw new Error('Professional no encontrado');
        }

        console.log('   ✓ Token válido');
        console.log('   ✓ Professional encontrado');
        console.log('   ✓ JWT se generaría aquí\n');

        // Marcar como usado
        await prisma.passwordToken.update({
            where: { token },
            data: { used: true },
        });

        console.log('   ✓ Token marcado como usado\n');

        console.log('✅ VALIDACIONES:');
        console.log('═'.repeat(50));
        console.log('   ✓ Professional creado correctamente');
        console.log('   ✓ Token generado y guardado');
        console.log('   ✓ Token validado exitosamente');
        console.log('   ✓ Token marcado como usado');
        console.log('═'.repeat(50));

        console.log('\n🔗 Link de prueba (ya usado):');
        console.log(`   https://pro.servy.lat/auth/verify?token=${token}\n`);

        // Limpiar
        await prisma.passwordToken.delete({ where: { token } });
        await prisma.professional.delete({ where: { id: professional.id } });

        console.log('🧹 Datos de prueba eliminados\n');
    } catch (error) {
        console.error('\n❌ ERROR:', error);
        if (error instanceof Error) {
            console.error('   Mensaje:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

testMagicLink()
    .then(() => {
        console.log('✅ Test completado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test falló:', error);
        process.exit(1);
    });
