import { describe, it, expect } from 'vitest';
import {
    canonicalizeCategory,
    classifyProblemByKeywords,
    categoryMatches,
    finalizeClassification,
} from '../services/service-categories';

describe('service-categories', () => {
    it('canonicalizes accented and alias names', () => {
        expect(canonicalizeCategory('plomeria')).toBe('Plomería');
        expect(canonicalizeCategory('Plomería')).toBe('Plomería');
        expect(canonicalizeCategory('aire acondicionado')).toBe('Aires acondicionados');
        expect(canonicalizeCategory('cerrajeria')).toBe('Cerrajería');
    });

    it('matches professional categories ignoring accents', () => {
        expect(categoryMatches(['Plomería'], 'plomeria')).toBe(true);
        expect(categoryMatches(['Electricidad'], 'Plomería')).toBe(false);
    });

    it('classifies common Spanish problem descriptions without Gemini', () => {
        const r = classifyProblemByKeywords('Se me rompió la canilla de la cocina y pierde agua');
        expect(r.understood).toBe(true);
        expect(r.category).toBe('Plomería');

        const e = classifyProblemByKeywords('No tengo luz en todo el departamento');
        expect(e.category).toBe('Electricidad');
        expect(e.urgency).toBe('alta');
    });

    it('finalizes Gemini output that is not the exact canonical string', () => {
        const r = finalizeClassification('gotea el techo', {
            category: 'plomeria',
            urgency: 'media',
            understood: false,
        });
        expect(r.understood).toBe(true);
        expect(r.category).toBe('Plomería');
    });
});
