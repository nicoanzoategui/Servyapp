import { createHash } from 'crypto';

/** Spec FASE 6 — pricing_config activo (TTL 1h; invalidar al actualizar desde admin). */
export const PRICING_CONFIG_KEY = 'config:pricing:active';
export const PRICING_CONFIG_TTL_SEC = 3600;

/** Matching por zona/categoría (TTL 5 min). */
export function professionalsActiveKey(zone: string, category: string): string {
    const z = zone.trim().slice(0, 64) || 'all';
    const c = category.trim().slice(0, 64) || 'all';
    return `professionals:active:${z}:${c}`;
}
export const PROFESSIONALS_CACHE_TTL_SEC = 300;

/** Respuestas Gemini deterministas (hash del prompt). TTL 24h. */
export function geminiCacheKey(systemHint: string, userText: string): string {
    const h = createHash('sha256').update(`${systemHint}\n---\n${userText}`).digest('hex').slice(0, 40);
    return `gemini:cache:${h}`;
}
export const GEMINI_CACHE_TTL_SEC = 24 * 3600;
