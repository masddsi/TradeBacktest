import type { Settings, Stats, Trade, TradeInput } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* resposta sem corpo JSON */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
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
};
