import { env } from '../utils/env';
import { foldText } from './service-categories';

export type ServicePriority = 'urgent' | 'scheduled';

export function visitFeeForPriority(priority: ServicePriority): number {
    return priority === 'urgent' ? env.VISIT_FEE_URGENT : env.VISIT_FEE_SCHEDULED;
}

export function formatArs(amount: number): string {
    return amount.toLocaleString('es-AR');
}

export function isLocksmithCategory(category?: string | null): boolean {
    return foldText(category || '').includes('cerrajer');
}

export function priorityLabel(priority: ServicePriority, category?: string | null): string {
    if (priority === 'urgent') {
        return isLocksmithCategory(category) ? 'Emergencia' : 'Urgente';
    }
    return 'Programado';
}

export function speedSelectionPrompt(category?: string | null): string {
    const urgentFee = formatArs(env.VISIT_FEE_URGENT);
    const scheduledFee = formatArs(env.VISIT_FEE_SCHEDULED);
    if (isLocksmithCategory(category)) {
        return (
            `🔑 ¿Cómo lo necesitás?\n\n` +
            `1. *Emergencia* — vamos lo antes posible, $${urgentFee}\n` +
            `2. *Programado* — hasta 72 hs, $${scheduledFee}`
        );
    }
    return (
        `¿Cómo lo necesitás?\n\n` +
        `1. *Urgente* — hoy, coordinamos el horario más rápido posible, $${urgentFee}\n` +
        `2. *Programado* — hasta 72 hs, $${scheduledFee}\n\n` +
        `_Si después hacés el arreglo, la visita se descuenta del total._`
    );
}

/** @deprecated Usar speedSelectionPrompt(category). Se mantiene para imports existentes. */
export const SPEED_SELECTION_PROMPT = speedSelectionPrompt(null);

export const AR_TZ = 'America/Argentina/Buenos_Aires';

const WEEKDAYS_AR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;

export type ScheduledDayOption = {
    offset: number;
    label: string;
    iso: string;
};

export type ScheduledTimeSlot = {
    id: string;
    label: string;
    night: boolean;
};

export const SCHEDULED_TIME_SLOTS: ScheduledTimeSlot[] = [
    { id: 'sch_9_12', label: '9 a 12 hs', night: false },
    { id: 'sch_14_18', label: '14 a 18 hs', night: false },
    { id: 'sch_18_21', label: '18 a 21 hs', night: true },
];

export function scheduledVisitFee(nightShift: boolean): number {
    return env.VISIT_FEE_SCHEDULED + (nightShift ? env.NIGHT_SHIFT_SURCHARGE : 0);
}

function ymdInTimeZone(date: Date, timeZone: string): { y: number; m: number; d: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(date);
    const num = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return { y: num('year'), m: num('month'), d: num('day') };
}

/** Mediodía en Argentina (UTC−3, sin DST) para anclar scheduled_date al día civil. */
function noonArgentina(y: number, m: number, d: number): Date {
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return new Date(`${y}-${mm}-${dd}T12:00:00-03:00`);
}

/** Mañana … +5 días, nunca hoy. Zona America/Argentina/Buenos_Aires. */
export function buildScheduledDayOptions(now = new Date()): ScheduledDayOption[] {
    const today = ymdInTimeZone(now, AR_TZ);
    const todayNoon = noonArgentina(today.y, today.m, today.d);
    const options: ScheduledDayOption[] = [];
    for (let offset = 1; offset <= 5; offset++) {
        // Argentina no tiene DST: +24 h desde el mediodía civil es el día siguiente.
        const date = new Date(todayNoon.getTime() + offset * 24 * 60 * 60 * 1000);
        const ymd = ymdInTimeZone(date, AR_TZ);
        const noon = noonArgentina(ymd.y, ymd.m, ymd.d);
        const weekday = WEEKDAYS_AR[new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay()];
        const label = `${weekday} ${String(ymd.d).padStart(2, '0')}/${String(ymd.m).padStart(2, '0')}`;
        options.push({ offset, label, iso: noon.toISOString() });
    }
    return options;
}

export function scheduledDayPrompt(options: ScheduledDayOption[]): string {
    const lines = options.map((o, i) => `${i + 1}. ${o.label}`).join('\n');
    return `📅 ¿Qué día preferís?\n\n${lines}`;
}

export function scheduledTimePrompt(): string {
    const extra = formatArs(env.NIGHT_SHIFT_SURCHARGE);
    return (
        `¿En qué horario?\n\n` +
        `1. ${SCHEDULED_TIME_SLOTS[0].label}\n` +
        `2. ${SCHEDULED_TIME_SLOTS[1].label}\n` +
        `3. ${SCHEDULED_TIME_SLOTS[2].label} — _+$${extra}, tarifa nocturna del técnico_`
    );
}

