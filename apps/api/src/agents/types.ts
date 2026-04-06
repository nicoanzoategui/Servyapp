/**
 * Tipos compartidos para los 6 agentes operativos (pricing, availability, quality, retention, fraud, forecast).
 * Ver servy_agents_master_spec.md
 */

// ---------------------------------------------------------------------------
// Agente logs (todos)
// ---------------------------------------------------------------------------

export type AgentLogAgentName =
    | 'pricing'
    | 'availability'
    | 'quality'
    | 'retention'
    | 'fraud'
    | 'forecast';

export type AgentLogLevel = 'info' | 'warn' | 'error';

// ---------------------------------------------------------------------------
// Agente 1 — Pricing
// ---------------------------------------------------------------------------

export interface QuoteParams {
    category: string;
    jobType: string;
    zone: string;
    datetime: Date;
}

export interface QuoteMultipliers {
    zone: number;
    time: number;
    demand: number;
}

export interface QuoteResult {
    rangeMin: number;
    rangeMax: number;
    recommended: number;
    demandLevel: string | null;
    demandLabel: string | null;
    multipliers: QuoteMultipliers;
    providerNetMin: number;
    providerNetMax: number;
    providerNetRecommended: number;
    validUntil: Date;
}

export type MaterialSource = 'mercadolibre' | string;

// ---------------------------------------------------------------------------
// Agente 2 — Disponibilidad
// ---------------------------------------------------------------------------

export type ProviderLiveStatus =
    | 'active'
    | 'active_no_location'
    | 'inactive'
    | 'busy';

export type CheckinScheduledState = 'pending' | 'sent' | 'responded';

export type SessionCheckinResponse = 'available' | 'unavailable' | 'later' | 'no_response';

export type CheckoutTrigger = 'provider_message' | 'auto_timeout' | 'admin';

export interface ProviderLocationPayload {
    lat: number;
    lng: number;
    updatedAt: string;
}

export interface ProviderSessionPayload {
    sessionId: string;
    startedAt: string;
    jobsCount: number;
}

// ---------------------------------------------------------------------------
// Agente 3 — Calidad
// ---------------------------------------------------------------------------

export type ReviewSentiment = 'positive' | 'neutral' | 'negative';

export type ComplaintCategory =
    | 'quality'
    | 'price'
    | 'punctuality'
    | 'behavior'
    | 'incomplete_work'
    | string;

/** Respuesta esperada del análisis Gemini (texto libre del usuario). */
export interface QualityGeminiAnalysisResult {
    stars: number;
    sentiment: ReviewSentiment;
    isComplaint: boolean;
    complaintCategory: string | null;
    complaintSummary: string | null;
}

// ---------------------------------------------------------------------------
// Agente 4 — Retención
// ---------------------------------------------------------------------------

export type ProviderRiskLevel = 'healthy' | 'watch' | 'at_risk' | 'churned';

export interface RiskThresholds {
    daysInactive?: number;
    ratingDelta?: number;
    jobs30d?: number;
}

export type RiskLevelsConfig = Record<
    Exclude<ProviderRiskLevel, 'healthy'>,
    RiskThresholds
>;

// ---------------------------------------------------------------------------
// Agente 5 — Fraude
// ---------------------------------------------------------------------------

export type FraudEntityType = 'provider' | 'user' | 'job';

export type FraudSeverity = 'low' | 'medium' | 'high';

export type FraudAlertStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

/** Tipos de alerta alineados al spec (extensibles). */
export type FraudAlertType =
    | 'price_always_max'
    | 'impossible_time'
    | 'repeat_user_same_service'
    | 'rating_manipulation'
    | 'payment_anomaly'
    | string;

// ---------------------------------------------------------------------------
// Agente 6 — Forecast
// ---------------------------------------------------------------------------

export type ForecastRecommendation = 'sufficient' | 'recruit_providers' | 'launch_campaign';

export interface ForecastResult {
    predictedRequests: number;
    confidence: number;
    availableProviders: number;
    coverageGap: number;
    recommendation: ForecastRecommendation;
    reasoning: string;
}

export type ExpansionPriority = 'low' | 'medium' | 'high';

export type ExpansionOpportunityStatus = 'detected' | 'campaigning' | 'covered' | 'dismissed';

// ---------------------------------------------------------------------------
// DB row shapes útiles (lectura desde SQL sin Prisma)
// ---------------------------------------------------------------------------

export interface AgentLogRow {
    id: string;
    created_at: Date;
    agent: string;
    event: string;
    level: AgentLogLevel;
    entity_type: string | null;
    entity_id: string | null;
    details: unknown;
    duration_ms: number | null;
    tokens_used: number | null;
}
