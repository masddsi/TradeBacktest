import type { Settings, Stats, Trade, TradeInput } from './types';

async function errorFrom(res: Response): Promise<Error> {
  let message = `Erro ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) message = body.error;
  } catch {
    /* resposta sem corpo JSON */
  }
  return new Error(message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });

  if (!res.ok) throw await errorFrom(res);

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function filenameFrom(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1] ?? null;
}

function qs(params: { from?: string; to?: string }): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

export interface RangeParams {
  from?: string;
  to?: string;
}

export const api = {
  listTrades: (params: RangeParams = {}) => request<Trade[]>(`/trades${qs(params)}`),
  createTrade: (input: TradeInput) =>
    request<Trade>('/trades', { method: 'POST', body: JSON.stringify(input) }),
  updateTrade: (id: number, input: TradeInput) =>
    request<Trade>(`/trades/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteTrade: (id: number) => request<void>(`/trades/${id}`, { method: 'DELETE' }),
  deleteAllTrades: () => request<{ deleted: number }>('/trades', { method: 'DELETE' }),
  stats: (params: RangeParams = {}) => request<Stats>(`/stats${qs(params)}`),
  getSettings: () => request<Settings>('/settings'),
  updateSettings: (patch: Settings) =>
    request<Settings>('/settings', { method: 'PUT', body: JSON.stringify(patch) }),
  exportDatabase: async () => {
    const res = await fetch('/api/export/database');
    if (!res.ok) throw await errorFrom(res);

    const filename =
      filenameFrom(res.headers.get('content-disposition')) ??
      `tradelog-backup-${new Date().toISOString().slice(0, 10)}.db`;
    const url = URL.createObjectURL(await res.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
