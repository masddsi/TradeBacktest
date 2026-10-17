import { useMemo, useState } from 'react';
import { Activity, Plus, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useSettings, useStats, useTrades } from '../../lib/hooks';
import { RANGE_LABELS, rangeFor, todayISO, type RangeKey } from '../../lib/ranges';
import { brl, brlSigned, pct, ratio, shortDate, weekday } from '../../lib/format';
import type { Trade } from '../../lib/types';
import { EquityChart } from '../../components/EquityChart';
import { CalendarHeatmap } from '../../components/CalendarHeatmap';
import { KpiCard } from '../../components/KpiCard';
import { Button, EmptyState, Panel, Pill, ResultBadge } from '../../components/ui';

const RANGES: RangeKey[] = ['month', 'ytd', '30d', '90d', 'all'];

export function Dashboard({
  onNewTrade,
  onEditTrade,
  onDayClick,
}: {
  onNewTrade: () => void;
  onEditTrade: (trade: Trade) => void;
  onDayClick: (date: string) => void;
}) {
  const [range, setRange] = useState<RangeKey>('month');
  const params = useMemo(() => rangeFor(range), [range]);
  const { data: stats } = useStats(params);
  const { data: allTrades } = useTrades();
  const { data: settings } = useSettings();

  const recent = useMemo(() => (allTrades ?? []).slice(0, 6), [allTrades]);
  const today = todayISO();
  const todayPnl = (allTrades ?? []).find((t) => t.date === today)?.pnl ?? 0;
  const goal = settings?.daily_goal ?? 0;
  const goalPct = goal > 0 ? Math.min(1, Math.max(0, todayPnl / goal)) : 0;
  const bankroll = settings?.bankroll ?? 0;
  const totalPnlAll = useMemo(
    () => (allTrades ?? []).reduce((a, t) => a + t.pnl, 0),
    [allTrades],
  );
  const bankrollNow = bankroll + totalPnlAll;

  const streakTone =
    stats?.currentResult === 'WIN' ? 'gain' : stats?.currentResult === 'LOSS' ? 'loss' : 'neutral';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-panel p-1">
          {RANGES.map((key) => (
            <Pill key={key} active={range === key} onClick={() => setRange(key)}>
              {RANGE_LABELS[key]}
            </Pill>
          ))}
        </div>
        <Button variant="primary" onClick={onNewTrade}>
          <Plus size={16} /> Nova operação
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Resultado líquido"
          value={brlSigned(stats?.totalPnl ?? 0)}
          tone={(stats?.totalPnl ?? 0) >= 0 ? 'gain' : 'loss'}
          sub={`${stats?.wins ?? 0}W · ${stats?.losses ?? 0}L`}
          icon={stats && stats.totalPnl >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
        />
        <KpiCard
          label="Taxa de acerto"
          value={pct(stats?.winRate ?? 0)}
          tone="accent"
          sub={`${stats?.total ?? 0} operações`}
          icon={<Target size={15} />}
        />
        <KpiCard
          label="Profit factor"
          value={ratio(stats?.profitFactor ?? 0)}
          tone={(stats?.profitFactor ?? 0) >= 1 ? 'gain' : 'loss'}
          sub={`${brl(stats?.grossProfit ?? 0)} / ${brl(stats?.grossLoss ?? 0)}`}
          icon={<Activity size={15} />}
        />
        <KpiCard
          label="Payoff"
          value={ratio(stats?.payoff ?? 0)}
          sub={`G ${brl(stats?.avgWin ?? 0)} · L ${brl(stats?.avgLoss ?? 0)}`}
        />
        <KpiCard
          label="Sequência"
          value={`${stats?.currentStreak ?? 0} ${stats?.currentResult ?? ''}`.trim()}
          tone={streakTone}
          sub={`máx ${stats?.maxWinStreak ?? 0}W / ${stats?.maxLossStreak ?? 0}L`}
        />
        <KpiCard
          label="Drawdown máx"
          value={brl(stats?.maxDrawdown ?? 0)}
          tone="loss"
          sub={`melhor ${brl(stats?.bestDay?.pnl ?? 0)} · pior ${brl(stats?.worstDay?.pnl ?? 0)}`}
        />
      </div>

      <Panel title="Curva de capital" subtitle="Evolução do P&L acumulado no período">
        <div className="h-[300px]">
          {stats && stats.equityCurve.length > 0 ? (
            <EquityChart data={stats.equityCurve} />
          ) : (
            <EmptyState title="Sem dados no período" hint="Registre operações para ver a curva." />
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
          subtitle="Verde = gain · Vermelho = loss"
          className="xl:col-span-2"
        >
          <CalendarHeatmap trades={allTrades ?? []} onDayClick={onDayClick} />
        </Panel>

        <div className="space-y-4">
          <Panel title="Status de hoje">
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold tabular-nums">
                <span
                  className={todayPnl > 0 ? 'text-gain' : todayPnl < 0 ? 'text-loss' : 'text-muted'}
                >
                  {todayPnl === 0 ? brl(0) : brlSigned(todayPnl)}
                </span>
              </span>
              <span className="font-mono text-xs text-muted">
                meta {brl(goal)} · stop {brl(settings?.daily_max_loss ?? 0)}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full rounded-full transition-all ${
                  todayPnl < 0 ? 'bg-loss' : 'bg-gain'
                }`}
                style={{ width: `${Math.round(goalPct * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {todayPnl >= goal && goal > 0
                ? 'Meta diária atingida. Bom trabalho.'
                : todayPnl < 0 && Math.abs(todayPnl) >= (settings?.daily_max_loss ?? 0)
                  ? 'Limite de perda atingido — encerre o dia.'
                  : 'Progresso em relação à meta diária.'}
            </p>
            {bankroll > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
                <span className="text-xs text-muted">Banca atual</span>
                <span className="text-right">
                  <span
                    className={`font-mono text-sm font-semibold tabular-nums ${
                      bankrollNow >= bankroll ? 'text-gain' : 'text-loss'
                    }`}
                  >
                    {brl(bankrollNow)}
                  </span>
                  <span className="ml-1.5 font-mono text-[11px] text-muted/70">
                    ini {brl(bankroll)}
                  </span>
                </span>
              </div>
            )}
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
                      <div className="flex items-center gap-3">
                        <span className="w-16 font-mono text-xs text-muted">{shortDate(t.date)}</span>
                        <ResultBadge result={t.result} />
                        <span className="font-mono text-xs text-muted">{t.contracts}x</span>
                      </div>
                      <span
                        className={`font-mono text-sm font-semibold tabular-nums ${
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
