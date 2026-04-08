import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { prisma } from '@servy/db';
import {
    PROFESSIONAL_FIXTURES,
    USER_FIXTURES,
    SEED_MARKERS,
    splitFullName,
    professionalTestEmail,
    professionalTestPhone,
    userTestPhone,
    normalizePhone,
} from '../tests/fixtures/test-data';

const TEST_PASSWORD = 'Test1234!';

async function upsertProfessionals() {
    const hash = bcrypt.hashSync(TEST_PASSWORD, 10);
    for (let i = 0; i < PROFESSIONAL_FIXTURES.length; i++) {
        const f = PROFESSIONAL_FIXTURES[i]!;
        const idx = i + 1;
        const { name, last_name } = splitFullName(f.fullName);
        const email = professionalTestEmail(f.fullName);
        const phone = professionalTestPhone(idx);
        const dni = `3000000${String(idx).padStart(2, '0')}`;

        await prisma.professional.upsert({
            where: { email },
            update: {
                name,
                last_name,
                phone,
                password_hash: hash,
                dni,
                categories: [f.category],
                zones: [f.zone],
                is_urgent: f.isUrgent,
                is_scheduled: f.isScheduled,
                rating: f.rating,
                status: 'active',
                onboarding_completed: true,
                onboarding_step: 1,
            },
            create: {
                name,
                last_name,
                phone,
                email,
                password_hash: hash,
                dni,
                categories: [f.category],
                zones: [f.zone],
                is_urgent: f.isUrgent,
                is_scheduled: f.isScheduled,
                rating: f.rating,
                status: 'active',
                onboarding_completed: true,
                onboarding_step: 1,
            },
        });
    }
}

async function upsertUsers() {
    for (let i = 0; i < USER_FIXTURES.length; i++) {
        const u = USER_FIXTURES[i]!;
        const { name, last_name } = splitFullName(u.fullName);
        const phone = normalizePhone(u.phoneDisplay);

        await prisma.user.upsert({
            where: { phone },
            update: {
                name,
                last_name,
                address: u.address,
                onboarding_completed: true,
            },
            create: {
                phone,
                name,
                last_name,
                address: u.address,
                onboarding_completed: true,
            },
        });
    }
}

async function findProByEmailFromFixture(fullName: string) {
    const email = professionalTestEmail(fullName);
    const p = await prisma.professional.findUnique({ where: { email } });
    if (!p) throw new Error(`Profesional no encontrado: ${email}`);
    return p;
}

async function ensureScenarioPending() {
    const existing = await prisma.serviceRequest.findFirst({
        where: { description: { contains: SEED_MARKERS.pending } },
    });
    if (existing) return;

    const phone = userTestPhone(1);
    await prisma.serviceRequest.create({
        data: {
            user_phone: phone,
            category: 'plomeria',
            description: `Perdida de agua en cocina ${SEED_MARKERS.pending}`,
            address: USER_FIXTURES[0]!.address,
            status: 'pending',
            photos: [],
        },
    });
}

async function ensureScenarioQuoted() {
    const existing = await prisma.serviceRequest.findFirst({
        where: { description: { contains: SEED_MARKERS.quoted } },
    });
    if (existing) return;

    const pro = await findProByEmailFromFixture('Carlos Rodríguez');
    const phone = userTestPhone(2);
    const sr = await prisma.serviceRequest.create({
        data: {
            user_phone: phone,
            category: 'plomeria',
            description: `Reparación canilla ${SEED_MARKERS.quoted}`,
            address: USER_FIXTURES[1]!.address,
            status: 'pending',
            photos: [],
        },
    });

    const offer = await prisma.jobOffer.create({
        data: {
            request_id: sr.id,
            professional_id: pro.id,
            priority: 'normal',
            status: 'quoted',
        },
    });

    await prisma.quotation.create({
        data: {
            job_offer_id: offer.id,
            items_json: [{ description: 'Mano de obra y materiales', price: 45000 }],
            total_price: 45000,
            description: 'Cambio de válvula y sellado',
            estimated_duration: '2h',
            status: 'pending',
        },
    });
}

async function ensureScenarioConfirmed() {
    const existing = await prisma.serviceRequest.findFirst({
        where: { description: { contains: SEED_MARKERS.confirmed } },
    });
    if (existing) return;

    const pro = await findProByEmailFromFixture('Diego Fernández');
    const phone = userTestPhone(3);
    const sr = await prisma.serviceRequest.create({
        data: {
            user_phone: phone,
            category: 'plomeria',
            description: `Desagüe tapado ${SEED_MARKERS.confirmed}`,
            address: USER_FIXTURES[2]!.address,
            status: 'pending',
            photos: [],
            scheduled_slot: 'mañana',
        },
    });

    const offer = await prisma.jobOffer.create({
        data: {
            request_id: sr.id,
            professional_id: pro.id,
            priority: 'urgent',
            status: 'accepted',
        },
    });

    const q = await prisma.quotation.create({
        data: {
            job_offer_id: offer.id,
            items_json: [{ description: 'Destapación', price: 38000 }],
            total_price: 38000,
            status: 'accepted',
        },
    });

    await prisma.payment.create({
        data: {
            quotation_id: q.id,
            amount: 38000,
            status: 'approved',
            mp_payment_id: `seed_${q.id}`,
            paid_at: new Date(),
        },
    });

    await prisma.job.create({
        data: {
            quotation_id: q.id,
            status: 'confirmed',
        },
    });
}

async function ensureScenarioCompleted() {
    const existing = await prisma.serviceRequest.findFirst({
        where: { description: { contains: SEED_MARKERS.completed } },
    });
    if (existing) return;

    const pro = await findProByEmailFromFixture('Martín López');
    const phone = userTestPhone(4);
    const sr = await prisma.serviceRequest.create({
        data: {
            user_phone: phone,
            category: 'plomeria',
            description: `Instalación termofusión ${SEED_MARKERS.completed}`,
            address: USER_FIXTURES[3]!.address,
            status: 'pending',
            photos: [],
        },
    });

    const offer = await prisma.jobOffer.create({
        data: {
            request_id: sr.id,
            professional_id: pro.id,
            priority: 'normal',
            status: 'accepted',
        },
    });

    const q = await prisma.quotation.create({
        data: {
            job_offer_id: offer.id,
            items_json: [{ description: 'Trabajo terminado', price: 52000 }],
            total_price: 52000,
            status: 'accepted',
        },
    });

    await prisma.payment.create({
        data: {
            quotation_id: q.id,
            amount: 52000,
            status: 'approved',
            mp_payment_id: `seed_done_${q.id}`,
            paid_at: new Date(),
        },
    });

    await prisma.job.create({
        data: {
            quotation_id: q.id,
            status: 'completed',
            rating: 5,
            completed_at: new Date(),
        },
    });
}

async function ensureScenarioCancelled() {
    const existing = await prisma.serviceRequest.findFirst({
        where: { description: { contains: SEED_MARKERS.cancelled } },
    });
    if (existing) return;

    const pro = await findProByEmailFromFixture('Pablo García');
    const phone = userTestPhone(5);
    const sr = await prisma.serviceRequest.create({
        data: {
            user_phone: phone,
            category: 'plomeria',
            description: `Corte de agua programado ${SEED_MARKERS.cancelled}`,
            address: USER_FIXTURES[4]!.address,
            status: 'pending',
            photos: [],
        },
    });

    const offer = await prisma.jobOffer.create({
        data: {
            request_id: sr.id,
            professional_id: pro.id,
            priority: 'normal',
            status: 'accepted',
        },
    });

    const q = await prisma.quotation.create({
        data: {
            job_offer_id: offer.id,
            items_json: [{ description: 'Servicio', price: 12000 }],
            total_price: 12000,
            status: 'accepted',
        },
    });

    await prisma.payment.create({
        data: {
            quotation_id: q.id,
            amount: 12000,
            status: 'approved',
            mp_payment_id: `seed_can_${q.id}`,
            paid_at: new Date(),
        },
    });

    await prisma.job.create({
        data: {
            quotation_id: q.id,
            status: 'cancelled',
        },
    });
}

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL es requerida');
        process.exit(1);
    }

    await upsertProfessionals();
    await upsertUsers();
    await ensureScenarioPending();
    await ensureScenarioQuoted();
    await ensureScenarioConfirmed();
    await ensureScenarioCompleted();
    await ensureScenarioCancelled();

    console.log('Seed idempotente OK: 20 profesionales, 20 usuarios, 5 escenarios de job.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
