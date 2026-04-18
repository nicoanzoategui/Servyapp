import { env } from '../utils/env';

const CATEGORIES = ['Plomería', 'Electricidad', 'Cerrajería', 'Gas', 'Aires acondicionados'];

export type UrgencyLevel = 'alta' | 'media' | 'baja';

export interface GeminiClassification {
    category: string | null;
    urgency: UrgencyLevel;
    understood: boolean;
}

/** Si el modelo corta el JSON (MAX_TOKENS), extrae lo mínimo con regex. */
function parseClassificationFromPartialJson(clean: string): GeminiClassification | null {
    const catM = clean.match(/"category"\s*:\s*"([^"]*)/);
    const category =
        catM?.[1]?.trim() ? catM[1].trim() : null;

    const urgM = clean.match(/"urgency"\s*:\s*"([a-z]*)/);
    const u = urgM?.[1];
    const urgency: UrgencyLevel = u === 'alta' || u === 'media' || u === 'baja' ? u : 'media';

    const undM = clean.match(/"understood"\s*:\s*(true|false)/);
    // Si el JSON se cortó antes de "understood" pero hay categoría, seguimos el flujo
    const understood = undM ? undM[1] === 'true' : !!category;

    if (!category && !urgM) return null;
    return { category, urgency, understood };
}

export class GeminiService {
    static async classifyProblem(description: string): Promise<GeminiClassification> {
        try {
            const prompt = `Sos un asistente de servicios del hogar argentino.
Tu trabajo es identificar el problema principal que describe el usuario.

Si el usuario describe múltiples problemas, elegí el MÁS URGENTE.
Si el problema es confuso o muy vago, igual intentá clasificarlo.
Solo marcá understood=false si el mensaje no tiene absolutamente nada que ver con servicios del hogar.

Categorías disponibles: ${CATEGORIES.join(', ')}

Niveles de urgencia:
- alta: sin gas, pérdida de gas, inundación, sin luz, puerta trabada, emergencia
- media: algo roto pero funciona, goteras, problemas menores
- baja: instalación nueva, mantenimiento, mejoras

Respondé SOLO con JSON válido en UNA LÍNEA sin espacios ni saltos:
{"category":"categoría","urgency":"alta|media|baja","understood":true}

Mensaje del usuario: "${description}"`;

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
                return { category: null, urgency: 'media', understood: false };
            }

            const data = await response.json();
            const candidate = (data as { candidates?: { finishReason?: string }[] })?.candidates?.[0];
            if (candidate?.finishReason === 'MAX_TOKENS') {
                console.warn('[Gemini] Respuesta truncada (MAX_TOKENS); se intenta parseo parcial');
            }
            const parts = (data as any)?.candidates?.[0]?.content?.parts || [];
            // Concatenar todos los parts por si viene fragmentado
            const text = parts.map((p: { text?: string }) => p.text || '').join('').trim();
            console.log('[Gemini response]', text);
            // Limpiar markdown y extraer JSON
            let clean = text.replace(/```json|```/g, '').trim();
            // Si empieza con texto antes del JSON, buscar desde la primera {
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
                    return {
                        category,
                        urgency,
                        understood: raw.understood === true,
                    };
                } catch {
                    /* intentar parseo parcial */
                }
            }

            const partial = parseClassificationFromPartialJson(clean);
            if (partial) {
                return partial;
            }

            console.error('[Gemini] No se pudo parsear la respuesta:', clean);
            return { category: null, urgency: 'media', understood: false };
        } catch (err) {
            console.error('Gemini error:', err);
            return { category: null, urgency: 'media', understood: false };
        }
    }
}
