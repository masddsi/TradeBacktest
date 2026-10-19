import type { Trade } from './types';

export interface ExamRules {
  /** Meta de lucro (R$). 0 = regra desativada. */
  meta: number;
  /** Perda máxima total sobre a banca inicial (R$). 0 = regra desativada. */
  maxLoss: number;
  /** Perda máxima por dia (R$). 0 = regra desativada. */
  maxDailyLoss: number;
}

export type Management = 'conservador' | 'arrojado';

const PROFIT_STEP = 1000;
const CONTRACT_STEP = 2;

export type ExamEvent = 'meta' | 'daily' | 'total';
export type ExamStatus = 'aprovado' | 'reprovado' | 'em_andamento' | 'sem_dados';

export interface SimRow {
  trade: Trade;
  /** R$ por contrato derivado da operação registrada (pnl / contracts). */
  valuePerContract: number;
  /** Lote fixo usado na simulação. */
  contracts: number;
  /** Resultado simulado da operação. */
  pnl: number;
  /** Banca acumulada até esta operação. */
  equity: number;
  /** Evento do exame decidido nesta operação, se houver. */
  event?: ExamEvent;
}

export interface SimResult {
  rows: SimRow[];
  status: ExamStatus;
  /** Operação que decidiu o exame (meta atingida ou limite violado). */
  event: ExamEvent | null;
  eventDate: string | null;
  /** Operações não simuladas por o teste ter sido decidido antes. */
  skipped: number;
  totalPnl: number;
  finalEquity: number;
  wins: number;
  losses: number;
  winRate: number;
  /** Drawdown máximo (≤ 0), medido do topo da banca. */
  maxDrawdown: number;
  /** P&L total / banca inicial (0 quando a banca é 0). */
  roi: number;
  /** Quanto falta para a meta (0 quando não há meta definida). */
  missingToGoal: number;
  /** Margem de perda total restante ao fim da simulação. */
  remainingLoss: number;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function toLote(value: number): number {
  return Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
}

/**
 * Simula um exame de mesa proprietária sobre as operações já registradas.
 *
 * Cada operação mantém o R$/contrato original (pnl / contracts — preserva
 * perdas personalizadas) e é redimensionada para o lote fixo informado.
 * A simulação encerra na primeira decisão do teste (meta atingida ou limite
 * de perda violado): as operações seguintes não entram na banca nem nos KPIs.
 * Nada é persistido: o resultado existe apenas em memória.
 */
export function simulateExam(
  trades: Trade[],
  {
    lote,
    bancaInicial,
    rules,
    management = 'conservador',
  }: { lote: number; bancaInicial: number; rules: ExamRules; management?: Management },
): SimResult {
  const baseContracts = toLote(lote);
  const initial = nonNegative(bancaInicial);
  const meta = nonNegative(rules.meta);
  const maxLoss = nonNegative(rules.maxLoss);
  const maxDailyLoss = nonNegative(rules.maxDailyLoss);

  const ordered = [...trades].sort((a, b) => a.date.localeCompare(b.date));

  let equity = initial;
  let peak = initial;
  let maxDrawdown = 0;
  let wins = 0;
  let losses = 0;
  let tier = 0;
  let event: ExamEvent | null = null;
  let eventDate: string | null = null;

  const rows: SimRow[] = [];
  for (const trade of ordered) {
    const contracts =
      management === 'arrojado' ? baseContracts + tier * CONTRACT_STEP : baseContracts;
    const valuePerContract = trade.pnl / trade.contracts;
    const pnl = valuePerContract * contracts;
    equity += pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - peak);
    if (trade.result === 'WIN') wins++;
    else losses++;

    const row: SimRow = { trade, valuePerContract, contracts, pnl, equity };

    // A primeira regra que decide o teste (meta ou limite) encerra a simulação.
    if (meta > 0 && equity >= initial + meta) {
      event = 'meta';
      eventDate = trade.date;
      row.event = 'meta';
    } else if (maxDailyLoss > 0 && pnl <= -maxDailyLoss) {
      event = 'daily';
      eventDate = trade.date;
      row.event = 'daily';
    } else if (maxLoss > 0 && equity <= initial - maxLoss) {
      event = 'total';
      eventDate = trade.date;
      row.event = 'total';
    }

    rows.push(row);
    if (event) break;

    if (management === 'arrojado') {
      const profit = equity - initial;
      tier =
        profit <= 0
          ? 0
          : Math.max(tier, Math.floor((profit + 1e-9) / PROFIT_STEP));
    }
  }

  const skipped = ordered.length - rows.length;

  const totalPnl = equity - initial;
  const status: ExamStatus =
    rows.length === 0
      ? 'sem_dados'
      : event === 'meta'
        ? 'aprovado'
        : event
          ? 'reprovado'
          : 'em_andamento';

  return {
    rows,
    status,
    event,
    eventDate,
    skipped,
    totalPnl,
    finalEquity: equity,
    wins,
    losses,
    winRate: rows.length ? wins / rows.length : 0,
    maxDrawdown,
    roi: initial > 0 ? totalPnl / initial : 0,
    missingToGoal: meta > 0 ? Math.max(0, initial + meta - equity) : 0,
    remainingLoss: maxLoss > 0 ? Math.max(0, equity - (initial - maxLoss)) : 0,
  };
}
