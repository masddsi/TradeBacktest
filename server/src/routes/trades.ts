import type { FastifyInstance } from 'fastify';
import {
  MAX_CONTRACTS,
  db,
  computePnl,
  SETUPS,
  type Direction,
  type Setup,
  type TradeResult,
} from '../db.js';

interface TradeInput {
  date: string;
  contracts: number;
  result: TradeResult;
  setup: Setup | null;
  direction: Direction | null;
  lossTotal: number | null;
  notes: string | null;
}

function validate(body: unknown): { ok: true; data: TradeInput } | { ok: false; error: string } {
  const b = (body ?? {}) as Record<string, unknown>;

  if (typeof b.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
    return { ok: false, error: 'Data inválida (use AAAA-MM-DD).' };
  }
  const contracts = Number(b.contracts);
  if (!Number.isInteger(contracts) || contracts <= 0 || contracts > MAX_CONTRACTS) {
    return { ok: false, error: 'Quantidade de contratos inválida.' };
  }
  if (b.result !== 'WIN' && b.result !== 'LOSS') {
    return { ok: false, error: 'Resultado deve ser WIN ou LOSS.' };
  }
  const setupRaw = typeof b.setup === 'string' ? b.setup.trim() : '';
  let setup: Setup | null = null;
  if (setupRaw) {
    if (!(SETUPS as readonly string[]).includes(setupRaw)) {
      return { ok: false, error: 'Setup inválido.' };
    }
    setup = setupRaw as Setup;
  }

  let direction: Direction | null = null;
  if (b.direction === 'C' || b.direction === 'V') {
    direction = b.direction;
  } else if (b.direction !== null && b.direction !== undefined) {
    return { ok: false, error: 'Direção deve ser C (compra) ou V (venda).' };
  }

  let lossTotal: number | null = null;
  if (b.loss_total !== null && b.loss_total !== undefined && b.loss_total !== '') {
    const lt = Number(b.loss_total);
    if (!Number.isFinite(lt) || lt <= 0 || lt > 1_000_000) {
      return { ok: false, error: 'Perda personalizada inválida.' };
    }
    lossTotal = lt;
  }

  const notes = typeof b.notes === 'string' ? b.notes.trim().slice(0, 4000) : null;

  return {
    ok: true,
    data: {
      date: b.date,
      contracts,
      result: b.result,
      setup,
      direction,
      lossTotal,
      notes: notes || null,
    },
  };
}

export async function tradesRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/trades', async (request) => {
    const { from, to, setups } = request.query as { from?: string; to?: string; setups?: string };
    const where: string[] = [];
    const params: string[] = [];
    if (from) {
      where.push('date >= ?');
      params.push(from);
    }
    if (to) {
      where.push('date <= ?');
      params.push(to);
    }
    const setupList = setups?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    if (setupList.length) {
      where.push(`setup IN (${setupList.map(() => '?').join(', ')})`);
      params.push(...setupList);
    }
    const sql =
      'SELECT * FROM trades' +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
      ' ORDER BY date DESC';
    return db.prepare(sql).all(...params);
  });

  app.post('/api/trades', async (request, reply) => {
    const parsed = validate(request.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    const { date, contracts, result, setup, direction, lossTotal, notes } = parsed.data;

    const existing = db.prepare('SELECT id FROM trades WHERE date = ?').get(date);
    if (existing) return reply.code(409).send({ error: 'Já existe uma operação nesse dia.' });

    const pnl =
      result === 'LOSS' && lossTotal !== null ? -lossTotal : computePnl(result, contracts);
    const info = db
      .prepare(
        'INSERT INTO trades (date, contracts, result, pnl, setup, direction, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(date, contracts, result, pnl, setup, direction, notes);

    return reply.code(201).send(db.prepare('SELECT * FROM trades WHERE id = ?').get(info.lastInsertRowid));
  });

  app.put('/api/trades/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'ID inválido.' });

    const current = db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
    if (!current) return reply.code(404).send({ error: 'Operação não encontrada.' });

    const parsed = validate(request.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    const { date, contracts, result, setup, direction, lossTotal, notes } = parsed.data;

    const clash = db.prepare('SELECT id FROM trades WHERE date = ? AND id <> ?').get(date, id);
    if (clash) return reply.code(409).send({ error: 'Já existe uma operação nesse dia.' });

    const pnl =
      result === 'LOSS' && lossTotal !== null ? -lossTotal : computePnl(result, contracts);
    db.prepare(
      'UPDATE trades SET date = ?, contracts = ?, result = ?, pnl = ?, setup = ?, direction = ?, notes = ? WHERE id = ?',
    ).run(date, contracts, result, pnl, setup, direction, notes, id);

    return db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
  });

  app.delete('/api/trades/:id', async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: 'ID inválido.' });
    const info = db.prepare('DELETE FROM trades WHERE id = ?').run(id);
    if (info.changes === 0) return reply.code(404).send({ error: 'Operação não encontrada.' });
    return reply.code(204).send();
  });

  app.delete('/api/trades', async () => {
    const info = db.prepare('DELETE FROM trades').run();
    return { deleted: Number(info.changes) };
  });
}
