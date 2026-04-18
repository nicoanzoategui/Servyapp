import { prisma } from '@servy/db';
import { WhatsAppService } from '../services/whatsapp.service';
import { insertAgentLog } from '../lib/agent-log';

/**
 * Cron que corre cada mañana y envía mensaje de disponibilidad 
 * a técnicos según sus horarios configurados en provider_schedules
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
            hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const dayName = parts.find(p => p.type === 'weekday')?.value.toLowerCase();
        const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const currentMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        
        if (!dayName) return;
        
        // Buscar schedules activos para este día
        const schedules = await prisma.providerSchedule.findMany({
            where: {
                is_active: true,
                work_days: {
                    has: dayName
                }
            },
            include: {
                professional: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        status: true
                    }
                }
            }
        });
        
        for (const schedule of schedules) {
            if (!schedule.professional || schedule.professional.status !== 'active') continue;
            
            // Parsear hora de inicio
            const [startHour, startMinute] = (schedule.shift_start || '09:00').split(':').map(Number);
            
            // Enviar mensaje si estamos en la hora de inicio (±15 min)
            const minutesDiff = (currentHour * 60 + currentMinute) - (startHour * 60 + startMinute);
            
            if (minutesDiff >= -5 && minutesDiff <= 15) {
                const message = `☀️ ¡Buen día ${schedule.professional.name}!\n\n¿Estás disponible hoy de ${schedule.shift_start} a ${schedule.shift_end}?\n\nRespondé:\n• "disponible" o "sí" para activarte\n• "no" si hoy no trabajás`;
                
                await WhatsAppService.sendTextMessage(schedule.professional.phone, message);
                
                await insertAgentLog({
                    agent: 'availability',
                    event: 'morning_checkin',
                    level: 'info',
                    entityType: 'provider',
                    entityId: schedule.professional.id,
                    details: {
                        dayName,
                        shiftStart: schedule.shift_start,
                        shiftEnd: schedule.shift_end
                    }
                });
                
                console.log(`[morning-checkin] Sent to ${schedule.professional.name} (${schedule.professional.phone})`);
            }
        }
    } catch (error) {
        console.error('[morning-checkin] Error:', error);
    }
}
