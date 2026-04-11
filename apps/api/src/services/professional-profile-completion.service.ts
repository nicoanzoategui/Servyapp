import { prisma } from '@servy/db';
import { WhatsAppService } from './whatsapp.service';

export type ProfileCompletionItem = { id: string; label: string; done: boolean };

export type ProfileCompletionResult = {
    items: ProfileCompletionItem[];
    complete: boolean;
    percent: number;
    missing_labels: string[];
};

type ProFields = {
    name: string;
    last_name: string;
    dni: string | null;
    address: string | null;
    postal_code: string | null;
    categories: string[];
    zones: string[];
    is_urgent: boolean;
    is_scheduled: boolean;
    bio: string | null;
    skills: string[];
    cbu_alias: string | null;
    mp_alias: string | null;
    payout_account_type: string | null;
    payout_institution: string | null;
};

function dniOk(dni: string | null): boolean {
    const d = String(dni || '').replace(/\D/g, '');
    return d.length >= 7 && d.length <= 10;
}

/** Evalúa perfil operativo (ofertas WhatsApp) a partir de datos en DB + documentos. */
export function evaluateProfileCompletion(p: ProFields, documentKinds: Set<string>): ProfileCompletionResult {
    const items: ProfileCompletionItem[] = [
        {
            id: 'bio',
            label: 'Descripción pública (mín. 30 caracteres)',
            done: (p.bio || '').trim().length >= 30,
        },
        {
            id: 'skills',
            label: 'Al menos una skill',
            done: Array.isArray(p.skills) && p.skills.filter(Boolean).length > 0,
        },
        { id: 'nombre', label: 'Nombre', done: !!(p.name || '').trim() },
        { id: 'apellido', label: 'Apellido', done: !!(p.last_name || '').trim() },
        { id: 'dni', label: 'DNI', done: dniOk(p.dni) },
        { id: 'direccion', label: 'Dirección', done: !!(p.address || '').trim() },
        { id: 'cp', label: 'Código postal', done: !!(p.postal_code || '').trim() },
        { id: 'zonas', label: 'Zonas de trabajo', done: Array.isArray(p.zones) && p.zones.filter(Boolean).length > 0 },
        {
            id: 'categorias',
            label: 'Categorías / oficios',
            done: Array.isArray(p.categories) && p.categories.filter(Boolean).length > 0,
        },
        {
            id: 'modalidad',
            label: 'Modalidad (urgencias y/o turnos)',
            done: p.is_urgent || p.is_scheduled,
        },
        {
            id: 'cobro',
            label: 'CBU/CVU/alias o alias Mercado Pago',
            done: !!(p.cbu_alias || '').trim() || !!(p.mp_alias || '').trim(),
        },
        {
            id: 'tipo_cuenta',
            label: 'Tipo de cuenta / medio de cobro',
            done: !!(p.payout_account_type || '').trim(),
        },
        {
            id: 'entidad',
            label: 'Banco o billetera',
            done: !!(p.payout_institution || '').trim(),
        },
        {
            id: 'dni_frente',
            label: 'DNI frente (archivo)',
            done: documentKinds.has('dni_front'),
        },
        {
            id: 'dni_dorso',
            label: 'DNI dorso (archivo)',
            done: documentKinds.has('dni_back'),
        },
    ];

    const doneCount = items.filter((i) => i.done).length;
    const complete = doneCount === items.length;
    const percent = items.length ? Math.round((doneCount / items.length) * 100) : 0;
    const missing_labels = items.filter((i) => !i.done).map((i) => i.label);

    return { items, complete, percent, missing_labels };
}

export function buildProfileCompletionFromDbRow(p: ProFields, docs: { kind: string }[]): ProfileCompletionResult {
    const kinds = new Set(docs.map((d) => String(d.kind)));
    return evaluateProfileCompletion(p, kinds);
}

/**
 * Persiste `profile_operational_complete` y, si recién quedó completo, envía WhatsApp una sola vez.
 */
export async function recomputeProfileOperationalCompleteAndNotify(professionalId: string): Promise<ProfileCompletionResult> {
    const row = await prisma.professional.findUnique({
        where: { id: professionalId },
        select: {
            name: true,
            last_name: true,
            dni: true,
            address: true,
            postal_code: true,
            categories: true,
            zones: true,
            is_urgent: true,
            is_scheduled: true,
            bio: true,
            skills: true,
            cbu_alias: true,
            mp_alias: true,
            payout_account_type: true,
            payout_institution: true,
            phone: true,
            profile_ready_whatsapp_sent_at: true,
            profile_operational_complete: true,
            documents: { select: { kind: true } },
        },
    });

    if (!row) {
        return {
            items: [],
            complete: false,
            percent: 0,
            missing_labels: ['Profesional no encontrado'],
        };
    }

    const {
        documents,
        profile_ready_whatsapp_sent_at,
        phone,
        name,
        profile_operational_complete: _prev,
        ...rest
    } = row;
    const proFields: ProFields = {
        name,
        last_name: rest.last_name,
        dni: rest.dni,
        address: rest.address,
        postal_code: rest.postal_code,
        categories: rest.categories,
        zones: rest.zones,
        is_urgent: rest.is_urgent,
        is_scheduled: rest.is_scheduled,
        bio: rest.bio,
        skills: rest.skills,
        cbu_alias: rest.cbu_alias,
        mp_alias: rest.mp_alias,
        payout_account_type: rest.payout_account_type,
        payout_institution: rest.payout_institution,
    };
    const result = evaluateProfileCompletion(proFields, new Set(documents.map((d) => String(d.kind))));

    await prisma.professional.update({
        where: { id: professionalId },
        data: { profile_operational_complete: result.complete },
    });

    if (result.complete && !profile_ready_whatsapp_sent_at && phone) {
        const first = (name || '').trim() || 'Hola';
        const text =
            `✅ *¡Listo, ${first}!* Completaste tu perfil en Servy.\n\n` +
            `Ya podés recibir solicitudes de trabajo por WhatsApp y usar el portal para cotizar y gestionar trabajos. ¡Éxitos con Servy! 💪`;

        try {
            await WhatsAppService.sendTextMessage(phone, text);
            await prisma.professional.update({
                where: { id: professionalId },
                data: { profile_ready_whatsapp_sent_at: new Date() },
            });
        } catch (e) {
            console.error('[profile-completion] WhatsApp notify failed:', e);
        }
    }

    return result;
}
