/** Feriados nacionales AR (inamovibles + algunos trasladables) — ampliar según año. */
export const AR_HOLIDAYS_2026: { date: string; name: string }[] = [
    { date: '2026-01-01', name: 'Año Nuevo' },
    { date: '2026-03-23', name: 'Puente Día de la Memoria' },
    { date: '2026-03-24', name: 'Día Nacional de la Memoria' },
    { date: '2026-04-02', name: 'Día del Veterano (Malvinas)' },
    { date: '2026-04-03', name: 'Viernes Santo' },
    { date: '2026-05-01', name: 'Día del Trabajador' },
    { date: '2026-05-25', name: 'Revolución de Mayo' },
    { date: '2026-06-15', name: 'Paso a la Inmortalidad de Güemes' },
    { date: '2026-06-20', name: 'Paso a la Inmortalidad de Belgrano' },
    { date: '2026-07-09', name: 'Día de la Independencia' },
    { date: '2026-08-17', name: 'Paso a la Inmortalidad de San Martín' },
    { date: '2026-10-12', name: 'Día del Respeto a la Diversidad Cultural' },
    { date: '2026-11-23', name: 'Día de la Soberanía Nacional' },
    { date: '2026-12-08', name: 'Inmaculada Concepción' },
    { date: '2026-12-25', name: 'Navidad' },
];

export function upcomingHolidays(daysAhead = 21): { date: string; name: string }[] {
    const now = new Date();
    const end = new Date(now.getTime() + daysAhead * 86400000);
    return AR_HOLIDAYS_2026.filter((h) => {
        const d = new Date(h.date + 'T12:00:00');
        return d >= now && d <= end;
    });
}
