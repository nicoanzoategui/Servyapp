export function buildRetentionPrompt(input: {
    name: string;
    category: string;
    daysInactive: number;
    lastJobDate: string;
    rating: string;
    riskReasons: string;
}): string {
    return `Sos el equipo de Servy escribiéndole a un proveedor.
Tono: cercano, de igual a igual, sin sonar corporativo.
Máximo 3 líneas. Voseo argentino.
No menciones "retención" ni "plataforma".

Datos del proveedor:
- Nombre: ${input.name}
- Rubro: ${input.category}
- Días inactivo: ${input.daysInactive}
- Último trabajo: ${input.lastJobDate}
- Rating actual: ${input.rating}
- Motivo de riesgo: ${input.riskReasons}

Escribí un mensaje de WhatsApp natural y específico.
Ejemplos de tono:
- "Carlos, hace 10 días que no te vemos. ¿Todo bien?"
- "Martín, tus últimas reseñas bajaron un poco. ¿Pasó algo?"
Solo el mensaje, sin comillas.`;
}
