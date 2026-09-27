/** Defaults alineados a VISIT_FEE_SCHEDULED / NIGHT_SHIFT_SURCHARGE de la API. */
export const VISIT_FEE_SCHEDULED = 39000;
export const NIGHT_SHIFT_SURCHARGE = 20000;

export function moneyArs(n: number | null | undefined): string {
    if (n == null || Number.isNaN(n)) return '—';
    return `$${Number(n).toLocaleString('es-AR')}`;
}

/** Recargo nocturno solo en programado; urgente ($55.000) no debe disparar esta nota. */
export function nightSurchargeAmount(
    visitFee: number | null | undefined,
    priority?: string | null,
    scheduledSlot?: string | null
): number | null {
    if (visitFee == null || Number.isNaN(visitFee)) return null;
    const slot = scheduledSlot || '';
    const looksNight = slot.includes('18 a 21') || slot.includes('tarifa nocturna');
    const scheduledOverBase = priority === 'scheduled' && visitFee > VISIT_FEE_SCHEDULED;
    if (!looksNight && !scheduledOverBase) return null;
    const extra = visitFee > VISIT_FEE_SCHEDULED ? visitFee - VISIT_FEE_SCHEDULED : NIGHT_SHIFT_SURCHARGE;
    return extra > 0 ? extra : null;
}

export function visitFeeNightNote(
    visitFee: number | null | undefined,
    priority?: string | null,
    scheduledSlot?: string | null
): string | null {
    const extra = nightSurchargeAmount(visitFee, priority, scheduledSlot);
    if (extra == null) return null;
    return `incluye ${moneyArs(extra)} recargo nocturno 18-21hs`;
}
