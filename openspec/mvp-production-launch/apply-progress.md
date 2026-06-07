# Apply Progress: MVP Production Launch

## Mode

Strict TDD (Node.js Test Runner). Hybrid persistence: OpenSpec file updated and Engram progress saved.

## Completed Tasks

- [x] 1.1 Implemented `computePostgresPoolMax(numWorkers, rawMax)` and `resolveApiWorkerCount()` in `apps/api/src/infrastructure/database/postgres/pool.ts`.
- [x] 1.2 Created pool helper tests in `apps/api/src/infrastructure/database/postgres/pool.test.ts`.
- [x] 1.3 Implemented `assertImageAssetPath(markup, expectedPath)` in `apps/web/src/components/landing/homepage.test.tsx`.
- [x] 2.1 Integrated dynamic PostgreSQL pool sizing into pool initialization.
- [x] 2.2 Refactored `/health` and `/ready` using `withReadinessTimeout()`.
- [x] 2.3 Kept MongoDB optional/degraded for readiness.
- [x] 3.1 Updated homepage image assertions to accept plain and encoded separators.
- [x] 3.2 Added health/readiness route tests for liveness, required failures, timeouts, and optional MongoDB.
- [x] 3.3 Ran focused web/API tests.
- [x] 3.4 Ran web/API regression tests.
- [x] 4.1 Rollback check confirmed: no schema migration; rollback is code-only via previous stable branch/commit and redeploy.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `apps/api/src/infrastructure/database/postgres/pool.test.ts` | Unit | N/A (new tests for helper behavior) | ✅ `computePostgresPoolMax`/`resolveApiWorkerCount` tests failed: exports missing (0/5) | ✅ Pool focused tests passed (5/5) | ✅ Override, default, single-worker, invalid input, worker-count cases | ✅ API build passed after helper extraction |
| 1.2 | `apps/api/src/infrastructure/database/postgres/pool.test.ts` | Unit | N/A (new file) | ✅ Test file written before helper implementation | ✅ Pool focused tests passed (5/5) | ✅ 5 behavioral cases | ✅ Kept assertions pure and deterministic |
| 1.3 | `apps/web/src/components/landing/homepage.test.tsx` | Unit/SSR component test | ⚠️ Baseline homepage focused test had known target RED: 1/2 failed on encoded image URL | ✅ Existing homepage assertion failed against `%2Flanding%2Fsource%2Flogo.webp` | ✅ Homepage focused tests passed (3/3) | ✅ Helper accepts plain `/`, encoded `%2F`, and rejects wrong asset | ✅ Regex helper extracted locally |
| 2.1 | `apps/api/src/infrastructure/database/postgres/pool.test.ts` | Unit | N/A (covered by new helper tests) | ✅ Integration covered by missing helper exports before implementation | ✅ Pool focused tests passed (5/5) | ✅ `12/3 => 5`, `20/4 => 5`, `20/1 => 20`, invalid fallback | ✅ Pool config now consumes helper |
| 2.2 | `apps/api/src/presentation/routes/health.test.ts` | Route integration | ✅ Existing health route tests passed (3/3) | ✅ New tests failed for missing `READINESS_DEPENDENCY_TIMEOUT_MS`, `withReadinessTimeout`, failed-required metadata, and timeout behavior (4/7 failed) | ✅ Health focused tests passed (7/7) | ✅ `/health` liveness, `/ready` healthy, required failure, required timeout | ✅ Timeout wrapper extracted and injectable timeout retained for fast tests |
| 2.3 | `apps/api/src/presentation/routes/health.test.ts` | Route integration | ✅ Existing optional Mongo route test passed | ✅ New assertions required Mongo degraded while readiness stays 200 | ✅ Health focused tests passed (7/7) | ✅ Mongo false with PG+Redis healthy returns 200; Redis false returns 503 and Mongo remains degraded | ✅ Mongo forced into optional services set |
| 3.1 | `apps/web/src/components/landing/homepage.test.tsx` | Unit/SSR component test | ⚠️ Baseline homepage focused test had known target RED: 1/2 failed | ✅ Failing encoded image assertion captured before helper update | ✅ Homepage focused tests passed (3/3) | ✅ Plain, encoded, and wrong-asset cases | ✅ Assertions remain asset-path-specific |
| 3.2 | `apps/api/src/presentation/routes/health.test.ts` | Route integration | ✅ Existing health route tests passed (3/3) | ✅ New route tests failed before production route changes | ✅ Health focused tests passed (7/7) | ✅ 200, 503, optional Mongo, and timeout cases | ✅ Shared `baseConfig` reduced duplication |
| 3.3 | Focused commands | Unit/integration | ✅ Pre-change focused commands run | ✅ RED failures captured for web image bug and new API tests | ✅ Web 3/3, pool 5/5, health 7/7 focused tests passed | ✅ Focused coverage spans all changed behavior | ✅ No extra changes after final focused pass |
| 3.4 | Package commands | Regression | N/A | N/A (regression phase after GREEN) | ✅ `pnpm --filter web test` passed 13/13; `pnpm --filter api test` passed 60/60 | ✅ Package suites cover surrounding behavior | ✅ `pnpm --filter api build` passed |
| 4.1 | Git/rollback check | Process | N/A | N/A | ✅ Confirmed no migration/schema dependency | ➖ Process-only task | ✅ Rollback remains branch/commit redeploy |

## Test Summary

- **Focused tests**:
  - `pnpm --filter web exec node --import tsx --test src/components/landing/homepage.test.tsx` — passed 3/3 after GREEN.
  - `pnpm --filter api exec node --import tsx --test src/infrastructure/database/postgres/pool.test.ts` — passed 5/5 after GREEN.
  - `pnpm --filter api exec node --import tsx --test src/presentation/routes/health.test.ts` — passed 7/7 after GREEN.
- **Regression tests**:
  - `pnpm --filter web test` — passed 13/13.
  - `pnpm --filter api test` — passed 60/60.
  - `pnpm --filter api build` — passed.
- **Total tests written/updated**: 13 relevant behavioral assertions across 3 test files.
- **Layers used**: Unit and route integration.
- **Approval tests**: Existing route/homepage tests used as safety net; no pure refactor-only task.
- **Pure functions created**: `computePostgresPoolMax`, `resolveApiWorkerCount`, `withReadinessTimeout`, `assertImageAssetPath`.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/web/src/components/landing/homepage.test.tsx` | Modified | Added separator-tolerant image path helper and updated logo/hero assertions. |
| `apps/api/src/infrastructure/database/postgres/pool.ts` | Modified | Added worker-aware PostgreSQL pool helper and wired `PoolConfig.max`. |
| `apps/api/src/infrastructure/database/postgres/pool.test.ts` | Created | Added pool helper unit coverage for override/default/single-worker/fallback cases. |
| `apps/api/src/presentation/routes/health.ts` | Modified | Added 2000ms readiness timeout helper, dependency metadata, failed required checks, and optional Mongo handling. |
| `apps/api/src/presentation/routes/health.test.ts` | Modified | Added liveness, timeout, failed required dependency, and optional Mongo tests. |
| `openspec/mvp-production-launch/tasks.md` | Modified | Marked all implementation, test, and rollback-check tasks complete. |
| `openspec/mvp-production-launch/apply-progress.md` | Created | Captured strict TDD apply evidence and verification results. |

## Deviations from Design

None — implementation matches the design. `readinessTimeoutMs` remains dependency-injectable for fast tests while production defaults to `READINESS_DEPENDENCY_TIMEOUT_MS = 2000`.

## Issues Found

- Baseline web homepage focused test failed before changes because Next.js emitted encoded `%2F` image paths in SSR/JSDOM markup. This was the expected target RED.
- `pnpm --filter api build` updated `apps/api/tsconfig.tsbuildinfo`; the generated file was reverted because it is not part of the change.

## Workload / PR Boundary

- Mode: single PR, `size-exception` chain strategy from tasks forecast.
- Current work unit: Production Readiness Implementations.
- Boundary: Next.js image test fix, PostgreSQL pool sizing, readiness timeout semantics, focused/regression tests, and SDD task/progress artifacts.
- Estimated review budget impact: Medium; actual source/test artifact diff remains within the forecasted single-unit scope.

## Status

11/11 tasks complete. Ready for `sdd-verify`.
