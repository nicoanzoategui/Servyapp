import { prisma } from '../src';

/**
 * Verifica que el Foreign Key constraint esté aplicado correctamente.
 */
async function verifyFK(): Promise<boolean> {
    console.log('🔍 Verificando Foreign Key constraint...\n');

    try {
        const fakeEmail = `fake-${Date.now()}@test.invalid`;
        const probeToken = `test-fk-verify-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        console.log(`   Intentando crear token con email inexistente: ${fakeEmail}\n`);

        try {
            await prisma.passwordToken.create({
                data: {
                    token: probeToken,
                    email: fakeEmail,
                    type: 'set',
                    expires_at: new Date(Date.now() + 3600000),
                    used: false,
                },
            });

            console.log('❌ FOREIGN KEY NO ESTÁ APLICADO\n');
            console.log('   El token se creó con un email inexistente.');
            console.log('   Esto NO debería ser posible si el FK está activo.\n');

            await prisma.passwordToken.deleteMany({
                where: { email: fakeEmail },
            });

            return false;
        } catch (error: unknown) {
            const err = error as { code?: string; message?: string };
            if (err.code === 'P2003' || err.message?.toLowerCase().includes('foreign key')) {
                console.log('✅ FOREIGN KEY ESTÁ APLICADO CORRECTAMENTE\n');
                console.log('   La base de datos rechazó crear un token con email inexistente.');
                console.log('   Integridad referencial garantizada. ✓\n');
                return true;
            }

            throw error;
        }
    } catch (error) {
        console.error('❌ Error verificando FK:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

verifyFK()
    .then((fkExists) => {
        if (fkExists) {
            console.log('🎉 Todo en orden. La migración FK está aplicada.');
        } else {
            console.log('⚠️  El FK todavía no está aplicado. Ejecutá la migración.');
        }
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Verificación falló:', error);
        process.exit(1);
    });
