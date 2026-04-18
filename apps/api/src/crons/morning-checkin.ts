import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { insertAgentLog } from '../lib/agent-log';

/** weekday long (en-US lowercased) → clave schedule_json del portal */
const WEEKDAY_TO_SCHEDULE_KEY: Record<string, string> = {
    monday: 'mon',
    tuesday: 'tue',
    wednesday: 'wed',
    thursday: 'thu',
    friday: 'fri',
    saturday: 'sat',
    sunday: 'sun',
};

function isWorkDayFromScheduleJson(scheduleJson: unknown, weekdayLong: string): boolean {
    const key = WEEKDAY_TO_SCHEDULE_KEY[weekdayLong];
    if (!key) return false;
    if (!scheduleJson || typeof scheduleJson !== 'object' || Array.isArray(scheduleJson)) return false;
    const row = (scheduleJson as Record<string, unknown>)[key];
    return !!(row && typeof row === 'object' && (row as { enabled?: boolean }).enabled === true);
}

/**
 * Cron que corre cada mañana y envía mensaje de disponibilidad
 * a técnicos según sus horarios configurados en provider_schedules
 *
 * No filtra por la columna `work_days` en SQL: evita errores 22P03 si hubo
 * filas corruptas (p. ej. bind incorrecto en raw). El día laborable se toma
 * de `professional.schedule_json`, alineado con el portal.
 */
export async function runMorningCheckin(): Promise<void> {
    try {
        // Obtener día actual en Buenos Aires
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Argentina/Buenos_Aires',
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const parts = formatter.formatToParts(now);
        const dayName = parts.find((p) => p.type === 'weekday')?.value.toLowerCase();
        const currentHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
        const currentMinute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

        if (!dayName) return;

        const schedules = await prisma.providerSchedule.findMany({
            where: { is_active: true },
            select: {
                id: true,
                shift_start: true,
                shift_end: true,
                professional: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        status: true,
                        schedule_json: true,
                    },
                },
            },
        });

        for (const schedule of schedules) {
            const pro = schedule.professional;
            if (!pro || pro.status !== 'active') continue;
            if (!isWorkDayFromScheduleJson(pro.schedule_json, dayName)) continue;

            // Parsear hora de inicio
            const [startHour, startMinute] = (schedule.shift_start || '09:00').split(':').map(Number);

            // Enviar mensaje si estamos en la hora de inicio (±15 min)
            const minutesDiff = currentHour * 60 + currentMinute - (startHour * 60 + startMinute);

            if (minutesDiff >= -5 && minutesDiff <= 15) {
                const message = `☀️ ¡Buen día ${pro.name}!\n\n¿Estás disponible hoy de ${schedule.shift_start} a ${schedule.shift_end}?\n\nRespondé:\n• "disponible" o "sí" para activarte\n• "no" si hoy no trabajás`;

                await WhatsAppService.sendTextMessage(pro.phone, message);

                await insertAgentLog({
                    agent: 'availability',
                    event: 'morning_checkin',
                    level: 'info',
                    entityType: 'provider',
                    entityId: pro.id,
                    details: {
                        dayName,
                        shiftStart: schedule.shift_start,
                        shiftEnd: schedule.shift_end,
                    },
                });

                console.log(`[morning-checkin] Sent to ${pro.name} (${pro.phone})`);
            }
        }
    } catch (error) {
        console.error('[morning-checkin] Error:', error);
    }
}
