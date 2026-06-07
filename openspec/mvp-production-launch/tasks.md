# Tasks: MVP Production Launch

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 270 - 380 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | size-exception |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Production Readiness Implementations | PR 1 | Base branch: main. Includes Next.js test fix, DB pool sizing, and readiness timeouts. |

## Phase 1: Foundation & Helper Implementations

- [x] 1.1 Implement `computePostgresPoolMax(numWorkers, rawMax)` and `resolveApiWorkerCount()` in `apps/api/src/infrastructure/database/postgres/pool.ts`.
- [x] 1.2 Create unit tests for pool helpers in `apps/api/src/infrastructure/database/postgres/pool.test.ts`.
- [x] 1.3 Implement `assertImageAssetPath(markup, expectedPath)` helper in `apps/web/src/components/landing/homepage.test.tsx`.

## Phase 2: Core Routing & Integration

- [x] 2.1 Integrate `computePostgresPoolMax` into connection pool initialization in `apps/api/src/infrastructure/database/postgres/pool.ts`.
- [x] 2.2 Refactor `GET /ready` and `GET /health` in `apps/api/src/presentation/routes/health.ts` using `withReadinessTimeout()`.
- [x] 2.3 Ensure MongoDB failures do not fail `/ready` and only mark it as degraded/optional in `apps/api/src/presentation/routes/health.ts`.

## Phase 3: Testing & Verification

- [x] 3.1 Update landing homepage test assertions in `apps/web/src/components/landing/homepage.test.tsx` using `assertImageAssetPath`.
- [x] 3.2 Add route tests in `apps/api/src/presentation/routes/health.test.ts` for failing/timeout dependencies, optional MongoDB, and 200/503 statuses.
- [x] 3.3 Run focused tests using `pnpm --filter web exec node --import tsx --test src/components/landing/homepage.test.tsx` and `pnpm --filter api exec node --import tsx --test src/infrastructure/database/postgres/pool.test.ts`.
- [x] 3.4 Run regression tests via `pnpm --filter web test` and `pnpm --filter api test`.

## Phase 4: Rollback Strategy & Verification

- [x] 4.1 Perform rollback check: if deployment fails, run `git checkout main` (or the previous stable commit) and redeploy.
