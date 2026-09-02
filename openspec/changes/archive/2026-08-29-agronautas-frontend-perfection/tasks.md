# Tasks: ibera-alerta production fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350-520 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 proxy+UI → PR 2 ingest+schemas → PR 3 tests/smoke |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Web BFF + canonical UI mapping | PR 1 | Covers `route.ts`, `overview.tsx`, `detail.tsx`; component tests included. |
| 2 | Ingest resilience + schema contract | PR 2 | Depends on PR 1 only for shared contract awareness; backend tests included. |
| 3 | Verification hardening | PR 3 | Adds route/proxy, empty-state, partial-failure, and smoke checks. |

## Phase 1: Frontend Proxy Foundation

- [x] 1.1 Create `apps/web/src/app/api/hydrology/[...path]/route.ts` to proxy `/api/hydrology/*` to `${AGRONAUTAS_API_INTERNAL_URL || http://localhost:3001}/api/hydrology/*`.
- [x] 1.2 Implement GET/POST/PUT/PATCH/DELETE forwarding with request body, upstream status/body/content-type, `cache: 'no-store'`, and `accept`, `content-type`, `x-request-id` headers.
- [x] 1.3 Forward optional existing BFF bearer env token consistently with `apps/web/src/app/api/agronautas/[...path]/route.ts`.

## Phase 2: Canonical Frontend Data Mapping

- [x] 2.1 Update `apps/web/src/components/government/overview.tsx` types to consume canonical `province`, `sourceFreshness`, `provinceAlerts`, and `municipalities[].latestTelemetry`.
- [x] 2.2 Replace legacy reads of `latest`, `riskLevel`, `localizedWarning`, `sourceFreshness.status`, and alert `title` with derived canonical display fields.
- [x] 2.3 Add deterministic overview helpers for latest PNA river height, rain, max `lastSuccessfulObservedAt`, thresholds, and `Sin datos oficiales recientes` fallback.
- [x] 2.4 Update `apps/web/src/components/government/detail.tsx` to render `inaPredictions30d`, `alerts`, and `provenance[].freshness/label` directly.
- [x] 2.5 Fix detail degraded-state logic to use `provenance.some(item => item.freshness !== 'fresh')` and handle empty telemetry arrays.
- [x] 2.6 Adjust SSE token parsing in `detail.tsx` so string token events and JSON events both append chat output safely.

## Phase 3: Backend Ingest Robustness

- [x] 3.1 Update `packages/zod-schemas/src/agronautas.ts` ingest response schema with `status`, `requestedSources[]`, and per-source `results[]`.
- [x] 3.2 Modify `apps/api/src/presentation/routes/hydrology-government.ts` so `/ingest` catches unrecoverable errors and returns the contract error response.
- [x] 3.3 Refactor `createGovernmentIngestionRunner` to process each source independently and report `success`, `failed`, `empty`, or `skipped` without aborting remaining sources.
- [x] 3.4 Persist failed/empty ingestion runs and set successful `lastSuccessfulObservedAt` from `observedTo`, not request-time `now()`.
- [x] 3.5 Remove or bypass runtime `CREATE EXTENSION` from municipality seeding; keep privileged setup in migrations/bootstrap only.
- [x] 3.6 Change municipality seeding in `hydrology-government.ts` to idempotent `ON CONFLICT DO UPDATE` for authoritative fields and mappings.
- [x] 3.7 Update `packages/hydrology-engine/src/clients/http-clients.ts` to read `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, and `HYDROLOGY_SMN_URL` overrides.
- [x] 3.8 Ensure unsupported HTML/invalid JSON provider responses become failed/empty results with provenance URL, never production fixture success.

## Phase 4: Verification and Testing

- [x] 4.1 Add web route tests proving BFF GET municipalities and POST ingest preserve method, body, status, and content-type.
- [x] 4.2 Add `overview.tsx` tests for canonical payloads, empty `latestTelemetry`, PNA/rain derivation, and explicit error/loading states.
- [x] 4.3 Add `detail.tsx` tests for telemetry, INA forecasts, alerts, provenance degraded state, empty telemetry, and SSE string tokens.
- [x] 4.4 Update `apps/api/src/presentation/routes/hydrology-government.test.ts` for partial source failure, failed-run persistence, and no fixture fallback in production.
- [x] 4.5 Add schema tests for ingest `completed`, `partial`, and `failed` responses in `packages/zod-schemas`.
- [x] 4.6 Run targeted checks: web tests, API hydrology tests, schema tests, and smoke `GET /api/hydrology/municipalities`, `/municipalities`, dashboard, and controlled ingest.
