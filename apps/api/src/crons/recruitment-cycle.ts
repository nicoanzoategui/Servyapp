import { enqueueRunRecruitmentCycle } from '../lib/queue';

export async function runRecruitmentCron(): Promise<void> {
    await enqueueRunRecruitmentCycle();
}
