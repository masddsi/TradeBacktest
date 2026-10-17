import type { FastifyInstance } from 'fastify';
import { getSettings, saveSettings } from '../db.js';

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/settings', async () => getSettings());

  app.put('/api/settings', async (request) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    return saveSettings({
      gain_per_contract: Number(body.gain_per_contract),
      loss_per_contract: Number(body.loss_per_contract),
      daily_goal: Number(body.daily_goal),
      daily_max_loss: Number(body.daily_max_loss),
      bankroll: Number(body.bankroll),
    });
  });
}
