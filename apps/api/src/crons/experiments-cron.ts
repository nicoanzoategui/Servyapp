import { runExperimentDailyEval, runExperimentMonthlySuggestion } from '../agents/experiments-agent';

export async function runExperimentsDaily(): Promise<void> {
    await runExperimentDailyEval();
}

/** Invocar desde cron mensual (ej. día 1). */
export async function runExperimentsMonthly(): Promise<void> {
    await runExperimentMonthlySuggestion();
}
