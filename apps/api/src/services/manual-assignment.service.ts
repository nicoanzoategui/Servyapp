import { prisma, type Professional } from '@servy/db';
import { WhatsAppService } from './whatsapp.service';
import { StorageService } from './storage.service';
import { ProfessionalMatchingService } from './matching.service';
import { categoryMatches } from './service-categories';
import { DOCUMENT_KIND_LABELS, type ProfessionalDocumentKindId } from './professional-documents.service';

const DOC_SHARE_TTL_SEC = 60 * 60 * 24 * 7;
const SHARE_KIND_ORDER: ProfessionalDocumentKindId[] = [
    'dni_front',
    'dni_back',
    'criminal_record',
    'certification',
];

export type AssignTechnicianResult =
    | { ok: true; jobOffer: NonNullable<Awaited<ReturnType<typeof loadOffer>>> }
    | { ok: false; status: number; message: string };

async function loadOffer(id: string) {
    return prisma.jobOffer.findUnique({
        where: { id },
        include: {
            professional: true,
            service_request: { include: { user: true } },
            quotations: { include: { payment: true, job: true } },
        },
    });
}

function isImageContentType(contentType: string): boolean {
    return contentType.startsWith('image/');
}

function formatClientChosenSchedule(args: {
    scheduled_slot: string | null;
    scheduled_date: Date | null;
    offerSchedule: string | null;
}): string {
    const slot = (args.scheduled_slot || args.offerSchedule || '').trim();
    const datePart = args.scheduled_date
        ? new Intl.DateTimeFormat('es-AR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone: 'America/Argentina/Buenos_Aires',
          }).format(args.scheduled_date)
        : '';
    if (datePart && slot) return `${datePart} · ${slot}`;
    return slot || datePart || 'A coordinar';
}

async function notifyClientTechnicianAssigned(args: {
    userPhone: string;
    professional: Professional;
    category: string | null;
    scheduled_slot: string | null;
    scheduled_date: Date | null;
    offerSchedule: string | null;
}): Promise<void> {
    const { userPhone, professional, category } = args;
    const fullName = ProfessionalMatchingService.formatProName(professional);
    const cat = category?.trim() || 'Servicio';
    const when = formatClientChosenSchedule({
        scheduled_slot: args.scheduled_slot,
        scheduled_date: args.scheduled_date,
        offerSchedule: args.offerSchedule,
    });

    const docs = await prisma.professionalDocument.findMany({
        where: { professional_id: professional.id },
    });
    const byKind = new Map(docs.map((d) => [d.kind, d]));

    const linkLines: string[] = [];
    const imageDocs: { url: string; label: string }[] = [];

    for (const kind of SHARE_KIND_ORDER) {
        const doc = byKind.get(kind);
        if (!doc) continue;
        const label = DOCUMENT_KIND_LABELS[kind];
        const url = await StorageService.getSignedUrl(doc.storage_key, DOC_SHARE_TTL_SEC);
        if (isImageContentType(doc.content_type)) {
            imageDocs.push({ url, label });
            linkLines.push(`• ${label}: adjunto`);
        } else {
            linkLines.push(`• ${label}: ${url}`);
        }
    }

    const docsBlock =
        linkLines.length > 0
            ? `\nTe compartimos su documentación para tu tranquilidad:\n${linkLines.join('\n')}\n`
            : '\n(Aún no hay documentación cargada de este técnico.)\n';

    await WhatsAppService.sendTextMessage(
        userPhone,
        `✅ *¡Ya tenemos tu técnico asignado!*\n\n━━━━━━━━━━━━━━━\n👤 *${fullName}*\n🔧 ${cat}\n📅 ${when}\n━━━━━━━━━━━━━━━\n${docsBlock}\nUn rato antes de la visita te confirmamos que el técnico está en camino.`
    );

    for (const img of imageDocs) {
        await WhatsAppService.sendImageMessage(userPhone, img.url);
    }
}

async function notifyTechnicianAssigned(args: {
    professional: Professional;
    request: { address: string | null; description: string | null; scheduled_slot: string | null };
    schedule: string | null;
    jobId: string | null;
}): Promise<void> {
    const { professional, request, schedule, jobId } = args;
    const franja = request.scheduled_slot || schedule || 'a coordinar';
    const addr = request.address || 'Ver portal';
    const desc = request.description?.slice(0, 120) || 'Ver portal';
    const portal = jobId ? `\n🔗 _portal.servy.lat/jobs/${jobId}_` : '';

    await WhatsAppService.sendTextMessage(
        professional.phone,
        `💼 *Te asignaron una visita*\n\nEl cliente ya pagó. Coordiná el horario exacto con él.\n\n━━━━━━━━━━━━━━━\n📍 ${addr}\n📋 ${desc}\n📅 ${franja}\n━━━━━━━━━━━━━━━${portal}\n\n*Comandos:* _estoy yendo_ · _llego en X minutos_ · _no encuentro la dirección_`
    );
}

export async function assignTechnicianToServiceRequest(
    serviceRequestId: string,
    professionalId: string
): Promise<AssignTechnicianResult> {
    const request = await prisma.serviceRequest.findUnique({
        where: { id: serviceRequestId },
        include: {
            user: true,
            job_offers: {
                orderBy: { created_at: 'desc' },
                include: {
                    quotations: { include: { payment: true, job: true } },
                },
            },
        },
    });
    if (!request) {
        return { ok: false, status: 404, message: 'Pedido no encontrado' };
    }

    const visitPaid = request.job_offers.some((o) =>
        o.quotations.some((q) => q.quotation_type === 'visit' && q.payment?.status === 'approved')
    );
    if (!visitPaid && request.status !== 'visit_paid') {
        return { ok: false, status: 400, message: 'El pedido todavía no tiene la visita pagada' };
    }

    const offer =
        request.job_offers.find((o) => o.professional_id == null) ||
        request.job_offers.find((o) => o.status === 'accepted' || o.status === 'held') ||
        request.job_offers[0];
    if (!offer) {
        return { ok: false, status: 400, message: 'El pedido no tiene JobOffer para asignar' };
    }
    if (offer.professional_id && offer.professional_id !== professionalId) {
        return { ok: false, status: 409, message: 'Este pedido ya tiene un técnico asignado' };
    }

    const professional = await prisma.professional.findUnique({ where: { id: professionalId } });
    if (!professional) {
        return { ok: false, status: 404, message: 'Técnico no encontrado' };
    }
    if (professional.status !== 'active') {
        return { ok: false, status: 400, message: 'El técnico no está activo' };
    }
    if (request.category && !categoryMatches(professional.categories, request.category)) {
        return { ok: false, status: 400, message: 'El técnico no cubre la categoría de este pedido' };
    }

    await prisma.jobOffer.update({
        where: { id: offer.id },
        data: { professional_id: professional.id, status: 'accepted' },
    });
    await prisma.serviceRequest.update({
        where: { id: request.id },
        data: { status: 'technician_assigned' },
    });

    const visitJob = offer.quotations.find((q) => q.quotation_type === 'visit')?.job;
    const jobId = visitJob?.id ?? null;

    await notifyClientTechnicianAssigned({
        userPhone: request.user_phone,
        professional,
        category: request.category,
        scheduled_slot: request.scheduled_slot,
        scheduled_date: request.scheduled_date,
        offerSchedule: offer.schedule,
    });
    await notifyTechnicianAssigned({
        professional,
        request,
        schedule: offer.schedule,
        jobId,
    });

    const updated = await loadOffer(offer.id);
    if (!updated) {
        return { ok: false, status: 500, message: 'No se pudo leer el JobOffer actualizado' };
    }
    return { ok: true, jobOffer: updated };
}
