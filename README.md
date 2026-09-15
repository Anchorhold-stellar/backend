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

npm run start:dev       # HTTP API on :3002
npm run start:indexer:dev   # indexer, as its own process — see "Indexer" below
```

## Testing

```bash
npm test        # unit tests — no external services required
npm run test:e2e    # e2e tests — requires DATABASE_URL pointing at a live,
                     # schema-applied Postgres (docker compose up -d is enough)
```

`test:e2e` skips itself (not a failure) when `DATABASE_URL` isn't set, so CI
or local runs of `npm test` never depend on Docker being available.

## Modules

| Module | Responsibility |
|---|---|
| `database` | `pg.Pool` provider (`PG_POOL`), env validation |
| `soroban` | Builds unsigned contract-call XDR via explicit per-method arg schemas |
| `escrow` | Escrow reads, XDR builders, auto-release cron |
| `disputes` | Dispute reads/evidence, XDR builders, resolution cascade |
| `listings` | Listings CRUD |
| `jurors` | Juror registration/staking |
| `reputation` | Reputation read + internal adjustment API |
| `auth` | Wallet-signature challenge/verify, `WalletAuthGuard` |
| `webhooks` | Out-of-band keeper-ping, HMAC-verified |
| `indexer` | Polls Soroban contract events and applies them to the read model |
| `common` | Global exception filter, pagination DTO, wallet-identity assertion |

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
