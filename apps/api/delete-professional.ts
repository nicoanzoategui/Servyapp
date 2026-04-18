import { prisma } from '@servy/db';

async function main() {
    const deleted = await prisma.professional.deleteMany({ 
        where: { phone: '5491154142169' } 
    });
    console.log('Profesionales borrados:', deleted.count);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
