# Tasks: Safe PNA Ingest Timeout Fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200 - 320 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation of PNA safe ingest | PR 1 | Base branch: main. Includes schemas, core HTTP client, route, and test updates |

## Phase 1: Zod Schema Extension

- [x] 1.1 Add `hydrologyGovernmentIngestDiagnosticSchema` in `packages/zod-schemas/src/agronautas.ts` with public diagnostics.
- [x] 1.2 Integrate diagnostic schema as an optional property in ingest result schemas in `packages/zod-schemas/src/agronautas.ts`.

## Phase 2: Core Http-Clients Timeout & Ingestion Engine

- [x] 2.1 Implement timeout parsing and UA headers in `packages/hydrology-engine/src/clients/http-clients.ts`.
- [x] 2.2 Add AbortController fetch to enforce anti-DDoS single-attempt and 10s PNA timeout in `packages/hydrology-engine/src/clients/http-clients.ts`.
- [x] 2.3 Map failures to safe diagnostics with host/path sanitization in `packages/hydrology-engine/src/clients/http-clients.ts`.

## Phase 3: Route Integration & Runner Timing

- [x] 3.1 Update named source budgets (10s PNA, 12s general deadline) in `apps/api/src/presentation/routes/hydrology-government.ts`.
- [x] 3.2 Add diagnostic merging, support independent failures returning HTTP 202, and return structured startup failures in `apps/api/src/presentation/routes/hydrology-government.ts`.

## Phase 4: Testing & Verification

- [x] 4.1 Write diagnostic schema validation tests in `packages/zod-schemas/src/agronautas.test.ts`.
- [x] 4.2 Assert client abort, options handling, host/path sanitization, and single-attempt fetch in `packages/hydrology-engine/src/hydrology-engine.test.ts`.
- [x] 4.3 Test source timing, partial statuses, and failed run persistence without fixture fallback in `apps/api/src/presentation/routes/hydrology-government.test.ts`.

## Phase 5: One-Shot Real Smoke Verification

- [ ] 5.1 Perform exactly one backend-origin `POST /api/hydrology/ingest` for `source=PNA` to confirm structured response/safe degradation.
- [ ] 5.2 Perform exactly one frontend-proxy `POST /api/hydrology/ingest` for `source=PNA` to confirm structured response/safe degradation.
- [ ] 5.3 Run one `GET /api/hydrology/municipalities` to verify preserved data. Ensure zero manual retries, no polling, and no loops.
