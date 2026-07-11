# Apply Progress: ibera-alerta-hydrology-ingest-scheduler

## Status

Implementation complete for all assigned tasks. Mode: Strict TDD. Delivery: size-exception accepted by launch prompt (`exception-ok/automatic`).

## Completed Tasks

- [x] 1.1 Enforce `HYDROLOGY_INGEST_TOKEN` bearer auth before ingest runner execution.
- [x] 1.2 Support operator/admin bearer fallback when `AGRONAUTAS_AUTH_ENABLED=true` and preserve unauthenticated local/dev safe mode when no tokens are configured.
- [x] 1.3 Add auth route/helper tests for valid, missing, invalid, fallback, and local safe behavior.
- [x] 2.1 Add `startHydrologySchedulerFromEnv(env, deps)` gated by `HYDROLOGY_SCHEDULER_ENABLED=true`.
- [x] 2.2 Start `HydrologyIngestionScheduler` only when enabled; no immediate ingest at boot.
- [x] 2.3 Add startup tests for disabled default, opt-in start, no immediate run, and scheduler source mapping.
- [x] 3.1 Preserve/enforce hourly-or-slower scheduler cadences and document Render Free external cron limits.
- [x] 3.2 Add provider URL override tests for `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`.
- [x] 4.1 Create Render Free runbook with cron/auth/provider env guidance.
- [x] 4.2 Document bounded local and production smoke strategy.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration/unit | ✅ API tests 85/85 baseline | ✅ Auth tests failed before guard | ✅ API tests 91/91 | ✅ Missing + invalid token cases prove rejection before runner | ✅ Extracted pure auth helper |
| 1.2 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Unit/integration | ✅ API tests 85/85 baseline | ✅ Fallback helper test failed before helper export | ✅ API tests 91/91 | ✅ Operator, admin, missing token, local safe cases | ✅ Token parsing centralized |
| 1.3 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration/unit | ✅ API tests 85/85 baseline | ✅ New auth coverage failed before implementation | ✅ API tests 91/91 | ✅ Valid/missing/invalid/fallback/local paths | ✅ Reused `withEnv` helper |
| 2.1 | `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` | Unit | ✅ API tests 85/85 baseline | ✅ Startup export tests failed before function existed | ✅ API tests 91/91 | ✅ Default disabled and enabled cases | ✅ Deps injection for tests |
| 2.2 | `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` | Unit | ✅ API tests 85/85 baseline | ✅ No-immediate-run assertion failed before startup wiring | ✅ API tests 91/91 | ✅ Enabled start plus source mapping without immediate runner calls | ✅ Startup adapter isolated |
| 2.3 | `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` | Unit | ✅ API tests 85/85 baseline | ✅ Scheduler startup tests failed before exported deps | ✅ API tests 91/91 | ✅ Disabled, enabled, and SMN/INA mapping | ✅ Minimal public surface |
| 3.1 | `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts`, runbook | Unit/docs | ✅ Existing cadence tests baseline | ✅ Existing cadence assertions protect hourly PNA | ✅ API tests 91/91 | ✅ PNA/INMET/SMN hourly and SMN rainfall 3-hour cadences | ➖ None needed |
| 3.2 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit | ✅ Hydrology engine tests 13/13 baseline | ✅ Env override test failed before constructor env lookup | ✅ Engine tests 14/14 | ✅ All four source env overrides verified with actual fetch URLs | ✅ Constructor fallback kept additive |
| 4.1 | `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` | Docs | N/A (new) | ✅ Runbook absent before doc task | ✅ File created and reviewed | ✅ Render Free envs, auth, cadence, provider overrides | ➖ None needed |
| 4.2 | `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` | Docs/smoke | N/A (new) | ✅ Smoke guidance absent before doc task | ✅ File created and bounded runner smoke passed | ✅ Local and production one-POST smoke plans | ➖ None needed |

## Verification

- ✅ `pnpm --dir apps/api test` — 91/91 passing.
- ✅ `pnpm --dir packages/hydrology-engine test` — 14/14 passing.
- ✅ `pnpm --dir packages/hydrology-engine build` — passing.
- ⚠️ `pnpm --dir apps/api build` — blocked by two pre-existing unrelated type errors in `src/application/usecases/create-field-intake-usecase.ts` and `src/presentation/routes/agronautas-demo.ts`; hydrology touched-file type errors were fixed.
- ✅ One bounded all-source runner smoke with stub clients completed exactly once for `PNA`, `INA`, `INMET`, `SMN`; no network calls, retries, polling, or DB writes.

## Deviations

- None — implementation matches spec/design. The scheduler startup adapter reuses the government ingest runner and returns neutral `{ inserted: 0, unchanged: 0 }` metadata to avoid delayed retry scheduling from startup wiring.

## Issues Found

- Existing API build errors remain outside this change: `create-field-intake-usecase.ts` crop literal mismatch and `agronautas-demo.ts` missing intake contract fields.
