import { runFraudScans } from '../agents/fraud-agent';

export async function runFraudScan(): Promise<void> {
    await runFraudScans();
}
