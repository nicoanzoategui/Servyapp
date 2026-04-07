/** User text = JSON.stringify([{i,title,price},...]) */
export function buildPricingMaterialsPrompt(category: string, itemsJson: string): string {
    return `Sos un comprador técnico de materiales de construcción y ferretería en Argentina.
Categoría objetivo: "${category}".

Lista de publicaciones (índice i, título, precio ARS):
${itemsJson}

Tarea:
1) Elegí cuáles son publicaciones de MATERiales/repuestos relevantes para esa categoría (excluí servicios, alquiler de herramientas, cursos, publicidades genéricas).
2) Calculá un precio representativo: preferí promedio ponderado donde el peso refleja qué tan alineado está el ítem con la categoría (1.0 = muy alineado, 0.5 = razonable, 0 = excluir).

Respondé SOLO JSON válido:
{
  "usedIndices": number[],
  "weights": number[],
  "weightedAverage": number,
  "note": string
}
usedIndices: índices i incluidos. weights: mismo largo que usedIndices, pesos 0-1.
weightedAverage: número (ARS). Si no hay ítems útiles, usedIndices [] y weightedAverage 0.`;
}
