import type { ReactNode } from 'react';

export function KpiCard({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'gain' | 'loss' | 'neutral' | 'accent';
  icon?: ReactNode;
}) {
  const toneClass =
    tone === 'gain'
      ? 'text-gain'
      : tone === 'loss'
        ? 'text-loss'
        : tone === 'accent'
          ? 'text-accent'
          : 'text-text';

  return (
    <div className="rounded-xl border border-border bg-panel px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wider text-muted uppercase">{label}</span>
        {icon && <span className="text-muted/70">{icon}</span>}
      </div>
      <div className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 font-mono text-xs text-muted tabular-nums">{sub}</div>}
    </div>
  );
}
