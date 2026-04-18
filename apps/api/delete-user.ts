import { prisma } from '@servy/db';

async function main() {
    const deleted = await prisma.user.deleteMany({ 
        where: { phone: { contains: '1154142169' } } 
    });
    console.log('Usuarios borrados:', deleted.count);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
