import { env } from '../utils/env';

export type ServicePriority = 'urgent' | 'scheduled';

export function visitFeeForPriority(priority: ServicePriority): number {
    return priority === 'urgent' ? env.VISIT_FEE_URGENT : env.VISIT_FEE_SCHEDULED;
}

export function formatArs(amount: number): string {
    return amount.toLocaleString('es-AR');
}

export function priorityLabel(priority: ServicePriority): string {
    return priority === 'urgent' ? 'Urgente' : 'Programado';
}

export const SPEED_SELECTION_PROMPT = `¿Cómo lo necesitás?

1. *Urgente* — $${formatArs(env.VISIT_FEE_URGENT)} (hoy, en menos de 24 hs)
2. *Programado* — $${formatArs(env.VISIT_FEE_SCHEDULED)} (hasta 72 hs)

_Incluye la visita del técnico para diagnosticar. El arreglo se cotiza in situ._`;
