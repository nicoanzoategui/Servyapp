import { prisma } from '@servy/db';

async function main() {
    const users = await prisma.user.findMany({
        select: { phone: true, name: true }
    });
    console.log('Usuarios en la DB:', users);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
