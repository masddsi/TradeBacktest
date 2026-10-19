import { useId, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

export function KpiCard({
  label,
  value,
  sub,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  hint?: string;
  tone?: 'gain' | 'loss' | 'neutral' | 'accent';
  icon?: ReactNode;
}) {
  const generatedId = useId();
  const hintId = `kpi-hint-${generatedId}`;
  const toneClass =
    tone === 'gain'
      ? 'text-gain'
      : tone === 'loss'
        ? 'text-loss'
        : tone === 'accent'
          ? 'text-accent'
          : 'text-text';

  return (
    <div className="relative min-w-0 rounded-xl border border-border bg-panel px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[11px] leading-snug font-medium tracking-wider text-muted uppercase">
          {label}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {icon && <span className="text-muted/70">{icon}</span>}
          {hint && (
            <span className="group inline-flex">
              <button
                type="button"
                aria-label={`Explicação sobre ${label}`}
                aria-describedby={hintId}
                onClick={(event) => event.currentTarget.focus()}
                className="cursor-help rounded p-1 text-muted/60 transition-colors hover:text-accent focus:text-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
              >
                <HelpCircle size={14} />
              </button>
              <span
                id={hintId}
                role="tooltip"
                className="pointer-events-none invisible absolute top-10 left-2 right-2 z-30 rounded-lg border border-border-strong bg-panel-2 px-3 py-2 text-left text-[10px] leading-relaxed font-normal tracking-normal text-text opacity-0 shadow-xl transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 sm:left-auto sm:right-2 sm:w-56 sm:text-[11px]"
              >
                {hint}
              </span>
            </span>
          )}
        </div>
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
