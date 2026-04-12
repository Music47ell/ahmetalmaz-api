# Copilot Instructions

## Commands

```bash
bun run workers:dev     # Local Cloudflare Worker (port 8787)
bun run workers:deploy  # Deploy to Cloudflare Workers

bunx biome check .          # Lint and format check
bunx biome check --write .  # Auto-fix lint and format issues
```

No test suite exists.

## Architecture

A [Hono](https://hono.dev/) HTTP API running on **Cloudflare Workers**. All routes are registered in `src/index.ts`. Each integration is a self-contained feature directory under `src/`:

- `codestats/`, `listenbrainz/`, `trakt/`, `simkl/`, `goodreads/`, `monkeytype/`, `location/` — feature integrations consumed directly by `src/index.ts`
- `turso/` — analytics query logic against Turso/libSQL
- `ogGenerator/` — dynamic PNG Open Graph image generation via `workers-og`
- `utils/` — shared utilities: `cache.ts`, `onlineVisitors.ts`, `helpers.ts`, `botFilter.ts`
- `tmdb/` — TMDB helper used by Trakt routes for poster images
- `curl-card/` — ASCII art served at `GET /`

**Database**: Turso (libSQL) remote database via `@libsql/client` in `src/db.ts`. No local schema bootstrapping in runtime.

## Key Conventions

**Caching**: Wrap all external API fetches in `withCache(key, ttlSeconds, fn)` from `src/utils/cache.ts`. Cache is stored in Turso `cache` table (TTL checked via `expires_at` unix timestamp).

**Online visitors**: Use `upsertOnlineVisitor(visitorId, slug)` and `getOnlineVisitors()` from `src/utils/onlineVisitors.ts`. Records expire after 30 s (checked at read time against `last_seen`).

**Database access**: Import `db` from `src/db.js`. Use `db.query<RowType, ParamsType>(sql).get/all/run(params)`. Named params use `$name` syntax with a `{ $name: value }` object.

**Error handling**: Feature modules use `logError(message, error)` from `src/utils/helpers.ts` for non-fatal errors. Routes catch errors and return `c.json({ error: ... }, 500)`.

**Adding a new integration**: Create a `src/<feature>/` directory with individual `*.ts` files per endpoint, import the exported async functions in `src/index.ts`, and register the routes there.

**Formatting**: Tabs (width 2), single quotes, no semicolons — enforced by Biome. JSX is configured for React.

**Analytics endpoint**: The analytics ingestion route is obscured (`/correct-horse-battery-staple`) and geo data is sourced from Cloudflare headers (`cf-ipcountry`, `cf-ipcity`, etc.) — the API is expected to sit behind Cloudflare.

## Environment Variables

```
USERNAME                  # Shared username for CodeStats, ListenBrainz, Trakt
TRAKT_CLIENT_ID
TMDB_API_TOKEN
GOODREADS_READ_FEED       # RSS URL for the Goodreads "read" shelf
ALLOWED_ORIGINS           # Comma-separated CORS origins
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
MONKEYTYPE_API_KEY
MONKEYTYPE_USERNAME
SIMKL_CLIENT_ID
SIMKL_USERNAME
SIMKL_ACCESS_TOKEN
TRACCAR_URL
TRACCAR_TOKEN
UPLOAD_API_KEY
```
