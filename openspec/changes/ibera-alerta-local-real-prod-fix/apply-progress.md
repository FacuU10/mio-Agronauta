# Apply Progress: Iberá-Alerta Local Real Production Fix

## Status

All planned tasks and the verification blocker fix are complete. The local API verifier now loads the remote/root environment before creating the Express app and returns HTTP `202` with per-source diagnostics for PNA/INA/INMET/SMN provider failures.

## Completed Tasks

- [x] 1.1 Route/provider boundary preserves post-start provider exceptions as source-level failures instead of aborting the all-source run.
- [x] 1.2 Diagnostics remain sanitized and include bounded metadata (`attempts: 1`, timeout/elapsed, provider host/path/status where available).
- [x] 2.1 Official HTTP clients add `elapsedMs` diagnostics while preserving env URL overrides and one fetch attempt.
- [x] 2.2 Existing manual and scheduler request contracts remain unchanged; response diagnostics are the only expanded contract surface.
- [x] 3.1 Added route tests for all-source provider failures returning HTTP 202 with per-source `results` and `sourceResults`.
- [x] 3.2 Startup failure tests prove structured safe HTTP 503 with sanitized AggregateError details in logs.
- [x] 3.3 Engine tests cover no-retry provider bounds and diagnostic metadata.
- [x] 4.1 Added and fixed one-shot local-real verifier script; it now uses the root/remote env before importing `createApp()`.
- [x] 4.2 Runbook remains updated with provider override guidance, local-real command, and bounded production smoke rules.
- [x] BLOCKER: Identified exact failing operation as `seed_municipalities` using `apps/api/.env` local DB (`ECONNREFUSED`) instead of the remote/root DB env; fixed verifier env load order.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1/1.2/3.1/3.2 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration/unit | ✅ 24/24 baseline before blocker fix | ✅ Added persistence-reject provider diagnostics test and AggregateError sanitizer test; both failed before implementation | ✅ 26/26 after implementation | ✅ Covers provider persistence rejection + startup AggregateError detail bounds | ✅ Extracted startup/persistence helpers and safe error fields |
| 2.1/3.3 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit | ✅ Existing package tests | No new engine behavior in blocker fix | ✅ 22/22 still passing | Existing timeout/status/content-type cases still cover provider diagnostics | ➖ No engine refactor needed |
| 4.1 | `apps/api/src/scripts/verify-hydrology-local-real.ts` | Script/local-real | ✅ API build exposed script type errors | ✅ Build failed until dynamic import used `.js` extension | ✅ API build passed; local-real verifier returned 202 | ✅ Failed local-env run identified `databaseTarget: local`/`seed_municipalities`; fixed run shows `databaseTarget: remote` | ✅ Env load moved before `createApp()` dynamic import |

## Test Summary

- Baseline before blocker fix: `pnpm exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts` → 24/24 passing.
- RED: new API route tests failed as expected: failed-source persistence `AggregateError` aborted the runner; `describeHydrologyStartupFailure` did not exist.
- GREEN: `pnpm exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts` → 26/26 passing.
- Build: `pnpm run build` in `apps/api` → passing.
- Build: `pnpm run build` in `packages/hydrology-engine` → passing.
- Package tests: `pnpm test` in `packages/hydrology-engine` → 22/22 passing.

## Local-Real Evidence

- Diagnostic run after adding sanitized logging: `artifacts/hydrology-local-real-after-blocker-fix.json` returned HTTP 503 with `diagnostic.reason: ingest startup failed during seed_municipalities`; logs showed bounded sanitized `AggregateError`, code `ECONNREFUSED`.
- Exact root cause: the verifier imported `../server` before loading the root remote env, so `dotenv.config()` in `server.ts` loaded `apps/api/.env` from the verifier cwd. That selected a local DB target and `seedGovernmentMunicipalitiesIfEmpty()` failed before provider execution.
- Final bounded local API verifier: `pnpm exec tsx src/scripts/verify-hydrology-local-real.ts --mode api --all-sources --out ../../artifacts/hydrology-local-real-after-env-fix.json`.
- Final artifact: `artifacts/hydrology-local-real-after-env-fix.json`.
- Result: `httpStatus: 202`, `contractValid: true`, `environment.databaseTarget: remote`, top-level `response.status: failed`, one result per PNA/INA/INMET/SMN with `attempts: 1` provider diagnostics.
- Provider outcomes: PNA `timeout`; INA `unexpected_content_type`; INMET `unexpected_content_type`; SMN `http_status` 403.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Added sanitized startup diagnostics, bounded AggregateError details, `seed_municipalities` operation classification, and per-source persistence failure handling after provider execution. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modified | Added TDD tests for failed-source persistence rejection preserving provider diagnostics and bounded sanitized AggregateError details. |
| `apps/api/src/scripts/verify-hydrology-local-real.ts` | Modified | Loads root remote `.env` before dynamically importing `createApp()`, records safe `databaseTarget`, and preserves one-shot verifier behavior. |
| `artifacts/hydrology-local-real-after-blocker-fix.json` | Created | Captured diagnostic 503 proving failing operation `seed_municipalities`. |
| `artifacts/hydrology-local-real-after-env-fix.json` | Created | Captured final bounded local-real API 202 evidence against remote DB. |

## Deviations from Design

- Minimal deviation: the verifier script now explicitly loads the repository root `.env` with `override: true` for local-real remote DB proof before importing the API server. This is script-only and does not alter production server env loading.

## Remaining / Verify Focus

- Run SDD verify again.
- Production bounded smoke remains post-deploy scope: one all-source POST and one municipalities GET.
