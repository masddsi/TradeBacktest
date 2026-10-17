import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type RangeParams } from './api';
import type { Settings, TradeInput } from './types';

const TRADES_KEY = 'trades';
const STATS_KEY = 'stats';
const SETTINGS_KEY = 'settings';

export function useTrades(params: RangeParams = {}) {
  return useQuery({
    queryKey: [TRADES_KEY, params],
    queryFn: () => api.listTrades(params),
  });
}

export function useStats(params: RangeParams = {}) {
  return useQuery({
    queryKey: [STATS_KEY, params],
    queryFn: () => api.stats(params),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: [SETTINGS_KEY],
    queryFn: () => api.getSettings(),
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: [TRADES_KEY] });
    void qc.invalidateQueries({ queryKey: [STATS_KEY] });
  };
}

export function useCreateTrade() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (input: TradeInput) => api.createTrade(input),
    onSuccess: invalidate,
  });
}

export function useUpdateTrade() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: TradeInput }) => api.updateTrade(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTrade() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: number) => api.deleteTrade(id),
    onSuccess: invalidate,
  });
}

export function useDeleteAllTrades() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: () => api.deleteAllTrades(),
    onSuccess: invalidate,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (patch: Settings) => api.updateSettings(patch),
    onSuccess: (data) => {
      qc.setQueryData([SETTINGS_KEY], data);
      invalidate();
    },
  });
}
