import { foldText } from './service-categories';

const MIN_REPAIR_AMOUNT = 1000;
const MAX_REPAIR_AMOUNT = 50_000_000;

function amountInRange(n: number): boolean {
    return Number.isFinite(n) && n >= MIN_REPAIR_AMOUNT && n <= MAX_REPAIR_AMOUNT && Number.isInteger(n);
}

/** Comando explícito: presupuesto / cotización / cotizacion. */
export function isRepairQuoteCommand(text: string): boolean {
    const n = foldText(text)
        .replace(/[.,!?¡¿]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return n === 'presupuesto' || n === 'cotizacion';
}

/**
 * Acepta 180000, $180.000, 180.000, 180,000.
 * No interpreta "180 mil" ni montos con decimales sueltos.
 */
export function parseRepairAmount(raw: string): number | null {
    let t = foldText(raw).replace(/\$/g, '').replace(/\s/g, '');
    t = t.replace(/ars|pesos?/g, '');

    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(t)) {
        const n = parseInt(t.split(',')[0].replace(/\./g, ''), 10);
        return amountInRange(n) ? n : null;
    }
    if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(t)) {
        const n = parseInt(t.split('.')[0].replace(/,/g, ''), 10);
        return amountInRange(n) ? n : null;
    }
    if (/^\d+$/.test(t)) {
        const n = parseInt(t, 10);
        return amountInRange(n) ? n : null;
    }
    return null;
}
