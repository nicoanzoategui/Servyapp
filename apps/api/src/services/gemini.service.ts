import { env } from '../utils/env';
import {
    SERVICE_CATEGORIES,
    classifyProblemByKeywords,
    finalizeClassification,
    type UrgencyLevel,
} from './service-categories';

export type { UrgencyLevel };

export interface GeminiClassification {
    category: string | null;
    urgency: UrgencyLevel;
    understood: boolean;
}

/** Si el modelo corta el JSON (MAX_TOKENS), extrae lo mínimo con regex. */
function parseClassificationFromPartialJson(clean: string): GeminiClassification | null {
    const catM = clean.match(/"category"\s*:\s*"([^"]*)/);
    const category = catM?.[1]?.trim() ? catM[1].trim() : null;

    const urgM = clean.match(/"urgency"\s*:\s*"([a-z]*)/);
    const u = urgM?.[1];
    const urgency: UrgencyLevel = u === 'alta' || u === 'media' || u === 'baja' ? u : 'media';

    const undM = clean.match(/"understood"\s*:\s*(true|false)/);
    const understood = undM ? undM[1] === 'true' : !!category;

    if (!category && !urgM) return null;
    return { category, urgency, understood };
}

function normalizeGeminiAudioMime(raw: string): string {
    const base = String(raw || '')
        .split(';')[0]
        .trim()
        .toLowerCase();
    if (base === 'audio/mpeg' || base === 'audio/mp3') return 'audio/mp3';
    if (base === 'audio/ogg' || base === 'audio/opus' || base === 'application/ogg') return 'audio/ogg';
    if (base === 'audio/wav' || base === 'audio/x-wav' || base === 'audio/wave') return 'audio/wav';
    if (base === 'audio/mp4' || base === 'audio/m4a' || base === 'audio/x-m4a' || base === 'audio/aac') return 'audio/aac';
    if (base === 'audio/flac') return 'audio/flac';
    if (base.startsWith('audio/')) return base;
    return 'audio/ogg';
}

export type GeminiTranscript = {
    transcript: string;
    summary: string;
};

export class GeminiService {
    static async classifyProblem(description: string): Promise<GeminiClassification> {
        const fallback = () => classifyProblemByKeywords(description);

        try {
            const prompt = `Sos un asistente de servicios del hogar argentino.
Tu trabajo es identificar el problema principal que describe el usuario.

Si el usuario describe múltiples problemas, elegí el MÁS URGENTE.
Si el problema es confuso o muy vago, igual intentá clasificarlo.
Solo marcá understood=false si el mensaje no tiene absolutamente nada que ver con servicios del hogar.

Categorías disponibles: ${SERVICE_CATEGORIES.join(', ')}

Niveles de urgencia:
- alta: sin gas, pérdida de gas, inundación, sin luz, puerta trabada, emergencia
- media: algo roto pero funciona, goteras, problemas menores
- baja: instalación nueva, mantenimiento, mejoras

Respondé SOLO con JSON válido en UNA LÍNEA sin espacios ni saltos:
{"category":"categoría","urgency":"alta|media|baja","understood":true}

Mensaje del usuario: "${description.replace(/"/g, "'")}"`;

            const key = env.GOOGLE_AI_API_KEY?.trim() || env.GEMINI_API_KEY;
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 512,
                        },
                    }),
                }
            );

            if (!response.ok) {
                const err = await response.text();
                console.error('[Gemini HTTP error]', response.status, err);
                return fallback();
            }

            const data = await response.json();
            const candidate = (data as { candidates?: { finishReason?: string }[] })?.candidates?.[0];
            if (candidate?.finishReason === 'MAX_TOKENS') {
                console.warn('[Gemini] Respuesta truncada (MAX_TOKENS); se intenta parseo parcial');
            }
            const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]
                ?.content?.parts || [];
            const text = parts.map((p) => p.text || '').join('').trim();
            console.log('[Gemini response]', text);
            let clean = text.replace(/```json|```/g, '').trim();
            const firstBrace = clean.indexOf('{');
            if (firstBrace > 0) {
                clean = clean.slice(firstBrace);
            }

            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
                    const u = raw.urgency;
                    const urgency: UrgencyLevel =
                        u === 'alta' || u === 'media' || u === 'baja' ? u : 'media';
                    const category =
                        typeof raw.category === 'string' && raw.category.trim()
                            ? raw.category.trim()
                            : null;
                    const understood = raw.understood === false ? false : raw.understood === true || !!category;
                    return finalizeClassification(description, { category, urgency, understood });
                } catch {
                    /* intentar parseo parcial */
                }
            }

            const partial = parseClassificationFromPartialJson(clean);
            if (partial) {
                return finalizeClassification(description, partial);
            }

            console.error('[Gemini] No se pudo parsear la respuesta:', clean);
            return fallback();
        } catch (err) {
            console.error('Gemini error:', err);
            return fallback();
        }
    }

    /** Transcribe una nota de voz (Twilio/WhatsApp) con el mismo modelo y API key de classifyProblem. */
    static async transcribeAudio(buffer: Buffer, mimeType: string): Promise<GeminiTranscript | null> {
        if (!buffer?.length) return null;
        const key = env.GOOGLE_AI_API_KEY?.trim() || env.GEMINI_API_KEY;
        const mime = normalizeGeminiAudioMime(mimeType);
        const prompt = `Transcribí esta nota de voz de WhatsApp en español rioplatense (Argentina).
Devolvé el texto COMPLETO, fiel, sin resumir ni omitir detalles.
También armá un resumen de UNA línea (máx. 120 caracteres) para confirmarle al cliente lo que se entendió.

Respondé SOLO con JSON válido en una línea:
{"transcript":"texto completo","summary":"una línea"}`;

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    { inline_data: { mime_type: mime, data: buffer.toString('base64') } },
                                    { text: prompt },
                                ],
                            },
                        ],
                        generationConfig: {
                            temperature: 0.1,
                            maxOutputTokens: 2048,
                        },
                    }),
                }
            );
            if (!response.ok) {
                const err = await response.text();
                console.error('[Gemini transcribe HTTP error]', response.status, err);
                return null;
            }
            const data = await response.json();
            const parts =
                (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content
                    ?.parts || [];
            const text = parts
                .map((p) => p.text || '')
                .join('')
                .trim();
            let clean = text.replace(/```json|```/g, '').trim();
            const firstBrace = clean.indexOf('{');
            if (firstBrace >= 0) clean = clean.slice(firstBrace);
            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
                    const transcript = typeof raw.transcript === 'string' ? raw.transcript.trim() : '';
                    const summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';
                    if (transcript) {
                        return {
                            transcript,
                            summary: summary || transcript.slice(0, 120),
                        };
                    }
                } catch {
                    /* usar texto plano */
                }
            }
            if (clean.length > 8) {
                return { transcript: clean, summary: clean.slice(0, 120) };
            }
            return null;
        } catch (err) {
            console.error('[Gemini transcribe error]', err);
            return null;
        }
    }
}
