import { useMemo, useState } from 'react';
import { Pencil, Search, StickyNote, Trash2 } from 'lucide-react';
import { useDeleteTrade, useTrades } from '../../lib/hooks';
import { brl, brlSigned, shortDate, weekday } from '../../lib/format';
import type { Trade, TradeResult } from '../../lib/types';
import { EmptyState, Panel, ResultBadge, Button } from '../../components/ui';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

type Filter = 'ALL' | TradeResult;

export function HistoryView({
  onEditTrade,
}: {
  onEditTrade: (trade: Trade) => void;
}) {
  const [month, setMonth] = useState(currentMonth());
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  const params = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) return {};
    const last = new Date(y, m, 0).getDate();
    return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
  }, [month]);

  const { data: trades = [], isLoading } = useTrades(params);
  const deleteTrade = useDeleteTrade();

  const rows = useMemo(() => {
    return trades.filter((t) => {
      if (filter !== 'ALL' && t.result !== filter) return false;
      if (query && !(t.setup ?? '').toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [trades, filter, query]);

  const totalPnl = rows.reduce((a, t) => a + t.pnl, 0);
  const wins = rows.filter((t) => t.result === 'WIN').length;

  async function handleDelete(trade: Trade) {
    if (!window.confirm(`Excluir a operação de ${shortDate(trade.date)}?`)) return;
    await deleteTrade.mutateAsync(trade.id);
  }

  return (
    <Panel
      title="Histórico de operações"
      bodyClassName="p-0"
      action={
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2.5 py-1.5 font-mono text-xs text-text outline-none focus:border-accent/60"
          />
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1.5">
            <Search size={13} className="text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="setup…"
              className="w-24 bg-transparent text-xs text-text outline-none placeholder:text-muted/50"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text outline-none focus:border-accent/60"
          >
            <option value="ALL">Todos</option>
            <option value="WIN">Gain</option>
            <option value="LOSS">Loss</option>
          </select>
        </div>
      }
    >
      {isLoading ? (
        <EmptyState title="Carregando…" />
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhuma operação encontrada" hint="Ajuste os filtros ou registre uma operação." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-2.5 font-medium">Data</th>
                <th className="px-4 py-2.5 font-medium">Dia</th>
                <th className="px-4 py-2.5 text-right font-medium">Contr.</th>
                <th className="px-4 py-2.5 font-medium">Resultado</th>
                <th className="px-4 py-2.5 text-right font-medium">P&amp;L</th>
                <th className="px-4 py-2.5 font-medium">Setup</th>
                <th className="px-4 py-2.5 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((t) => (
                <tr key={t.id} className="group hover:bg-panel-2/40">
                  <td className="px-4 py-2.5 font-mono text-xs">{shortDate(t.date)}</td>
                  <td className="px-4 py-2.5 text-xs capitalize text-muted">{weekday(t.date)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{t.contracts}</td>
                  <td className="px-4 py-2.5">
                    <ResultBadge result={t.result} />
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono text-sm font-semibold tabular-nums ${
                      t.pnl >= 0 ? 'text-gain' : 'text-loss'
                    }`}
                  >
                    {brlSigned(t.pnl)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      {t.direction && (
                        <span
                          className={`font-mono text-[10px] font-bold ${
                            t.direction === 'C' ? 'text-gain' : 'text-loss'
                          }`}
                        >
                          {t.direction === 'C' ? '▲' : '▼'}
                        </span>
                      )}
                      {t.notes && <StickyNote size={12} className="text-accent/70" />}
                      {t.setup || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => onEditTrade(t)}
                        className="rounded-md border border-border p-1.5 text-muted hover:text-text"
                        aria-label="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="rounded-md border border-border p-1.5 text-muted hover:border-loss/40 hover:text-loss"
                        aria-label="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-strong bg-surface/60">
                <td className="px-4 py-2.5 text-xs text-muted" colSpan={3}>
                  {rows.length} operações · {wins}W / {rows.length - wins}L
                </td>
                <td className="px-4 py-2.5 text-right text-xs text-muted">Total</td>
                <td
                  className={`px-4 py-2.5 text-right font-mono text-sm font-bold tabular-nums ${
                    totalPnl >= 0 ? 'text-gain' : 'text-loss'
                  }`}
                >
                  {brlSigned(totalPnl)}
                </td>
                <td colSpan={2} className="px-4 py-2.5 text-right text-xs text-muted">
                  {brl(totalPnl)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {rows.length > 0 && (
        <div className="flex justify-end border-t border-border p-3">
          <Button variant="ghost" onClick={() => setMonth(currentMonth())} className="text-xs">
            Mês atual
          </Button>
        </div>
      )}
    </Panel>
  );
}
