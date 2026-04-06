import { runWeeklyForecast } from '../agents/forecast-agent';

export async function runForecast(): Promise<void> {
    await runWeeklyForecast();
}
