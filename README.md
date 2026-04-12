# Personal Activity & Media API

Hono API deployed on **Cloudflare Workers**, backed by **Turso (libSQL)**.

## Setup

```bash
bun install
```

## Environment Variables

Set these in `.env` for local development (`wrangler dev`) and as Worker secrets in production.

```env
ALLOWED_ORIGINS=<comma-separated origins>
USERNAME=<shared username for CodeStats/ListenBrainz/Trakt>
TURSO_DATABASE_URL=<libsql url>
TURSO_AUTH_TOKEN=<turso auth token>
TRAKT_CLIENT_ID=<trakt client id>
TMDB_API_TOKEN=<tmdb token>
GOODREADS_READ_FEED=<goodreads rss feed url>
MONKEYTYPE_API_KEY=<monkeytype api key>
MONKEYTYPE_USERNAME=<monkeytype username>
SIMKL_CLIENT_ID=<simkl client id>
SIMKL_USER_ID=<simkl user id>
SIMKL_ACCESS_TOKEN=<simkl access token>
TRACCAR_URL=<traccar server url>
TRACCAR_TOKEN=<traccar token>
UPLOAD_API_KEY=<upload route bearer token>
```

## Local Development

```bash
bun run workers:dev
```

Worker runs on `http://localhost:8787`.

## Deploy

```bash
bun run workers:deploy
```

Before first deploy, set secrets:

```bash
wrangler secret put TURSO_DATABASE_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put TRAKT_CLIENT_ID
wrangler secret put TMDB_API_TOKEN
wrangler secret put GOODREADS_READ_FEED
wrangler secret put MONKEYTYPE_API_KEY
wrangler secret put MONKEYTYPE_USERNAME
wrangler secret put SIMKL_CLIENT_ID
wrangler secret put SIMKL_USER_ID
wrangler secret put SIMKL_ACCESS_TOKEN
wrangler secret put TRACCAR_URL
wrangler secret put TRACCAR_TOKEN
wrangler secret put UPLOAD_API_KEY
wrangler secret put USERNAME
wrangler secret put ALLOWED_ORIGINS
```

## API Endpoints

- `GET /`
- `GET /status`
- `GET /og?title=...&description=...&pubdate=...` (returns `image/png`)
- `GET /listenbrainz/*`
- `GET /trakt/*`
- `GET /simkl/*`
- `GET /codestats/*`
- `GET /goodreads/*`
- `GET /monkeytype/*`
- `POST /correct-horse-battery-staple`
- `GET /insight`
- `GET /insight/:slug`
- `POST /heartbeat`
- `GET /online`
