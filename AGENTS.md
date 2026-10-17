# AGENTS.md

TradeLog — local day-trade (mini dólar) journal. Two apps, no shared package, no tests, no CI, no linter/formatter.

## Layout

- `server/` — Fastify 5 API, TypeScript, ESM. Entry `server/src/index.ts`; routes in `server/src/routes/`; DB layer + schema in `server/src/db.ts`.
- `web/` — React 19 + Vite + Tailwind v4 SPA. Entry `web/src/main.tsx`, screens in `web/src/features/`, API client in `web/src/lib/api.ts`.
- `web/src/lib/simulate.ts` + `web/src/features/simulator/` — "Simulador de exame": read-only simulation over saved trades, recomputing each as `pnl / contracts × lote fixo`. Lote, banca inicial, exam rules and the data source (all trades or selected months) are local state — nothing persisted, no API involved.
- Root `package.json` only orchestrates the two via `--prefix` (not real npm workspaces). `iniciar.bat` is the Windows one-click launcher (installs deps, starts dev, opens browser).

## Commands (run from repo root)

- `npm run install:all` — install root + server + web deps.
- `npm run dev` — runs both dev servers concurrently (Fastify + Vite).
- `npm run typecheck` — `tsc --noEmit` in both packages. This is the main verification step.
- `npm run build` — builds both (web build runs typecheck first).

Target a single package with `npm --prefix server run <script>` / `npm --prefix web run <script>`.

## Hard requirements / gotchas

- `server/src/db.ts` uses Node's built-in `node:sqlite` (`DatabaseSync`) with **no experimental flag**. Needs a recent Node (24+ verified here); `iniciar.bat` only claims Node 22+, so verify the version if the server fails to start.
- SQLite DB lives at `server/tradelog.db` (WAL mode). Created/migrated automatically on server boot by `migrate()`. It is gitignored — never commit `*.db*`.
- API listens on `127.0.0.1:3001`; all routes are under `/api`. Vite dev server on `5173` proxies `/api` → `3001` (`web/vite.config.ts`), so the frontend always calls relative `/api/...` paths.
- If an edited file never shows up in the browser — even after a hard refresh, and the served module still lacks the new code — the Vite dev server is stuck with a stale transform (seen in this repo). Restart `npm run dev`; don't trust HMR/refresh.
- Server `package.json` + tsconfig are ESM/NodeNext: relative imports must carry the `.js` extension (e.g. `import { db } from '../db.js'`).
- One trade per calendar day: `trades.date` is UNIQUE. POST/PUT return `409` on a date clash (handled in `server/src/routes/trades.ts`).
- `pnl` is computed server-side from settings (`gain_per_contract` / `loss_per_contract`). Exception: a LOSS trade may carry an optional `loss_total` (R$, positive) sent by the client, which overrides the computed loss (`pnl = -loss_total`). WIN always uses the settings. `loss_total` is not persisted, so client-side recomputations must recover it as `pnl / contracts` (that is what the simulator does).
- `trades.setup` is a closed list (`SETUPS` in `server/src/db.ts`): Gap, Bate e Volta, Vazio, Extremo. `trades.direction` is `'C'`/`'V'`/null. `migrate()` normalizes legacy free-text setups on boot and preserves the original text in `notes`.

## Conventions

- Backend error messages and all UI copy are Portuguese (pt-BR). Keep it.
- Types are duplicated, not shared: keep `server/src/db.ts`/routes and `web/src/lib/types.ts` in sync manually when the API shape changes.
- Client state goes through React Query hooks in `web/src/lib/hooks.ts` (query keys `trades`/`stats`/`settings`; mutations invalidate). Add new calls there, not ad-hoc `fetch`.
- Tailwind v4 is CSS-first: design tokens are the `@theme` block in `web/src/index.css` (`bg`, `surface`, `panel`, `panel-2`, `border`, `muted`, `text`, `gain`, `loss`, `accent`). Use those semantic classes (`bg-surface`, `text-muted`, `border-border`, `text-gain`), not arbitrary hex values.
