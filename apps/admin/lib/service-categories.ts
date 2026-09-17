export const SERVICE_CATEGORIES = [
    'Plomería',
    'Electricidad',
    'Cerrajería',
    'Gas',
    'Aires acondicionados',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
