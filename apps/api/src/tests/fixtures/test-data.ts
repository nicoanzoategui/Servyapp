/** Datos compartidos entre seed, clear y simulador (seed_spec.md). */

export const TEST_EMAIL_DOMAIN = '@test.servy.lat';
export const TEST_USER_PHONE_PREFIX = '549115555';
/** +5491100000XX (XX 01–20) sin prefijo +. */
export const TEST_PRO_PHONE_PREFIX = '5491100000';

/** Quita `whatsapp:`, `+` y espacios — mismo criterio que el webhook Twilio. */
export function normalizePhone(raw: string): string {
    return raw
        .replace(/^whatsapp:/i, '')
        .replace(/^\+/, '')
        .replace(/\s/g, '')
        .trim();
}

/** E.164 con + para header Twilio `From`. */
export function toWhatsappFrom(raw: string): string {
    const n = normalizePhone(raw);
    return n.startsWith('+') ? `whatsapp:${n}` : `whatsapp:+${n}`;
}

export type ProfessionalFixture = {
    fullName: string;
    category: string;
    zone: string;
    rating: number;
    isUrgent: boolean;
    isScheduled: boolean;
};

export const PROFESSIONAL_FIXTURES: ProfessionalFixture[] = [
    { fullName: 'Carlos Rodríguez', category: 'plomeria', zone: 'gba_norte', rating: 4.9, isUrgent: true, isScheduled: true },
    { fullName: 'Martín López', category: 'plomeria', zone: 'gba_norte', rating: 4.7, isUrgent: false, isScheduled: true },
    { fullName: 'Diego Fernández', category: 'plomeria', zone: 'caba_resto', rating: 4.8, isUrgent: true, isScheduled: true },
    { fullName: 'Pablo García', category: 'plomeria', zone: 'caba_resto', rating: 4.5, isUrgent: true, isScheduled: false },
    { fullName: 'Sergio Torres', category: 'electricidad', zone: 'gba_norte', rating: 4.9, isUrgent: true, isScheduled: true },
    { fullName: 'Nicolás Pérez', category: 'electricidad', zone: 'gba_norte', rating: 4.6, isUrgent: false, isScheduled: true },
    { fullName: 'Alejandro Díaz', category: 'electricidad', zone: 'caba_resto', rating: 4.8, isUrgent: true, isScheduled: true },
    { fullName: 'Federico Ruiz', category: 'electricidad', zone: 'caba_premium', rating: 4.7, isUrgent: true, isScheduled: false },
    { fullName: 'Roberto Sánchez', category: 'gas', zone: 'gba_norte', rating: 4.9, isUrgent: true, isScheduled: true },
    { fullName: 'Gustavo Moreno', category: 'gas', zone: 'caba_resto', rating: 4.8, isUrgent: false, isScheduled: true },
    { fullName: 'Hernán Jiménez', category: 'gas', zone: 'caba_premium', rating: 4.7, isUrgent: true, isScheduled: true },
    { fullName: 'Oscar Romero', category: 'cerrajeria', zone: 'gba_norte', rating: 4.8, isUrgent: true, isScheduled: false },
    { fullName: 'Luis Vargas', category: 'cerrajeria', zone: 'caba_resto', rating: 4.6, isUrgent: true, isScheduled: false },
    { fullName: 'Juan Medina', category: 'cerrajeria', zone: 'caba_premium', rating: 4.9, isUrgent: true, isScheduled: false },
    { fullName: 'Marcelo Castro', category: 'aires', zone: 'gba_norte', rating: 4.7, isUrgent: false, isScheduled: true },
    { fullName: 'Andrés Ortega', category: 'aires', zone: 'caba_resto', rating: 4.8, isUrgent: false, isScheduled: true },
    { fullName: 'Ricardo Flores', category: 'aires', zone: 'caba_premium', rating: 4.9, isUrgent: true, isScheduled: true },
    { fullName: 'Eduardo Silva', category: 'plomeria', zone: 'gba_norte', rating: 4.5, isUrgent: true, isScheduled: true },
    { fullName: 'Claudio Reyes', category: 'electricidad', zone: 'caba_resto', rating: 4.6, isUrgent: false, isScheduled: true },
    { fullName: 'Miguel Herrera', category: 'gas', zone: 'gba_norte', rating: 4.4, isUrgent: true, isScheduled: true },
];

export type UserFixture = {
    fullName: string;
    /** Teléfono legible (+ opcional); en DB se guarda normalizado. */
    phoneDisplay: string;
    address: string;
};

export const USER_FIXTURES: UserFixture[] = [
    { fullName: 'Ana Martínez', phoneDisplay: '+5491155550001', address: 'Av. Santa Fe 1234, Pilar' },
    { fullName: 'Laura González', phoneDisplay: '+5491155550002', address: 'Belgrano 567, Pilar' },
    { fullName: 'Sofía Ramírez', phoneDisplay: '+5491155550003', address: 'San Martín 890, Del Viso' },
    { fullName: 'Valentina Torres', phoneDisplay: '+5491155550004', address: 'Rivadavia 234, Pilar' },
    { fullName: 'Camila López', phoneDisplay: '+5491155550005', address: 'Mitre 678, Tortuguitas' },
    { fullName: 'Martina García', phoneDisplay: '+5491155550006', address: 'Sarmiento 345, Manuel Alberti' },
    { fullName: 'Julia Fernández', phoneDisplay: '+5491155550007', address: 'Corrientes 1567, Pilar' },
    { fullName: 'Florencia Díaz', phoneDisplay: '+5491155550008', address: 'Las Heras 234, Del Viso' },
    { fullName: 'Romina Sánchez', phoneDisplay: '+5491155550009', address: 'Libertad 890, Pilar' },
    { fullName: 'Natalia Pérez', phoneDisplay: '+5491155550010', address: 'Moreno 456, Tortuguitas' },
    { fullName: 'Diego Castillo', phoneDisplay: '+5491155550011', address: 'Av. del Libertador 789, Pilar' },
    { fullName: 'Facundo Ríos', phoneDisplay: '+5491155550012', address: 'Reconquista 345, Del Viso' },
    { fullName: 'Lucía Benitez', phoneDisplay: '+5491155550013', address: 'Avenida Italia 678, Pilar' },
    { fullName: 'Tomás Aguirre', phoneDisplay: '+5491155550014', address: 'San Lorenzo 123, Tortuguitas' },
    { fullName: 'Agustina Molina', phoneDisplay: '+5491155550015', address: 'Hipólito Yrigoyen 456, Pilar' },
    { fullName: 'Bruno Suárez', phoneDisplay: '+5491155550016', address: 'Av. Colón 789, Manuel Alberti' },
    { fullName: 'Manuela Castro', phoneDisplay: '+5491155550017', address: 'Güemes 234, Del Viso' },
    { fullName: 'Ignacio Peralta', phoneDisplay: '+5491155550018', address: 'Av. San Martín 567, Pilar' },
    { fullName: 'Julieta Vega', phoneDisplay: '+5491155550019', address: 'Lavalle 890, Tortuguitas' },
    { fullName: 'Matías Heredia', phoneDisplay: '+5491155550020', address: 'Independencia 123, Pilar' },
];

export function splitFullName(full: string): { name: string; last_name: string } {
    const i = full.indexOf(' ');
    if (i === -1) return { name: full, last_name: '-' };
    return { name: full.slice(0, i), last_name: full.slice(i + 1).trim() };
}

export function professionalTestEmail(fullName: string): string {
    const local = fullName
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\s+/, '.')
        .replace(/[^a-z0-9.]/g, '');
    return `${local}${TEST_EMAIL_DOMAIN}`;
}

export function professionalTestPhone(index1Based: number): string {
    return `${TEST_PRO_PHONE_PREFIX}${String(index1Based).padStart(2, '0')}`;
}

export function userTestPhone(index1Based: number): string {
    return `${TEST_USER_PHONE_PREFIX}${String(index1Based).padStart(4, '0')}`;
}

/** Marcadores en `description` de service_requests para jobs de demostración. */
export const SEED_MARKERS = {
    pending: '[seed:job_pending]',
    quoted: '[seed:job_quoted]',
    confirmed: '[seed:job_confirmed]',
    completed: '[seed:job_completed]',
    cancelled: '[seed:job_cancelled]',
} as const;

/** Primer usuario / profesional de prueba (normalizados) para escenarios multi-rol. */
export const DEFAULT_SIM_USER_PHONE = userTestPhone(1);
export const DEFAULT_SIM_PRO_PHONE = professionalTestPhone(1);

export type ScenarioStep =
    | { message: string; delay: number }
    | { phone: 'user' | 'professional'; message: string; delay: number };

export const SCENARIO_DEFINITIONS: Record<string, ScenarioStep[]> = {
    full_flow: [
        { message: 'necesito un plomero', delay: 1000 },
        { message: '1', delay: 2000 },
        { message: '1', delay: 1000 },
        { message: 'Aceptar', delay: 3000 },
    ],
    onboarding: [
        { message: 'hola', delay: 1000 },
        { message: 'Juan Pérez', delay: 2000 },
        { message: 'Av. Corrientes 1234, Pilar', delay: 2000 },
    ],
    reject_and_retry: [
        { message: 'necesito electricista', delay: 1000 },
        { message: '1', delay: 2000 },
        { message: '2', delay: 1000 },
        { message: 'Rechazar', delay: 3000 },
        { message: '2', delay: 2000 },
        { message: 'Aceptar', delay: 3000 },
    ],
    mediated_messaging: [
        { phone: 'professional', message: 'estoy yendo', delay: 1000 },
        { phone: 'user', message: 'perfecto gracias', delay: 2000 },
        { phone: 'professional', message: 'llego en 10 minutos', delay: 2000 },
    ],
    imprevisto: [{ phone: 'professional', message: 'tuve un imprevisto', delay: 1000 }],
};
