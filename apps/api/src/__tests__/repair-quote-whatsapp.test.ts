import { describe, expect, it } from 'vitest';
import { isRepairQuoteCommand, parseRepairAmount } from '../services/repair-quote-parse';

describe('isRepairQuoteCommand', () => {
    it('accepts presupuesto and cotización aliases', () => {
        expect(isRepairQuoteCommand('presupuesto')).toBe(true);
        expect(isRepairQuoteCommand('Presupuesto!')).toBe(true);
        expect(isRepairQuoteCommand('cotización')).toBe(true);
        expect(isRepairQuoteCommand('cotizacion')).toBe(true);
        expect(isRepairQuoteCommand('180000')).toBe(false);
        expect(isRepairQuoteCommand('el presupuesto')).toBe(false);
    });
});

describe('parseRepairAmount', () => {
    it('parses plain, $ and thousands separators', () => {
        expect(parseRepairAmount('180000')).toBe(180000);
        expect(parseRepairAmount('$180.000')).toBe(180000);
        expect(parseRepairAmount('180.000')).toBe(180000);
        expect(parseRepairAmount('180,000')).toBe(180000);
        expect(parseRepairAmount('  $ 220.000 ')).toBe(220000);
    });

    it('rejects ambiguous or out-of-range values', () => {
        expect(parseRepairAmount('180 mil')).toBeNull();
        expect(parseRepairAmount('1')).toBeNull();
        expect(parseRepairAmount('no')).toBeNull();
        expect(parseRepairAmount('999')).toBeNull();
    });
});
