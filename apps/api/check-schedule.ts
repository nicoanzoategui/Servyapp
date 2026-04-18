import { prisma } from '@servy/db';

async function main() {
    const schedules = await prisma.providerSchedule.findMany({
        include: {
            professional: {
                select: { name: true, phone: true }
            }
        }
    });
    
    console.log('Provider Schedules:');
    schedules.forEach(s => {
        console.log(`\n${s.professional?.name || 'Unknown'}:`);
        console.log(`  Days: ${s.work_days.join(', ')}`);
        console.log(`  Hours: ${s.shift_start} - ${s.shift_end}`);
        console.log(`  Active: ${s.is_active}`);
    });
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
