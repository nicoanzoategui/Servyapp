import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { geminiGenerateJson } from '../lib/gemini-json';
import { insertAgentLog } from '../lib/agent-log';
import { QUALITY_ANALYSIS_PROMPT } from './prompts/quality';
import type { QualityGeminiAnalysisResult } from './types';

function parseStars(text: string): number | null {
    const stars = (text.match(/⭐/g) || []).length;
    if (stars >= 1 && stars <= 5) return stars;
    const m = text.trim().match(/^([1-5])(\s|$)/);
    if (m) return parseInt(m[1]!, 10);
    const w = text.toLowerCase().match(/^(\d)\s*estrella/);
    if (w) return parseInt(w[1]!, 10);
    return null;
}

async function upsertProviderRating(providerId: string, stars: number): Promise<void> {
    await prisma.$executeRawUnsafe(
        `INSERT INTO provider_ratings (provider_id, total_reviews, average_stars, last_review_at)
         VALUES ($1, 1, $2, now())
         ON CONFLICT (provider_id) DO UPDATE SET
           total_reviews = provider_ratings.total_reviews + 1,
           average_stars = (provider_ratings.average_stars * provider_ratings.total_reviews + $2) / (provider_ratings.total_reviews + 1),
           last_review_at = now()`,
        providerId,
        stars
    );
    await prisma.$executeRawUnsafe(
        `UPDATE professionals SET rating = (
           SELECT average_stars::float FROM provider_ratings WHERE provider_id = $1
         ) WHERE id = $1`,
        providerId
    );
}

export async function runQualityFollowupBatch(): Promise<void> {
    const rows = await prisma.$queryRaw<
        { job_id: string; provider_id: string; user_phone: string; user_name: string | null }[]
    >`
        SELECT j.id AS job_id, jo.professional_id AS provider_id, sr.user_phone AS user_phone,
               u.name AS user_name
        FROM jobs j
        JOIN quotations q ON q.id = j.quotation_id
        JOIN job_offers jo ON jo.id = q.job_offer_id
        JOIN service_requests sr ON sr.id = jo.request_id
        JOIN users u ON u.phone = sr.user_phone
        LEFT JOIN quality_reviews qr ON qr.job_id = j.id
        WHERE j.status = 'completed'
          AND j.completed_at IS NOT NULL
          AND j.completed_at <= now() - interval '48 hours'
          AND j.completed_at >= now() - interval '14 days'
          AND qr.id IS NULL
        LIMIT 25
    `;

    for (const row of rows) {
        const name = row.user_name || 'Hola';
        const text =
            `${name} 👋\n` +
            `¿Cómo te fue con el trabajo que completaste?\n\n` +
            `Contanos brevemente o respondé con una estrella:\n` +
            `⭐ Malo\n⭐⭐ Regular\n⭐⭐⭐ Bien\n⭐⭐⭐⭐ Muy bien\n⭐⭐⭐⭐⭐ Excelente`;

        await WhatsAppService.sendTextMessage(row.user_phone, text);

        await prisma.$executeRawUnsafe(
            `INSERT INTO quality_reviews (job_id, provider_id, user_phone, asked_at)
             VALUES ($1, $2, $3, now())`,
            row.job_id,
            row.provider_id,
            row.user_phone
        );

        await insertAgentLog({
            agent: 'quality',
            event: 'review_asked',
            level: 'info',
            entityType: 'job',
            entityId: row.job_id,
        });
    }
}

/**
 * Si el usuario tiene una reseña pendiente, procesa el mensaje y devuelve true.
 */
export async function processQualityUserReply(userPhone: string, body: string): Promise<boolean> {
    const pending = await prisma.$queryRaw<{ id: string; job_id: string; provider_id: string }[]>`
        SELECT id, job_id, provider_id
        FROM quality_reviews
        WHERE user_phone = ${userPhone}
          AND responded_at IS NULL
          AND asked_at IS NOT NULL
        ORDER BY asked_at DESC
        LIMIT 1
    `;
    const p = pending[0];
    if (!p) return false;

    const trimmed = body.trim();
    let stars = parseStars(trimmed);
    let analysis: QualityGeminiAnalysisResult | null = null;
    let tokensUsed: number | undefined;

    if (stars == null) {
        const g = await geminiGenerateJson<QualityGeminiAnalysisResult>(QUALITY_ANALYSIS_PROMPT, trimmed);
        tokensUsed = g.tokensUsed;
        if (g.ok && g.data) {
            analysis = g.data;
            stars = Math.min(5, Math.max(1, Math.round(Number(g.data.stars) || 3)));
        } else {
            stars = 3;
            analysis = {
                stars,
                sentiment: 'neutral',
                isComplaint: false,
                complaintCategory: null,
                complaintSummary: null,
            };
        }
    } else {
        analysis = {
            stars,
            sentiment: stars <= 2 ? 'negative' : stars >= 4 ? 'positive' : 'neutral',
            isComplaint: stars <= 2,
            complaintCategory: stars <= 2 ? 'quality' : null,
            complaintSummary: stars <= 2 ? 'Calificación baja' : null,
        };
    }

    const isComplaint = Boolean(analysis?.isComplaint);
    const sentiment = analysis?.sentiment ?? 'neutral';

    await prisma.$executeRawUnsafe(
        `UPDATE quality_reviews SET
            responded_at = now(),
            raw_response = $2,
            stars = $3,
            sentiment = $4,
            is_complaint = $5,
            complaint_category = $6,
            complaint_summary = $7,
            gemini_analysis = $8::jsonb,
            escalated = $5,
            escalated_at = CASE WHEN $5 THEN now() ELSE escalated_at END
         WHERE id = $1`,
        p.id,
        trimmed,
        stars,
        sentiment,
        isComplaint,
        analysis?.complaintCategory ?? null,
        analysis?.complaintSummary ?? null,
        JSON.stringify(analysis ?? {})
    );

    await upsertProviderRating(p.provider_id, stars!);

    if (isComplaint) {
        await prisma.$executeRawUnsafe(
            `INSERT INTO fraud_alerts (entity_type, entity_id, alert_type, severity, description, evidence)
             VALUES ('job', $1, 'rating_manipulation', 'medium', $2, $3::jsonb)`,
            p.job_id,
            'Reclamo post-servicio escalado desde calidad',
            JSON.stringify({ quality_review_id: p.id, summary: analysis?.complaintSummary })
        );
        await WhatsAppService.sendTextMessage(
            userPhone,
            'Gracias por contarnos, lo tomamos muy en serio 🙏\nUn integrante del equipo de Servy va a revisar tu caso en las próximas 24hs.'
        );
    } else {
        await WhatsAppService.sendTextMessage(userPhone, '¡Gracias por tu feedback! Nos ayuda a mejorar 💚');
    }

    await insertAgentLog({
        agent: 'quality',
        event: 'review_recorded',
        level: isComplaint ? 'warn' : 'info',
        entityType: 'job',
        entityId: p.job_id,
        details: { stars, isComplaint },
        tokensUsed: tokensUsed ?? null,
    });

    return true;
}
