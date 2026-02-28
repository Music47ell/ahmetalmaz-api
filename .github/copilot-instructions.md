# Copilot Instructions

## Commands

```bash
bun run dev      # Start with hot reload (port 3000)
bun run start    # Production start

bunx biome check .          # Lint and format check
bunx biome check --write .  # Auto-fix lint and format issues
```

No test suite exists.

## Architecture

A [Hono](https://hono.dev/) HTTP API running on Bun. All routes are registered in `src/index.ts`. Each integration is a self-contained feature directory under `src/`:

- `codestats/`, `listenbrainz/`, `trakt/`, `goodreads/`, `monkeytype/`, `quotes/`, `lyrics/` — third-party API integrations, each exposing named async functions consumed directly by `src/index.ts`
- `turso/` — all analytics query logic (despite the directory name, the underlying DB is now Bun SQLite via `src/db.ts`)
- `ogGenerator/` — dynamic PNG Open Graph image generation using `canvas`
- `utils/` — shared utilities: `cache.ts`, `onlineVisitors.ts`, `helpers.ts`, `botFilter.ts`
- `tmdb/` — TMDB helper used by Trakt routes for poster images
- `curl-card/` — ASCII art served at `GET /`

**Database**: Single SQLite file (`/data/app.db`) via Bun's built-in `bun:sqlite`. Schema is defined in `src/schema.sql` and applied at startup in `src/db.ts`. Three tables: `analytics`, `cache`, `online_visitors`.

The app is deployed as a Docker container (multi-stage build) pushed to GHCR on every push to `main`. A `docker-compose.yml` mounts a named volume at `/data` to persist the SQLite file.

## Key Conventions

**Caching**: Wrap all external API fetches in `withCache(key, ttlSeconds, fn)` from `src/utils/cache.ts`. Cache is stored in the SQLite `cache` table (TTL checked via `expires_at` unix timestamp). No external cache service required.

**Online visitors**: Use `upsertOnlineVisitor(visitorId, slug)` and `getOnlineVisitors()` from `src/utils/onlineVisitors.ts`. Records expire after 30 s (checked at read time against `last_seen`).

**Database access**: Import `db` from `src/db.js`. Use `db.query<RowType, ParamsType>(sql).get/all/run(params)`. Named params use `$name` syntax with a `{ $name: value }` object.

**Error handling**: Feature modules use `logError(message, error)` from `src/utils/helpers.ts` for non-fatal errors. Routes catch errors and return `c.json({ error: ... }, 500)`.

**Adding a new integration**: Create a `src/<feature>/` directory with individual `*.ts` files per endpoint, import the exported async functions in `src/index.ts`, and register the routes there.

**Formatting**: Tabs (width 2), single quotes, no semicolons — enforced by Biome. JSX is configured for `hono/jsx`.

**Analytics endpoint**: The analytics ingestion route is obscured (`/correct-horse-battery-staple`) and geo data is sourced from Cloudflare headers (`cf-ipcountry`, `cf-ipcity`, etc.) — the API is expected to sit behind Cloudflare.

## Environment Variables

```
USERNAME                  # Shared username for CodeStats, ListenBrainz, Trakt
TRAKT_CLIENT_ID
TMDB_API_TOKEN
GOODREADS_READ_FEED       # RSS URL for the Goodreads "read" shelf
DATABASE_PATH             # Path to SQLite file (default: /data/app.db)
ALLOWED_ORIGINS           # Comma-separated CORS origins
```
