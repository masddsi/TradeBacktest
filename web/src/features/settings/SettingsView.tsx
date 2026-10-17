import { useEffect, useState } from 'react';
import { Check, RotateCcw, Trash2 } from 'lucide-react';
import { useDeleteAllTrades, useSettings, useTrades, useUpdateSettings } from '../../lib/hooks';
import { brl, brlSigned } from '../../lib/format';
import type { Settings } from '../../lib/types';
import { Button, Panel } from '../../components/ui';

const DEFAULTS: Settings = {
  gain_per_contract: 60,
  loss_per_contract: 100,
  daily_goal: 300,
  daily_max_loss: 200,
  bankroll: 0,
};

interface FieldDef {
  key: keyof Settings;
  label: string;
  hint: string;
  prefix: string;
}

const FIELDS: FieldDef[] = [
  {
    key: 'gain_per_contract',
    label: 'Gain por contrato',
    hint: 'Resultado positivo de 1 contrato no mini dólar.',
    prefix: 'R$',
  },
  {
    key: 'loss_per_contract',
    label: 'Loss por contrato',
    hint: 'Resultado negativo de 1 contrato no mini dólar.',
    prefix: 'R$',
  },
  { key: 'daily_goal', label: 'Meta diária', hint: 'Alvo de resultado por dia.', prefix: 'R$' },
  {
    key: 'daily_max_loss',
    label: 'Limite de perda diária',
    hint: 'Stop financeiro do dia.',
    prefix: 'R$',
  },
  {
    key: 'bankroll',
    label: 'Banca',
    hint: 'Valor de banca inicial (patrimônio de referência).',
    prefix: 'R$',
  },
];

export function SettingsView() {
  const { data } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: trades } = useTrades();
  const deleteAllTrades = useDeleteAllTrades();
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tradeCount = trades?.length ?? 0;

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  function set(key: keyof Settings, value: number) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    await updateSettings.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function deleteAll() {
    setError(null);
    if (
      !window.confirm(
        'Apagar TODAS as operações registradas? Esta ação é permanente e não pode ser desfeita.',
      )
    )
      return;
    try {
      await deleteAllTrades.mutateAsync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao apagar as operações.');
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel
        title="Parâmetros de cálculo"
        subtitle="Valores usados para calcular o resultado de cada operação"
        className="lg:col-span-2"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">{f.label}</span>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-accent/60">
                <span className="font-mono text-xs text-muted">{f.prefix}</span>
                <input
                  type="number"
                  min={0}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-transparent font-mono text-sm text-text outline-none"
                />
              </div>
              <span className="mt-1 block text-[11px] text-muted/70">{f.hint}</span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Button variant="primary" onClick={save} disabled={updateSettings.isPending}>
            <Check size={15} /> {updateSettings.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setForm(DEFAULTS);
              setSaved(false);
            }}
          >
            <RotateCcw size={14} /> Restaurar padrão
          </Button>
          {saved && <span className="text-xs text-gain">Configurações salvas.</span>}
        </div>
      </Panel>

      <Panel title="Pré-visualização">
        <p className="text-xs text-muted">Como o resultado é calculado:</p>
        <div className="mt-3 space-y-2 font-mono text-sm">
          <div className="flex items-center justify-between rounded-lg border border-gain/30 bg-gain/10 px-3 py-2">
            <span className="text-gain">1 contrato · GAIN</span>
            <span className="font-semibold text-gain">{brlSigned(form.gain_per_contract)}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-loss/30 bg-loss/10 px-3 py-2">
            <span className="text-loss">1 contrato · LOSS</span>
            <span className="font-semibold text-loss">{brlSigned(-form.loss_per_contract)}</span>
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-muted">
          Ex.: 5 contratos · GAIN = {brl(5 * form.gain_per_contract)}
          <br />3 contratos · LOSS = {brl(-3 * form.loss_per_contract)}
        </div>
      </Panel>

      <Panel
        title="Zona de risco"
        subtitle="Ações irreversíveis sobre as operações salvas"
        className="lg:col-span-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-loss/30 bg-loss/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text">Apagar todas as operações</p>
            <p className="mt-0.5 text-xs text-muted">
              {tradeCount === 0
                ? 'Nenhuma operação registrada no momento.'
                : `Remove permanentemente ${tradeCount} ${
                    tradeCount === 1 ? 'operação registrada' : 'operações registradas'
                  }. Esta ação não pode ser desfeita.`}
            </p>
          </div>
          <Button
            variant="danger"
            onClick={deleteAll}
            disabled={deleteAllTrades.isPending || tradeCount === 0}
          >
            <Trash2 size={15} />
            {deleteAllTrades.isPending ? 'Apagando…' : 'Apagar tudo'}
          </Button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-loss/40 bg-loss/10 px-3 py-2 text-sm text-loss">
            {error}
          </p>
        )}
      </Panel>
    </div>
  );
}
