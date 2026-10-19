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
    <div className="min-w-0 rounded-xl border border-border bg-panel px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[11px] leading-snug font-medium tracking-wider text-muted uppercase">
          {label}
        </span>
        {icon && <span className="shrink-0 text-muted/70">{icon}</span>}
      </div>
      <div
        className={`mt-2 font-mono text-xl leading-tight font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-2xl ${toneClass}`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-1 font-mono text-xs leading-snug text-muted tabular-nums [overflow-wrap:anywhere]">
          {sub}
        </div>
      )}
    </div>
  );
}
