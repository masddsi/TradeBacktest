import { useMemo, useState } from 'react';
import { FlaskConical, Info } from 'lucide-react';
import { useSettings, useTrades } from '../../lib/hooks';
import { monthKey, monthShortLabel, monthsWithData } from '../../lib/ranges';
import { brl, brlSigned, pct, shortDate } from '../../lib/format';
import {
  simulateExam,
  type ExamEvent,
  type ExamRules,
  type ExamStatus,
  type Management,
} from '../../lib/simulate';
import { EquityChart } from '../../components/EquityChart';
import { KpiCard } from '../../components/KpiCard';
import { Button, EmptyState, Panel, Pill, ResultBadge } from '../../components/ui';

const LOTE_PRESETS = [1, 2, 5, 10];

type Source = 'all' | 'months';

const STATUS_LABEL: Record<ExamStatus, string> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  em_andamento: 'Em andamento',
  sem_dados: 'Sem operações',
};

const STATUS_TONE: Record<ExamStatus, 'gain' | 'loss' | 'accent' | 'neutral'> = {
  aprovado: 'gain',
  reprovado: 'loss',
  em_andamento: 'accent',
  sem_dados: 'neutral',
};

const EVENT_LABEL: Record<ExamEvent, string> = {
  meta: 'Meta atingida',
  daily: 'Perda diária',
  total: 'Perda máxima',
};

function MoneyField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  // Enquanto o campo está em foco, mostramos um rascunho em texto (string).
  // Ao focar num campo com 0, o zero é limpo para o usuário digitar direto.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 focus-within:border-accent/60">
        <span className="font-mono text-xs text-muted">R$</span>
        <input
          type="number"
          min={0}
          step="0.01"
          value={draft ?? String(value)}
          onFocus={() => setDraft(value === 0 ? '' : String(value))}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value) || 0));
          }}
          onBlur={() => setDraft(null)}
          className="w-full bg-transparent font-mono text-sm text-text outline-none"
        />
      </div>
      <span className="mt-1 block text-[11px] text-muted/70">{hint}</span>
    </label>
  );
}

export function SimulatorView() {
  const { data: trades, isLoading } = useTrades();
  const { data: settings } = useSettings();

  const [source, setSource] = useState<Source>('all');
  const [months, setMonths] = useState<string[]>([]);
  const [lote, setLote] = useState(1);
  const [management, setManagement] = useState<Management>('conservador');
  const [banca, setBanca] = useState<number | null>(null);
  const [meta, setMeta] = useState(0);
  const [maxLoss, setMaxLoss] = useState(0);
  const [maxDaily, setMaxDaily] = useState(0);

  const bancaInicial = banca ?? settings?.bankroll ?? 0;
  const rules = useMemo<ExamRules>(() => ({ meta, maxLoss, maxDailyLoss: maxDaily }), [meta, maxLoss, maxDaily]);

  // Meses disponíveis (só os que têm operações), do mais recente ao mais antigo.
  const monthsByYear = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of monthsWithData(trades ?? [])) {
      const year = key.slice(0, 4);
      map.set(year, [...(map.get(year) ?? []), key]);
    }
    return [...map.entries()];
  }, [trades]);

  const scoped = useMemo(() => {
    const all = trades ?? [];
    return source === 'all' ? all : all.filter((t) => months.includes(monthKey(t.date)));
  }, [trades, source, months]);

  const sim = useMemo(
    () => simulateExam(scoped, { lote, bancaInicial, rules, management }),
    [scoped, lote, bancaInicial, rules, management],
  );

  const curve = useMemo(
    () => sim.rows.map((r) => ({ date: r.trade.date, equity: r.equity, pnl: r.pnl })),
    [sim],
  );

  const noMonths = source === 'months' && months.length === 0;
  const eventRow = useMemo(() => sim.rows.find((r) => r.event), [sim]);
  const stopNote =
    sim.skipped > 0
      ? ` ${sim.skipped} ${
          sim.skipped === 1
            ? 'operação seguinte não foi simulada'
            : 'operações seguintes não foram simuladas'
        }.`
      : '';
  const statusSub = noMonths
    ? 'selecione ao menos um mês'
    : sim.status === 'sem_dados'
      ? 'sem operações na fonte'
      : sim.status === 'aprovado' && sim.eventDate
        ? `meta em ${shortDate(sim.eventDate)}`
        : sim.status === 'reprovado' && sim.eventDate
          ? `quebrou em ${shortDate(sim.eventDate)}`
          : sim.status === 'em_andamento' && rules.meta > 0
            ? `faltam ${brl(sim.missingToGoal)}`
            : 'defina meta e limites';

  const emptyTitle = noMonths ? 'Selecione ao menos um mês' : 'Nenhuma operação na fonte';
  const emptyHint = noMonths
    ? 'Marque um ou mais meses na fonte de dados.'
    : 'Ajuste a fonte de dados ou registre operações.';

  function toggleMonth(key: string) {
    setMonths((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]));
  }

  function toggleYear(keys: string[]) {
    const allSelected = keys.every((k) => months.includes(k));
    setMonths((prev) =>
      allSelected ? prev.filter((m) => !keys.includes(m)) : [...new Set([...prev, ...keys])],
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-panel px-4 py-3">
        <Info size={15} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-muted">
          Simule um teste de mesa proprietária com as operações que você já registrou. Escolha a fonte de
          dados, o gerenciamento de contratos, a banca inicial, a meta do teste e os limites de perda — o
          simulador recalcula cada operação, mostra a banca acumulada até a decisão do teste e indica se
          você passaria (aprovado ou reprovado). É só leitura: nada é salvo e as operações do journal não
          são alteradas.
        </p>
      </div>

      <Panel
        title="Fonte de dados"
        subtitle="Escolha quais operações entram na simulação"
        action={
          <div className="flex gap-1">
            <Pill active={source === 'all'} onClick={() => setSource('all')}>
              Todas as operações
            </Pill>
            <Pill active={source === 'months'} onClick={() => setSource('months')}>
              Meses específicos
            </Pill>
          </div>
        }
      >
        {source === 'all' ? (
          <p className="text-xs text-muted">
            Simulando <span className="font-mono text-text">{scoped.length}</span>{' '}
            {scoped.length === 1 ? 'operação cadastrada' : 'operações cadastradas'}.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted">
                {months.length} {months.length === 1 ? 'mês' : 'meses'} · {scoped.length}{' '}
                {scoped.length === 1 ? 'operação' : 'operações'}
              </span>
              <Button variant="ghost" onClick={() => setMonths([])} disabled={months.length === 0}>
                Limpar
              </Button>
            </div>

            {monthsByYear.length === 0 ? (
              <p className="text-xs text-muted/70">
                Nenhuma operação cadastrada ainda — registre operações para escolher meses.
              </p>
            ) : (
              <div className="space-y-2.5">
                {monthsByYear.map(([year, keys]) => {
                  const allSelected = keys.every((k) => months.includes(k));
                  return (
                    <div key={year} className="flex flex-wrap items-center gap-1.5">
                      <span className="w-10 font-mono text-xs text-muted">{year}</span>
                      {keys.map((key) => (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={months.includes(key)}
                          onClick={() => toggleMonth(key)}
                          className={`rounded-md border px-2.5 py-1 font-mono text-xs capitalize transition-colors ${
                            months.includes(key)
                              ? 'border-accent/40 bg-accent/10 text-accent'
                              : 'border-border text-muted hover:text-text'
                          }`}
                        >
                          {monthShortLabel(key)}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => toggleYear(keys)}
                        className="ml-1 rounded-md px-2 py-1 text-[11px] text-muted/70 transition-colors hover:text-text"
                      >
                        {allSelected ? 'limpar' : 'todos'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Panel>

      <Panel
        title="Parâmetros da simulação"
        subtitle="Reavalie as operações com outro lote, banca inicial e gerenciamento de contratos"
      >
        <div className="mb-4">
          <span className="mb-1.5 block text-xs font-medium text-muted">Gerenciamento do teste</span>
          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-panel p-1">
            <Pill
              active={management === 'conservador'}
              onClick={() => setManagement('conservador')}
            >
              Conservador
            </Pill>
            <Pill active={management === 'arrojado'} onClick={() => setManagement('arrojado')}>
              Arrojado
            </Pill>
          </div>
          <p className="mt-1.5 text-[11px] text-muted/70">
            {management === 'conservador'
              ? 'Mantém o mesmo número de contratos durante todo o teste.'
              : 'A cada R$ 1.000 de lucro sobre a banca inicial, adiciona 2 contratos à operação seguinte. Se a banca voltar à inicial ou menos, retorna ao lote inicial.'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-muted">
              {management === 'conservador' ? 'Contratos por operação' : 'Contratos iniciais'}
            </span>
            <div className="flex items-stretch gap-1">
              <button
                type="button"
                onClick={() => setLote((c) => Math.max(1, c - 1))}
                className="w-9 rounded-lg border border-border bg-surface text-lg text-muted hover:text-text"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={lote}
                onChange={(e) => setLote(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                className="w-full rounded-lg border border-border bg-surface px-2 py-2 text-center font-mono text-sm text-text outline-none focus:border-accent/60"
              />
              <button
                type="button"
                onClick={() => setLote((c) => c + 1)}
                className="w-9 rounded-lg border border-border bg-surface text-lg text-muted hover:text-text"
              >
                +
              </button>
            </div>
            <div className="mt-1.5 flex gap-1">
              {LOTE_PRESETS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLote(n)}
                  className={`flex-1 rounded-md border py-1 font-mono text-xs ${
                    lote === n
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-border text-muted hover:text-text'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <MoneyField
            label="Banca inicial"
            hint="Ponto de partida da simulação."
            value={bancaInicial}
            onChange={setBanca}
          />
          <MoneyField
            label="Meta do Teste"
            hint="0 = sem meta. Ex.: alvo do exame da mesa."
            value={meta}
            onChange={setMeta}
          />
          <MoneyField
            label="Perda máxima total"
            hint="Sobre a banca inicial. 0 = sem limite."
            value={maxLoss}
            onChange={setMaxLoss}
          />
          <MoneyField
            label="Perda máxima diária"
            hint={
              (settings?.daily_max_loss ?? 0) > 0
                ? `0 = sem limite. Sugerido: ${brl(settings?.daily_max_loss ?? 0)}.`
                : '0 = sem limite.'
            }
            value={maxDaily}
            onChange={setMaxDaily}
          />
          <div className="flex items-end">
            <p className="rounded-lg border border-border bg-surface px-3 py-2 text-[11px] text-muted">
              Cada operação mantém o R$/contrato registrado (inclui perdas personalizadas) e é
              redimensionada para o lote do gerenciamento escolhido. Nada é salvo.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          label="Banca final"
          value={brl(sim.finalEquity)}
          tone={sim.finalEquity >= bancaInicial ? 'gain' : 'loss'}
          hint="Saldo ao final da simulação: banca inicial mais o P&L das operações simuladas, já considerando a meta e os limites."
          sub={
            sim.skipped > 0
              ? `${sim.event === 'meta' ? 'na aprovação' : 'na reprovação'} · ini ${brl(bancaInicial)}`
              : `ini ${brl(bancaInicial)}`
          }
        />
        <KpiCard
          label="P&L simulado"
          value={brlSigned(sim.totalPnl)}
          tone={sim.totalPnl >= 0 ? 'gain' : 'loss'}
          sub={`${sim.rows.length} operações`}
          hint="Resultado total das operações recalculadas com o gerenciamento de contratos escolhido."
        />
        <KpiCard
          label="Acerto"
          value={pct(sim.winRate)}
          tone="accent"
          sub={`${sim.wins}W · ${sim.losses}L`}
          hint="Percentual de operações vencedoras entre as operações efetivamente simuladas."
        />
        <KpiCard
          label="Drawdown máx"
          value={brl(sim.maxDrawdown)}
          tone="loss"
          sub="pico até o vale"
          hint="Maior queda da banca simulada desde um topo até o vale seguinte, em R$."
        />
        <KpiCard
          label="ROI"
          value={pct(sim.roi)}
          tone={sim.roi >= 0 ? 'gain' : 'loss'}
          sub="sobre a banca inicial"
          hint="Retorno sobre a banca inicial: P&L simulado dividido pela banca inicial."
        />
        <KpiCard
          label="Status do exame"
          value={STATUS_LABEL[sim.status]}
          tone={STATUS_TONE[sim.status]}
          sub={statusSub}
          hint="Aprovado ao atingir a meta; reprovado ao violar a perda diária ou total; em andamento quando o período termina sem nenhuma decisão."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Curva de banca"
          subtitle="Banca acumulada com os contratos e a banca inicial simulados"
          className="xl:col-span-2"
        >
          <div className="h-[300px]">
            {curve.length > 0 ? (
              <EquityChart data={curve} />
            ) : (
              <EmptyState title={emptyTitle} hint={emptyHint} />
            )}
          </div>
        </Panel>

        <Panel title="Regras do exame">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted">Meta do Teste</span>
              <span className="shrink-0 text-right font-mono text-xs">
                {rules.meta > 0 ? brl(rules.meta) : '—'}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted">Perda máxima total</span>
              <span className="shrink-0 text-right font-mono text-xs">
                {rules.maxLoss > 0 ? brl(rules.maxLoss) : '—'}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-muted">Perda máxima diária</span>
              <span className="shrink-0 text-right font-mono text-xs">
                {rules.maxDailyLoss > 0 ? brl(rules.maxDailyLoss) : '—'}
              </span>
            </li>
            {rules.maxLoss > 0 && (
              <li className="flex items-center justify-between gap-3 border-t border-border pt-2">
                <span className="text-muted">Margem de perda restante</span>
                <span className="shrink-0 text-right font-mono text-xs text-loss">
                  {brl(sim.remainingLoss)}
                </span>
              </li>
            )}
            {rules.meta > 0 && sim.status === 'em_andamento' && (
              <li className="flex items-center justify-between gap-3">
                <span className="text-muted">Falta para a meta</span>
                <span className="shrink-0 text-right font-mono text-xs text-accent">
                  {brl(sim.missingToGoal)}
                </span>
              </li>
            )}
          </ul>

          <p
            className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
              sim.status === 'aprovado'
                ? 'border-gain/40 bg-gain/10 text-gain'
                : sim.status === 'reprovado'
                  ? 'border-loss/40 bg-loss/10 text-loss'
                  : 'border-border bg-surface text-muted'
            }`}
          >
            {noMonths
              ? 'Selecione ao menos um mês na fonte de dados.'
              : sim.status === 'aprovado' && sim.eventDate
                ? `Meta atingida em ${shortDate(sim.eventDate)} — simulação aprovada.${stopNote}`
                : sim.status === 'reprovado' && sim.eventDate
                  ? `Limite de ${sim.event === 'daily' ? 'perda diária' : 'perda máxima'} violado em ${shortDate(
                      sim.eventDate,
                    )}${eventRow ? ` (${brlSigned(eventRow.pnl)})` : ''}.${stopNote}`
                  : sim.status === 'em_andamento'
                    ? rules.meta > 0
                      ? 'Período terminou sem atingir a meta nem violar os limites.'
                      : 'Defina meta e limites para avaliar a aprovação.'
                    : 'Nenhuma operação na fonte de dados selecionada.'}
          </p>
        </Panel>
      </div>

      <Panel
        title="Operações simuladas"
        subtitle={`Ordem cronológica · lote ${
          management === 'conservador' ? 'fixo' : 'inicial'
        } de ${lote} ${lote === 1 ? 'contrato' : 'contratos'}${
          management === 'arrojado' ? ' · gerenciamento arrojado' : ''
        }${sim.skipped > 0 ? ` · encerrada na ${sim.event === 'meta' ? 'aprovação' : 'reprovação'}` : ''}`}
        bodyClassName="p-0"
      >
        {isLoading ? (
          <EmptyState title="Carregando…" />
        ) : sim.rows.length === 0 ? (
          <EmptyState title={emptyTitle} hint={emptyHint} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium">Resultado</th>
                  <th className="px-4 py-2.5 text-right font-medium">R$/contr.</th>
                  <th className="px-4 py-2.5 text-right font-medium">Lote</th>
                  <th className="px-4 py-2.5 text-right font-medium">P&amp;L</th>
                  <th className="px-4 py-2.5 text-right font-medium">Acumulado</th>
                  <th className="px-4 py-2.5 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sim.rows.map((r) => (
                  <tr
                    key={r.trade.id}
                    className={
                      r.event === 'meta'
                        ? 'bg-gain/5'
                        : r.event
                          ? 'bg-loss/5'
                          : 'hover:bg-panel-2/40'
                    }
                  >
                    <td className="px-4 py-2.5 font-mono text-xs">{shortDate(r.trade.date)}</td>
                    <td className="px-4 py-2.5">
                      <ResultBadge result={r.trade.result} />
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                      {brlSigned(r.valuePerContract)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                      {r.contracts}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${
                        r.pnl >= 0 ? 'text-gain' : 'text-loss'
                      }`}
                    >
                      {brlSigned(r.pnl)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-mono text-sm font-semibold tabular-nums ${
                        r.equity >= bancaInicial ? 'text-text' : 'text-loss'
                      }`}
                    >
                      {brl(r.equity)}
                    </td>
                    <td className="px-4 py-2.5">
                      {r.event ? (
                        <span
                          className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                            r.event === 'meta'
                              ? 'border-gain/40 bg-gain/10 text-gain'
                              : 'border-loss/40 bg-loss/10 text-loss'
                          }`}
                        >
                          {EVENT_LABEL[r.event]}
                        </span>
                      ) : (
                        <span className="text-xs text-muted/50">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border-strong bg-surface/60">
                  <td className="px-4 py-2.5 text-xs text-muted" colSpan={4}>
                    {sim.rows.length} operações · {sim.wins}W / {sim.losses}L
                  </td>
                  <td
                    className={`px-4 py-2.5 text-right font-mono text-sm font-bold tabular-nums ${
                      sim.totalPnl >= 0 ? 'text-gain' : 'text-loss'
                    }`}
                  >
                    {brlSigned(sim.totalPnl)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm font-bold tabular-nums">
                    {brl(sim.finalEquity)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>

      <p className="flex items-center gap-2 px-1 text-xs text-muted">
        <FlaskConical size={13} className="shrink-0" />
        Simulação somente leitura: as operações registradas não são alteradas.
      </p>
    </div>
  );
}
