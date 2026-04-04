import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../utils/env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
            const prompt = `Sos un asistente de servicios del hogar. Analizá esta descripción de problema y respondé SOLO con un JSON válido sin markdown:
{
  "category": "una de estas opciones: ${CATEGORIES.join(', ')} o null si no corresponde",
  "urgency": "alta si es urgente (pérdida de gas, inundación, sin luz, puerta trabada, etc), media si es algo roto pero funciona, baja si es instalación o mantenimiento",
  "understood": true si entendiste el problema, false si es muy confuso
}

Descripción del usuario: "${description.replace(/"/g, '\\"')}"`;

            const result = await model.generateContent(prompt);
            const text = result.response.text().trim();
            const clean = text.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(clean) as GeminiClassification;
            return {
                category: parsed.category ?? null,
                urgency: parsed.urgency ?? 'media',
                understood: Boolean(parsed.understood),
            };
        } catch (err) {
            console.error('Gemini error:', err);
            return { category: null, urgency: 'media', understood: false };
        }
    }
}
