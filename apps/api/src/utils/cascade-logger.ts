/**
 * Logger estructurado para eventos de cascada
 * Facilita monitoreo y debugging en producción
 */

export type CascadeEvent = {
    type:
        | 'cascade_started'
        | 'offer_sent'
        | 'offer_accepted'
        | 'offer_rejected'
        | 'offer_timeout'
        | 'cascade_completed'
        | 'no_technicians_available';
    requestId: string;
    professionalId?: string;
    jobOfferId?: string;
    position?: number;
    responseTimeSeconds?: number;
    totalProfessionals?: number;
    timestamp: Date;
};

export class CascadeLogger {
    static log(event: CascadeEvent): void {
        const logData = {
            ...event,
            timestamp: event.timestamp.toISOString(),
        };

        // Log estructurado para fácil parsing
        console.log('[CascadeMetrics]', JSON.stringify(logData));
    }

    static cascadeStarted(requestId: string, totalProfessionals: number): void {
        this.log({
            type: 'cascade_started',
            requestId,
            totalProfessionals,
            timestamp: new Date(),
        });
    }

    static offerSent(requestId: string, professionalId: string, jobOfferId: string, position: number): void {
        this.log({
            type: 'offer_sent',
            requestId,
            professionalId,
            jobOfferId,
            position,
            timestamp: new Date(),
        });
    }

    static offerAccepted(
        requestId: string,
        professionalId: string,
        jobOfferId: string,
        responseTimeSeconds: number
    ): void {
        this.log({
            type: 'offer_accepted',
            requestId,
            professionalId,
            jobOfferId,
            responseTimeSeconds,
            timestamp: new Date(),
        });
    }

    static offerRejected(requestId: string, professionalId: string, jobOfferId: string): void {
        this.log({
            type: 'offer_rejected',
            requestId,
            professionalId,
            jobOfferId,
            timestamp: new Date(),
        });
    }

    static offerTimeout(requestId: string, professionalId: string, jobOfferId: string): void {
        this.log({
            type: 'offer_timeout',
            requestId,
            professionalId,
            jobOfferId,
            timestamp: new Date(),
        });
    }

    static cascadeCompleted(requestId: string): void {
        this.log({
            type: 'cascade_completed',
            requestId,
            timestamp: new Date(),
        });
    }

    static noTechniciansAvailable(requestId: string): void {
        this.log({
            type: 'no_technicians_available',
            requestId,
            timestamp: new Date(),
        });
    }
}
