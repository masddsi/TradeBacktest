import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DB_PATH = path.resolve(here, '..', 'tradelog.db');

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

export function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT    NOT NULL UNIQUE,
      contracts  INTEGER NOT NULL CHECK (contracts > 0),
      result     TEXT    NOT NULL CHECK (result IN ('WIN', 'LOSS')),
      pnl        REAL    NOT NULL,
      setup      TEXT,
      direction  TEXT    CHECK (direction IN ('C', 'V')),
      notes      TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const cols = db.prepare('PRAGMA table_info(trades)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'direction')) {
    db.exec("ALTER TABLE trades ADD COLUMN direction TEXT CHECK (direction IN ('C', 'V'))");
  }
  normalizeLegacySetups();

  const count = (db.prepare('SELECT COUNT(*) AS c FROM settings').get() as { c: number }).c;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    insert.run('gain_per_contract', '60');
    insert.run('loss_per_contract', '100');
    insert.run('daily_goal', '300');
    insert.run('daily_max_loss', '200');
    insert.run('bankroll', '0');
    insert.run('contracts', '1');
  } else {
    // Instalações existentes: garante as chaves novas sem sobrescrever valores do usuário.
    const ensure = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    ensure.run('bankroll', '0');
    ensure.run('contracts', '1');
  }
}

/** Limite superior aceito para a quantidade de contratos de uma operação. */
export const MAX_CONTRACTS = 100000;

export interface Settings {
  gain_per_contract: number;
  loss_per_contract: number;
  daily_goal: number;
  daily_max_loss: number;
  bankroll: number;
  /** Quantidade padrão de contratos, aplicada às operações já registradas ao salvar. */
  contracts: number;
}

const SETTINGS_KEYS: (keyof Settings)[] = [
  'gain_per_contract',
  'loss_per_contract',
  'daily_goal',
  'daily_max_loss',
  'bankroll',
  'contracts',
];

function isNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

// `contracts` é a única chave que exige inteiro positivo.
const SETTINGS_VALIDATORS: Record<keyof Settings, (value: number) => boolean> = {
  gain_per_contract: isNonNegative,
  loss_per_contract: isNonNegative,
  daily_goal: isNonNegative,
  daily_max_loss: isNonNegative,
  bankroll: isNonNegative,
  contracts: (value) => Number.isInteger(value) && value >= 1 && value <= MAX_CONTRACTS,
};

export function getSettings(): Settings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string;
    value: string;
  }[];
  const map = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  return {
    gain_per_contract: map.gain_per_contract ?? 60,
    loss_per_contract: map.loss_per_contract ?? 100,
    daily_goal: map.daily_goal ?? 300,
    daily_max_loss: map.daily_max_loss ?? 200,
    bankroll: map.bankroll ?? 0,
    contracts: map.contracts ?? 1,
  };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const upsert = db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  for (const key of SETTINGS_KEYS) {
    const value = patch[key];
    if (typeof value === 'number' && SETTINGS_VALIDATORS[key](value)) {
      upsert.run(key, String(value));
    }
  }
  return getSettings();
}

export type TradeResult = 'WIN' | 'LOSS';

export const SETUPS = ['Gap', 'Bate e Volta', 'Vazio', 'Extremo'] as const;
export type Setup = (typeof SETUPS)[number];
export type Direction = 'C' | 'V';

function stripAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function legacySetup(text: string): Setup | null {
  const s = stripAccents(text);
  if (s.includes('gap')) return 'Gap';
  if (s.includes('vazio')) return 'Vazio';
  if (s.includes('extremo')) return 'Extremo';
  if (s.includes('bate')) return 'Bate e Volta';
  return null;
}

function legacyDirection(text: string): Direction | null {
  const s = stripAccents(text);
  if (/canal (da|de) minima|canal de baixa/.test(s)) return 'C';
  if (/canal (da|de) maxima/.test(s)) return 'V';
  if (s.includes('gap de baixa')) return 'C';
  if (s.includes('gap de alta')) return 'V';
  if (s.includes('compra')) return 'C';
  if (s.includes('venda')) return 'V';
  return null;
}

// Migra setups em texto livre (ex.: "Gap de Baixa / IFR 12") para a lista
// fechada de módulos + direção. O texto original é preservado em notes.
function normalizeLegacySetups(): void {
  const rows = db
    .prepare('SELECT id, setup, notes FROM trades WHERE setup IS NOT NULL')
    .all() as { id: number; setup: string; notes: string | null }[];
  const update = db.prepare('UPDATE trades SET setup = ?, direction = ?, notes = ? WHERE id = ?');
  for (const row of rows) {
    const raw = row.setup.trim();
    if ((SETUPS as readonly string[]).includes(raw)) continue;
    const setup = legacySetup(raw);
    const direction = legacyDirection(raw);
    const keepRaw = setup === null || stripAccents(raw) !== stripAccents(setup);
    const notes = row.notes?.trim() ? row.notes : keepRaw ? raw : null;
    update.run(setup, direction, notes, row.id);
  }
}

export function computePnl(result: TradeResult, contracts: number, s = getSettings()): number {
  return result === 'WIN'
    ? contracts * s.gain_per_contract
    : -contracts * s.loss_per_contract;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Reescreve a quantidade de contratos de todas as operações já registradas e
 * recalcula o pnl a partir do R$/contrato gravado (pnl / contracts), o que
 * preserva perdas personalizadas — `loss_total` não é persistido.
 * Operações que já estão na quantidade pedida não são tocadas.
 */
export function setContractsForAllTrades(contracts: number): number {
  if (!Number.isInteger(contracts) || contracts < 1 || contracts > MAX_CONTRACTS) {
    throw new Error('Quantidade de contratos inválida.');
  }

  const rows = db.prepare('SELECT id, contracts, pnl FROM trades').all() as {
    id: number;
    contracts: number;
    pnl: number;
  }[];
  const update = db.prepare('UPDATE trades SET contracts = ?, pnl = ? WHERE id = ?');

  let updated = 0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const row of rows) {
      if (row.contracts === contracts) continue;
      const valuePerContract = row.contracts > 0 ? row.pnl / row.contracts : 0;
      update.run(contracts, round2(valuePerContract * contracts), row.id);
      updated++;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return updated;
}
