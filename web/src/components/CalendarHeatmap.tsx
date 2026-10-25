import { useMemo, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Trade } from '../lib/types';
import { brlSigned, pct } from '../lib/format';
import { EmptyState } from './ui';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function CalendarHeatmap({
  trades,
  year,
  onYearChange,
  onDayClick,
}: {
  trades: Trade[];
  /** Ano controlado pelo componente pai (dashboard). */
  year: number;
  onYearChange: (year: number) => void;
  onDayClick?: (date: string) => void;
}) {
  const currentMonth = useMemo(() => startOfMonth(new Date()), []);

  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  // Mês só vale se pertencer ao ano controlado; caso contrário, recalcula:
  // último mês com operações do ano, ou o mesmo índice de mês de antes.
  const month = useMemo(() => {
    if (selectedMonth && selectedMonth.getFullYear() === year) return selectedMonth;
    const monthIndex = selectedMonth ? selectedMonth.getMonth() : currentMonth.getMonth();
    let latest = '';
    for (const t of trades) {
      if (t.date.startsWith(`${year}-`) && t.date > latest) latest = t.date;
    }
    return latest
      ? startOfMonth(new Date(`${latest}T12:00:00`))
      : startOfMonth(new Date(year, monthIndex, 1));
  }, [selectedMonth, year, trades, currentMonth]);

  function goMonth(next: Date) {
    if (next.getFullYear() !== year) onYearChange(next.getFullYear());
    setSelectedMonth(next);
  }

  const byDate = useMemo(() => {
    const map = new Map<string, Trade>();
    for (const t of trades) map.set(t.date, t);
    return map;
  }, [trades]);

  // Anos disponíveis: anos com operações + ano atual + ano selecionado.
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const t of trades) set.add(Number(t.date.slice(0, 4)));
    set.add(new Date().getFullYear());
    set.add(year);
    return [...set].sort((a, b) => b - a);
  }, [trades, year]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
      }),
    [month],
  );

  const maxAbs = useMemo(() => {
    let max = 0;
    for (const d of days) {
      const t = byDate.get(iso(d));
      if (t) max = Math.max(max, Math.abs(t.pnl));
    }
    return max || 1;
  }, [days, byDate]);

  const monthTrades = days
    .filter((d) => isSameMonth(d, month))
    .map((d) => byDate.get(iso(d)))
    .filter((t): t is Trade => Boolean(t));
  const monthPnl = monthTrades.reduce((a, t) => a + t.pnl, 0);
  const wins = monthTrades.filter((t) => t.result === 'WIN').length;
  const winRate = monthTrades.length > 0 ? wins / monthTrades.length : 0;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month.getMonth()}
            onChange={(e) =>
              setSelectedMonth(new Date(month.getFullYear(), Number(e.target.value), 1))
            }
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text capitalize outline-none focus:border-accent/60"
            aria-label="Selecionar mês"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {format(new Date(2000, i, 1), 'MMMM', { locale: ptBR })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => {
              onYearChange(Number(e.target.value));
              setSelectedMonth(null);
            }}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 font-mono text-xs text-text outline-none focus:border-accent/60"
            aria-label="Selecionar ano"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <span className="font-mono text-xs text-muted">
            {monthTrades.length} {monthTrades.length === 1 ? 'op' : 'ops'}
            {monthTrades.length > 0 && ` · ${wins}W/${monthTrades.length - wins}L`}
            {monthTrades.length > 0 && ` · ${pct(winRate)} acerto`}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`font-mono text-sm font-semibold tabular-nums ${
              monthPnl > 0 ? 'text-gain' : monthPnl < 0 ? 'text-loss' : 'text-muted'
            }`}
          >
            {brlSigned(monthPnl)}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => goMonth(subMonths(month, 1))}
              className="rounded-md border border-border p-1 text-muted hover:border-border-strong hover:text-text"
              aria-label="Mês anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => goMonth(addMonths(month, 1))}
              className="rounded-md border border-border p-1 text-muted hover:border-border-strong hover:text-text"
              aria-label="Próximo mês"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-[10px] font-medium text-muted uppercase">
            {w}
          </div>
        ))}
        {days.map((d) => {
          const key = iso(d);
          const trade = byDate.get(key);
          const inMonth = isSameMonth(d, month);
          const ratio = trade ? Math.min(1, Math.abs(trade.pnl) / maxAbs) : 0;
          const win = trade ? trade.pnl >= 0 : false;
          const bg = trade
            ? `rgba(${win ? '22, 199, 132' : '239, 83, 80'}, ${0.16 + ratio * 0.6})`
            : undefined;

          return (
            <button
              key={key}
              onClick={() => onDayClick?.(key)}
              title={trade ? `${trade.date} · ${trade.contracts} contratos · ${brlSigned(trade.pnl)}` : key}
              style={bg ? { backgroundColor: bg } : undefined}
              className={`flex h-14 flex-col justify-between rounded-md border p-1.5 text-left transition-colors ${
                inMonth ? 'border-border' : 'border-transparent opacity-35'
              } ${trade ? 'hover:brightness-125' : 'hover:border-border-strong'}`}
            >
              <span className="text-[11px] font-medium text-text/80">{format(d, 'd')}</span>
              {trade && (
                <span
                  className={`truncate font-mono text-[10px] font-semibold tabular-nums ${
                    win ? 'text-gain' : 'text-loss'
                  }`}
                >
                  {trade.pnl > 0 ? '+' : ''}
                  {trade.pnl}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {monthTrades.length === 0 && (
        <EmptyState title="Nenhuma operação neste mês" hint="Clique em um dia para registrar." />
      )}
    </div>
  );
}
