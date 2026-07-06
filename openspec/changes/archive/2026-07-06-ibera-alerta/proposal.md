# Proposal: ibera-alerta production fix

## Problem
Iberá-Alerta has three production blockers:

1. `/api/hydrology/municipalities` can return backend data, but the web UI does not render it because the frontend fetch path is not proxied through Next.js and the component expects an older, incompatible payload shape.
2. `/municipalities` remains loading, empty, or crashes because `GovernmentOverview` fetches `/api/hydrology/municipalities` from the web origin with no matching BFF route/rewrite, then dereferences fields that the backend no longer returns (`municipality.latest`, `riskLevel`, `localizedWarning`, `sourceFreshness.status`).
3. `/api/hydrology/ingest` is not production-ready: live source clients are configured against likely non-JSON/public HTML endpoints, adapters expect fixture-like payloads, one source failure rejects the whole manual run, and runtime seeding performs privileged/unsafe DB setup.

## Goals
- Make `/municipalities` and `/municipalities/[id]` load through the deployed frontend reliably.
- Render the current backend hydrology contract without runtime crashes.
- Preserve last known official data and expose degraded/failed source states instead of blanking the UI.
- Make manual ingest safe for production: per-source result reporting, explicit failures, no fixture fallback outside tests, no hidden 500s, and configurable/verified official endpoints.
- Add tests that catch route proxy failures, frontend/backend contract drift, empty telemetry states, and ingest partial failure behavior.

## Non-Goals
- Do not add authentication/authorization beyond existing environment token proxy patterns unless a later SDD phase expands scope.
- Do not claim real-time official ingestion until source URLs/parsers are verified against real provider payloads.
- Do not merge Iberá-Alerta with the separate Agronautas agricultural dashboard model.

## Proposed Changes

### 1. Add a frontend hydrology BFF/proxy
- Create `apps/web/src/app/api/hydrology/[...path]/route.ts`, modeled after `apps/web/src/app/api/agronautas/[...path]/route.ts`.
- Forward `GET`, `POST`, and body-bearing methods to `${AGRONAUTAS_API_INTERNAL_URL || http://localhost:3001}/api/hydrology/${path}`.
- Forward `accept`, `content-type`, `x-request-id`; optionally forward the same bearer token envs if backend later protects hydrology.
- Return upstream status/body/content-type transparently with `cache: 'no-store'`.
- Add route tests or integration tests proving `/api/hydrology/municipalities`, `/api/hydrology/municipalities/:id/dashboard`, `/api/hydrology/ingest`, and copilot chat proxy to the Express API.

### 2. Align overview UI to the canonical backend contract
- Update `apps/web/src/components/government/overview.tsx` types to match `hydrologyGovernmentMunicipalitiesResponseSchema`:
  - `province.provinceCode`, `province.name`
  - `sourceFreshness[].freshness`, `sourceFreshness[].label`
  - `provinceAlerts[].message`, `zone`, `source`, `observedAt`
  - `municipalities[].provinceCode`, `gaugeMappings`, `latestTelemetry[]`
- Derive UI display fields in pure helpers:
  - `lastSuccessfulObservedAt` = max over all telemetry `lastSuccessfulObservedAt`.
  - PNA height = latest telemetry where `source === 'PNA' && metric === 'river_height_m'`.
  - Rain = latest telemetry where `metric === 'rain_mm'`.
  - Risk label = compare PNA height against `alertHeightM` / `evacuationHeightM` (`Sin datos`, `Normal`, `Alerta`, `Evacuación`).
  - Local warning = deterministic text from risk level and source freshness.
- Render municipalities even when `latestTelemetry` is empty; show `Sin datos oficiales recientes` instead of crashing.
- Add loading and error states that are visually explicit and do not leave an infinite `Cargando…` after failure.

### 3. Align detail UI to the canonical dashboard contract
- Update `apps/web/src/components/government/detail.tsx` to consume backend fields:
  - `inaPredictions30d` instead of `inaForecast30Days`.
  - `alerts` instead of absent `smn`/`inmet` nested objects.
  - `provenance[].freshness/label` instead of `lastRunStatus/errorMessage`.
- Render telemetry, forecasts, alerts, and provenance directly from `HydrologyTelemetry` fields.
- Fix degraded state logic to use `provenance.some(item => item.freshness !== 'fresh')` and empty telemetry fallbacks.
- Fix SSE token parsing if needed: `writeSse` serializes plain strings for token events, so the current regex only extracts JSON objects and may miss `data: "Respuesta"`; parse event-stream lines robustly.

### 4. Make ingest production-safe
- In `apps/api/src/presentation/routes/hydrology-government.ts`, wrap `POST /ingest` with explicit error handling so thrown source failures return a contract error instead of an unhandled Express 500.
- Change `createGovernmentIngestionRunner` to process each source independently and return per-source outcomes (`success`, `failed`, `empty`, `skipped`) while preserving a top-level accepted/completed status. If a source fails, save the failed ingestion run and continue remaining sources.
- Extend the ingest response schema in `packages/zod-schemas/src/agronautas.ts` with `results[]` containing `source`, `status`, `recordsIngested`, `errorMessage?`, and `provenanceUrl?`.
- Keep `allowFixtureFallback` restricted to tests/local explicit opt-in. In production, never write offline fixture telemetry as if it were official data.
- Move PostGIS extension creation to migrations/bootstrap only; remove runtime `CREATE EXTENSION` from `seedGovernmentMunicipalitiesIfEmpty` or guard it behind an admin-only script.
- Change municipality seeding to upsert authoritative fields (`ON CONFLICT DO UPDATE`) so stale rows/mappings are corrected.
- Use `observedTo` as `lastSuccessfulObservedAt` for successful runs instead of `now()`.

### 5. Verify and configure official source clients
- Audit `packages/hydrology-engine/src/clients/http-clients.ts` URLs:
  - PNA currently fetches HTML but adapter expects `data-station` rows.
  - INA/INMET/SMN currently require JSON but configured URLs are public pages/portals likely returning HTML.
- Add environment-variable overrides per source (`HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`) and log configured provenance.
- Add parser fixtures captured from verified provider payloads before enabling production ingest as `success`.
- If a provider lacks a stable endpoint, mark it `failed`/`degraded` with the last known data still visible; do not fabricate production telemetry.

## Files to Change
- `apps/web/src/app/api/hydrology/[...path]/route.ts` — new BFF proxy for hydrology API.
- `apps/web/src/components/government/overview.tsx` — canonical contract rendering and empty/error states.
- `apps/web/src/components/government/detail.tsx` — canonical dashboard rendering, provenance, forecasts, alerts, SSE parsing.
- `apps/web/src/components/government/*.test.tsx` or existing web test location — regression tests for data render and empty/degraded states.
- `apps/api/src/presentation/routes/hydrology-government.ts` — ingest error handling, per-source outcomes, safer seeding semantics.
- `apps/api/src/presentation/routes/hydrology-government.test.ts` — tests for partial ingest failure, no production fixture fallback, contract errors, upsert seeding.
- `packages/zod-schemas/src/agronautas.ts` and tests — ingest response contract with per-source results.
- `packages/hydrology-engine/src/clients/http-clients.ts` and `packages/hydrology-engine/src/adapters/*.ts` — configurable URLs and verified parser behavior.
- DB migrations/bootstrap if runtime PostGIS/seeding changes require schema/data migration.

## Production Acceptance Criteria
- Visiting `/municipalities` through the frontend renders the 17 monitored Corrientes localities from the backend contract, including localities with empty telemetry.
- Browser/network logs show `/api/hydrology/municipalities` resolves through the web BFF to the Express API, not a web 404.
- No React runtime error occurs when backend returns canonical municipality objects without `latest`.
- `/municipalities/[id]` renders telemetry cards, INA forecasts, alerts, and provenance from backend `dashboard` payload.
- `POST /api/hydrology/ingest` returns a structured response for all requested sources, persists failed runs, continues other sources after one failure, and never writes offline fixtures in production.
- Tests cover backend schema, frontend render, BFF proxy, ingest partial failures, and empty/degraded data states.

## Rollout Plan
1. Add hydrology BFF proxy and frontend contract helpers/tests.
2. Update overview/detail components and verify locally with mocked backend payloads plus a live dev API.
3. Harden ingest response semantics and schema; update backend tests.
4. Verify official provider URLs/parsers with captured fixtures; configure production env vars.
5. Deploy behind existing environment routing and run smoke checks: `GET /api/hydrology/municipalities`, `/municipalities`, `GET dashboard`, and controlled `POST /api/hydrology/ingest`.

## Rollback Plan
- Revert the web BFF route and component changes if the frontend regresses; backend canonical routes remain unchanged.
- Keep ingest schema changes backward-compatible during rollout if possible by preserving `runId/status/sources` while adding `results`.
- Disable manual ingest in production via route guard/env flag if source verification fails, while keeping last known municipal data visible.

## Risks and Mitigations
- **Provider endpoint instability:** require verified fixtures and env-configured URLs before marking source success.
- **Contract drift:** import or mirror zod-inferred types in frontend tests; add payload fixture tests for canonical schemas.
- **Operational false confidence:** distinguish `estimated/test fixture`, `failed`, `empty`, and `success`; never write fixtures in production.
- **DB privilege errors:** move PostGIS/admin setup to migrations/bootstrap and make runtime seeding idempotent upserts only.

## Next Recommended Phase
Run SDD spec/design for `ibera-alerta`, then tasks. The design should decide the exact ingest response compatibility strategy and source verification method before implementation.
