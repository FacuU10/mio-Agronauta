# Proposal: Agronautas Reality-Hardening Provider Foundation

## Intent

Make Agronautas truthful and safely executable without inventing identity, provider, or production evidence. Evidence: API readiness/Postgres/Redis and web/Iberá BFF navigation succeeded; favicon/asset warnings, absent Python dependencies, log-only scheduler dispatch, owner-only hydrology cron with no dry-run, and no Render Python worker remain.

## Scope

### In Scope
- Four strict-TDD slices: auth/truthful landing/runtime contract; disabled scheduler-to-Redis-to-worker-DLQ topology; evidence envelope plus Georef 2.1, NASA POWER, and Open-Meteo adapters; real-runtime verification.
- Preserve explicit `live`, `seam`, `mock`, and `unavailable` states; fixtures prove parsers only.
- Record source/signal, retrieved/observed semantics, freshness, units, mode, HTTP/schema outcome, run IDs, degradation, latency, and retry/circuit telemetry.

### Out of Scope
- Identity, tenant/workspace ownership semantics, official Iberá geometry, soil/economic/market data, Google credentials, marketplace/credit/insurance, or production proof.
- Docker, default mock data, or enabling scheduled ingestion before the worker path is proven.

## Capabilities

### New Capabilities
- `runtime-evidence-foundation`: typed runtime/provider evidence, queue topology, and truthful release boundary.

### Modified Capabilities
- `management-foundation`: status/chat route authentication and explicit non-ownership access behavior.
- `intelligence-foundation`: provider timestamp, freshness, unit, lineage, and unavailable-state semantics.

## Approach

1. RED-GREEN-REFACTOR route tests; protect status/chat, label landing claims/metrics unavailable or illustrative, and add a local API/web/worker/cron readiness contract.
2. Align scheduler envelopes, Redis producer/consumer, lease/retry/result/DLQ telemetry, Python startup, and Render’s worker service. Keep scheduler disabled until completion is observed.
3. Add adapters: official Georef 2.1; credential-free NASA POWER Daily with explicit local-solar/UTC time standard; Open-Meteo with explicit forecast horizon, retrieval/model timestamps, units, timeout, schema, and commercial-license decision. Google Maps remains billing/key-restriction blocked.
4. Verify without Docker using browser, API/BFF, Postgres, Redis, worker, cron, providers, and Render evidence.

## Affected Areas

`apps/api`, `apps/workflow-runtime-python`, `packages/zod-schemas`, `apps/web`, and `render.yaml`.

## Risks

Shared role tokens cannot prove ownership; authenticated access MUST NOT be called tenant authorization. Provider drift, timestamp semantics, worker dependencies, Render topology, or owner credentials keep claims unavailable.

## Rollback Plan

Revert slices independently: restore route/landing changes, disable scheduler flags/remove the worker service, keep adapters unavailable/seam, and revert schema changes only after dependent rows are compatible.

## Dependencies

Postgres/Redis, Python dependencies, isolated runtime authorization, hydrology owner/token (no dry-run), Render worker/log access, and an Open-Meteo commercial decision. Maps remains blocked; no Google key is needed. Render cron is UTC, single-run, and limited to 12 hours.

## Success Criteria

- [ ] Every slice has RED-GREEN-REFACTOR evidence; no fixture is reported as live.
- [ ] Real E2E captures Playwright navigation, snapshots/screenshots, network and console output (including favicon/asset warnings), authenticated API/BFF calls, Postgres migrations/field-workspace/evidence/job-run state, Redis `PING` plus queue success/retry/DLQ transitions, installed worker execution, owner cron execution, and Render service/deploy/log wiring.
- [ ] Real Georef, NASA POWER, and Open-Meteo requests show explicit semantics; blocked credentials/data/production proof remain typed unavailable.
