# Exploration: Agronautas and Iberá-Alerta data-first UX with on-demand acquisition

## Current State

### Baseline and completed work

- The verified repository baseline is `main`, `HEAD`, and `origin/main` at `7a3007a5dc9d292c8d14555783b2d222ac93ba72`.
- `agronautas-ibera-uiux-mvp-visibility` is already applied: its `tasks.md` records 10/10 completed tasks, and the prior evidence records web tests 83/83, a successful build, focused Playwright 5/5, and the known global E2E locator failure in `government-ui.spec.js:78`. This change must not recreate that UI work.
- The active OpenSpec project is hybrid with strict TDD. The repository contains Next.js 15/React 19/Tailwind 4 web code, an Express/Prisma/PostgreSQL/PostGIS/Redis API, a Python 3.12 worker, shared Zod contracts, and a hydrology engine.
- The working tree already has two untracked roadmap documents. They were read as context only; this exploration does not modify or promote them to implementation authority.

### Agronautas: verified backend and UI

The Express router in `apps/api/src/presentation/routes/agronautas.ts` currently exposes:

- `POST /fields` using `fieldIntakeSchema`; the payload accepts crop/category, hectares, locality, centroid and optional `location.polygonWkt`.
- Field, risk, alert, status, risk-timeline, weather-timeline, dashboard and PDF reads under `/fields/:fieldId`.
- Hydrology dashboard/alerts reads using a dense context derived from a field boundary or centroid fallback.
- `POST /fields/:fieldId/recompute`, grounded synchronous chat, and hydrology Copilot SSE.
- The dashboard builder includes risk, climate signals, alerts, provenance, scheduler-shaped data, last-fetch time and presentation degradation flags. Its scheduler projection currently sets `lockStatus: 'unknown'` and an empty `nextDueBySource` array rather than exposing a complete operational schedule.

The web BFF at `apps/web/src/app/api/agronautas/[...path]/route.ts` forwards the request to the Express Agronautas namespace with `cache: 'no-store'`. `apps/web/src/lib/agronautas/service.ts` has typed methods for all of the above reads plus both chat paths.

`apps/web/src/components/agronautas/page-client.tsx` runs parallel queries for field, risk, current alerts, status, risk timeline, weather timeline, dashboard and hydrology dashboard. `workspace.tsx` renders a decision card, freshness/degraded states, hydrology heights/trends/alerts/INA forecasts, risk/alert timelines, drivers, evidence, an ingestion/freshness panel, two chat surfaces and a PDF link. `field-detail.tsx` renders a separate detail journey with risk, evidence, alerts, timelines, a point-oriented map fallback, provenance and recompute.

What is verified as still incomplete or misleadingly shaped:

- The map abstraction in `apps/web/src/lib/visibility/map.ts` is explicitly `provider: 'unconfigured'`; `intake-map.ts` contains only two hard-coded localities and a bounding-box preview. The UI is a text/locality selector and coordinate form, not Google Maps, WhatsApp intake, polygon drawing or editable geometry.
- The intake UI does not send `polygonWkt`, despite the shared contract accepting it. The backend use case copies it into the `Field` entity and `FieldContext.contextPayload`, but `PostgresFieldRepository.save()` does not write a field geometry column, and `findById()` does not select or return one. The Prisma `Field` model has `boundary geometry(MultiPolygon,4326)`, but the repository path does not populate it. Durable polygon editing is therefore not an existing capability.
- Real intake is constrained twice: `fieldIntakeSchema` allows the supported crop enum, but `CreateFieldIntakeUseCase.execute()` persists `crop: 'rice'`, and coverage resolves only a point with `CORRIENTES_COVERAGE_QUERY` against `scope = 'corrientes_rice'`. `corrientesRiceZoneBoundarySource` remains a placeholder/pending-ingest source descriptor.
- The dashboard UI renders much of the current payload, but not a complete source/cadence/failure matrix, all raw evidence relationships, durable job lifecycle, or a proven “data acquired for this request” trace. Some UI values are presentation projections rather than direct source observations.
- The grounded field chat assembles field context, latest risk and alerts in `agronautas.ts`; the hydrology Copilot path supplies a hydrology dense context. Neither current API contract is a complete per-field bundle containing every relevant dashboard signal, source freshness, scheduler state, job state, field geometry and historical evidence. The Python `AgronautasCopilotRuntime` has a different request/context shape and is not shown to be wired to these Express chat routes.

### Agronautas: acquisition, scheduler and persistence

There are three distinct mechanisms, not one complete on-demand pipeline:

1. `createOpenMeteoAdapter()` in `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts` can call `https://api.open-meteo.com/v1/forecast` and normalize daily temperature/rainfall. It supports an injectable fetch seam and `live`/`mock` mode, but has no location argument in the adapter interface beyond `fieldId`, no explicit timeout, retry, cache or rate-limit implementation, and no caller shown that turns field creation into an acquisition run.
2. `AgronautasSignalScheduler` computes due windows from persisted source cadences and a Redis window lock. In `server.ts`, its production dispatcher currently logs a planned window; it does not invoke the provider adapter. The configured Open-Meteo cadence is hourly with a two-hour freshness SLA and a `public-api-fair-use` note, which is metadata, not runtime rate-limit proof.
3. A recompute request uses Redis locking and `RedisAgronautasRuntimeDispatcher` to push a job to `bull:agronautas-runtime:wait`. The Python worker (`apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`) reads the field centroid, calls Open-Meteo with `urlopen(..., timeout=10)`, calculates `open-meteo-basic-v1`, and persists `signal_ingestion_runs` and `risk_snapshots`. Failures are recorded and become `retryable_failure` or `dlq`; this path does not itself demonstrate serving the last good result as a fallback.

Existing persistence supports history in principle: `signal_ingestion_runs`, `risk_snapshots`, `alert_snapshots`, `AgronautasJobRun`, and timeline endpoints exist. `PostgresSignalIngestionRepository.findLatestGood()` provides a latest-success query. A location-keyed weather cache, acquisition request record, source-specific cache policy, durable on-demand status, and a complete field-to-provider evidence correlation are not verified.

### Iberá-Alerta: verified backend and UI

`apps/api/src/presentation/routes/hydrology-government.ts` exposes:

- `GET /municipalities` with municipality mappings, latest telemetry, official alerts, province alerts and source freshness.
- `GET /municipalities/:id/dashboard` with telemetry cards, INA predictions up to 30 days, SMN/INMET alert telemetry, official alerts and provenance.
- Protected asynchronous ingest: `POST /ingest` returns `202`, `runId`, `proofRunId`, `statusPath` and `queued`; `GET /ingest/:runId` observes bounded in-memory states with a 15-minute TTL and 32-entry cap. Admission is limited to four requests per minute per key.
- Municipal Copilot SSE with explicit out-of-scope responses and metadata/token/done/error events.

The provider path is concrete in `packages/hydrology-engine/src/clients/http-clients.ts` and its adapters:

- PNA uses the official heights page, 120-second request timeout, 145-second total budget, up to two attempts and a small retry backoff.
- INA queries three configured series by default and accepts CSV/HTML/JSON normalizations, capped to a 30-day forecast horizon.
- INMET and SMN consume official alert/RSS endpoints with bounded response sizes and 60-second default requests.
- Ingestion records HTTP summaries, sanitized diagnostics, observed ranges, provenance and per-source results. `HydrologyRepository.saveTelemetryDeduped()` persists telemetry and ingestion runs in PostgreSQL.

The applied UI already renders the institutional overview, source freshness, provincial alerts, municipality cards, a list fallback in `MapFrame`, municipality telemetry, mappings, official alerts, INA table, provenance, Copilot stream metadata/limits and the protected ingest flow. `ingest-panel.tsx` polls `statusPath` with bounded attempts; this is completed UI work and should not be reimplemented.

### Iberá-Alerta: verified gaps and map constraints

- The municipal contract does not return geometry. `hydrologyGovernmentMunicipalitySchema` contains IDs, names, thresholds, gauge mappings, telemetry and alerts, but no boundary/centroid/GeoJSON field. The overview therefore cannot draw a data-backed map from its current response.
- PostgreSQL/PostGIS does contain `agronautas_municipalities.boundary geometry(MultiPolygon,4326)` and GIST indexes. However, `seedGovernmentMunicipalitiesIfEmpty()` generates each boundary with `squareBoundary()` around a PNA port (`delta = 0.12`), and the migration stores no geometry source, version, official administrative level or semantic relation between the polygon and gauge influence. This is approximate display geometry, not verified official municipality geography.
- `municipality_gauge_mappings` and the versioned `municipality_alert_coverage` table provide reviewable station/coverage-key associations. They do not define hydrodynamic influence, travel time, causality, threshold semantics across a municipality, or an official municipality boundary.
- `apps/api/src/infrastructure/database/postgres/seed-municipality-alert-coverage.ts` deliberately maps all seeded municipalities to broad SMN/INMET keys. This supports alert projection but is not proof that every alert applies uniformly to every point in a municipality.
- The current repository can calculate municipality-level status from mapped telemetry and PNA thresholds, but there is no checked contract for “river height impact on each municipality” beyond that threshold comparison. Any visual must label the relation as observed/mapped/threshold-based and must not imply hydraulic simulation.

### Google Maps, WhatsApp and field geometry

The repository has no verified Google Maps SDK dependency, Google Maps server route, WhatsApp webhook, WhatsApp message parser, inbound media storage contract or field-polygon edit endpoint. Targeted route/dependency searches found only the existing provider-neutral map adapter and JSON `POST /fields`. Consequently:

- Google Maps is an unselected future adapter, not an available capability.
- WhatsApp can be explored as an intake channel only after its webhook/auth/media/link contract is established; no implementation or availability claim is supported now.
- Editable one-or-more polygon support requires a new versioned geometry contract, validation/normalization, durable PostGIS writes, read/update endpoints, audit/history semantics and coverage semantics. Existing `polygonWkt` acceptance is insufficient evidence.

## Affected Areas

- `apps/web/src/components/agronautas/page-client.tsx`, `workspace.tsx`, `field-detail.tsx` — current data queries and rendered Agronautas surfaces; candidate for a non-repetitive data/provenance visibility audit only.
- `apps/web/src/lib/agronautas/service.ts`, `schemas.ts`, `intake-map.ts`, `apps/web/src/lib/visibility/map.ts` — existing BFF adapters, contracts and unconfigured map seam.
- `apps/api/src/presentation/routes/agronautas.ts` — canonical field, dashboard, hydrology and chat contracts; current Copilot context boundaries and recompute entry point.
- `packages/zod-schemas/src/agronautas.ts` — intake, dashboard, provenance, freshness, hydrology and Copilot schemas; likely boundary for a future evidence bundle, not a reason to invent fields in this phase.
- `apps/api/src/application/usecases/create-field-intake-usecase.ts` and `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.ts` — current point coverage and non-durable polygon behavior.
- `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts`, `agronautas-scheduler.ts`, `server.ts`, `agronautas-runtime-dispatcher.ts` — provider seam, scheduler planning/logging and recompute queue dispatch.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` and `tests/test_agronautas_jobs.py` — current real Open-Meteo recompute path, timeout, persistence and retry/DLQ behavior.
- `apps/api/prisma/schema.prisma`, `infra/bootstrap/agronautas/001-postgis-schema.sql`, `002-corrientes-seeds.sql` — field and municipality geometry storage, approximate seed geometries and source/boundary metadata.
- `apps/api/src/presentation/routes/hydrology-government.ts`, `packages/hydrology-engine/src/repository.ts`, `packages/hydrology-engine/src/clients/http-clients.ts` and source adapters — Iberá source acquisition, mapping, persistence and freshness evidence.
- `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx` — already-applied institutional surfaces; only evidence-backed missing views should be touched later.
- `apps/api/prisma/migrations/20260623210000_government_hydrology_municipalities/migration.sql` and `20260718120000_municipality_alert_coverage/migration.sql` — current municipal geometry/mapping schema and its missing official-geometry semantics.

## Approaches

1. **Data-first visibility slice before acquisition** — Audit each existing route/contract against the applied screens, then add only the smallest missing read-only surfaces: complete source/freshness/provenance context, explicit observed/forecast/fallback labels, Copilot context/evidence references, and an Iberá municipality impact view based on mapped telemetry and thresholds.
   - Pros: directly addresses the user value gap; reuses real contracts and completed UI; exposes whether data is sufficient before adding acquisition; low domain risk.
   - Cons: cannot fix missing durable polygon geometry, canonical Risk Engine or on-demand orchestration; some backend contract additions may be needed for evidence that is currently not returned.
   - Effort: Medium.

2. **Field-location on-demand vertical slice first** — Create an acquisition request from a field centroid, call one adapter (Open-Meteo), persist source/run/snapshot history, serve cached/latest-good data, and expose freshness/error state in the existing field journey.
   - Pros: proves the differentiated data loop end to end with a narrow source and real location.
   - Cons: crosses API, Redis, worker, PostgreSQL and Python/TypeScript Risk Engine boundaries; current scheduler is not an acquisition dispatcher, Open-Meteo adapter and worker have different contracts, timeout/rate-limit/cache semantics are incomplete, and the field geometry is not durably stored.
   - Effort: High; not ready to implement until the evidence matrix and canonical runtime boundary are agreed.

3. **Iberá municipality map/impact slice first** — Return GeoJSON or map-ready geometry with mapped telemetry/threshold status and render a map plus accessible table, explicitly without hydraulic simulation.
   - Pros: advances the requested institutional workflow and uses existing PostGIS, telemetry and mapping tables.
   - Cons: current polygons are generated squares, the API omits geometry, and official boundary/impact semantics are missing. A map built now could make approximate relationships look authoritative.
   - Effort: Medium/high; suitable only as an evidence/geometry sub-slice after source and semantics review.

## Recommendation

Proceed with Approach 1 as the proposed boundary, explicitly excluding the completed UI/UX reconstruction. The first slice should be a **data-first evidence layer over the existing Agronautas and Iberá-Alerta journeys**, with a contract-to-render matrix and runtime states that make visible what is already available, what is stale/degraded/missing, and what the Copilot actually received. It should not introduce Google Maps, WhatsApp, new national/regional storage, a new Risk Engine, hydraulic simulation or a second dashboard shell.

Use the resulting evidence matrix to define Approach 2 as a separate, narrow follow-on: one field centroid, one proven adapter/source, one acquisition request, one durable run/history record, one cache/latest-good policy, measured latency/rate behavior, and an end-to-end trace from request to Copilot context. Do not call Corrientes-wide acquisition feasible until this slice proves source coverage, provider limits, cost/latency, failure behavior and persistence under the real configured runtime.

Treat Approach 3 as a separate institutional workflow with a hard prerequisite: an approved official geometry source/version and explicit semantics for how mapped river observations and thresholds affect each municipality. Until then, a table/list and approximate geometry disclaimer are safer than a map that implies modeled impact.

### Proposed change boundary

Include:

- Contract-to-screen inventory for Agronautas and Iberá-Alerta using current routes, schemas and applied components.
- Minimal data-first view-model/UI adjustments that expose existing forecasts, key indicators, source/provenance/freshness, telemetry, alerts, local context, ingestion diagnostics and Copilot evidence without repeating the prior UI slice.
- A bounded proof plan for the field-location on-demand slice, including adapter, request, rate limit, timeout, cache, fallback, persistence/history, freshness and runtime evidence.
- A PostGIS/contract evidence plan for municipality impact mapping, with explicit approximate/official geometry and no hydraulic-simulation claim.
- A documented intake decision boundary for Google Maps/WhatsApp and editable polygons; no provider selection or geometry implementation in this exploration.

Exclude:

- Rebuilding `agronautas-ibera-uiux-mvp-visibility` surfaces or changing their identity/navigation without evidence of a defect.
- New provider integrations, Google Maps billing/key setup, WhatsApp business/webhook setup, national or all-Corrientes precomputation, and speculative product modules.
- Canonical Risk Engine selection/merge, queue/worker rewrite, auth/security redesign, hydraulic simulation, routing/lag, discharge or evacuation authority.
- Claims that current municipality squares are official boundaries, that current Copilot context is complete, or that `polygonWkt` is durably persisted.

## Evidence and later-phase commands

These are required evidence commands, not results. They must be run later with approved local/runtime configuration, without Docker in this change:

1. Static/contracts: `pnpm --dir apps/api test`, `pnpm --dir packages/hydrology-engine test`, `pnpm --dir apps/web test`, `pnpm build`, `pytest apps/workflow-runtime-python/tests/test_agronautas_jobs.py apps/workflow-runtime-python/tests/test_queue_consumer.py`.
2. Adapter/runtime proof: run the existing Open-Meteo adapter tests and Python job tests, then capture one bounded real request showing URL, timeout, elapsed time, response shape, source mode, persistence IDs and failure behavior. Do not report a live provider result until it is actually observed.
3. Field on-demand proof sequence: create one supported field through `POST /api/agronautas/v1/fields`, request current status/risk, trigger recompute, observe job completion through the durable API contract, then read dashboard/weather/risk timelines and verify corresponding `signal_ingestion_runs`, `risk_snapshots` and job rows with read-only SQL. Confirm the Copilot request includes the same field, source, freshness and evidence identifiers.
4. Iberá source proof: `pnpm --dir apps/api verify-local` or the documented `verify-hydrology-local-real.ts --all-sources --allow-empty` path, then inspect per-source HTTP summaries, ingestion rows, telemetry rows and freshness. Production cells must remain `not_run` unless separately authorized and observed.
5. Iberá browser proof: only when the configured database and migrations are intentionally available, use `HYDROLOGY_REAL_E2E=true pnpm --dir apps/web exec playwright test --workers=1 tests/e2e/hydrology-government.spec.js`; this is not production evidence.
6. Geometry/semantics proof: inspect `ST_AsGeoJSON(boundary)`, SRID, validity, source/version metadata and municipality-to-gauge/alert mappings in read-only SQL; compare them with an approved official geometry dataset before exposing a map. No result is assumed by this exploration.

## Risks

- The current TypeScript and Python risk paths can produce different outputs (`risk-v0` versus `open-meteo-basic-v1`); an on-demand proof can be false confidence if it does not identify the canonical computation.
- Scheduler due-window planning is not equivalent to provider acquisition; the current Agronautas scheduler path may only log planned windows.
- Open-Meteo rate-limit, fair-use, timeout and cache behavior is not proven by the cadence metadata or injectable adapter tests.
- In-memory Iberá `statusPath` observations disappear on process restart and have bounded TTL/capacity; this is unsuitable as durable acquisition history without a separate change.
- Polygon acceptance without geometry persistence/readback can lose the user’s boundary; Google Maps/WhatsApp intake would amplify that risk unless storage and audit semantics are settled first.
- Approximate municipality squares and broad alert coverage keys can be mistaken for official territorial or hydraulic impact relationships.
- Existing demo/mock/seam/fallback paths can make a UI smoke look healthy while no live provider data was acquired; every future proof must report mode, source URL, timestamps and persistence evidence separately.
- No Docker was used or should be used for this exploration; local runtime evidence that depends on Postgres/Redis must state its external prerequisites instead of inventing a result.

## Ready for Proposal

Yes, with the proposal restricted to a non-repetitive data-first evidence slice and an evidence plan for a later single-field on-demand vertical slice. The proposal should state that the applied UI is the baseline, make the contract-to-render matrix an acceptance artifact, require measured runtime evidence before any Corrientes-wide/on-demand claim, and keep Google Maps/WhatsApp, durable polygon editing and Iberá map semantics as explicitly gated follow-on decisions.
