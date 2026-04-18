import { prisma } from '@servy/db';

async function main() {
    // Obtener todos los schedules
    const schedules = await prisma.$queryRaw<any[]>`
        SELECT id, work_days FROM provider_schedules;
    `;
    
    console.log('Schedules encontrados:', schedules.length);
    
    // Arreglar cada uno
    for (const schedule of schedules) {
        try {
            // Convertir work_days a formato correcto
            let daysArray: string[] = [];
            
            if (Array.isArray(schedule.work_days)) {
                daysArray = schedule.work_days;
            } else if (typeof schedule.work_days === 'string') {
                daysArray = [schedule.work_days];
            }
            
            // Actualizar con el formato correcto
            await prisma.$executeRaw`
                UPDATE provider_schedules 
                SET work_days = ${daysArray}::text[]
                WHERE id = ${schedule.id};
            `;
            
            console.log(`✅ Fixed schedule ${schedule.id}`);
        } catch (err) {
            console.error(`❌ Error fixing ${schedule.id}:`, err);
        }
    }
    
    console.log('Terminado');
}

main()
    .then(() => process.exit(0))
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
