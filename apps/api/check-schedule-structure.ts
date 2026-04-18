import { prisma } from '@servy/db';

async function main() {
    // Ver estructura de la tabla
    const columns = await prisma.$queryRaw<any[]>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'provider_schedules'
        ORDER BY ordinal_position;
    `;
    
    console.log('provider_schedules columns:');
    console.log(columns);
    
    // Ver datos
    const data = await prisma.$queryRaw<any[]>`
        SELECT * FROM provider_schedules LIMIT 5;
    `;
    
    console.log('\nSample data:');
    console.log(JSON.stringify(data, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
