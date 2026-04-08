import {
  endOfISOWeek,
  format,
  startOfISOWeek,
  subDays,
  subWeeks,
} from 'date-fns';
import { env } from '../utils/env';
import { redis } from '../utils/redis';
import { prisma, type Prisma } from '@servy/db';
import { insertAgentLog } from '../lib/agent-log';
import { geminiGenerateJson, geminiGenerateText } from '../lib/gemini-json';
import { WhatsAppService } from '../services/whatsapp.service';
import { buildProjectionSystemPrompt, buildWeeklyExecutiveSummaryPrompt } from './prompts/finance';

async function redisSetJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

function mpFeeRate(): number {
  const raw = process.env.MP_FEE_RATE ?? "0.0299";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0.0299;
}

export async function logAgent(
  event: string,
  level: 'info' | 'warn' | 'error',
  details: Record<string, unknown>,
  opts?: { durationMs?: number; tokensUsed?: number; entityId?: string },
): Promise<void> {
  try {
    await insertAgentLog({
      agent: 'finance',
      event,
      level,
      details,
      durationMs: opts?.durationMs,
      tokensUsed: opts?.tokensUsed,
      entityId: opts?.entityId,
    });
  } catch (e) {
    console.error('[finance-agent] logAgent failed', e);
  }
}

function periodMonth(d: Date): string {
  return format(d, "yyyy-MM");
}

async function syncTransactionsFromAcceptedQuotes(): Promise<number> {
  const rate = mpFeeRate();
  const sql = `
    insert into finance_transactions (
      job_id, provider_id, category, zone, job_type,
      gross_amount_ars, servy_commission_rate, servy_revenue_ars,
      provider_net_ars, mp_fee_ars, net_revenue_ars,
      payment_status, simulated, period_month, period_week
    )
    select
      pq.job_id,
      pq.provider_id,
      pq.category,
      pq.zone,
      pq.job_type,
      coalesce(pq.price_chosen, 0),
      coalesce(pq.servy_commission, 0.12),
      coalesce(pq.price_chosen, 0) * coalesce(pq.servy_commission, 0.12),
      coalesce(
        pq.provider_net,
        coalesce(pq.price_chosen, 0) * (1 - coalesce(pq.servy_commission, 0.12))
      ),
      coalesce(pq.price_chosen, 0) * ${rate},
      (coalesce(pq.price_chosen, 0) * coalesce(pq.servy_commission, 0.12))
        - (coalesce(pq.price_chosen, 0) * ${rate}),
      'completed',
      true,
      to_char((pq.accepted_at at time zone 'UTC')::date, 'YYYY-MM'),
      to_char((pq.accepted_at at time zone 'UTC')::date, 'IYYY') || '-W'
        || lpad(to_char((pq.accepted_at at time zone 'UTC')::date, 'IW'), 2, '0')
    from price_quotes pq
    where pq.accepted_at is not null
      and pq.job_id is not null
      and not exists (
        select 1 from finance_transactions ft where ft.job_id = pq.job_id
      )
  `;
  const result = await prisma.$executeRawUnsafe(sql);
  return typeof result === "number" ? result : 0;
}

type AggRow = {
  gross: Prisma.Decimal;
  servy_rev: Prisma.Decimal;
  mp_fees: Prisma.Decimal;
  net_rev: Prisma.Decimal;
  n: bigint;
  completed: bigint;
  cancelled: bigint;
  avg_comm: Prisma.Decimal | null;
};

async function aggregateTransactionsRange(
  start: Date,
  end: Date,
): Promise<AggRow | null> {
  const rows = await prisma.$queryRaw<AggRow[]>`
    select
      coalesce(sum(gross_amount_ars), 0)::numeric as gross,
      coalesce(sum(servy_revenue_ars), 0)::numeric as servy_rev,
      coalesce(sum(mp_fee_ars), 0)::numeric as mp_fees,
      coalesce(sum(net_revenue_ars), 0)::numeric as net_rev,
      count(*)::bigint as n,
      count(*) filter (where payment_status = 'completed')::bigint as completed,
      count(*) filter (where payment_status = 'refunded')::bigint as cancelled,
      avg(servy_commission_rate)::numeric as avg_comm
    from finance_transactions
    where created_at >= ${start}
      and created_at < ${end}
  `;
  return rows[0] ?? null;
}

async function buildByCategoryZoneJson(
  start: Date,
  end: Date,
): Promise<{ by_category: Prisma.JsonObject; by_zone: Prisma.JsonObject }> {
  const catRows = await prisma.$queryRaw<{ c: string; net: Prisma.Decimal }[]>`
    select category as c, coalesce(sum(net_revenue_ars),0)::numeric as net
    from finance_transactions
    where created_at >= ${start} and created_at < ${end}
    group by category
  `;
  const zoneRows = await prisma.$queryRaw<{ z: string; net: Prisma.Decimal }[]>`
    select zone as z, coalesce(sum(net_revenue_ars),0)::numeric as net
    from finance_transactions
    where created_at >= ${start} and created_at < ${end}
    group by zone
  `;
  const by_category: Prisma.JsonObject = {};
  const by_zone: Prisma.JsonObject = {};
  for (const r of catRows) by_category[r.c] = Number(r.net);
  for (const r of zoneRows) by_zone[r.z] = Number(r.net);
  return { by_category, by_zone };
}

async function countActiveProviders(start: Date, end: Date): Promise<number> {
  const r = await prisma.$queryRaw<{ c: bigint }[]>`
    select count(distinct provider_id)::bigint as c
    from finance_transactions
    where created_at >= ${start}
      and created_at < ${end}
      and provider_id is not null
  `;
  return Number(r[0]?.c ?? 0);
}

async function insertFinanceAlert(args: {
  alertType: string;
  severity: string;
  title: string;
  description: string;
  metricValue?: number;
  thresholdValue?: number;
  periodKey?: string;
}): Promise<void> {
  await prisma.financeAlert.create({
    data: {
      alertType: args.alertType,
      severity: args.severity,
      title: args.title,
      description: args.description,
      metricValue: args.metricValue,
      thresholdValue: args.thresholdValue,
      periodKey: args.periodKey,
      resolved: false,
    },
  });
}

/** Cron diario ~7am: snapshot del día anterior (lógica determinista). */
export async function runDailyFinanceSnapshot(): Promise<void> {
  const t0 = Date.now();
  try {
    await syncTransactionsFromAcceptedQuotes();

    const end = subDays(new Date(), 1);
    end.setHours(23, 59, 59, 999);
    const start = subDays(new Date(), 1);
    start.setHours(0, 0, 0, 0);

    const agg = await aggregateTransactionsRange(start, end);
    const { by_category, by_zone } = await buildByCategoryZoneJson(start, end);
    const activeProviders = await countActiveProviders(start, end);

    const n = Number(agg?.n ?? 0);
    const completed = Number(agg?.completed ?? 0);
    const gross = Number(agg?.gross ?? 0);
    const netRev = Number(agg?.net_rev ?? 0);
    const avgTicket = completed > 0 ? gross / completed : null;
    const avgComm = agg?.avg_comm != null ? Number(agg.avg_comm) : null;
    const revPerJob = completed > 0 ? netRev / completed : null;
    const revPerProvider =
      activeProviders > 0 ? netRev / activeProviders : null;

    const periodKey = format(start, "yyyy-MM-dd");

    await prisma.financeSnapshot.upsert({
      where: {
        periodType_periodKey: { periodType: "daily", periodKey },
      },
      create: {
        periodType: "daily",
        periodKey,
        grossRevenueArs: gross,
        servyRevenueArs: Number(agg?.servy_rev ?? 0),
        mpFeesArs: Number(agg?.mp_fees ?? 0),
        netRevenueArs: netRev,
        totalJobs: n,
        completedJobs: completed,
        cancelledJobs: Number(agg?.cancelled ?? 0),
        avgTicketArs: avgTicket,
        avgCommissionRate: avgComm,
        revenuePerJobArs: revPerJob,
        byCategory: by_category,
        byZone: by_zone,
        activeProviders,
        revenuePerActiveProviderArs: revPerProvider,
        simulated: true,
      },
      update: {
        grossRevenueArs: gross,
        servyRevenueArs: Number(agg?.servy_rev ?? 0),
        mpFeesArs: Number(agg?.mp_fees ?? 0),
        netRevenueArs: netRev,
        totalJobs: n,
        completedJobs: completed,
        cancelledJobs: Number(agg?.cancelled ?? 0),
        avgTicketArs: avgTicket,
        avgCommissionRate: avgComm,
        revenuePerJobArs: revPerJob,
        byCategory: by_category,
        byZone: by_zone,
        activeProviders,
        revenuePerActiveProviderArs: revPerProvider,
        simulated: true,
      },
    });

    const prevWeekStart = subWeeks(start, 1);
    const prevWeekEnd = new Date(prevWeekStart);
    prevWeekEnd.setHours(23, 59, 59, 999);
    const prevAgg = await aggregateTransactionsRange(prevWeekStart, prevWeekEnd);
    const prevNet = Number(prevAgg?.net_rev ?? 0);
    if (prevNet > 0 && netRev < prevNet * 0.8) {
      const deltaPct = Math.round((1 - netRev / prevNet) * 100);
      await insertFinanceAlert({
        alertType: "revenue_drop",
        severity: "critical",
        title: "Caída fuerte de ingresos netos (día vs mismo día semana anterior)",
        description: `Ingresos netos ${periodKey} vs semana anterior: ~${deltaPct}% menor.`,
        metricValue: netRev,
        thresholdValue: prevNet * 0.8,
        periodKey,
      });
    }

    if (avgComm != null && avgComm < 0.1) {
      await insertFinanceAlert({
        alertType: "commission_below_threshold",
        severity: "warn",
        title: "Comisión promedio bajo umbral",
        description: `Comisión promedio ${(avgComm * 100).toFixed(1)}% (< 10%).`,
        metricValue: avgComm,
        thresholdValue: 0.1,
        periodKey,
      });
    }

    if (n > 0) {
      const cancelRate = Number(agg?.cancelled ?? 0) / n;
      if (cancelRate > 0.15) {
        await insertFinanceAlert({
          alertType: "high_cancellation_rate",
          severity: "warn",
          title: "Alta tasa de cancelación / refunded",
          description: `Tasa ${(cancelRate * 100).toFixed(0)}% sobre transacciones del día.`,
          metricValue: cancelRate,
          thresholdValue: 0.15,
          periodKey,
        });
      }
    }

    await redisSetJson(
      `finance:daily:${periodKey}`,
      {
        periodKey,
        netRevenueArs: netRev,
        completedJobs: completed,
        avgTicketArs: avgTicket,
      },
      25 * 3600,
    );

    const unresolved = await prisma.financeAlert.count({
      where: { resolved: false },
    });
    await redisSetJson("finance:alerts:unresolved", { count: unresolved }, 3600);

    await logAgent("daily_snapshot", "info", { periodKey, netRev, n }, {
      durationMs: Date.now() - t0,
    });
  } catch (e) {
    await logAgent(
      "daily_snapshot",
      "error",
      { error: e instanceof Error ? e.message : String(e) },
      { durationMs: Date.now() - t0 },
    );
    throw e;
  }
}

function topEntries(obj: Prisma.JsonValue, n: number): string {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "—";
  const entries = Object.entries(obj as Record<string, number>)
    .map(([k, v]) => ({ k, v: Number(v) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, n);
  return entries.map((e, i) => `${i + 1}. ${e.k} — $${e.v.toLocaleString("es-AR")}`).join("\n");
}

async function callGeminiText(systemInstruction: string, user: string): Promise<{
  text: string;
  tokensUsed?: number;
}> {
  const result = await geminiGenerateText(systemInstruction, user, {
    temperature: 0.4,
    maxOutputTokens: 2048,
  });
  if (!result.ok || result.text == null) {
    throw new Error(result.error || 'Gemini text failed');
  }
  return { text: result.text, tokensUsed: result.tokensUsed };
}

async function callGeminiJson<T>(systemInstruction: string, user: string): Promise<T> {
  const result = await geminiGenerateJson<T>(systemInstruction, user);
  if (!result.ok || result.data == null) {
    throw new Error(result.error || 'Gemini JSON failed');
  }
  return result.data;
}

/** Lunes 8am: semana ISO anterior + resumen Gemini + WhatsApp founder. */
export async function runWeeklyReport(): Promise<void> {
  const t0 = Date.now();
  try {
    const ref = subWeeks(new Date(), 1);
    const wStart = startOfISOWeek(ref);
    const wEnd = endOfISOWeek(ref);
    wEnd.setHours(23, 59, 59, 999);
    const weekKey = format(wStart, "RRRR-'W'II");
    const weekNum = format(wStart, "II");

    const agg = await aggregateTransactionsRange(wStart, wEnd);
    const { by_category, by_zone } = await buildByCategoryZoneJson(wStart, wEnd);
    const activeProviders = await countActiveProviders(wStart, wEnd);

    const gross = Number(agg?.gross ?? 0);
    const netRev = Number(agg?.net_rev ?? 0);
    const completed = Number(agg?.completed ?? 0);
    const avgTicket =
      completed > 0 ? gross / completed : null;
    const avgComm = agg?.avg_comm != null ? Number(agg.avg_comm) : null;
    const revPerJob = completed > 0 ? netRev / completed : null;
    const revPerProvider =
      activeProviders > 0 ? netRev / activeProviders : null;

    const prevStart = subWeeks(wStart, 1);
    const prevEnd = subWeeks(wEnd, 1);
    const prevAgg = await aggregateTransactionsRange(prevStart, prevEnd);
    const prevNet = Number(prevAgg?.net_rev ?? 0);
    const deltaPct =
      prevNet > 0 ? Math.round(((netRev - prevNet) / prevNet) * 1000) / 10 : 0;

    await prisma.financeSnapshot.upsert({
      where: {
        periodType_periodKey: { periodType: "weekly", periodKey: weekKey },
      },
      create: {
        periodType: "weekly",
        periodKey: weekKey,
        grossRevenueArs: gross,
        servyRevenueArs: Number(agg?.servy_rev ?? 0),
        mpFeesArs: Number(agg?.mp_fees ?? 0),
        netRevenueArs: netRev,
        totalJobs: Number(agg?.n ?? 0),
        completedJobs: completed,
        cancelledJobs: Number(agg?.cancelled ?? 0),
        avgTicketArs: avgTicket,
        avgCommissionRate: avgComm,
        revenuePerJobArs: revPerJob,
        byCategory: by_category,
        byZone: by_zone,
        activeProviders,
        revenuePerActiveProviderArs: revPerProvider,
        simulated: true,
      },
      update: {
        grossRevenueArs: gross,
        servyRevenueArs: Number(agg?.servy_rev ?? 0),
        mpFeesArs: Number(agg?.mp_fees ?? 0),
        netRevenueArs: netRev,
        totalJobs: Number(agg?.n ?? 0),
        completedJobs: completed,
        cancelledJobs: Number(agg?.cancelled ?? 0),
        avgTicketArs: avgTicket,
        avgCommissionRate: avgComm,
        revenuePerJobArs: revPerJob,
        byCategory: by_category,
        byZone: by_zone,
        activeProviders,
        revenuePerActiveProviderArs: revPerProvider,
        simulated: true,
      },
    });

    if (prevNet > 0 && netRev < prevNet * 0.8) {
      await insertFinanceAlert({
        alertType: "revenue_drop",
        severity: "critical",
        title: "Caída de ingresos semana a semana",
        description: `Semana ${weekKey}: ingresos netos ${deltaPct}% vs semana anterior.`,
        metricValue: netRev,
        thresholdValue: prevNet * 0.8,
        periodKey: weekKey,
      });
    }

    const metricsJson = JSON.stringify({
      netRevenueArs: netRev,
      deltaPctVsPrevWeek: deltaPct,
      completedJobs: completed,
      avgTicketArs: avgTicket,
      avgCommissionRate: avgComm,
    });

    let geminiSummary = "";
    try {
      const sys = buildWeeklyExecutiveSummaryPrompt({
        weekLabel: weekKey,
        metricsJson,
        topCategories: topEntries(by_category, 3),
        topZones: topEntries(by_zone, 3),
      });
      const { text } = await callGeminiText(sys, "Generá el resumen ahora.");
      geminiSummary = text;
    } catch (e) {
      geminiSummary = "(Resumen IA no disponible)";
      await logAgent("weekly_gemini_skipped", "warn", {
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const waBody = [
      `📊 *Resumen financiero — Semana ${weekNum}*`,
      "",
      `💰 Ingresos netos: $${Math.round(netRev).toLocaleString("es-AR")} ARS (${deltaPct >= 0 ? "+" : ""}${deltaPct}% vs semana anterior)`,
      `📦 Jobs completados: ${completed}`,
      `🎯 Ticket promedio: $${avgTicket != null ? Math.round(avgTicket).toLocaleString("es-AR") : "—"} ARS`,
      `💼 Comisión promedio: ${avgComm != null ? (avgComm * 100).toFixed(1) : "—"}%`,
      "",
      "*Top categorías:*",
      topEntries(by_category, 3),
      "",
      "*Top zonas:*",
      topEntries(by_zone, 3),
      "",
      geminiSummary,
      "",
      "Ver detalle completo: servy.lat/admin/finance",
    ].join("\n");

    await sendFounderWhatsApp(waBody);

    await redisSetJson(
      `finance:weekly:${weekKey}`,
      { weekKey, netRevenueArs: netRev, completedJobs: completed },
      8 * 24 * 3600,
    );

    await logAgent("weekly_report", "info", { weekKey, netRev }, {
      durationMs: Date.now() - t0,
    });
  } catch (e) {
    await logAgent(
      "weekly_report",
      "error",
      { error: e instanceof Error ? e.message : String(e) },
      { durationMs: Date.now() - t0 },
    );
    throw e;
  }
}

async function sendFounderWhatsApp(body: string): Promise<void> {
  const to = process.env.FOUNDER_PHONE?.trim();
  if (!to) {
    await logAgent('weekly_whatsapp_skipped', 'warn', {
      reason: 'missing FOUNDER_PHONE',
    });
    return;
  }
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    await logAgent('weekly_whatsapp_skipped', 'warn', {
      reason: 'Twilio credentials missing in env',
    });
    return;
  }
  await WhatsAppService.sendTextMessage(to, body);
}

type ProjectionJson = {
  scenario_base_ars: number;
  scenario_optimist_ars: number;
  scenario_pessimist_ars: number;
  assumed_job_growth_rate: number;
  assumed_avg_ticket_ars: number;
  assumed_commission_rate?: number;
  confidence: number;
  key_risks: string[];
  key_opportunities: string[];
  gemini_analysis: string;
};

/** Primer lunes del mes 9am (invocar desde cron filtrado). */
export async function runProjections(): Promise<void> {
  const t0 = Date.now();
  try {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const projectionForMonth = periodMonth(nextMonth);

    const monthlySnaps = await prisma.financeSnapshot.findMany({
      where: { periodType: "monthly" },
      orderBy: { periodKey: "desc" },
      take: 3,
    });

    let histSlice: { periodKey: string; net: number; jobs: number }[];
    if (monthlySnaps.length > 0) {
      histSlice = monthlySnaps.map((m) => ({
        periodKey: m.periodKey,
        net: Number(m.netRevenueArs),
        jobs: m.completedJobs,
      }));
    } else {
      const approx = await prisma.$queryRaw<
        { period_key: string; net: Prisma.Decimal; jobs: bigint }[]
      >`
        select
          period_month as period_key,
          coalesce(sum(net_revenue_ars), 0)::numeric as net,
          count(*)::bigint as jobs
        from finance_transactions
        where created_at >= (now() - interval '120 days')
        group by period_month
        order by period_month desc
        limit 3
      `;
      histSlice = approx.map((r) => ({
        periodKey: r.period_key,
        net: Number(r.net),
        jobs: Number(r.jobs),
      }));
    }

    const historicalSnapshots = JSON.stringify(histSlice);

    const forecasts = await prisma.demandForecast.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const demandForecast = JSON.stringify(
      forecasts.map((f) => ({
        cat: f.category,
        zone: f.zone,
        pred: f.predictedRequests,
        conf: f.confidence != null ? Number(f.confidence) : null,
      })),
    );

    const expansions = await prisma.expansionOpportunity.findMany({
      where: { NOT: { status: "dismissed" } },
      orderBy: { detectedAt: "desc" },
      take: 20,
    });
    const expansionOpportunities = JSON.stringify(
      expansions.map((x) => ({
        zone: x.zone,
        category: x.category,
        priority: x.priority,
        status: x.status,
      })),
    );

    const system = buildProjectionSystemPrompt({
      historicalSnapshots,
      demandForecast,
      expansionOpportunities,
    });

    const parsed = await callGeminiJson<ProjectionJson>(
      system,
      "Generá la proyección para el mes siguiente en JSON según el esquema.",
    );

    await prisma.financeProjection.create({
      data: {
        projectionForMonth,
        scenarioBaseArs: parsed.scenario_base_ars,
        scenarioOptimistArs: parsed.scenario_optimist_ars,
        scenarioPessimistArs: parsed.scenario_pessimist_ars,
        assumedJobGrowthRate: parsed.assumed_job_growth_rate,
        assumedAvgTicketArs: parsed.assumed_avg_ticket_ars,
        assumedCommissionRate:
          parsed.assumed_commission_rate != null &&
          Number.isFinite(parsed.assumed_commission_rate) ?
            parsed.assumed_commission_rate
          : 0.12,
        assumedMpFeeRate: mpFeeRate(),
        geminiAnalysis: parsed.gemini_analysis,
        confidence: parsed.confidence,
        keyRisks: parsed.key_risks,
        keyOpportunities: parsed.key_opportunities,
      },
    });

    if (parsed.scenario_pessimist_ars < 0) {
      await insertFinanceAlert({
        alertType: "cashflow_negative_projected",
        severity: "critical",
        title: "Escenario pesimista con ingresos negativos proyectados",
        description: parsed.gemini_analysis.slice(0, 500),
        metricValue: parsed.scenario_pessimist_ars,
        periodKey: projectionForMonth,
      });
      await sendFounderWhatsApp(
        `⚠️ *Alerta finanzas*\nEscenario pesimista proyecta ingresos negativos para ${projectionForMonth}.\nRevisá /admin/finance`,
      );
    }

    await redisSetJson(
      "finance:projection:current",
      { projectionForMonth, ...parsed },
      7 * 24 * 3600,
    );

    await logAgent("projections", "info", { projectionForMonth }, {
      durationMs: Date.now() - t0,
    });
  } catch (e) {
    await logAgent(
      "projections",
      "error",
      { error: e instanceof Error ? e.message : String(e) },
      { durationMs: Date.now() - t0 },
    );
    throw e;
  }
}

/** Diario 7:30 — simulación si MP_LIVE_MODE no está activo. */
export async function runMpReconciliation(): Promise<void> {
  const t0 = Date.now();
  try {
    const dayStart = subDays(new Date(), 1);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const internalRows = await prisma.$queryRaw<{ s: Prisma.Decimal; c: bigint }[]>`
      select coalesce(sum(net_revenue_ars),0)::numeric as s, count(*)::bigint as c
      from finance_transactions
      where created_at >= ${dayStart}
        and created_at <= ${dayEnd}
        and simulated = true
    `;
    const internalExpected = Number(internalRows[0]?.s ?? 0);
    const internalCount = Number(internalRows[0]?.c ?? 0);

    const live = process.env.MP_LIVE_MODE === "true";

    if (!live) {
      await prisma.mpReconciliation.create({
        data: {
          periodDate: dayStart,
          mpReportedAmountArs: internalExpected,
          internalExpectedArs: internalExpected,
          differenceArs: 0,
          differencePct: 0,
          mpTransactionCount: internalCount,
          internalTransactionCount: internalCount,
          status: "matched",
          notes: "Modo simulación — sin llamadas a Mercado Pago",
          simulated: true,
        },
      });
      await logAgent("mp_reconciliation", "info", { mode: "simulated" }, {
        durationMs: Date.now() - t0,
      });
      return;
    }

    await logAgent(
      "mp_reconciliation",
      "warn",
      { message: "MP_LIVE_MODE true — integración API MP pendiente de implementar" },
      { durationMs: Date.now() - t0 },
    );
  } catch (e) {
    await logAgent(
      "mp_reconciliation",
      "error",
      { error: e instanceof Error ? e.message : String(e) },
      { durationMs: Date.now() - t0 },
    );
    throw e;
  }
}

export async function refreshAlertsCache(): Promise<void> {
  const unresolved = await prisma.financeAlert.count({
    where: { resolved: false },
  });
  await redisSetJson("finance:alerts:unresolved", { count: unresolved }, 3600);
}
