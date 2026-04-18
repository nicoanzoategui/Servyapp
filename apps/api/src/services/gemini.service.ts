import { env } from '../utils/env';

const CATEGORIES = ['Plomería', 'Electricidad', 'Cerrajería', 'Gas', 'Aires acondicionados'];

export type UrgencyLevel = 'alta' | 'media' | 'baja';

export interface GeminiClassification {
    category: string | null;
    urgency: UrgencyLevel;
    understood: boolean;
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
                            maxOutputTokens: 256, // Aumentar de 150 a 256
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
            if (!jsonMatch) {
                console.error('[Gemini] No se encontró JSON en la respuesta:', clean);
                return { category: null, urgency: 'media', understood: false };
            }

            const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
            const u = raw.urgency;
            const urgency: UrgencyLevel =
                u === 'alta' || u === 'media' || u === 'baja' ? u : 'media';
            const category =
                typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : null;
            return {
                category,
                urgency,
                understood: raw.understood === true,
            };
        } catch (err) {
            console.error('Gemini error:', err);
            return { category: null, urgency: 'media', understood: false };
        }
    }
}
