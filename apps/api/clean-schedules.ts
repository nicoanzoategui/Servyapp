import { prisma } from '@servy/db';

async function main() {
    await prisma.$executeRaw`DELETE FROM provider_schedules;`;
    console.log('✅ Schedules limpiados');
}

main().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
