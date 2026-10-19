import { createReadStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { backup } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import { db } from '../db.js';

function timestamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/export/database', async (request, reply) => {
    let dir: string | undefined;

    try {
      dir = await mkdtemp(path.join(tmpdir(), 'tradelog-export-'));
      const filename = `tradelog-backup-${timestamp()}.db`;
      const file = path.join(dir, filename);

      await backup(db, file);
      const { size } = await stat(file);

      reply.raw.once('close', () => {
        void rm(dir!, { recursive: true, force: true });
      });

      return reply
        .header('Content-Type', 'application/vnd.sqlite3')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .header('Content-Length', size)
        .header('Cache-Control', 'no-store')
        .send(createReadStream(file));
    } catch (err) {
      request.log.error(err);
      if (dir) await rm(dir, { recursive: true, force: true });
      return reply.code(500).send({ error: 'Não foi possível gerar o backup do banco.' });
    }
  });
}
