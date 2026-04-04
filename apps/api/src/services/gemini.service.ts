import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../utils/env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const CATEGORIES = ['Plomería', 'Electricidad', 'Cerrajería', 'Gas', 'Aires acondicionados'];

export type UrgencyLevel = 'alta' | 'media' | 'baja';

export interface GeminiClassification {
    category: string | null;
    urgency: UrgencyLevel;
    understood: boolean;
    detected_problem: string | null;
}

function normalizeUrgency(raw: unknown): UrgencyLevel {
    const s = String(raw ?? 'media')
        .toLowerCase()
        .trim()
        .replace(/^["']|["']$/g, '');
    const parts = s.split('|').map((t) => t.trim());
    if (parts.length === 3 && parts[0] === 'alta' && parts[1] === 'media' && parts[2] === 'baja') {
        return 'media';
    }
    for (const t of parts) {
        if (t === 'alta' || t === 'media' || t === 'baja') return t;
    }
    if (s.startsWith('alta')) return 'alta';
    if (s.startsWith('baja')) return 'baja';
    if (s.startsWith('media')) return 'media';
    return 'media';
}

function safeUserSnippet(text: string, maxLen = 2000): string {
    return text.replace(/"/g, '\\"').replace(/\r?\n/g, ' ').slice(0, maxLen);
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
  "detected_problem": "descripción breve del problema principal en una línea"
}

Mensaje del usuario: "${safeUserSnippet(description)}"`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const clean = text.replace(/```json|```/g, '').trim();
            console.log('[Gemini response]', clean);
            const parsed = JSON.parse(clean) as Partial<GeminiClassification>;
            const dp = parsed.detected_problem;
            return {
                category: parsed.category != null && String(parsed.category).trim() !== '' ? String(parsed.category).trim() : null,
                urgency: normalizeUrgency(parsed.urgency),
                understood: Boolean(parsed.understood),
                detected_problem:
                    dp != null && String(dp).trim() !== '' ? String(dp).trim().slice(0, 500) : null,
            };
        } catch (err) {
            console.error('Gemini error:', err);
            return { category: null, urgency: 'media', understood: false, detected_problem: null };
        }
    }
}
