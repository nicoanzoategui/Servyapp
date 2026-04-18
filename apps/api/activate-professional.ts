import { prisma } from '@servy/db';

async function main() {
    const phone = '5491154142169';
    
    const updated = await prisma.professional.update({
        where: { phone },
        data: { status: 'active' }
    });
    
    console.log('✅ Profesional activado:', updated.name, '-', updated.status);
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
