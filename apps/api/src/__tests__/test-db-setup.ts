import { PrismaClient } from '@servy/db';

const testDbUrl = process.env.DATABASE_URL || 'postgresql://servy:password@localhost:5432/servydb_test?schema=public';

export const testPrisma = new PrismaClient({
    datasources: {
        db: {
            url: testDbUrl,
        },
    },
});

export async function cleanTestDb() {
    // Truncate tables in correct order of dependency
    const tables = [
        'earnings',
        'jobs',
        'payments',
        'quotations',
        'job_offers',
        'service_requests',
        'professional_documents',
        'provider_schedules',
        'professionals',
        'users',
    ];

    for (const table of tables) {
        try {
            await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        } catch (error) {
            // Table might not exist yet during initial setup
        }
    }
}
