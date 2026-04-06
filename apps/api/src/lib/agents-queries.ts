import { prisma } from '@servy/db';

export interface PricingConfigRow {
    id: string;
    labor_base: Record<string, number>;
    zone_multipliers: Record<string, number>;
    time_multipliers: Record<string, number>;
    demand_thresholds: Record<string, { max: number; multiplier: number }>;
    servy_commission: string | number;
}

export async function getActivePricingConfig(): Promise<PricingConfigRow | null> {
    const rows = await prisma.$queryRaw<PricingConfigRow[]>`
        SELECT id, labor_base, zone_multipliers, time_multipliers, demand_thresholds, servy_commission
        FROM pricing_config
        WHERE is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return {
        ...row,
        labor_base: row.labor_base as Record<string, number>,
        zone_multipliers: row.zone_multipliers as Record<string, number>,
        time_multipliers: row.time_multipliers as Record<string, number>,
        demand_thresholds: row.demand_thresholds as Record<string, { max: number; multiplier: number }>,
    };
}

export async function listRecentMaterialPrices(category: string, limit = 50): Promise<
    { id: string; item_name: string; price_ars: string | number; scraped_at: Date }[]
> {
    return prisma.$queryRaw`
        SELECT id, item_name, price_ars, scraped_at
        FROM material_prices
        WHERE category = ${category} AND is_active = true
        ORDER BY scraped_at DESC
        LIMIT ${limit}
    `;
}

export async function listRecentQuotes(limit = 30): Promise<Record<string, unknown>[]> {
    return prisma.$queryRaw`
        SELECT id, created_at, category, job_type, zone, range_min, range_max, range_recommended,
               demand_level, provider_id, accepted_at
        FROM price_quotes
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
}
