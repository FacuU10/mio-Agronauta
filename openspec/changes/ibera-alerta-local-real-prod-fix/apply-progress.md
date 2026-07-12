# Apply Progress: Iberá-Alerta Local Real Production Fix

## Status

All planned tasks are complete. Implementation is ready for SDD verify, with one caveat: the single local-real API execution reached a true startup/database failure and correctly returned structured `503`, so it did not prove the desired remote-DB provider-failure `202` path in this environment.

## Completed Tasks

- [x] 1.1 Route/provider boundary now preserves post-start provider exceptions as source-level failures instead of aborting the all-source run.
- [x] 1.2 Diagnostics remain sanitized and include bounded metadata (`attempts: 1`, timeout/elapsed, provider host/path/status where available).
- [x] 2.1 Official HTTP clients add `elapsedMs` diagnostics while preserving env URL overrides and one fetch attempt.
- [x] 2.2 Existing manual and scheduler request contracts remain unchanged; response diagnostics are the only expanded contract surface.
- [x] 3.1 Added route test for all-source provider failures returning HTTP 202 with per-source `results` and `sourceResults`.
- [x] 3.2 Startup failure tests continue proving structured safe HTTP 503.
- [x] 3.3 Added/adjusted engine tests for no-retry provider bounds and diagnostic metadata.
- [x] 4.1 Added one-shot local-real verifier script and saved one execution artifact.
- [x] 4.2 Updated runbook with provider override guidance, local-real command, and bounded production smoke rules.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1/1.2/3.1/3.2 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration/unit | ✅ 22/22 baseline | ✅ Added provider-throw and all-source route diagnostics tests; provider-throw failed before implementation | ✅ 24/24 after implementation | ✅ Route 202 all-provider failure + runner-thrown provider failures + existing startup 503 | ✅ Extracted safe thrown-provider diagnostic/status helpers |
| 2.1/3.3 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit | ✅ 14/14 baseline | ✅ Added `elapsedMs` assertion; failed before implementation | ✅ 14/14 after implementation | ✅ Timeout and env override/no-retry paths both assert diagnostic metadata | ✅ Kept one-attempt client structure; added elapsed timing centrally |
| 4.1/4.2 | `apps/api/src/scripts/verify-hydrology-local-real.ts`, runbook | Script/docs | N/A (new script/docs) | ✅ Build exposed script type errors before final pass | ✅ `pnpm run build` in `apps/api` passed | ➖ Single bounded command by design; no repeated local-real POSTs | ✅ Script now exits cleanly after writing JSON despite background handles |

## Test Summary

- Baseline: `node --import tsx --test src/presentation/routes/hydrology-government.test.ts` → 22/22 passing before changes.
- Baseline: `pnpm run build:ensure; node --import tsx --test src/hydrology-engine.test.ts` → 14/14 passing before changes.
- RED: API test failed on thrown provider exception aborting runner (`socket secret should stay private`).
- RED: engine test failed because `elapsedMs` was missing.
- GREEN: API route tests → 24/24 passing.
- GREEN: hydrology engine tests → 14/14 passing.
- Build: `pnpm run build` in `apps/api` → passing.
- Build: `pnpm run build` in `packages/hydrology-engine` → passing.

## Local-Real Evidence

- Command attempted once from `apps/api`: `pnpm exec tsx src/scripts/verify-hydrology-local-real.ts --mode api --all-sources --out ../../artifacts/hydrology-local-real.json`.
- Output artifact: `artifacts/hydrology-local-real.json`.
- Result: `httpStatus: 503`, `contractValid: true`, `response.status: failed`, all four requested sources represented with `startup_failure` diagnostics.
- Interpretation: this environment hit a true startup/database failure (`AggregateError`) before source execution, so the route correctly returned structured 503. It did not prove remote-DB provider-failure 202; verify should rerun the same one-shot command only in an environment where DB startup succeeds.
- Anti-DDoS note: no repeated POSTs were run after the real execution; the earlier failed shell invocation did not start the script/API call.

## Files Changed

| File | Action | What Was Done |
|------|--------|---------------|
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Captures thrown provider/client failures inside the source loop and returns sanitized source diagnostics; adds `elapsedMs` during result shaping. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modified | Adds all-source route 202 diagnostics test and provider-throw continuation/no-secret/no-retry test. |
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modified | Adds elapsed timing to safe HTTP client diagnostics without extra fetch attempts. |
| `packages/hydrology-engine/src/hydrology-engine.test.ts` | Modified | Asserts elapsed diagnostics on timeout/env-override no-retry paths. |
| `apps/api/src/scripts/verify-hydrology-local-real.ts` | Created | One-shot local API verifier for all-source ingest, writing a JSON artifact. |
| `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` | Modified | Documents provider overrides, local-real command, expected 202/503 evidence, and bounded production smoke. |
| `artifacts/hydrology-local-real.json` | Created | Captured the single local-real execution result. |
| `openspec/changes/ibera-alerta-local-real-prod-fix/tasks.md` | Created | Hybrid task checklist marked complete. |

## Deviations from Design

- None in implementation. Verification evidence is incomplete for the provider-failure 202 local-real success path because the local execution failed at startup/database access before providers ran.

## Remaining / Verify Focus

- Run SDD verify.
- In an environment with successful DB startup, run the local-real verifier once to prove HTTP 202 provider diagnostics against the remote DB.
- Production bounded smoke remains post-deploy scope: one all-source POST and one municipalities GET.
