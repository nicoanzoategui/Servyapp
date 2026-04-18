import { prisma } from '@servy/db';

async function main() {
    const pros = await prisma.professional.findMany({
        select: { phone: true, name: true, email: true }
    });
    console.log('Profesionales en la DB:', pros);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
