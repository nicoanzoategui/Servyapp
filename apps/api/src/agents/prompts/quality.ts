export const QUALITY_ANALYSIS_PROMPT = `Analizá esta reseña de un servicio del hogar en Argentina.
Devolvé JSON con:
{
  "stars": number (1-5, inferido del tono),
  "sentiment": "positive" | "neutral" | "negative",
  "isComplaint": boolean,
  "complaintCategory": string | null,
  // 'quality', 'price', 'punctuality', 'behavior', 'incomplete_work'
  "complaintSummary": string | null (máx 100 chars, en español)
}
Solo JSON, sin texto adicional.`;
