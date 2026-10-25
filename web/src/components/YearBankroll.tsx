import { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useBankrolls, useDeleteBankroll, useSetBankroll } from '../lib/hooks';
import { brl, brlSigned } from '../lib/format';

/**
 * Bloco "Banca no ano" do dashboard: banca inicial do ano selecionado + P&L do ano.
 * Ano sem banca mostra apenas o P&L, com ação para definir (inline no card).
 */
export function YearBankroll({ year, yearPnl }: { year: number; yearPnl: number }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setBankroll = useSetBankroll();
  const deleteBankroll = useDeleteBankroll();

  const { data: bankrolls } = useBankrolls();
  const raw = bankrolls?.[String(year)];
  const bankroll = typeof raw === 'number' ? raw : null;

  // Ao trocar o ano, descarta qualquer edição em andamento.
  useEffect(() => {
    setEditing(false);
    setError(null);
  }, [year]);

  function startEdit() {
    setDraft(bankroll === null ? '' : String(bankroll));
    setError(null);
    setEditing(true);
  }

  async function save() {
    // O input é type="number", então o valor já vem no formato numérico (ponto decimal).
    const value = Number(draft);
    if (!Number.isFinite(value) || value < 0) {
      setError('Valor inválido.');
      return;
    }
    try {
      await setBankroll.mutateAsync({ year, bankroll: value });
      setEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a banca.');
    }
  }

  async function clear() {
    if (!window.confirm(`Remover a banca inicial de ${year}? O card volta a mostrar só o P&L do ano.`))
      return;
    try {
      await deleteBankroll.mutateAsync(year);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover a banca.');
    }
  }

  if (editing) {
    return (
      <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="text-xs text-muted">Banca inicial de {year}</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 focus-within:border-accent/60">
              <span className="font-mono text-xs text-muted">R$</span>
              <input
                autoFocus
                type="number"
                min={0}
                step="any"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void save();
                  if (e.key === 'Escape') setEditing(false);
                }}
                className="w-24 bg-transparent font-mono text-sm text-text outline-none"
                aria-label={`Banca inicial de ${year}`}
              />
            </div>
            <button
              onClick={() => void save()}
              disabled={setBankroll.isPending}
              className="rounded-md border border-border p-1.5 text-gain hover:border-gain/60"
              aria-label="Salvar banca"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-md border border-border p-1 text-muted hover:border-border-strong hover:text-text"
              aria-label="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-[11px] text-loss">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-3 py-2">
      <span className="text-xs text-muted">Banca no ano</span>
      {bankroll === null ? (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted/70">
            sem banca · {brlSigned(yearPnl)} no ano
          </span>
          <button
            onClick={startEdit}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted hover:border-accent/60 hover:text-accent"
          >
            <Plus size={12} /> Definir banca
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-right">
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${
                yearPnl >= 0 ? 'text-gain' : 'text-loss'
              }`}
            >
              {brl(bankroll + yearPnl)}
            </span>
            <span className="ml-1.5 font-mono text-[11px] text-muted/70">
              ini {brl(bankroll)} · {brlSigned(yearPnl)} no ano
            </span>
          </span>
          <button
            onClick={startEdit}
            className="rounded-md border border-border p-1 text-muted hover:border-border-strong hover:text-text"
            aria-label="Editar banca do ano"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => void clear()}
            className="rounded-md border border-border p-1 text-muted hover:border-loss/60 hover:text-loss"
            aria-label="Remover banca do ano"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
      {error && <p className="w-full text-[11px] text-loss">{error}</p>}
    </div>
  );
}
