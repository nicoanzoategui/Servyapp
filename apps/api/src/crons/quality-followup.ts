import { runQualityFollowupBatch } from '../agents/quality-agent';

export async function runQualityFollowup(): Promise<void> {
    await runQualityFollowupBatch();
}
