import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'ServyDemo123!';

function hash(password: string): string {
    return bcrypt.hashSync(password, 12);
}

async function main() {
    await prisma.earning.deleteMany();
    await prisma.job.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.quotation.deleteMany();
    await prisma.jobOffer.deleteMany();
    await prisma.serviceRequest.deleteMany();
    await prisma.whatsappSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.professional.deleteMany();
    await prisma.admin.deleteMany();

    await prisma.admin.create({
        data: {
            email: 'admin@servy.local',
            password_hash: hash(DEMO_PASSWORD),
            name: 'Admin Servy',
        },
    });

    const p1 = await prisma.professional.create({
        data: {
            name: 'Juan',
            last_name: 'Pérez',
            phone: '1111111111',
            email: 'juan@plomero.com',
            password_hash: hash(DEMO_PASSWORD),
            categories: ['Plomería'],
            zones: ['Capital Federal'],
            status: 'active',
            is_urgent: true,
            rating: 4.8,
            onboarding_completed: true,
        },
    });

    const p2 = await prisma.professional.create({
        data: {
            name: 'Carlos',
            last_name: 'Gómez',
            phone: '2222222222',
            email: 'carlos@electricista.com',
            password_hash: hash(DEMO_PASSWORD),
            categories: ['Electricidad'],
            zones: ['Capital Federal'],
            status: 'active',
            is_scheduled: true,
            rating: 4.5,
            onboarding_completed: true,
        },
    });

    const p3 = await prisma.professional.create({
        data: {
            name: 'Roberto',
            last_name: 'Díaz',
            phone: '3333333333',
            email: 'roberto@cerrajero.com',
            password_hash: hash(DEMO_PASSWORD),
            categories: ['Cerrajería'],
            zones: ['GBA Norte'],
            status: 'active',
            is_urgent: true,
            rating: 5.0,
            onboarding_completed: true,
        },
    });

    const u1 = await prisma.user.create({
        data: {
            phone: '5491100000000',
            name: 'María',
            last_name: 'López',
            address: 'Av. Corrientes 1234, Capital Federal',
            onboarding_completed: true,
        },
    });

    const req1 = await prisma.serviceRequest.create({
        data: {
            user_phone: u1.phone,
            category: 'Plomería',
            description: 'Pérdida de agua en el baño',
            address: 'Av. Corrientes 1234, Capital Federal',
            status: 'pending',
        },
    });

    const req2 = await prisma.serviceRequest.create({
        data: {
            user_phone: u1.phone,
            category: 'Electricidad',
            description: 'Cortocircuito en la cocina',
            address: 'Av. Corrientes 1234, Capital Federal',
            status: 'completed',
        },
    });

    const jobOffer = await prisma.jobOffer.create({
        data: {
            request_id: req2.id,
            professional_id: p2.id,
            status: 'accepted',
        },
    });

    const quotation = await prisma.quotation.create({
        data: {
            job_offer_id: jobOffer.id,
            items_json: [{ description: 'Arreglo cable', price: 5000 }],
            total_price: 5000,
            description: 'Cambio de cables',
            status: 'accepted',
        },
    });

    await prisma.payment.create({
        data: {
            quotation_id: quotation.id,
            amount: 5000,
            status: 'approved',
        },
    });

    await prisma.job.create({
        data: {
            quotation_id: quotation.id,
            status: 'completed',
        },
    });

    console.log('Seed OK. Demo password para admin y profesionales:', DEMO_PASSWORD);
    console.log('Admin:', 'admin@servy.local');
    console.log('Pros:', 'juan@plomero.com, carlos@electricista.com, roberto@cerrajero.com');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
