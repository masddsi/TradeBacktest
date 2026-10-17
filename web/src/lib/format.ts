const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function brl(value: number): string {
  return brlFormatter.format(value);
}

export function brlSigned(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${brlFormatter.format(Math.abs(value))}`;
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function ratio(value: number): string {
  if (!Number.isFinite(value)) return '∞';
  return value.toFixed(2);
}

export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(2)}`;
}

export function weekday(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
}
