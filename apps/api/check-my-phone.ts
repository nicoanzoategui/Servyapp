import { prisma } from '@servy/db';

async function main() {
    const prof = await prisma.professional.findFirst({
        where: {
            OR: [
                { phone: '5491154142169' },
                { phone: { contains: '1154142169' } }
            ]
        },
        select: { phone: true, name: true, status: true }
    });
    
    console.log('Tu técnico:', prof);
    console.log('Formato esperado: 5491154142169');
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
