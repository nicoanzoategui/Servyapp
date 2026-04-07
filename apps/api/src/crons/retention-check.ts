import { syncProviderHealth, runRetentionOutreach } from '../agents/retention-agent';

export async function runRetentionCheck(): Promise<void> {
    await syncProviderHealth();
    await runRetentionOutreach();
}
