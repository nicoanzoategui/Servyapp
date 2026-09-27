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
