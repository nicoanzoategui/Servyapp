// Precio fijo de la visita diagnóstica
export const DIAGNOSTIC_VISIT_PRICE = 35000; // $35.000 ARS

// Comisiones según tipo de servicio
export const COMMISSION_RATES = {
  diagnostic_visit: 0.15,    // 15% en visita diagnóstica
  diagnostic_repair: 0.05,   // 5% en arreglo post-visita
  one_shot: 0.15,            // 15% en servicios one-shot
} as const;

// Categorías que usan modelo diagnóstico
export const DIAGNOSTIC_CATEGORIES = [
  'Plomería',
  'Electricidad',
  'Gas',
  'Cerrajería',
  'Aires acondicionados',
] as const;

// Categorías que usan modelo one-shot (cotización automática)
export const ONE_SHOT_CATEGORIES = [
  'Lavado de Autos',
  'Limpieza de Piscinas',
  'Jardinería',
] as const;

// Precios fijos para servicios one-shot
export const ONE_SHOT_PRICING = {
  'Lavado de Autos': {
    chico: 15000,
    mediano: 18000,
    grande: 22000,
  },
  'Limpieza de Piscinas': {
    '0-20m2': 25000,
    '20-40m2': 35000,
    '40m2+': 50000,
  },
  'Jardinería': {
    basico: 20000,
    completo: 35000,
  },
} as const;

// Precios de suscripciones (descuento por recurrencia)
export const SUBSCRIPTION_PRICING = {
  'Lavado de Autos': {
    weekly: 12000,    // -20% descuento
    biweekly: 15000,  // sin descuento
  },
  'Limpieza de Piscinas': {
    weekly: 20000,    // -20% descuento
    biweekly: 25000,  // sin descuento
  },
  'Jardinería': {
    weekly: 16000,    // -20% descuento
    biweekly: 20000,  // sin descuento
  },
} as const;

// Helper para determinar tipo de servicio
export function getServiceType(category: string): 'diagnostic' | 'one_shot' {
  if (DIAGNOSTIC_CATEGORIES.includes(category as any)) {
    return 'diagnostic';
  }
  if (ONE_SHOT_CATEGORIES.includes(category as any)) {
    return 'one_shot';
  }
  // Default a diagnostic para categorías no reconocidas
  return 'diagnostic';
}

// Helper para calcular comisión
export function calculateCommission(
  serviceType: 'diagnostic' | 'one_shot',
  phase: 'visit' | 'repair',
  totalPrice: number
): number {
  if (serviceType === 'diagnostic') {
    const rate = phase === 'visit' 
      ? COMMISSION_RATES.diagnostic_visit 
      : COMMISSION_RATES.diagnostic_repair;
    return Math.round(totalPrice * rate);
  }
  
  // One-shot siempre usa la misma comisión
  return Math.round(totalPrice * COMMISSION_RATES.one_shot);
}
