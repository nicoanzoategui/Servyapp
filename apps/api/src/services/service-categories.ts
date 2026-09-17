export const SERVICE_CATEGORIES = [
    'Plomería',
    'Electricidad',
    'Cerrajería',
    'Gas',
    'Aires acondicionados',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export type UrgencyLevel = 'alta' | 'media' | 'baja';

export function foldText(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

const CATEGORY_ALIASES: Record<string, ServiceCategory> = {
    plomeria: 'Plomería',
    plomero: 'Plomería',
    plomeros: 'Plomería',
    canilla: 'Plomería',
    canillas: 'Plomería',
    cano: 'Plomería',
    canos: 'Plomería',
    caño: 'Plomería',
    caños: 'Plomería',
    perdida: 'Plomería',
    gotera: 'Plomería',
    goteras: 'Plomería',
    inundacion: 'Plomería',
    inodoro: 'Plomería',
    cloaca: 'Plomería',
    tanque: 'Plomería',
    electricidad: 'Electricidad',
    electricista: 'Electricidad',
    electricistas: 'Electricidad',
    termica: 'Electricidad',
    disyuntor: 'Electricidad',
    enchufe: 'Electricidad',
    tablero: 'Electricidad',
    cortocircuito: 'Electricidad',
    luz: 'Electricidad',
    cerrajeria: 'Cerrajería',
    cerrajero: 'Cerrajería',
    cerrajeros: 'Cerrajería',
    cerradura: 'Cerrajería',
    llave: 'Cerrajería',
    gasista: 'Gas',
    gasistas: 'Gas',
    garrafa: 'Gas',
    aire: 'Aires acondicionados',
    aires: 'Aires acondicionados',
    split: 'Aires acondicionados',
    climatizacion: 'Aires acondicionados',
};

/** Mapea lo que venga de Gemini / DB a la categoría canónica, o null. */
export function canonicalizeCategory(raw: string | null | undefined): ServiceCategory | null {
    if (!raw?.trim()) return null;
    const folded = foldText(raw);
    for (const cat of SERVICE_CATEGORIES) {
        if (foldText(cat) === folded) return cat;
    }
    if (folded.includes('aire') && folded.includes('acondicion')) return 'Aires acondicionados';
    return CATEGORY_ALIASES[folded] ?? null;
}

export function categoryMatches(professionalCategories: string[] | null | undefined, requestCategory: string | null | undefined): boolean {
    const want = canonicalizeCategory(requestCategory);
    if (!want) return false;
    return (professionalCategories || []).some((c) => canonicalizeCategory(c) === want);
}

const HIGH_URGENCY = [
    'inundacion',
    'sin luz',
    'no tengo luz',
    'sin gas',
    'perdida de gas',
    'olor a gas',
    'puerta trabada',
    'no puedo entrar',
    'incendio',
    ' exploto',
    ' explota',
];

export function classifyProblemByKeywords(description: string): {
    category: ServiceCategory | null;
    urgency: UrgencyLevel;
    understood: boolean;
} {
    const folded = foldText(description);
    if (!folded) return { category: null, urgency: 'media', understood: false };

    let category: ServiceCategory | null = null;
    for (const [alias, cat] of Object.entries(CATEGORY_ALIASES)) {
        if (alias.length < 3) continue;
        if (folded.includes(alias)) {
            category = cat;
            break;
        }
    }
    if (!category) {
        for (const cat of SERVICE_CATEGORIES) {
            if (folded.includes(foldText(cat))) {
                category = cat;
                break;
            }
        }
    }

    const urgency: UrgencyLevel = HIGH_URGENCY.some((p) => folded.includes(p)) ? 'alta' : 'media';
    return { category, urgency, understood: !!category };
}

export function finalizeClassification(
    description: string,
    parsed: { category: string | null; urgency: UrgencyLevel; understood: boolean }
): { category: ServiceCategory | null; urgency: UrgencyLevel; understood: boolean } {
    const canonical = canonicalizeCategory(parsed.category);
    if (canonical) {
        return { category: canonical, urgency: parsed.urgency, understood: true };
    }
    return classifyProblemByKeywords(description);
}
