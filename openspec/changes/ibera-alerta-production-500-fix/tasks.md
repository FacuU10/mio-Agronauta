# Tasks: Ibera-Alerta Production 500 Fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150-250 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR (Exception-ok) |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Infrastructure & Hardened DB Query | PR 1 | Target main; add safe SQL arrays and test fixtures |
| 2 | Route-level Hardening & Diagnostics | PR 1 | Add Try/Catch, Zod fallback, Logging, and Debug Endpoint |
| 3 | BFF Proxy Security & Error Fallback | PR 1 | Add non-localhost Vercel upstream guards & BFF route tests |

## Phase 1: Foundation and Database Hardening

- [x] 1.1 Update `packages/hydrology-engine/src/repository.ts` to harden array type mapping/SQL output in `toMunicipalityTelemetryViews`.
- [x] 1.2 Modify repository overview tests in `packages/hydrology-engine/src/hydrology-engine.test.ts` to verify production-shaped fixtures with missing mappings/null telemetry.

## Phase 2: Express API route Diagnostics & Hardening

- [x] 2.1 Refactor route `/municipalities` in `apps/api/src/presentation/routes/hydrology-government.ts` to implement try/catch block with request-correlated logging.
- [x] 2.2 Add error classification/phases (`repository_query`, `contract_validation`) and map them to structured client-safe JSON errors.
- [x] 2.3 Implement lightweight `/municipalities/debug` route inside the router to expose non-sensitive runtime diagnostics.
- [x] 2.4 Add express route integration tests in `apps/api/src/presentation/routes/hydrology-government.test.ts` to assert error code output on parsing failures.

## Phase 3: BFF Proxy Security & Upstream Fallbacks

- [x] 3.1 Update Next.js BFF proxy `apps/web/src/app/api/hydrology/[...path]/route.ts` to reject missing or localhost `AGRONAUTAS_API_INTERNAL_URL` in production.
- [x] 3.2 Wrap downstream fetches in try/catch to return structured `502`/`503` with propagating `x-request-id` header.
- [x] 3.3 Add unit and boundary tests in `apps/web/src/app/api/hydrology/[...path]/route.test.ts` to cover fetch failures and localhost production guard.

## Phase 4: Verification and Smoke Testing

- [x] 4.1 Run local workspace tests for `hydrology-engine`, API router, and BFF proxy to verify complete test suites pass.
- [x] 4.2 Execute a production smoke request against the deployed endpoint `https://www.agronauta.com.ar/api/hydrology/municipalities` and record response counts and schema validation status.
