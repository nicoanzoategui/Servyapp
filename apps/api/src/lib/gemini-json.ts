import { env } from '../utils/env';

const MODEL = 'gemini-2.5-flash';

function geminiApiKey(): string {
    const alt = env.GOOGLE_AI_API_KEY?.trim();
    return alt && alt.length > 0 ? alt : env.GEMINI_API_KEY;
}

export interface GeminiJsonResult<T> {
    ok: boolean;
    data?: T;
    raw?: string;
    tokensUsed?: number;
    error?: string;
}

/** POST generateContent y parsea el primer objeto JSON del texto. */
export async function geminiGenerateJson<T>(systemHint: string, userText: string): Promise<GeminiJsonResult<T>> {
    const prompt = `${systemHint}\n\n---\n${userText}`;
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${geminiApiKey()}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
                }),
            }
        );

        if (!response.ok) {
            const err = await response.text();
            return { ok: false, error: `${response.status} ${err}` };
        }

        const data = (await response.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
            usageMetadata?: { totalTokenCount?: number };
        };
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const tokensUsed = data?.usageMetadata?.totalTokenCount;
        const clean = text.replace(/```json|```/g, '').trim();
        const jsonMatch = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (!jsonMatch) {
            return { ok: false, raw: text, error: 'No JSON in response', tokensUsed };
        }
        return { ok: true, data: JSON.parse(jsonMatch[0]) as T, raw: text, tokensUsed };
    } catch (e) {
        return { ok: false, error: String(e) };
    }
}
