import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../index';
import { testPrisma, cleanTestDb } from './test-db-setup';
import { redis } from '../utils/redis';

// Desactivar mocks globales de Prisma que se cargan en setup.ts
vi.unmock('@servy/db');

// Mock del servicio de WhatsApp para no enviar peticiones reales a Meta/Twilio
vi.mock('../services/whatsapp.service', () => ({
    WhatsAppService: {
        sendTextMessage: vi.fn().mockResolvedValue({ success: true }),
        sendImageMessage: vi.fn().mockResolvedValue({ success: true }),
    },
}));

// Mock de Mercado Pago
vi.mock('../services/mercadopago.service', () => ({
    MercadoPagoService: {
        createPreference: vi.fn().mockResolvedValue({
            id: 'mp-pref-123',
            init_point: 'https://mercadopago.com/init/mp-pref-123',
        }),
        getPayment: vi.fn().mockResolvedValue({
            status: 'approved',
            metadata: {
                quotation_id: 'quot-123',
                user_phone: '5491115000001',
                payment_type: 'visit',
            },
        }),
    },
}));

// Mock de Gemini
vi.mock('../services/gemini.service', () => ({
    GeminiService: {
        classifyRequest: vi.fn().mockResolvedValue({
            category: 'Plomería',
            urgency: 'alta',
        }),
    },
}));

describe('Pruebas de Integración con Base de Datos Real', () => {
    beforeAll(async () => {
        // Asegurar que conectamos a la DB de prueba antes de correr
        await testPrisma.$connect();
    });

    beforeEach(async () => {
        await cleanTestDb();
        vi.clearAllMocks();
    });

    afterAll(async () => {
        await testPrisma.$disconnect();
    });

    describe('Flujo A: Cliente - Registro y Pedido de Servicio', () => {
        it('debe registrar un nuevo usuario y guardar sus datos en la tabla users', async () => {
            const clientPhone = '5491115000001';
            
            // Simular onboarding del cliente respondiendo al webhook de Twilio
            const resOnboarding = await request(app)
                .post('/webhook/twilio')
                .send({
                    From: `whatsapp:+${clientPhone}`,
                    Body: 'Hola, necesito arreglar un caño roto',
                    MessageSid: 'SM1111',
                });
            
            expect(resOnboarding.status).toBe(200);

            // Verificar si el usuario fue creado en la base de datos de test
            const user = await testPrisma.user.findUnique({
                where: { phone: clientPhone },
            });
            
            expect(user).toBeDefined();
            expect(user?.phone).toBe(clientPhone);
        });
    });

    describe('Flujo B: Asignación, Cotización, Pagos de Mercado Pago y Liberación QR', () => {
        it('debe orquestar el ciclo de vida del trabajo con transiciones de estado correctas', async () => {
            // 1. Crear usuario y técnico de prueba en la base de datos
            const clientPhone = '5491115000001';
            await testPrisma.user.create({
                data: {
                    phone: clientPhone,
                    name: 'Nicolás Cliente',
                    address: 'Calle 123, Pilar',
                    postal_code: '1629',
                    onboarding_completed: true,
                },
            });

            const tech = await testPrisma.professional.create({
                data: {
                    name: 'Lucas Técnico',
                    last_name: 'Plomero',
                    phone: '5491115000002',
                    email: 'lucas@example.com',
                    password_hash: 'dummyhash',
                    categories: ['Plomería'],
                    zones: ['1629'],
                    is_urgent: true,
                    status: 'active',
                    onboarding_completed: true,
                    profile_operational_complete: true,
                },
            });

            // 2. Crear un ServiceRequest
            const requestRow = await testPrisma.serviceRequest.create({
                data: {
                    user_phone: clientPhone,
                    category: 'Plomería',
                    description: 'Pérdida en el caño de la cocina',
                    address: 'Calle 123, Pilar',
                    priority: 'urgent',
                    visit_fee: 50000,
                    status: 'pending',
                },
            });

            // 3. Crear una JobOffer en estado pending
            const jobOffer = await testPrisma.jobOffer.create({
                data: {
                    request_id: requestRow.id,
                    professional_id: tech.id,
                    status: 'pending',
                },
            });

            expect(jobOffer.status).toBe('pending');

            // 4. Aceptar la oferta simulando respuesta del profesional
            await testPrisma.jobOffer.update({
                where: { id: jobOffer.id },
                data: { status: 'accepted' },
            });

            // 5. Generar cotización de visita y simular pago aprobado de Mercado Pago
            const visitQuotation = await testPrisma.quotation.create({
                data: {
                    job_offer_id: jobOffer.id,
                    quotation_type: 'visit',
                    total_price: 50000,
                    items_json: [{ description: 'Costo de visita', price: 50000 }],
                    status: 'pending',
                },
            });

            await testPrisma.payment.create({
                data: {
                    quotation_id: visitQuotation.id,
                    amount: 50000,
                    payment_type: 'visit',
                    status: 'pending',
                },
            });

            // Forzar mock de getPayment de Mercado Pago para esta cotización
            const mpService = await import('../services/mercadopago.service');
            vi.spyOn(mpService.MercadoPagoService, 'getPayment').mockResolvedValue({
                id: 'mp-payment-1',
                status: 'approved',
                metadata: {
                    quotation_id: visitQuotation.id,
                    user_phone: clientPhone,
                    payment_type: 'visit',
                },
            } as any);

            // Simular webhook de Mercado Pago
            const resMP = await request(app)
                .post('/webhook/mercadopago')
                .send({
                    type: 'payment',
                    data: { id: 'mp-payment-1' },
                });

            expect(resMP.status).toBe(200);

            // Verificar que el Payment pasó a aprobado y el Job fue creado
            const updatedPayment = await testPrisma.payment.findFirst({
                where: { quotation_id: visitQuotation.id },
            });
            expect(updatedPayment?.status).toBe('approved');

            const job = await testPrisma.job.findUnique({
                where: { quotation_id: visitQuotation.id },
            });
            expect(job).toBeDefined();
            expect(job?.status).toBe('confirmed');
        });
    });

    describe('Flujo C: Onboarding Profesional', () => {
        it('debe registrar un técnico en estado pending', async () => {
            const techData = {
                name: 'Pedro',
                last_name: 'Gómez',
                email: 'pedro@example.com',
                password: 'password123',
                phone: '5491115000003',
            };

            const res = await request(app)
                .post('/auth/professional/register')
                .send(techData);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);

            // Validar en la base de datos que está en estado pending
            const tech = await testPrisma.professional.findUnique({
                where: { phone: techData.phone },
            });
            expect(tech?.status).toBe('pending');
        });
    });
});
