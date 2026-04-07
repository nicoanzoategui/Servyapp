export const RECRUITMENT_SCORE_PROMPT = `Analizá este perfil/publicación de Facebook y calificá al candidato
como potencial proveedor independiente de servicios del hogar en Argentina.

Criterios:
+3 si menciona explícitamente su oficio
+2 si publica fotos de trabajos realizados
+2 si menciona zona geográfica específica
+2 si tiene reseñas o recomendaciones
+1 si parece activo (publicación reciente)

Descalificar si: empresa grande, perfil falso, ya saturado de clientes.

Devolvé JSON:
{
  "score": number (1-10),
  "category": string,
  "zone": string | null,
  "isIndependent": boolean,
  "reasons": string[],
  "disqualified": boolean,
  "disqualifyReason": string | null
}
Solo JSON.`;

export function recruitmentAdPrompt(category: string, zone: string, averageIncome: number): string {
    return `Generá un anuncio de Facebook/Instagram para reclutar proveedores de Servy.
Tono: de igual a igual, directo, sin corporativo.
NO decir "unite a nuestra familia" ni "oportunidad única".
SÍ hablar de ingresos concretos y autonomía.

Categoría: ${category} · Zona: ${zone}
Ingreso promedio activos en esa categoría: $${averageIncome}/mes

Devolvé JSON:
{
  "headline": string (máx 40 chars),
  "body": string (máx 125 chars),
  "cta": "Registrarme" | "Saber más" | "Empezar ahora"
}
Solo JSON.`;
}
