# Design: MVP Production Launch

## Technical Approach

Implement the smallest production-launch patch: make the landing image assertion encoding-tolerant, compute PostgreSQL pool size per API worker using the refined spec formula, and make `/ready` dependency checks bounded and explicit. `/health` stays pure liveness. Mongo remains optional/degraded and must never fail readiness by itself.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Image assertion | Add a local test helper that matches each path separator as `(?:/|%2F)` for `/landing/source/logo.webp` and `/landing/source/imagen1.webp`. | Decode the full HTML string; assert only image filename. | Regex keeps proof tied to the exact asset path without risking malformed global decode or weakening to filename-only checks. |
| Pool sizing | Export pure helpers from `apps/api/src/infrastructure/database/postgres/pool.ts`: `computePostgresPoolMax(numWorkers, rawMax)` and `resolveApiWorkerCount(env)`. Use `max` in `PoolConfig`. | Keep `max: 20`; move cluster logic to `index.ts`. | Pure helpers are deterministic and testable while preserving the existing pool module as the single place that owns PG configuration. |
| Readiness timeout | Add `READINESS_DEPENDENCY_TIMEOUT_MS = 2000` and a local `withReadinessTimeout()` wrapper in `health.ts`; allow `readinessTimeoutMs` override only through `createHealthRouter()` deps for fast tests. | Rely on pg/redis client timeouts only. | Route-level timeout guarantees probe behavior even when a dependency promise hangs. |

## Data Flow

```text
GET /health ──→ immediate 200 { status: "ok" }

GET /ready ──→ config
           ├─→ withTimeout(checkPostgres) ─┐
           ├─→ withTimeout(checkRedis) ────┼─→ requiredChecks + failedRequiredChecks
           ├─→ withTimeout(checkMongoDB) ──┘   (optional/degraded only)
           └─→ worker readiness if runtimeRequired (preserve existing behavior)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/components/landing/homepage.test.tsx` | Modify | Add `assertImageAssetPath(markup, expectedPath)` that builds a separator-tolerant regex. Replace fixed `/landing/source/...` assertions with helper calls. |
| `apps/api/src/infrastructure/database/postgres/pool.ts` | Modify | Import `os`; add exported `computePostgresPoolMax(numWorkers, rawMax = process.env['DATABASE_POOL_MAX'])`; parse invalid/non-positive values back to base `20`; compute exactly `Math.max(5, Math.floor(base / numWorkers))`; use `resolveApiWorkerCount()` for production `os.cpus().length` vs non-production `1`; set `config.max` from helper. |
| `apps/api/src/infrastructure/database/postgres/pool.test.ts` | Create | Unit-test explicit override division (`12/3 => 5`), default division (`20/4 => 5`), single worker default (`20`), and invalid override fallback. |
| `apps/api/src/presentation/routes/health.ts` | Modify | Keep `/health` dependency-free. Wrap Postgres, Redis, and Mongo checks with timeout metadata; build `failedRequiredChecks`; return `200` only when required checks pass, else `503`. Mongo failure/timeout appears in `degraded`/capabilities only. Preserve existing worker-required logic. |
| `apps/api/src/presentation/routes/health.test.ts` | Modify | Add mocks for failing deps, slow Redis/Postgres promises, and optional Mongo failure. Assert `/health` 200, `/ready` 200 for PG+Redis healthy with Mongo degraded, `/ready` 503 for required failure/timeout, and exported timeout constant equals `2000`. |

## Interfaces / Contracts

```ts
export const READINESS_DEPENDENCY_TIMEOUT_MS = 2000
export function computePostgresPoolMax(numWorkers: number, rawMax?: string): number
```

`/ready` response adds `failedRequiredChecks: string[]`; existing `checks`, `requiredChecks`, `optionalChecks`, `degraded`, `worker`, and `capabilities.mongodb` remain compatible.

## Testing Strategy

| Layer | What to Test | Command |
|---|---|---|
| Web unit | Landing image paths accept `/` and `%2F` separators | `pnpm --filter web exec node --import tsx --test src/components/landing/homepage.test.tsx` |
| API unit | Pool formula and fallback behavior | `pnpm --filter api exec node --import tsx --test src/infrastructure/database/postgres/pool.test.ts` |
| API route | `/health`, `/ready`, dependency failures, timeout wrapper | `pnpm --filter api exec node --import tsx --test src/presentation/routes/health.test.ts` |
| Regression | Package-level suites after focused tests | `pnpm --filter web test` and `pnpm --filter api test` |

## Migration / Rollout

No migration required. Deploy is code/config only; tune `DATABASE_POOL_MAX` if production monitoring shows pool saturation.

## Open Questions

None.
