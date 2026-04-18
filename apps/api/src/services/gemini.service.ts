import { env } from '../utils/env';

const CATEGORIES = ['Plomería', 'Electricidad', 'Cerrajería', 'Gas', 'Aires acondicionados'];

export type UrgencyLevel = 'alta' | 'media' | 'baja';

export interface GeminiClassification {
    category: string | null;
    urgency: UrgencyLevel;
    understood: boolean;
    detected_problem: string;
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

Respondé SOLO con JSON válido sin markdown ni texto extra:
{
  "category": "la categoría que mejor aplica",
  "urgency": "alta | media | baja",
  "understood": true,
  "detected_problem": "descripción breve del problema en una línea"
}

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
                            maxOutputTokens: 150,
                        },
                    }),
                }
            );

            if (!response.ok) {
                const err = await response.text();
                console.error('[Gemini HTTP error]', response.status, err);
                return { category: null, urgency: 'media', understood: false, detected_problem: '' };
            }

            const data = await response.json();
            const text = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('[Gemini response]', text);
            const clean = text.replace(/```json|```/g, '').trim();

            const jsonMatch = clean.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('[Gemini] No se encontró JSON en la respuesta:', clean);
                return { category: null, urgency: 'media', understood: false, detected_problem: '' };
            }

            return JSON.parse(jsonMatch[0]);
        } catch (err) {
            console.error('Gemini error:', err);
            return { category: null, urgency: 'media', understood: false, detected_problem: '' };
        }
    }
}
