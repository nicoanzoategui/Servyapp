import { scrapeMaterials } from '../agents/pricing-agent';

export async function scrapePrices(): Promise<void> {
    await scrapeMaterials();
}
