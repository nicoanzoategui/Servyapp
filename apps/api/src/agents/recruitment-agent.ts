import { ApifyClient } from 'apify-client';
import { env } from '../utils/env';
import { prisma } from '@servy/db';
import { insertAgentLog } from '../lib/agent-log';
import { captureException } from '../lib/sentry';
import { geminiGenerateJson } from '../lib/gemini-json';
import { recruitmentAdPrompt, RECRUITMENT_SCORE_PROMPT } from './prompts/recruitment';

const SCORE_THRESHOLD = 7;

// ─── Apify ────────────────────────────────────────────────────────────────────

async function scrapeGroup(client: ApifyClient, groupUrl: string): Promise<string[]> {
    const run = await client.actor('apify/facebook-groups-scraper').call({
        startUrls: [{ url: groupUrl }],
        maxPosts: 50,
        maxPostComments: 0,
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return items
        .map((i: any) => i.text ?? i.message ?? '')
        .filter(Boolean) as string[];
}

// ─── Calificación con Gemini ──────────────────────────────────────────────────

interface CandidateScore {
    score: number;
    category: string;
    zone: string | null;
    isIndependent: boolean;
    reasons: string[];
    disqualified: boolean;
    disqualifyReason: string | null;
}

async function scorePost(rawPost: string): Promise<CandidateScore | null> {
    const g = await geminiGenerateJson<CandidateScore>(RECRUITMENT_SCORE_PROMPT, rawPost);
    if (!g.ok || !g.data) return null;
    return g.data;
}

// ─── Persistir candidato calificado ──────────────────────────────────────────

async function persistCandidate(
    groupUrl: string,
    groupName: string,
    rawPost: string,
    score: CandidateScore
): Promise<void> {
    await prisma.$executeRawUnsafe(
        `INSERT INTO recruitment_candidates
            (source, source_url, source_group, raw_post, score, score_reasons,
             gemini_analysis, category, zone, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT DO NOTHING`,
        'facebook_scrape',
        groupUrl,
        groupName,
        rawPost.slice(0, 2000),
        score.score,
        JSON.stringify(score.reasons),
        JSON.stringify(score),
        score.category ?? null,
        score.zone ?? null,
        score.disqualified ? 'disqualified' : score.score >= SCORE_THRESHOLD ? 'qualified' : 'detected'
    );
}

// ─── Ciclo principal ──────────────────────────────────────────────────────────

export async function runRecruitmentCycle(): Promise<void> {
    if (!env.APIFY_API_TOKEN) {
        await insertAgentLog({
            agent: 'recruitment',
            event: 'apify_disabled',
            level: 'info',
            details: { note: 'APIFY_API_TOKEN vacío — sin scrape de grupos' },
        });
        await draftCampaignsFromExpansion();
        return;
    }

    const client = new ApifyClient({ token: env.APIFY_API_TOKEN });

    // Traer grupos activos de la DB
    const groups = await prisma.$queryRaw<
        { id: string; group_url: string; group_name: string; category: string; zone: string }[]
    >`SELECT id, group_url, group_name, category, zone FROM facebook_groups WHERE is_active = true`;

    if (!groups.length) {
        await insertAgentLog({
            agent: 'recruitment',
            event: 'no_groups_configured',
            level: 'warn',
            details: { note: 'No hay grupos activos en facebook_groups' },
        });
        await draftCampaignsFromExpansion();
        return;
    }

    let totalScraped = 0;
    let totalQualified = 0;

    for (const group of groups) {
        try {
            const posts = await scrapeGroup(client, group.group_url);
            totalScraped += posts.length;

            for (const post of posts) {
                const score = await scorePost(post);
                if (!score) continue;

                await persistCandidate(group.group_url, group.group_name, post, score);
                if (!score.disqualified && score.score >= SCORE_THRESHOLD) totalQualified++;
            }

            // Actualizar last_scraped_at del grupo
            await prisma.$executeRawUnsafe(
                `UPDATE facebook_groups
                 SET last_scraped_at = now(), candidates_found = candidates_found + $1
                 WHERE id = $2`,
                totalQualified,
                group.id
            );

            await insertAgentLog({
                agent: 'recruitment',
                event: 'group_scraped',
                level: 'info',
                details: {
                    group: group.group_name,
                    posts: posts.length,
                    qualified: totalQualified,
                },
            });
        } catch (err: any) {
            captureException(err, { tags: { agent: 'recruitment' } });
            await insertAgentLog({
                agent: 'recruitment',
                event: 'scrape_error',
                level: 'error',
                details: { group: group.group_name, error: err.message },
            });
        }
    }

    await insertAgentLog({
        agent: 'recruitment',
        event: 'cycle_complete',
        level: 'info',
        details: { totalScraped, totalQualified },
    });

    await draftCampaignsFromExpansion();
}

// ─── Draft de campañas desde expansion_opportunities ─────────────────────────

export async function draftCampaignsFromExpansion(): Promise<void> {
    const rows = await prisma.$queryRaw<{ id: string; zone: string; category: string }[]>`
        SELECT id, zone, category FROM expansion_opportunities
        WHERE priority = 'high' AND status = 'detected'
        LIMIT 10
    `;

    for (const row of rows) {
        const exists = await prisma.$queryRaw<{ c: bigint }[]>`
            SELECT COUNT(*)::bigint AS c FROM recruitment_campaigns
            WHERE zone = ${row.zone} AND category = ${row.category}
            AND status IN ('draft', 'pending_approval', 'active')
        `;
        if (Number(exists[0]?.c) > 0) continue;

        const ad = await geminiGenerateJson<{ headline: string; body: string; cta: string }>(
            recruitmentAdPrompt(row.category, row.zone, 350000),
            'Respondé solo con el JSON pedido.'
        );

        await prisma.$executeRawUnsafe(
            `INSERT INTO recruitment_campaigns (category, zone, status, ad_headline, ad_body, ad_cta)
             VALUES ($1, $2, 'draft', $3, $4, $5)`,
            row.category,
            row.zone,
            ad.data?.headline ?? `Servy busca ${row.category}`,
            ad.data?.body ?? `Sumate en ${row.zone}. Ingresos por trabajo.`,
            ad.data?.cta ?? 'Registrarme'
        );

        await insertAgentLog({
            agent: 'recruitment',
            event: 'draft_campaign_from_expansion',
            level: 'info',
            details: { expansion_id: row.id, zone: row.zone, category: row.category },
            tokensUsed: ad.tokensUsed,
        });
    }
}

// ─── Calificación manual (desde admin) ───────────────────────────────────────

export async function scoreCandidateText(rawPost: string): Promise<{
    score: number;
    disqualified: boolean;
    reasons: string[];
} | null> {
    const g = await geminiGenerateJson<{
        score: number;
        disqualified: boolean;
        reasons: string[];
    }>(RECRUITMENT_SCORE_PROMPT, rawPost);
    if (!g.ok || !g.data) return null;
    return {
        score: g.data.score,
        disqualified: Boolean(g.data.disqualified),
        reasons: g.data.reasons ?? [],
    };
}

// ─── Meta Ads ─────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
const bizSdk: any = require('facebook-nodejs-business-sdk');

function metaAdAccountId(): string {
    const raw = env.META_AD_ACCOUNT_ID.trim();
    if (!raw) return '';
    return raw.startsWith('act_') ? raw : `act_${raw}`;
}

function initMeta() {
    bizSdk.FacebookAdsApi.init(env.META_SYSTEM_USER_TOKEN);
    return {
        AdAccount: bizSdk.AdAccount,
        CustomAudience: bizSdk.CustomAudience,
        Campaign: bizSdk.Campaign,
        AdSet: bizSdk.AdSet,
        Ad: bizSdk.Ad,
        AdCreative: bizSdk.AdCreative,
    };
}

export async function uploadCustomAudience(category: string, zone: string): Promise<string | null> {
    if (!env.META_SYSTEM_USER_TOKEN || !env.META_AD_ACCOUNT_ID) return null;

    const candidates = await prisma.$queryRaw<{ facebook_id: string }[]>`
        SELECT facebook_id FROM recruitment_candidates
        WHERE category = ${category} AND zone = ${zone}
        AND status = 'qualified' AND facebook_id IS NOT NULL
    `;

    if (!candidates.length) return null;

    const { AdAccount } = initMeta();
    const account = new AdAccount(metaAdAccountId());

    const audience = await account.createCustomAudience([], {
        name: `Servy ${category} ${zone} ${new Date().toISOString().slice(0, 10)}`,
        subtype: 'CUSTOM',
        description: `Candidatos calificados para ${category} en ${zone}`,
        customer_file_source: 'USER_PROVIDED_ONLY',
    });

    await prisma.$executeRawUnsafe(
        `INSERT INTO meta_custom_audiences (category, zone, meta_audience_id, candidate_count, last_updated_at)
         VALUES ($1, $2, $3, $4, now())`,
        category,
        zone,
        audience.id,
        candidates.length
    );

    await insertAgentLog({
        agent: 'recruitment',
        event: 'custom_audience_created',
        level: 'info',
        details: { category, zone, audienceId: audience.id, count: candidates.length },
    });

    return audience.id;
}

export async function launchCampaign(campaignId: string): Promise<void> {
    if (!env.META_SYSTEM_USER_TOKEN || !env.META_AD_ACCOUNT_ID) {
        throw new Error('META credentials no configuradas');
    }
    if (!env.META_PAGE_ID?.trim()) {
        throw new Error('META_PAGE_ID requerida para crear creatives de link');
    }

    const rows = await prisma.$queryRaw<
        {
            id: string;
            category: string;
            zone: string;
            ad_headline: string | null;
            ad_body: string | null;
            ad_cta: string | null;
            approved_budget_daily_ars: string | number | null;
        }[]
    >`
        SELECT id, category, zone, ad_headline, ad_body, ad_cta, approved_budget_daily_ars
        FROM recruitment_campaigns
        WHERE id = ${campaignId} AND status = 'pending_approval'
    `;

    if (!rows.length) throw new Error('Campaña no encontrada o no está en pending_approval');
    const camp = rows[0]!;

    const { AdAccount } = initMeta();
    const account = new AdAccount(metaAdAccountId());

    const headline = camp.ad_headline ?? `Servy — ${camp.category}`;
    const body = camp.ad_body ?? `Sumate en ${camp.zone}`;
    const dailyBudget = Math.round(Number(camp.approved_budget_daily_ars ?? 5000) * 100);
    const destUrl = `https://servy.lat/profesionales?utm_source=recruitment&utm_zone=${encodeURIComponent(camp.zone)}&utm_category=${encodeURIComponent(camp.category)}`;

    const metaCampaign = await account.createCampaign([], {
        name: `Servy Recruitment ${camp.category} ${camp.zone}`,
        objective: 'OUTCOME_TRAFFIC',
        status: 'ACTIVE',
        special_ad_categories: [],
    });

    const audienceRow = await prisma.$queryRaw<{ meta_audience_id: string | null }[]>`
        SELECT meta_audience_id FROM meta_custom_audiences
        WHERE category = ${camp.category} AND zone = ${camp.zone}
        ORDER BY last_updated_at DESC NULLS LAST
        LIMIT 1
    `;

    const hasAudience =
        audienceRow[0]?.meta_audience_id != null && String(audienceRow[0].meta_audience_id).length > 0;

    const adSet = await account.createAdSet([], {
        name: `AdSet ${camp.category} ${camp.zone}`,
        campaign_id: metaCampaign.id,
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'LINK_CLICKS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        daily_budget: dailyBudget,
        targeting: hasAudience
            ? { custom_audiences: [{ id: audienceRow[0]!.meta_audience_id }] }
            : { geo_locations: { countries: ['AR'] } },
        status: 'ACTIVE',
    });

    const creative = await account.createAdCreative([], {
        name: `Creative ${camp.category} ${camp.zone}`,
        object_story_spec: {
            page_id: env.META_PAGE_ID.trim(),
            link_data: {
                message: body,
                link: destUrl,
                name: headline,
                call_to_action: {
                    type: 'SIGN_UP',
                    value: { link: destUrl },
                },
            },
        },
    });

    const ad = await account.createAd([], {
        name: `Ad ${camp.category} ${camp.zone}`,
        adset_id: adSet.id,
        creative: { creative_id: creative.id },
        status: 'ACTIVE',
    });

    await prisma.$executeRawUnsafe(
        `UPDATE recruitment_campaigns SET
            status = 'active',
            meta_campaign_id = $2,
            meta_adset_id = $3,
            meta_ad_id = $4,
            updated_at = now()
         WHERE id = $1::uuid`,
        camp.id,
        String(metaCampaign.id),
        String(adSet.id),
        String(ad.id)
    );

    await insertAgentLog({
        agent: 'recruitment',
        event: 'meta_campaign_launched',
        level: 'info',
        details: {
            campaignId: camp.id,
            metaCampaignId: metaCampaign.id,
            metaAdSetId: adSet.id,
            metaAdId: ad.id,
        },
    });
}

export async function syncAudienceMembers(audienceId: string, category: string, zone: string): Promise<void> {
    const candidates = await prisma.$queryRaw<{ facebook_id: string }[]>`
        SELECT facebook_id FROM recruitment_candidates
        WHERE category = ${category} AND zone = ${zone}
        AND status = 'qualified' AND facebook_id IS NOT NULL
    `;

    if (!candidates.length) return;

    const { CustomAudience } = initMeta();
    const audience = new CustomAudience(audienceId);

    const fbIds = candidates.map((c) => c.facebook_id);

    await audience.createUser([], {
        payload: {
            schema: 'UID',
            data: fbIds,
        },
    });

    await insertAgentLog({
        agent: 'recruitment',
        event: 'audience_members_synced',
        level: 'info',
        details: { audienceId, count: fbIds.length, category, zone },
    });
}

/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */