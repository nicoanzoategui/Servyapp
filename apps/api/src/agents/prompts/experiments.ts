export const EXPERIMENT_EVAL_PROMPT = `Evaluá el experimento A/B descrito. Devolvé solo JSON:
{
  "success": boolean,
  "summary": string (máx 300 chars, español),
  "nextAction": "continue" | "pause" | "rollout"
}`;
