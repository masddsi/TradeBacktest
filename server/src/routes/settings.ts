import type { FastifyInstance } from 'fastify';
import {
  MAX_CONTRACTS,
  getSettings,
  saveSettings,
  setContractsForAllTrades,
  type Settings,
} from '../db.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/settings', async () => getSettings());

  app.put('/api/settings', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;

    const hasContracts = body.contracts !== undefined && body.contracts !== null;
    const contracts = Number(body.contracts);
    if (
      hasContracts &&
      (!Number.isInteger(contracts) || contracts < 1 || contracts > MAX_CONTRACTS)
    ) {
      return reply.code(400).send({ error: 'Quantidade de contratos inválida.' });
    }

    const before = getSettings().contracts;

    const patch: Partial<Settings> = {
      gain_per_contract: Number(body.gain_per_contract),
      loss_per_contract: Number(body.loss_per_contract),
      daily_goal: Number(body.daily_goal),
      daily_max_loss: Number(body.daily_max_loss),
      bankroll: Number(body.bankroll),
    };
    if (hasContracts) patch.contracts = contracts;

    const saved = saveSettings(patch);

    // Só reescreve o histórico quando a quantidade realmente mudou.
    const updated_trades =
      hasContracts && contracts !== before ? setContractsForAllTrades(contracts) : 0;

    return { ...saved, updated_trades };
  });
}
