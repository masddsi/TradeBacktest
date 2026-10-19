import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useCreateTrade, useSettings, useUpdateTrade } from '../lib/hooks';
import { todayISO } from '../lib/ranges';
import { SETUPS, type Direction, type Setup, type Trade, type TradeResult } from '../lib/types';
import { brlSigned } from '../lib/format';
import { Button } from './ui';

interface Props {
  open: boolean;
  onClose: () => void;
  trade?: Trade | null;
  initialDate?: string;
}

export function TradeFormModal({ open, onClose, trade = null, initialDate }: Props) {
  const { data: settings } = useSettings();
  const createTrade = useCreateTrade();
  const updateTrade = useUpdateTrade();
  const isEdit = Boolean(trade);

  const [date, setDate] = useState(todayISO());
  const [contracts, setContracts] = useState(1);
  const [result, setResult] = useState<TradeResult>('WIN');
  const [setup, setSetup] = useState<Setup | ''>('');
  const [direction, setDirection] = useState<Direction | null>(null);
  const [customLoss, setCustomLoss] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (trade) {
      setDate(trade.date);
      setContracts(trade.contracts);
      setResult(trade.result);
      setSetup(trade.setup ?? '');
      setDirection(trade.direction);
      setNotes(trade.notes ?? '');
      // Se o pnl difere do cálculo padrão, o loss foi personalizado: pré-preenche.
      const defaultLoss = trade.contracts * (settings?.loss_per_contract ?? 100);
      const isCustom = trade.result === 'LOSS' && trade.pnl !== -defaultLoss;
      setCustomLoss(isCustom ? String(-trade.pnl) : '');
    } else {
      setDate(initialDate ?? todayISO());
      setContracts(1);
      setResult('WIN');
      setSetup('');
      setDirection(null);
      setCustomLoss('');
      setNotes('');
    }
  }, [open, trade, initialDate, settings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const gain = settings?.gain_per_contract ?? 60;
  const loss = settings?.loss_per_contract ?? 100;
  const customLossValue = Number(customLoss);
  const hasCustomLoss =
    result === 'LOSS' && customLoss.trim() !== '' && Number.isFinite(customLossValue) && customLossValue > 0;
  const preview =
    result === 'WIN' ? contracts * gain : hasCustomLoss ? -customLossValue : -contracts * loss;
  const pending = createTrade.isPending || updateTrade.isPending;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const input = {
      date,
      contracts,
      result,
      setup: setup || null,
      direction,
      loss_total: hasCustomLoss ? customLossValue : null,
      notes: notes.trim() || null,
    };
    try {
      if (trade) {
        await updateTrade.mutateAsync({ id: trade.id, input });
      } else {
        await createTrade.mutateAsync(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={handleSubmit}
        className="animate-fade-in relative z-10 w-full max-w-lg rounded-xl border border-border-strong bg-panel shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-wide uppercase">
            {isEdit ? 'Editar Operação' : 'Registrar Operação'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-panel-2 hover:text-text"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Data da operação</span>
              <input
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text outline-none focus:border-accent/60"
              />
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted">Contratos</span>
              <div className="flex items-stretch gap-1">
                <button
                  type="button"
                  onClick={() => setContracts((c) => Math.max(1, c - 1))}
                  className="w-9 rounded-lg border border-border bg-surface text-lg text-muted hover:text-text"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={contracts}
                  onChange={(e) => setContracts(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-center font-mono text-sm text-text outline-none focus:border-accent/60"
                />
                <button
                  type="button"
                  onClick={() => setContracts((c) => c + 1)}
                  className="w-9 rounded-lg border border-border bg-surface text-lg text-muted hover:text-text"
                >
                  +
                </button>
              </div>
              <div className="mt-1.5 flex gap-1">
                {[1, 2, 5, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setContracts(n)}
                    className={`flex-1 rounded-md border py-1 font-mono text-xs ${
                      contracts === n
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-border text-muted hover:text-text'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">Resultado</span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setResult('WIN')}
                className={`rounded-lg border py-3 text-center transition-all ${
                  result === 'WIN'
                    ? 'border-gain bg-gain/15 text-gain'
                    : 'border-border text-muted hover:border-border-strong'
                }`}
              >
                <div className="text-sm font-bold tracking-widest">GAIN</div>
                <div className="mt-0.5 font-mono text-xs opacity-80">
                  {brlSigned(contracts * gain)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setResult('LOSS')}
                className={`rounded-lg border py-3 text-center transition-all ${
                  result === 'LOSS'
                    ? 'border-loss bg-loss/15 text-loss'
                    : 'border-border text-muted hover:border-border-strong'
                }`}
              >
                <div className="text-sm font-bold tracking-widest">LOSS</div>
                <div className="mt-0.5 font-mono text-xs opacity-80">
                  {brlSigned(hasCustomLoss ? -customLossValue : -contracts * loss)}
                </div>
              </button>
            </div>
          </div>

          {result === 'LOSS' && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">
                Perda personalizada (R$) <span className="text-muted/60">— opcional</span>
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={customLoss}
                onChange={(e) => setCustomLoss(e.target.value)}
                placeholder={`Padrão: ${brlSigned(-contracts * loss)} (${contracts} × ${brlSigned(-loss)})`}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-text outline-none placeholder:text-muted/50 focus:border-accent/60"
              />
              <span className="mt-1 block text-[11px] text-muted/70">
                Use quando o stop executado ficar diferente do padrão (spread, ajuste de stop).
                Vazio = valor padrão.
              </span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Setup / módulo</span>
              <select
                value={setup}
                onChange={(e) => setSetup(e.target.value as Setup | '')}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent/60"
              >
                <option value="">— Sem setup —</option>
                {SETUPS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted">Direção</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDirection((d) => (d === 'C' ? null : 'C'))}
                  className={`rounded-lg border py-2 font-mono text-xs font-bold tracking-widest transition-all ${
                    direction === 'C'
                      ? 'border-gain bg-gain/15 text-gain'
                      : 'border-border text-muted hover:border-border-strong'
                  }`}
                >
                  ▲ COMPRA
                </button>
                <button
                  type="button"
                  onClick={() => setDirection((d) => (d === 'V' ? null : 'V'))}
                  className={`rounded-lg border py-2 font-mono text-xs font-bold tracking-widest transition-all ${
                    direction === 'V'
                      ? 'border-loss bg-loss/15 text-loss'
                      : 'border-border text-muted hover:border-border-strong'
                  }`}
                >
                  ▼ VENDA
                </button>
              </div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Anotações do dia</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Contexto, disciplina, emoções, o que funcionou..."
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-muted/50 focus:border-accent/60"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-4 py-3">
            <span className="text-xs font-medium text-muted uppercase">Resultado do dia</span>
            <span
              className={`text-right font-mono text-lg font-bold tabular-nums [overflow-wrap:anywhere] sm:text-xl ${
                preview > 0 ? 'text-gain' : preview < 0 ? 'text-loss' : 'text-muted'
              }`}
            >
              {brlSigned(preview)}
            </span>
          </div>

          {error && (
            <p className="rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Registrar'}
          </Button>
        </footer>
      </form>
    </div>
  );
}
