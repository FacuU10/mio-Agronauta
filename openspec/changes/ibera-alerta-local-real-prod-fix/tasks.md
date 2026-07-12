# Tasks: Iberá-Alerta Local Real Production Fix

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

| Field | Value |
|-------|-------|
| Estimated changed lines | 180-250 lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (Low complexity refactoring + 1 test file + 1 script) |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

## Phase 1: Route Parity & Diagnostic Classification

- [x] 1.1 In `apps/api/src/presentation/routes/hydrology-government.ts`, refine `/ingest` POST handler to catch true pre-run database/runner errors as 503, but return 202 for post-run/provider failures.
- [x] 1.2 Validate and standardize diagnostic payload fields (`failureKind`, `reason`, `attempts: 1`, `timeoutMs`, `elapsedMs`, `providerHost`, `providerPath`, `upstreamStatus`) to ensure zero raw credential/stack leaks.

## Phase 2: Diagnostic & Provider Robustness

- [x] 2.1 In `packages/hydrology-engine/src/clients/http-clients.ts`, ensure HTTP clients log and propagate safe error attributes (timeouts, invalid HTML/403) and honor override env URLs without retries.
- [x] 2.2 Verify that manual and scheduler ingest flows are fully backwards-compatible with the improved diagnostics schema.

## Phase 3: Route & Engine Verification Tests

- [x] 3.1 In `apps/api/src/presentation/routes/hydrology-government.test.ts`, add test cases for all-source provider failures ensuring 202 responses with detailed per-source diagnostics.
- [x] 3.2 Add test case for true startup failure returning structured 503 response.
- [x] 3.3 In `packages/hydrology-engine/src/hydrology-engine.test.ts`, add unit tests verifying no-retry client bounds and override URL diagnostics.

## Phase 4: Local-Real Verification & Documentation

- [x] 4.1 Create `apps/api/src/scripts/verify-hydrology-local-real.ts` to execute a single bounded all-source run using local code against a remote/prod-like database without mocks. Save run to JSON.
- [x] 4.2 Update `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` detailing provider overrides, local-real script command, and bounded production smoke rules.
