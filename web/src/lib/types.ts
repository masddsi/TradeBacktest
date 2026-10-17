export type TradeResult = 'WIN' | 'LOSS';

export const SETUPS = ['Gap', 'Bate e Volta', 'Vazio', 'Extremo'] as const;
export type Setup = (typeof SETUPS)[number];
export type Direction = 'C' | 'V';

export interface Trade {
  id: number;
  date: string;
  contracts: number;
  result: TradeResult;
  pnl: number;
  setup: Setup | null;
  direction: Direction | null;
  notes: string | null;
  created_at: string;
}

export interface Settings {
  gain_per_contract: number;
  loss_per_contract: number;
  daily_goal: number;
  daily_max_loss: number;
  bankroll: number;
}

export interface TradeInput {
  date: string;
  contracts: number;
  result: TradeResult;
  setup?: Setup | null;
  direction?: Direction | null;
  loss_total?: number | null;
  notes?: string | null;
}

export interface EquityPoint {
  date: string;
  equity: number;
  pnl: number;
}

export interface GroupStats {
  key: string;
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  profitFactor: number;
  avgPnl: number;
}

export interface Stats {
  total: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  payoff: number;
  bestDay: Trade | null;
  worstDay: Trade | null;
  currentStreak: number;
  currentResult: TradeResult | null;
  maxWinStreak: number;
  maxLossStreak: number;
  maxDrawdown: number;
  equityCurve: EquityPoint[];
  bySetup: GroupStats[];
  byDirection: GroupStats[];
}

