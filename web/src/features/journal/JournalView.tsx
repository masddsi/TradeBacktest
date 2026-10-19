import { useMemo, useState } from 'react';
import { Pencil, StickyNote } from 'lucide-react';
import { useTrades } from '../../lib/hooks';
import { brlSigned, shortDate, weekday } from '../../lib/format';
import type { Trade } from '../../lib/types';
import { Button, EmptyState, Panel, ResultBadge } from '../../components/ui';

export function JournalView({ onEditTrade }: { onEditTrade: (trade: Trade) => void }) {
  const { data: trades = [] } = useTrades();
  const [onlyWithNotes, setOnlyWithNotes] = useState(false);

  const entries = useMemo(() => {
    const sorted = [...trades].sort((a, b) => b.date.localeCompare(a.date));
    return onlyWithNotes ? sorted.filter((t) => t.notes) : sorted;
  }, [trades, onlyWithNotes]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase">Journal de operações</h2>
          <p className="mt-0.5 text-xs text-muted">
            Revise o contexto e a disciplina de cada dia.
          </p>
        </div>
        <Button
          variant={onlyWithNotes ? 'primary' : 'outline'}
          onClick={() => setOnlyWithNotes((v) => !v)}
        >
          <StickyNote size={14} /> Só com notas
        </Button>
      </div>

      {entries.length === 0 ? (
        <Panel>
          <EmptyState
            title={onlyWithNotes ? 'Nenhuma operação com anotações' : 'Nenhuma operação registrada'}
            hint="Adicione notas ao registrar ou editar uma operação."
          />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {entries.map((t) => (
            <article
              key={t.id}
              className="rounded-xl border border-border bg-panel p-4 transition-colors hover:border-border-strong"
            >
              <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <div>
                    <div className="font-mono text-sm font-semibold">{shortDate(t.date)}</div>
                    <div className="text-[11px] capitalize text-muted">{weekday(t.date)}</div>
                  </div>
                  <ResultBadge result={t.result} />
                  {t.direction && (
                    <span
                      className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                        t.direction === 'C'
                          ? 'border-gain/40 bg-gain/10 text-gain'
                          : 'border-loss/40 bg-loss/10 text-loss'
                      }`}
                    >
                      {t.direction === 'C' ? '▲ C' : '▼ V'}
                    </span>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      t.pnl >= 0 ? 'text-gain' : 'text-loss'
                    }`}
                  >
                    {brlSigned(t.pnl)}
                  </span>
                  <button
                    onClick={() => onEditTrade(t)}
                    className="rounded-md border border-border p-1.5 text-muted hover:text-text"
                    aria-label="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </header>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono">
                  {t.contracts} contratos
                </span>
                {t.setup && (
                  <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent">
                    {t.setup}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-text/80">
                {t.notes || <span className="text-muted/60 italic">Sem anotações para este dia.</span>}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
