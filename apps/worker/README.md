# @auction/worker — Cloudflare Worker + Durable Objects

This is the auction room backend. Each auction room is managed by a dedicated **Durable Object** instance. WebSocket connections from the Next.js frontend terminate at the DO.

## Architecture

```
Next.js (apps/web) ──HTTP/WS──► Cloudflare Worker (src/index.ts)
                                     │
                           ┌─────────┴─────────┐
                           │  RoomDurableObject │  (1 per room code)
                           │  src/room-do.ts    │
                           └─────────┬─────────┘
                                     │ postgres.js
                                  Hyperdrive
                                     │
                               PostgreSQL DB
```

- **Worker** handles CORS, auth, HTTP API routes, and WebSocket routing.  
- **Durable Object** manages in-memory auction state, WebSocket Hibernation, DO Alarms for the timer, and persists state to DO storage.  
- **Hyperdrive** provides fast PostgreSQL access from the Worker runtime.

---

## Local Development

### Prerequisites

- Docker + Docker Compose (PostgreSQL)
- Node.js 18+
- Wrangler CLI (`npm install` at repo root installs it)

### 1. Start the database

```bash
# From repo root
docker compose up -d
npm run db:migrate
npm run db:seed
```

### 2. Start all services

```bash
# From repo root — starts Next.js (port 3000) + Wrangler (port 8787) concurrently
npm run dev
```

Or individually:

```bash
npm run dev:web     # Next.js only
npm run dev:worker  # Wrangler only
```

### 3. Environment variables

- **Monorepo root `.env`** (see repo `.env.example`): set `DATABASE_URL`, `SESSION_COOKIE_NAME`, and `ALLOWED_ORIGINS`.
- **`npm run dev` in this package** runs `scripts/dev.mjs`, which:
  - loads `../../.env` and optional `apps/worker/.env`;
  - sets `WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB` from `DATABASE_URL` (or the explicit `WRANGLER_*` var) so Wrangler can emulate Hyperdrive locally;
  - writes `apps/worker/.dev.vars` from `ALLOWED_ORIGINS` / `SESSION_COOKIE_NAME` (gitignored) for Worker bindings.

If those vars are missing from `.env`, the Worker falls back to safe localhost defaults for CORS and the session cookie name.

---

## Production Deployment

### 1. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 2. Create a Hyperdrive configuration

```bash
npx wrangler hyperdrive create auction-db \
  --connection-string "postgresql://<user>:<password>@<host>/<db>"
```

Copy the resulting Hyperdrive ID and replace the placeholder in `wrangler.toml`:

```toml
[[hyperdrive]]
binding = "DB"
id = "your-hyperdrive-id-here"   # ← replace PLACEHOLDER_REPLACE_AFTER_CF_SETUP
```

Local Postgres URL stays in root `.env` as `DATABASE_URL` (or `WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_DB`); do not commit secrets in `wrangler.toml`.

### 3. Deploy

```bash
# From apps/worker/
npm run deploy

# Or from repo root
npx wrangler deploy --config apps/worker/wrangler.toml
```

### 4. Configure the frontend

In your hosting environment (Vercel, Cloudflare Pages, etc.), set:

```
NEXT_PUBLIC_AUCTION_API_URL=https://auction-worker.<your-account>.workers.dev
NEXT_PUBLIC_AUCTION_WS_URL=wss://auction-worker.<your-account>.workers.dev
```

### 5. Run database migrations for production

```bash
# From repo root (Prisma migrations use DATABASE_URL)
DATABASE_URL="postgresql://..." npm run db:migrate:deploy
```

---

## Testing

```bash
# From apps/worker/
npm test

# Or from repo root
npm test -w @auction/worker
```

Tests cover:
- Pure in-memory room engine logic (26 test cases)
- Room permission model
- WebSocket event validation
- DO event dispatch integration (without live Cloudflare environment)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker fetch handler — HTTP routes + WS routing to DO |
| `src/room-do.ts` | `RoomDurableObject` — state, WebSockets, alarms |
| `src/persistence/queries.ts` | Raw SQL queries via postgres.js |
| `src/persistence/index.ts` | `createPostgresPersistence()` wiring |
| `src/types.ts` | `Env` bindings interface |
| `wrangler.toml` | Worker configuration |
| `tests/` | Vitest test suite |
