import { prisma } from '@servy/db';

async function main() {
    // Verificar si existe provider_schedules
    try {
        const result = await prisma.$queryRaw`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'provider_schedules'
            );
        `;
        console.log('provider_schedules exists:', result);
    } catch (e) {
        console.error('Error checking table:', e);
    }
    
    // Ver campos del Professional
    const pro = await prisma.professional.findFirst({
        select: { id: true }
    });
    console.log('\nProfessional model exists');
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
