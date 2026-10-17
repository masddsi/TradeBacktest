import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { TradeResult } from '../lib/types';

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
  bodyClassName = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-panel shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset] ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            {title && (
              <h2 className="text-[13px] font-semibold tracking-wide text-text uppercase">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName || 'p-4'}>{children}</div>
    </section>
  );
}

type Variant = 'primary' | 'ghost' | 'danger' | 'gain' | 'loss' | 'outline';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent/15 text-accent border border-accent/40 hover:bg-accent/25 hover:border-accent/60',
  ghost: 'bg-panel-2/60 text-muted border border-border hover:text-text hover:border-border-strong',
  outline: 'bg-transparent text-text border border-border-strong hover:bg-panel-2',
  danger: 'bg-loss/10 text-loss border border-loss/40 hover:bg-loss/20',
  gain: 'bg-gain text-[#04160d] border border-gain hover:brightness-110 font-semibold',
  loss: 'bg-loss text-[#1c0505] border border-loss hover:brightness-110 font-semibold',
};

export function Button({
  variant = 'ghost',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ResultBadge({ result }: { result: TradeResult }) {
  const win = result === 'WIN';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-semibold tracking-wide ${
        win ? 'border-gain/40 bg-gain/10 text-gain' : 'border-loss/40 bg-loss/10 text-loss'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${win ? 'bg-gain' : 'bg-loss'}`} />
      {result}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
      <p className="text-sm font-medium text-muted">{title}</p>
      {hint && <p className="text-xs text-muted/70">{hint}</p>}
    </div>
  );
}

export function Pill({
  active,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-accent/15 text-accent border border-accent/40'
          : 'text-muted border border-transparent hover:text-text hover:bg-panel-2'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}
