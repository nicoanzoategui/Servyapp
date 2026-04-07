import { Router, type Request, type Response } from 'express';
import { subDays, format } from 'date-fns';
import { prisma } from '@servy/db';
import { redis } from '../utils/redis';
import {
  refreshAlertsCache,
  runDailyFinanceSnapshot,
} from '../agents/finance-agent';

export const financeRouter = Router();

financeRouter.get("/summary", async (_req: Request, res: Response) => {
  try {
    const yesterday = subDays(new Date(), 1);
    const dayKey = format(yesterday, "yyyy-MM-dd");
    const rawDaily = await redis.get(`finance:daily:${dayKey}`);
    const cached = rawDaily
      ? (JSON.parse(rawDaily) as Record<string, unknown>)
      : null;
    const snap = await prisma.financeSnapshot.findUnique({
      where: {
        periodType_periodKey: { periodType: "daily", periodKey: dayKey },
      },
    });
    const weekKey = format(yesterday, "RRRR-'W'II");
    const weekly = await prisma.financeSnapshot.findUnique({
      where: {
        periodType_periodKey: { periodType: "weekly", periodKey: weekKey },
      },
    });
    res.json({
      ok: true,
      dailyCache: cached,
      dailySnapshot: snap,
      weeklySnapshot: weekly,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

financeRouter.get("/snapshots", async (req: Request, res: Response) => {
  try {
    const period = String(req.query.period ?? "daily");
    if (!["daily", "weekly", "monthly"].includes(period)) {
      res.status(400).json({ ok: false, error: "period inválido" });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 60, 200);
    const rows = await prisma.financeSnapshot.findMany({
      where: { periodType: period },
      orderBy: { periodKey: "desc" },
      take: limit,
    });
    res.json({ ok: true, snapshots: rows });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

/** P&L por rango — agrega snapshots diarios entre fechas (period_key yyyy-mm-dd) */
financeRouter.get("/pl", async (req: Request, res: Response) => {
  try {
    const from = String(req.query.from ?? "");
    const to = String(req.query.to ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      res.status(400).json({ ok: false, error: "from y to YYYY-MM-DD" });
      return;
    }
    const rows = await prisma.financeSnapshot.findMany({
      where: {
        periodType: "daily",
        periodKey: { gte: from, lte: to },
      },
      orderBy: { periodKey: "asc" },
    });
    const totals = rows.reduce(
      (acc, r) => ({
        gross: acc.gross + Number(r.grossRevenueArs),
        servy: acc.servy + Number(r.servyRevenueArs),
        mpFees: acc.mpFees + Number(r.mpFeesArs),
        net: acc.net + Number(r.netRevenueArs),
      }),
      { gross: 0, servy: 0, mpFees: 0, net: 0 },
    );
    res.json({ ok: true, rows, totals });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

financeRouter.get("/unit-economics", async (_req: Request, res: Response) => {
  try {
    const yesterday = subDays(new Date(), 1);
    const dayKey = format(yesterday, "yyyy-MM-dd");
    const snap = await prisma.financeSnapshot.findUnique({
      where: {
        periodType_periodKey: { periodType: "daily", periodKey: dayKey },
      },
    });
    res.json({ ok: true, snapshot: snap });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

financeRouter.get("/by-category", async (req: Request, res: Response) => {
  try {
    const dayKey =
      String(req.query.date ?? "") ||
      format(subDays(new Date(), 1), "yyyy-MM-dd");
    const snap = await prisma.financeSnapshot.findUnique({
      where: {
        periodType_periodKey: { periodType: "daily", periodKey: dayKey },
      },
    });
    res.json({ ok: true, periodKey: dayKey, byCategory: snap?.byCategory });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

financeRouter.get("/by-zone", async (req: Request, res: Response) => {
  try {
    const dayKey =
      String(req.query.date ?? "") ||
      format(subDays(new Date(), 1), "yyyy-MM-dd");
    const snap = await prisma.financeSnapshot.findUnique({
      where: {
        periodType_periodKey: { periodType: "daily", periodKey: dayKey },
      },
    });
    res.json({ ok: true, periodKey: dayKey, byZone: snap?.byZone });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

financeRouter.get("/projections", async (_req: Request, res: Response) => {
  try {
    const rawProj = await redis.get('finance:projection:current');
    const cached = rawProj ? JSON.parse(rawProj) : null;
    const latest = await prisma.financeProjection.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.json({ ok: true, cache: cached, latest });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

financeRouter.get("/reconciliation", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const rows = await prisma.mpReconciliation.findMany({
      orderBy: { periodDate: "desc" },
      take: limit,
    });
    res.json({ ok: true, rows });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

financeRouter.get("/alerts", async (req: Request, res: Response) => {
  try {
    const unresolvedOnly = req.query.unresolved === "1";
    const rows = await prisma.financeAlert.findMany({
      where: unresolvedOnly ? { resolved: false } : undefined,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
    res.json({ ok: true, alerts: rows });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

financeRouter.post("/alerts/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.financeAlert.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date() },
    });
    await refreshAlertsCache();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});

financeRouter.post("/snapshot/force", async (_req: Request, res: Response) => {
  try {
    await runDailyFinanceSnapshot();
    await refreshAlertsCache();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
    });
  }
});
