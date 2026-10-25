import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TradeResult } from './types';

export interface DateRange {
  from?: string;
  to?: string;
}

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Intervalo cobrindo um ano inteiro (AAAA-01-01 a AAAA-12-31). */
export function yearRange(year: number): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

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
