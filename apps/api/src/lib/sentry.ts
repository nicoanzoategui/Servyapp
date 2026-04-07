import * as Sentry from '@sentry/node';

export function initSentry(): void {
    if (!process.env.SENTRY_DSN) return;
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV ?? 'development',
        tracesSampleRate: 0.1,
    });
}

export function captureException(err: unknown, context?: { tags?: Record<string, string> }): void {
    if (!process.env.SENTRY_DSN) return;
    const e = err instanceof Error ? err : new Error(String(err));
    Sentry.captureException(e, context);
}

export { Sentry };
