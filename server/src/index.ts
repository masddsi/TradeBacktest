import Fastify from 'fastify';
import cors from '@fastify/cors';
import { migrate, DB_PATH } from './db.js';
import { tradesRoutes } from './routes/trades.js';
import { statsRoutes } from './routes/stats.js';
import { settingsRoutes } from './routes/settings.js';

const PORT = Number(process.env.PORT ?? 3001);

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(tradesRoutes);
await app.register(statsRoutes);
await app.register(settingsRoutes);

app.get('/api/health', async () => ({ ok: true }));

migrate();

try {
  await app.listen({ port: PORT, host: '127.0.0.1' });
  app.log.info(`Banco SQLite: ${DB_PATH}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
