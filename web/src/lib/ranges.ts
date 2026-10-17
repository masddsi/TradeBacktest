import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TradeResult } from './types';

export interface DateRange {
  from?: string;
  to?: string;
}

export type RangeKey = 'all' | 'ytd' | 'month' | '30d' | '90d';

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function rangeFor(key: RangeKey): DateRange {
  const now = new Date();
  switch (key) {
    case 'month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    case 'ytd':
      return { from: `${now.getFullYear()}-01-01`, to: iso(now) };
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: iso(d), to: iso(now) };
    }
    case '90d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 89);
      return { from: iso(d), to: iso(now) };
    }
    default:
      return {};
  }
}

export const RANGE_LABELS: Record<RangeKey, string> = {
  month: 'Mês atual',
  ytd: 'Ano',
  '30d': '30 dias',
  '90d': '90 dias',
  all: 'Tudo',
};

export function resultTone(result: TradeResult): 'gain' | 'loss' {
  return result === 'WIN' ? 'gain' : 'loss';
}

export function todayISO(): string {
  return iso(new Date());
}

/** Chave do mês (AAAA-MM) de uma data ISO (AAAA-MM-DD). */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Rótulo curto do mês em pt-BR (ex.: "fev"). */
export function monthShortLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return format(new Date(y, m - 1, 1), 'MMM', { locale: ptBR }).replace('.', '');
}

/** Meses (AAAA-MM) que possuem operações, do mais recente ao mais antigo. */
export function monthsWithData(items: { date: string }[]): string[] {
  const set = new Set<string>();
  for (const item of items) set.add(monthKey(item.date));
  return [...set].sort((a, b) => b.localeCompare(a));
}
