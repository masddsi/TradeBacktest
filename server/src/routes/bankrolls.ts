import type { FastifyInstance } from 'fastify';
import { deleteBankroll, getBankrolls, setBankroll } from '../db.js';

function parseYear(value: unknown): number | null {
  const year = Number(value);
  return Number.isInteger(year) ? year : null;
}

export async function bankrollRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/bankrolls', async () => getBankrolls());

  app.put('/api/bankrolls', async (request, reply) => {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const year = parseYear(body.year);
    const bankroll = Number(body.bankroll);
    if (year === null) return reply.code(400).send({ error: 'Ano inválido.' });
    if (!Number.isFinite(bankroll) || bankroll < 0) {
      return reply.code(400).send({ error: 'Banca inicial inválida.' });
    }
    try {
      return setBankroll(year, bankroll);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Erro ao salvar a banca.' });
    }
  });

  app.delete('/api/bankrolls/:year', async (request, reply) => {
    const { year: yearParam } = request.params as { year: string };
    const year = parseYear(yearParam);
    if (year === null) return reply.code(400).send({ error: 'Ano inválido.' });
    try {
      return deleteBankroll(year);
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Erro ao remover a banca.' });
    }
  });
}
