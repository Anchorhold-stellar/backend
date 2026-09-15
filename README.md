# SafeTrust v2 — Backend

A NestJS backend for a Stellar/Soroban-based escrow and dispute-resolution
marketplace (rental / equipment / service listings, milestone-based escrow,
juror-based dispute resolution). The backend never holds a signing key — it
builds unsigned transaction XDR for the frontend wallet (Freighter) to sign
and submit. Postgres is a *read model* materialized from on-chain Soroban
contract events by a separate indexer process; the contract is the source of
truth for fund custody.

This is a from-scratch NestJS rewrite of an earlier Express prototype
(preserved as the first commit on `main`), plus a set of features the
prototype's schema anticipated but never implemented.

## Setup

```bash
npm install
cp .env.example .env    # then fill in DATABASE_URL, KEEPER_WEBHOOK_SECRET, etc.

# Postgres for local dev (also used by e2e tests)
docker compose up -d    # or: docker-compose up -d
npm run migrate:up      # applies migrations/ against DATABASE_URL

npm run start:dev       # HTTP API on :3002
npm run start:indexer:dev   # indexer, as its own process — see "Indexer" below
```

API docs (Swagger UI) are served at `GET /docs` once the app is running, with
the raw OpenAPI spec at `GET /docs-json`.

## Database migrations

Schema changes live in `migrations/` (via `node-pg-migrate`), not as a
hand-applied SQL file — `migrations/1758000000000_initial-schema.js` is the
full baseline schema, and every change after it is its own migration.

```bash
npm run migrate:up               # apply all pending migrations
npm run migrate:down             # roll back the most recent migration
npm run migrate:create -- <name> # scaffold a new migration
```

## Testing

```bash
npm test        # unit tests — no external services required
npm run test:e2e    # e2e tests — requires DATABASE_URL pointing at a live
                     # Postgres with migrations applied (see above)
```

`test:e2e` skips itself (not a failure) when `DATABASE_URL` isn't set, so CI
or local runs of `npm test` never depend on Docker being available.

## Modules

| Module | Responsibility |
|---|---|
| `database` | `pg.Pool` provider (`PG_POOL`), env validation |
| `soroban` | Builds unsigned contract-call XDR via explicit per-method arg schemas |
| `escrow` | Escrow reads, XDR builders (create/deposit/confirm/cancel), auto-release cron |
| `disputes` | Dispute reads/evidence/votes, XDR builders, resolution cascade |
| `listings` | Listings CRUD (soft-delete) |
| `jurors` | Juror registration/staking |
| `reputation` | Reputation read + leaderboard + internal adjustment API |
| `auth` | Wallet-signature challenge/verify, `WalletAuthGuard` |
| `webhooks` | Out-of-band keeper-ping, HMAC-verified |
| `notifications` | Configurable outbound webhook fan-out on key domain events |
| `health` | Liveness (`/health`) and DB readiness (`/health/ready`) checks |
| `indexer` | Polls Soroban contract events and applies them to the read model |
| `common` | Global exception filter, camelCase response interceptor, request logging, pagination DTO, wallet-identity assertion |

## Auth

Mutating endpoints require proof of wallet ownership:

1. `GET /auth/challenge?wallet=G...` — issues a short-lived nonce.
2. Sign the nonce with the wallet's key (Freighter, or `Keypair.sign` in tests).
3. Send the request with `X-Wallet-Address` and `X-Wallet-Signature` (base64) headers.

The authenticated wallet must match the relevant field in the request body
(e.g. `renterWallet`, `hostWallet`) — a valid signature alone isn't enough to
act as someone else's identity. The nonce store is in-memory and scoped to a
single process; running multiple backend instances needs a shared store
(e.g. a table or Redis) instead — deliberately out of scope here.

## Indexer

Runs as its own process (`npm run start:indexer`), not inside the HTTP
server — this keeps chain-event processing off the request path and matches
the original design. Two modes, via `INDEXER_MODE`:

- `mock` (default): deterministic in-memory fixture events, no RPC needed.
  Useful for exercising the full pipeline (cursor advance, event
  application, dispute-resolution cascade) without a deployed contract.
- `live`: real `server.getEvents()` calls against `SOROBAN_RPC_URL` /
  `ESCROW_CONTRACT_ID`. No contract is deployed yet in this project —
  `ESCROW_CONTRACT_ID` in `.env.example` is a placeholder.

## Scope

**In scope (this milestone):** the NestJS port itself, auth, validation,
error handling, listings/jurors/reputation modules, the indexer
port/adapter architecture, the dispute-resolution and auto-release cascades,
unit + e2e tests.

**Out of scope:** the actual Soroban smart contract (source/deployment),
frontend integration, production deployment infrastructure (the only Docker
artifact here is the dev-only Postgres in `docker-compose.yml`),
production-grade auth (sessions, refresh tokens, a distributed nonce store),
load testing, full historical event backfill.
