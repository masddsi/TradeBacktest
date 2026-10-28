import { useMemo, useState } from 'react';
import { Activity, Plus, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useSettings, useStats, useTrades } from '../../lib/hooks';
import { todayISO, yearRange } from '../../lib/ranges';
import { brl, brlSigned, pct, ratio, shortDate, weekday } from '../../lib/format';
import type { Trade } from '../../lib/types';
import { EquityChart } from '../../components/EquityChart';
import { CalendarHeatmap } from '../../components/CalendarHeatmap';
import { KpiCard } from '../../components/KpiCard';
import { SetupPicker } from '../../components/SetupPicker';
import { YearBankroll } from '../../components/YearBankroll';
import { Button, EmptyState, Panel, ResultBadge } from '../../components/ui';

export function Dashboard({
  onNewTrade,
  onEditTrade,
  onDayClick,
}: {
  onNewTrade: () => void;
  onEditTrade: (trade: Trade) => void;
  onDayClick: (date: string) => void;
}) {
  // Todos os anos vêm do servidor uma vez; o ano selecionado dita o resto da tela.
  const { data: allTrades } = useTrades();
  const [year, setYear] = useState<number | null>(null);
  const [setups, setSetups] = useState<string[]>([]);

  // Padrão: ano da operação mais recente (a lista vem em ordem desc); senão, o ano atual.
  const effectiveYear = year ?? Number((allTrades ?? [])[0]?.date.slice(0, 4) ?? new Date().getFullYear());
  const currentYear = new Date().getFullYear();
  const isCurrentYear = effectiveYear === currentYear;

  const params = useMemo(() => {
    const base = yearRange(effectiveYear);
    return setups.length ? { ...base, setups } : base;
  }, [effectiveYear, setups]);
  const { data: stats } = useStats(params);
  const { data: settings } = useSettings();

  // Operações com o filtro de estratégia (todos os anos) — alimenta o calendário
  // e seus anos disponíveis.
  const filteredTrades = useMemo(() => {
    const setupSet = setups.length ? new Set(setups) : null;
    return (allTrades ?? []).filter((t) => !setupSet || setupSet.has(t.setup ?? ''));
  }, [allTrades, setups]);

  // Operações do ano selecionado.
  const yearTrades = useMemo(
    () => filteredTrades.filter((t) => t.date.startsWith(`${effectiveYear}-`)),
    [filteredTrades, effectiveYear],
  );

  const recent = useMemo(() => yearTrades.slice(0, 6), [yearTrades]);
  const today = todayISO();
  // No ano atual, mostra o dia de hoje; em anos passados, o último dia operado do ano.
  const dayTrade = isCurrentYear
    ? filteredTrades.find((t) => t.date === today)
    : (yearTrades[0] ?? null);
  const dayPnl = dayTrade?.pnl ?? 0;
  const goal = settings?.daily_goal ?? 0;
  const goalPct = goal > 0 ? Math.min(1, Math.max(0, dayPnl / goal)) : 0;
  const yearPnl = stats?.totalPnl ?? 0;

  const streakTone =
    stats?.currentResult === 'WIN' ? 'gain' : stats?.currentResult === 'LOSS' ? 'loss' : 'neutral';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel px-2.5 py-1.5">
          <span className="text-xs text-muted">Estratégia</span>
          <SetupPicker selected={setups} onChange={setSetups} />
        </div>
        <Button variant="primary" onClick={onNewTrade}>
          <Plus size={16} /> Nova operação
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          label="Resultado líquido"
          value={brlSigned(stats?.totalPnl ?? 0)}
          tone={(stats?.totalPnl ?? 0) >= 0 ? 'gain' : 'loss'}
          sub={`${stats?.wins ?? 0}W · ${stats?.losses ?? 0}L`}
          hint="Soma dos resultados das operações do ano selecionado: ganhos menos perdas. Valores positivos indicam lucro; negativos, prejuízo."
          icon={stats && stats.totalPnl >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
        />
        <KpiCard
          label="Taxa de acerto"
          value={pct(stats?.winRate ?? 0)}
          tone="accent"
          sub={`${stats?.total ?? 0} operações`}
          hint="Percentual de operações vencedoras (WIN) no ano selecionado. É calculada como WINs ÷ total de operações."
          icon={<Target size={15} />}
        />
        <KpiCard
          label="Profit factor"
          value={ratio(stats?.profitFactor ?? 0)}
          tone={(stats?.profitFactor ?? 0) >= 1 ? 'gain' : 'loss'}
          sub={`${brl(stats?.grossProfit ?? 0)} / ${brl(stats?.grossLoss ?? 0)}`}
          hint="Ganhos brutos divididos pelas perdas brutas. Acima de 1 significa lucro; abaixo de 1, prejuízo."
          icon={<Activity size={15} />}
        />
        <KpiCard
          label="Payoff"
          value={ratio(stats?.payoff ?? 0)}
          sub={`G ${brl(stats?.avgWin ?? 0)} · L ${brl(stats?.avgLoss ?? 0)}`}
          hint="Ganho médio das operações vencedoras dividido pela perda média das perdedoras: quanto se ganha, em média, para cada R$ 1 perdido."
        />
        <KpiCard
          label="Sequência"
          value={`${stats?.currentStreak ?? 0} ${stats?.currentResult ?? ''}`.trim()}
          tone={streakTone}
          sub={`máx ${stats?.maxWinStreak ?? 0}W / ${stats?.maxLossStreak ?? 0}L`}
          hint="Resultado da sequência atual (WIN ou LOSS) e quantas operações ela dura. O texto abaixo mostra a maior sequência de ganhos e de perdas do ano selecionado."
        />
        <KpiCard
          label="Drawdown máx"
          value={brl(stats?.maxDrawdown ?? 0)}
          tone="loss"
          sub={`melhor ${brl(stats?.bestDay?.pnl ?? 0)} · pior ${brl(stats?.worstDay?.pnl ?? 0)}`}
          hint="Maior queda da curva de capital desde um topo até o vale seguinte. O texto abaixo mostra o melhor e o pior dia do ano selecionado."
        />
      </div>

      <Panel title="Curva de capital" subtitle="Evolução do P&L acumulado no ano selecionado">
        <div className="h-[300px]">
          {stats && stats.equityCurve.length > 0 ? (
            <EquityChart data={stats.equityCurve} />
          ) : (
            <EmptyState title="Sem dados no ano selecionado" hint="Registre operações para ver a curva." />
          )}
        </div>
      </Panel>

      {stats && stats.total > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel
            title="Desempenho por módulo"
            subtitle="Linha de corte do sistema: 62,5% de acerto"
            bodyClassName="p-0"
          >
            {stats.bySetup.length === 0 ? (
              <EmptyState title="Sem dados de setup" hint="Marque o módulo ao registrar a operação." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-4 py-2.5 font-medium">Módulo</th>
                    <th className="px-4 py-2.5 text-right font-medium">Ops</th>
                    <th className="px-4 py-2.5 text-right font-medium">Acerto</th>
                    <th className="px-4 py-2.5 text-right font-medium">P&amp;L</th>
                    <th className="px-4 py-2.5 text-right font-medium">R$/op</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.bySetup.map((g) => (
                    <tr key={g.key} className="hover:bg-panel-2/40">
                      <td className="px-4 py-2.5 text-xs font-medium">{g.key}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                        {g.total} <span className="text-muted/60">({g.wins}W/{g.losses}L)</span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${
                          g.winRate >= 0.625 ? 'text-gain' : 'text-loss'
                        }`}
                      >
                        {pct(g.winRate)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${
                          g.pnl >= 0 ? 'text-gain' : 'text-loss'
                        }`}
                      >
                        {brlSigned(g.pnl)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums ${
                          g.avgPnl >= 0 ? 'text-muted' : 'text-loss'
                        }`}
                      >
                        {brlSigned(g.avgPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel
            title="Compra vs Venda"
            subtitle="Desempenho por direção da operação"
            bodyClassName="p-0"
          >
            {stats.byDirection.length === 0 ? (
              <EmptyState
                title="Sem direção registrada"
                hint="Marque Compra ou Venda ao registrar a operação."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-4 py-2.5 font-medium">Direção</th>
                    <th className="px-4 py-2.5 text-right font-medium">Ops</th>
                    <th className="px-4 py-2.5 text-right font-medium">Acerto</th>
                    <th className="px-4 py-2.5 text-right font-medium">P&amp;L</th>
                    <th className="px-4 py-2.5 text-right font-medium">R$/op</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.byDirection.map((g) => (
                    <tr key={g.key} className="hover:bg-panel-2/40">
                      <td className="px-4 py-2.5 text-xs font-medium">
                        <span
                          className={`font-mono font-bold ${g.key === 'C' ? 'text-gain' : 'text-loss'}`}
                        >
                          {g.key === 'C' ? '▲ Compra' : '▼ Venda'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">
                        {g.total} <span className="text-muted/60">({g.wins}W/{g.losses}L)</span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs font-semibold ${
                          g.winRate >= 0.625 ? 'text-gain' : 'text-loss'
                        }`}
                      >
                        {pct(g.winRate)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs font-semibold tabular-nums ${
                          g.pnl >= 0 ? 'text-gain' : 'text-loss'
                        }`}
                      >
                        {brlSigned(g.pnl)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-xs tabular-nums ${
                          g.avgPnl >= 0 ? 'text-muted' : 'text-loss'
                        }`}
                      >
                        {brlSigned(g.avgPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Calendário de resultados"
          subtitle={`Ano ${effectiveYear} · Verde = gain · Vermelho = loss`}
          className="xl:col-span-2"
        >
          <CalendarHeatmap
            trades={filteredTrades}
            year={effectiveYear}
            onYearChange={setYear}
            onDayClick={onDayClick}
            onTradeClick={onEditTrade}
          />
        </Panel>

        <div className="space-y-4">
          <Panel title={isCurrentYear ? 'Status de hoje' : `Último dia de ${effectiveYear}`}>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="font-mono text-xl font-bold tabular-nums [overflow-wrap:anywhere] sm:text-2xl">
                <span
                  className={dayPnl > 0 ? 'text-gain' : dayPnl < 0 ? 'text-loss' : 'text-muted'}
                >
                  {dayPnl === 0 ? brl(0) : brlSigned(dayPnl)}
                </span>
              </span>
              <span className="text-right font-mono text-xs text-muted">
                {dayTrade ? `${shortDate(dayTrade.date)} · ` : ''}
                meta {brl(goal)} · stop {brl(settings?.daily_max_loss ?? 0)}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full rounded-full transition-all ${
                  dayPnl < 0 ? 'bg-loss' : 'bg-gain'
                }`}
                style={{ width: `${Math.round(goalPct * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {dayPnl >= goal && goal > 0
                ? 'Meta diária atingida. Bom trabalho.'
                : dayPnl < 0 && Math.abs(dayPnl) >= (settings?.daily_max_loss ?? 0)
                  ? 'Limite de perda atingido — encerre o dia.'
                  : 'Progresso em relação à meta diária.'}
            </p>
            <YearBankroll year={effectiveYear} yearPnl={yearPnl} />
          </Panel>

          <Panel title="Últimas operações" bodyClassName="p-0">
            {recent.length === 0 ? (
              <EmptyState title="Nenhuma operação registrada" />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => onEditTrade(t)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-panel-2/50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-14 font-mono text-xs text-muted">{shortDate(t.date)}</span>
                        <ResultBadge result={t.result} />
                        <span className="font-mono text-xs text-muted">{t.contracts}x</span>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-xs font-semibold tabular-nums sm:text-sm ${
                          t.pnl >= 0 ? 'text-gain' : 'text-loss'
                        }`}
                      >
                        {brlSigned(t.pnl)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {stats && stats.total > 0 && stats.bestDay && (
        <p className="px-1 text-xs text-muted">
          Melhor dia: {weekday(stats.bestDay.date)} {shortDate(stats.bestDay.date)} (
          {brlSigned(stats.bestDay.pnl)}) · Pior dia: {shortDate(stats.worstDay?.date ?? '')} (
          {brlSigned(stats.worstDay?.pnl ?? 0)})
        </p>
      )}
    </div>
  );
}
