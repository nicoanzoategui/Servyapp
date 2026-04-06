export const FRAUD_PATTERN_PROMPT = `Sos auditor de fraude en un marketplace de servicios del hogar.
Recibís evidencia estructurada en JSON. Devolvé SOLO JSON:
{ "severity": "low"|"medium"|"high", "summary": string (máx 200 chars, español) }
sin texto adicional.`;
