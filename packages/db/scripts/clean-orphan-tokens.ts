import { prisma } from '../src';

/**
 * Limpia tokens de password que no tienen un Professional asociado.
 * Ejecutar ANTES de aplicar la migración FK.
 */
async function cleanOrphanTokens() {
    console.log('🧹 Limpiando tokens huérfanos...\n');

    try {
        const professionals = await prisma.professional.findMany({
            select: { email: true },
        });

        const validEmails = new Set(professionals.map((p) => p.email.trim().toLowerCase()));

        console.log(`   ✓ Emails válidos en Professional: ${validEmails.size}\n`);

        const allTokens = await prisma.passwordToken.findMany({
            select: { id: true, email: true, type: true, created_at: true },
        });

        const orphanTokens = allTokens.filter((t) => !validEmails.has(t.email.trim().toLowerCase()));

        if (orphanTokens.length === 0) {
            console.log('✅ No hay tokens huérfanos. Base de datos limpia.\n');
            return;
        }

        console.log(`⚠️  Tokens huérfanos encontrados: ${orphanTokens.length}\n`);

        console.log('Ejemplos de tokens huérfanos:');
        orphanTokens.slice(0, 5).forEach((t) => {
            console.log(`   - Email: ${t.email}`);
            console.log(`     Tipo: ${t.type}`);
            console.log(`     Creado: ${t.created_at.toLocaleString()}\n`);
        });

        const deleted = await prisma.passwordToken.deleteMany({
            where: {
                id: { in: orphanTokens.map((t) => t.id) },
            },
        });

        console.log(`✅ Eliminados ${deleted.count} tokens huérfanos\n`);
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

cleanOrphanTokens()
    .then(() => {
        console.log('✅ Limpieza completada. Ya podés aplicar la migración FK.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Limpieza falló:', error);
        process.exit(1);
    });
