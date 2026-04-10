# IPL Auction Realtime App

A premium IPL auction web app starter built with Next.js, TypeScript, Tailwind CSS, Framer Motion, a lightweight websocket backend, and PostgreSQL + Prisma persistence for users, rooms, lots, bids, and room access.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Node.js websocket backend with `ws`
- PostgreSQL
- Prisma ORM
- In-memory realtime room engine hydrated from persisted room state
- Zod validation, structured logging, rate limiting, and health/readiness checks

## Project structure

- `app/` Next.js routes and layout
- `components/` shared UI and auction room views
- `hooks/` frontend room/auth hooks
- `server/` backend HTTP + websocket transport
- `server/data/` Prisma repositories
- `server/services/` auth, room access, health, and persistence services
- `server/lib/` backend config, logging, validation, rate limiting, and error helpers
- `server/validation/` Zod request and event schemas
- `shared/` shared room engine contracts, types, and websocket events
- `prisma/` schema, migrations, and seed data

## Environment variables

Create `.env` from `.env.example`.

Required:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/auction?schema=public"
AUCTION_WS_PORT=4000
NEXT_PUBLIC_AUCTION_WS_PORT=4000
NEXT_PUBLIC_AUCTION_API_PORT=4000
NEXT_ALLOWED_DEV_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
SESSION_COOKIE_NAME=auction_session
SESSION_COOKIE_SECURE=false
WS_HEARTBEAT_INTERVAL_MS=30000
WS_STALE_TIMEOUT_MS=45000
```

Optional:

```env
NEXT_PUBLIC_AUCTION_API_URL=http://localhost:4000
NEXT_PUBLIC_AUCTION_WS_URL=ws://localhost:4000
```

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL:

```bash
docker compose up -d postgres
```

3. Generate Prisma client, apply migrations, and seed demo data:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

4. Start frontend and backend together:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Docker usage

Run the full stack with Docker:

```bash
npm run docker:up
```

This starts:

- `postgres` on `localhost:5432`
- `server` on `localhost:4000`
- `web` on `localhost:3000`

To stop it:

```bash
npm run docker:down
```

## Prisma commands

- `npm run db:generate`
  Generate Prisma client.
- `npm run db:migrate`
  Run development migrations.
- `npm run db:migrate:deploy`
  Apply production-safe migrations.
- `npm run db:seed`
  Seed IPL-style demo players and teams.

## Runtime scripts

- `npm run dev`
  Start frontend and backend in watch mode.
- `npm run dev:web`
  Start only the Next.js app.
- `npm run dev:server`
  Start only the backend in watch mode.
- `npm run build`
  Build the frontend for production.
- `npm run test`
  Run the automated room engine, validation, and permission tests.
- `npm run test:watch`
  Re-run tests while files change.
- `npm run start:web`
  Start the production Next.js server.
- `npm run start:server`
  Start the backend server.

## Test coverage

The automated test suite currently covers:

- room join snapshot loading
- room creation/join payload validation
- bid validation and franchise lock rules
- host-only room controls
- sold and unsold lot transitions
- room state recovery after engine restart
- concurrent bidding with eight near-simultaneous bid attempts

Run it with:

```bash
npm run test
```

## Health endpoints

- `GET /api/health`
  Basic liveness check.
- `GET /api/ready`
  Readiness check including database connectivity.
- `GET /health`
  Backward-compatible plain health route.

Examples:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/ready
```

## Security and hardening

- All backend HTTP payloads and websocket events are validated with Zod.
- Rate limiting is applied to:
  - guest auth/session endpoints
  - room creation
  - room joining
  - bidding
  - host auction actions
- Room permissions are enforced on the backend.
- Websocket handlers use centralized permission services instead of frontend flags.
- Websocket connections use heartbeat/ping-pong cleanup to remove stale sockets.
- CORS and websocket origin handling are allowlist-based.
- Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production unless overridden.
- Health and readiness checks are available for orchestration and deploy checks.

## Current room access model

- `host`
  Can start the auction and control lot lifecycle.
- `participant`
  Can bid only with the single franchise locked to that user for the room.
- `viewer`
  Read-only room access.

## Notes

- The live auction timer and active websocket sessions remain in memory.
- Completed bids, lot outcomes, room metadata, teams, and room memberships are persisted in PostgreSQL.
- The room engine stays behind an interface so the in-memory implementation can later be replaced by Durable Objects or another distributed room engine.
