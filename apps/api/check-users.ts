import { prisma } from '@servy/db';

async function main() {
    const users = await prisma.user.count();
    const professionals = await prisma.professional.findMany({
        select: {
            name: true,
            phone: true,
            status: true,
        }
    });
    
    console.log('Total usuarios (clientes):', users);
    console.log('Total profesionales:', professionals.length);
    console.log('\nProfesionales:');
    professionals.forEach(p => {
        console.log(`- ${p.name}: ${p.status} (${p.phone})`);
    });
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
