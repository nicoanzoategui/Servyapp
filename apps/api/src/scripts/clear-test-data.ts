import 'dotenv/config';
import { prisma } from '@servy/db';
import { TEST_EMAIL_DOMAIN, TEST_USER_PHONE_PREFIX, TEST_PRO_PHONE_PREFIX } from '../tests/fixtures/test-data';

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL es requerida');
        process.exit(1);
    }

    const testPros = await prisma.professional.findMany({
        where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
        select: { id: true, phone: true },
    });
    const proIds = testPros.map((p) => p.id);
    const proPhones = testPros.map((p) => p.phone);

    const testUsers = await prisma.user.findMany({
        where: {
            OR: [
                { phone: { startsWith: TEST_USER_PHONE_PREFIX } },
                { phone: { startsWith: `+${TEST_USER_PHONE_PREFIX}` } },
            ],
        },
        select: { phone: true },
    });
    const userPhones = testUsers.map((u) => u.phone);

    if (testPros.length === 0 && testUsers.length === 0) {
        console.log('No hay datos de prueba (@test.servy.lat / 549115555…). Nada que borrar.');
        return;
    }

    const srs = await prisma.serviceRequest.findMany({
        where: { user_phone: { in: userPhones } },
        select: { id: true },
    });
    const srIds = srs.map((s) => s.id);

    const offers = await prisma.jobOffer.findMany({
        where: {
            OR: [{ professional_id: { in: proIds } }, { request_id: { in: srIds } }],
        },
        select: { id: true },
    });
    const offerIds = offers.map((o) => o.id);

    const quos = await prisma.quotation.findMany({
        where: { job_offer_id: { in: offerIds } },
        select: { id: true },
    });
    const qids = quos.map((q) => q.id);

    const jobs = await prisma.job.findMany({
        where: { quotation_id: { in: qids } },
        select: { id: true },
    });
    const jobIds = jobs.map((j) => j.id);

    const sessionPhones = [...new Set([...userPhones, ...proPhones])];

    await prisma.$transaction(async (tx) => {
        await tx.earning.deleteMany({ where: { job_id: { in: jobIds } } });
        await tx.job.deleteMany({ where: { id: { in: jobIds } } });
        await tx.payment.deleteMany({ where: { quotation_id: { in: qids } } });
        await tx.quotation.deleteMany({ where: { id: { in: qids } } });
        await tx.jobOffer.deleteMany({ where: { id: { in: offerIds } } });
        await tx.serviceRequest.deleteMany({ where: { id: { in: srIds } } });
        await tx.whatsappSession.deleteMany({
            where: { phone: { in: sessionPhones } },
        });
        await tx.professionalSession.deleteMany({
            where: { phone: { in: proPhones } },
        });
        await tx.passwordToken.deleteMany({
            where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
        });
        await tx.user.deleteMany({
            where: {
                OR: [
                    { phone: { startsWith: TEST_USER_PHONE_PREFIX } },
                    { phone: { startsWith: `+${TEST_USER_PHONE_PREFIX}` } },
                ],
            },
        });
        await tx.professional.deleteMany({ where: { id: { in: proIds } } });
    });

    console.log(
        `Limpieza OK: ${testPros.length} profesionales, ${testUsers.length} usuarios, cadenas de jobs asociadas.`,
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
