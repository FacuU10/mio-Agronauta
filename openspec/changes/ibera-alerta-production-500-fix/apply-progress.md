# Apply Progress: ibera-alerta-production-500-fix

**Change**: `ibera-alerta-production-500-fix`  
**Phase**: 5 — Apply / Implementation  
**Mode**: Standard  
**Delivery strategy**: `exception-ok` / `size-exception` (forecast risk Low)  
**Executed at**: 2026-07-09  
**Executor**: sdd-apply

## Completed Tasks

- [x] 1.1 Hardened repository SQL text-array casts and row normalization in `packages/hydrology-engine/src/repository.ts`.
- [x] 1.2 Added production-shaped repository test coverage for null mappings, Postgres text-array strings, and invalid telemetry rows.
- [x] 2.1 Added request-correlated server-side logging around the Express `/municipalities` repository phase.
- [x] 2.2 Added phase classification for `repository_query` and `contract_validation`, with structured safe JSON errors and telemetry-stripped fallback parsing.
- [x] 2.3 Added `GET /api/hydrology/municipalities/debug` non-sensitive diagnostics route.
- [x] 2.4 Added Express route tests for repository failures, contract-parse fallback, and diagnostics.
- [x] 3.1 Added production guard in the Next.js BFF against missing/localhost `AGRONAUTAS_API_INTERNAL_URL`.
- [x] 3.2 Wrapped BFF upstream fetch in try/catch with structured `502`/`503`, request-id propagation, and safe upstream/header diagnostics.
- [x] 3.3 Added BFF tests for missing upstream, localhost production guard, and thrown fetch.
- [x] 4.1 Ran local test suites for hydrology-engine, API route, and web BFF.
- [x] 4.2 Ran current production smoke request and recorded that deployed production still returns HTTP 500 before these local changes are deployed.

## Verification Evidence

| Check | Result | Notes |
|---|---:|---|
| `pnpm --filter @repo/hydrology-engine test` | PASS | 20/20 tests passed. |
| `pnpm --filter api exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts` | PASS | 15/15 tests passed. |
| `pnpm --filter web test` | PASS | 29/29 tests passed. |
| `pnpm --filter @repo/hydrology-engine build` | PASS | TypeScript build passed. |
| `pnpm --filter api build` | PASS | TypeScript build passed. |
| `pnpm --filter web build` | PASS | Next.js production build passed. |
| `GET https://www.agronauta.com.ar/api/hydrology/municipalities` | FAIL (HTTP 500) | Current deployed production is not yet running these local changes; no response body/count available from smoke. |

## Implementation Notes

- Repository SQL now uses explicit `ARRAY[]::text[]` and `ARRAY[...]::text[]` casts so production Postgres does not infer ambiguous array types from empty defaults.
- Repository mapping now accepts native arrays, Postgres text-array strings such as `{a,b}`, null/empty arrays, non-finite numeric values, and invalid/null telemetry timestamps without throwing the whole municipality response.
- Express `/municipalities` logs phase, request ID, municipality count, telemetry count, sanitized DB error messages, and sanitized Zod issue paths/counts.
- Express response validation first tries the full payload; if production telemetry breaks the shared contract, it retries with `latestTelemetry: []`, empty source freshness, and no province alerts so seeded municipalities can still return `200` when municipality-level data is valid.
- BFF logs resolved upstream origin/path and forwarded header names before fetch, while avoiding authorization/cookie/secret values.
- BFF production runtime refuses missing/localhost upstream configuration instead of silently falling back to `http://localhost:3001`.

## Files Changed

| File | Action | What Was Done |
|---|---|---|
| `packages/hydrology-engine/src/repository.ts` | Modified | Hardened SQL casts and row parsing fallbacks for arrays, numbers, and telemetry dates. |
| `packages/hydrology-engine/src/hydrology-engine.test.ts` | Modified | Added production-shaped overview fallback fixture. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Added request-correlated diagnostics, classified errors, fallback validation, and debug route. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modified | Added route failure/fallback/debug tests. |
| `apps/web/src/app/api/hydrology/[...path]/route.ts` | Modified | Added production upstream guard, safe logging, request-id propagation, and structured fetch errors. |
| `apps/web/src/app/api/hydrology/[...path]/route.test.ts` | Modified | Added BFF boundary/failure tests. |
| `openspec/changes/ibera-alerta-production-500-fix/tasks.md` | Modified | Marked implementation tasks complete. |
| `openspec/changes/ibera-alerta-production-500-fix/apply-progress.md` | Created | Captured cumulative apply evidence. |

## Deviations from Design

- The Express `HYDROLOGY_MUNICIPALITIES_UNAVAILABLE` error is emitted as structured JSON directly instead of being parsed through `agronautasContractErrorSchema`, because the existing enum does not include the new stable hydrology error code.
- Production smoke was executed against the currently deployed app and still returns 500; proof of the fix requires deploying these changes and rerunning verification.

## Remaining Work

- Deploy the API/BFF changes.
- Run SDD verify with real production HTTP smoke after deployment and inspect correlated logs if production still fails.
