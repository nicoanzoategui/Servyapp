import { prisma } from '@servy/db';

async function main() {
    const phone = '5491154142169';
    
    // Limpiar sesiones en DB
    await prisma.whatsappSession.deleteMany({ where: { phone } }).catch(() => {});
    await prisma.professionalSession.deleteMany({ where: { phone } }).catch(() => {});
    
    console.log('✅ Sesión limpiada en DB');
    console.log('⚠️  Redis de producción en Railway se limpiará automáticamente');
    console.log('🎯 Ahora escribí "hola" al bot y debería preguntarte si sos técnico o usuario');
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
