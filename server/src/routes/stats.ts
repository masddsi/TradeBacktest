import type { FastifyInstance } from 'fastify';
import { db, SETUPS } from '../db.js';

interface TradeRow {
  id: number;
  date: string;
  contracts: number;
  result: 'WIN' | 'LOSS';
  pnl: number;
  setup: string | null;
  direction: 'C' | 'V' | null;
}

interface GroupStats {
  key: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  profitFactor: number;
  avgPnl: number;
}

function buildGroups(rows: TradeRow[], keyOf: (r: TradeRow) => string | null): GroupStats[] {
  const map = new Map<string, { wins: number; losses: number; pnl: number; grossP: number; grossL: number }>();
  for (const r of rows) {
    const key = keyOf(r);
    if (key === null) continue;
    const g = map.get(key) ?? { wins: 0, losses: 0, pnl: 0, grossP: 0, grossL: 0 };
    if (r.result === 'WIN') {
      g.wins++;
      g.grossP += r.pnl;
    } else {
      g.losses++;
      g.grossL += Math.abs(r.pnl);
    }
    g.pnl += r.pnl;
    map.set(key, g);
  }
  return [...map.entries()].map(([key, g]) => {
    const total = g.wins + g.losses;
    return {
      key,
      total,
      wins: g.wins,
      losses: g.losses,
      winRate: total ? g.wins / total : 0,
      pnl: g.pnl,
      profitFactor: g.grossL > 0 ? g.grossP / g.grossL : g.grossP > 0 ? Infinity : 0,
      avgPnl: total ? g.pnl / total : 0,
    };
  });
}

const SETUP_ORDER = [...SETUPS, 'Sem setup'] as const;

export async function statsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/stats', async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const where: string[] = [];
    const params: string[] = [];
    if (from) {
      where.push('date >= ?');
      params.push(from);
    }
    if (to) {
      where.push('date <= ?');
      params.push(to);
    }
    const rows = db
      .prepare(
        'SELECT id, date, contracts, result, pnl, setup, direction FROM trades' +
          (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
          ' ORDER BY date ASC',
      )
      .all(...params) as unknown as TradeRow[];

    const wins = rows.filter((r) => r.result === 'WIN');
    const losses = rows.filter((r) => r.result === 'LOSS');

    const grossProfit = wins.reduce((a, r) => a + r.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((a, r) => a + r.pnl, 0));
    const totalPnl = grossProfit - grossLoss;
    const total = rows.length;

    const avgWin = wins.length ? grossProfit / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;

    let equity = 0;
    const equityCurve = rows.map((r) => {
      equity += r.pnl;
      return { date: r.date, equity, pnl: r.pnl };
    });

    const bestDay = rows.reduce<TradeRow | null>(
      (best, r) => (best === null || r.pnl > best.pnl ? r : best),
      null,
    );
    const worstDay = rows.reduce<TradeRow | null>(
      (worst, r) => (worst === null || r.pnl < worst.pnl ? r : worst),
      null,
    );

    let currentStreak = 0;
    let currentResult: 'WIN' | 'LOSS' | null = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (currentResult === null) {
        currentResult = rows[i].result;
        currentStreak = 1;
      } else if (rows[i].result === currentResult) {
        currentStreak++;
      } else {
        break;
      }
    }

    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let run = 0;
    let runType: 'WIN' | 'LOSS' | null = null;
    for (const r of rows) {
      if (r.result === runType) {
        run++;
      } else {
        runType = r.result;
        run = 1;
      }
      if (r.result === 'WIN') maxWinStreak = Math.max(maxWinStreak, run);
      else maxLossStreak = Math.max(maxLossStreak, run);
    }

    let peak = 0;
    let maxDrawdown = 0;
    for (const p of equityCurve) {
      peak = Math.max(peak, p.equity);
      maxDrawdown = Math.min(maxDrawdown, p.equity - peak);
    }

    const bySetup = buildGroups(rows, (r) => r.setup ?? 'Sem setup').sort(
      (a, b) =>
        SETUP_ORDER.indexOf(a.key as (typeof SETUP_ORDER)[number]) -
        SETUP_ORDER.indexOf(b.key as (typeof SETUP_ORDER)[number]),
    );
    const byDirection = buildGroups(rows, (r) => r.direction).sort((a, b) =>
      a.key.localeCompare(b.key),
    );

    return {
      total,
      wins: wins.length,
      losses: losses.length,
      winRate: total ? wins.length / total : 0,
      totalPnl,
      grossProfit,
      grossLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      avgWin,
      avgLoss,
      payoff: avgLoss > 0 ? avgWin / avgLoss : 0,
      bestDay,
      worstDay,
      currentStreak,
      currentResult,
      maxWinStreak,
      maxLossStreak,
      maxDrawdown,
      equityCurve,
      bySetup,
      byDirection,
    };
  });
}
