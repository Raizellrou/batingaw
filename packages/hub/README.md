# @ligtas/hub

The verifying endpoint per PRD Section 5.4/5.5/9. Receives raw alert packet hex from `packages/mesh-sim`, verifies it with the same `@ligtas/core` logic the PWA and `verify-alert.ts` use, stores accepted alerts in SQLite, and serves them back as an `AlertBundle` (see `docs/alert-bundle.schema.json`).

## Setup

```bash
cd packages/hub
cp config/issuers.example.json config/issuers.json
# edit issuers.json with real issuer public keys, or generate a demo one:
#   node ../core/dist/scripts/emit-alert.js --sequence 1
# and put its expectedIssuerPublicKey (not the secret) in issuers.json
```

`config/issuers.json` holds only public keys — safe to commit, needed for a reproducible demo. Never put a secret key in it.

## Running

```bash
pnpm --filter @ligtas/core build   # if not already built
pnpm --filter @ligtas/hub build    # tsc has no direct .ts execution path here -- see Known limitation below
PORT=3001 node packages/hub/dist/index.js
```

Env vars: `PORT` (default 3001), `LIGTAS_DB_PATH` (default `packages/hub/hub.sqlite`), `LIGTAS_ISSUERS_PATH` (default `packages/hub/config/issuers.json`).

## API

- `POST /alert` — body `{ "packetHex": "<168 hex chars>" }`. Returns `{ decision, alertHash? }`. `decision` is one of `accepted`, `rejected_signature`, `rejected_unknown_issuer`, `rejected_replay`, `duplicate`, `malformed`.
- `GET /alerts` — a live `AlertBundle` (`source: "live"`), same shape `apps/pwa` consumes from a captured file.
- `GET /health` — liveness check.

## Verified live, not just unit tested

`packages/mesh-sim/bridge_to_hub.py` drives the full chain for real: Docker-simulated LoRa mesh → a packet arriving at the hub node's own client interface → HTTP POST to this server → real signature verification → SQLite → `GET /alerts`. Run it (with the hub already running) to see a genuine alert accepted and a forged one — which the mesh forwards exactly like a real packet, per PRD Section 5.5 — rejected here instead.

## Known limitation

Node's native TypeScript execution can't resolve this package's own `.ts` sources directly (its `@ligtas/core` import expects compiled `.js`), so `packages/hub` has to be compiled with `tsc` before running — there's no `tsx`-style direct-run path yet. `pnpm --filter @ligtas/hub build` followed by `node dist/index.js`, not `node src/index.ts`.
