import { runRecruitmentCycle } from '../agents/recruitment-agent';

export async function runRecruitmentCron(): Promise<void> {
    await runRecruitmentCycle();
}
