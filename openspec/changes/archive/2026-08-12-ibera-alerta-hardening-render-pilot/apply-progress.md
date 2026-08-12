# Apply Progress: Iberá-Alerta Hardening and Institutional Render Pilot

## Status

- Mode: Strict TDD
- Artifact store: hybrid
- Work unit: configured PostgreSQL Iberá ledger schema repair, station mapping correction, and real provider smoke reconciliation
- Delivery boundary: repaired the partially applied additive Iberá ledger schema, made the production runner use one durable repository for ledger and source writes, ensured provider stations exist before telemetry inserts, and reran configured PNA/INA/INMET/SMN persistence smoke. Task 3.3 evidence is complete for the executable local boundary; production Render proof remains an explicitly documented external gap.
- Branch/worktree policy: preserved; no branch, worktree, stash, or Docker changes were performed. The requested local configured provider/database smoke was executed.

## Completed Tasks

- [x] 1.1 Added Iberá run status/source result/diagnostic/citation/Copilot metadata and bounded coverage-gap schemas with unsupported citation rejection; coverage-gap contract is now exercised by the reconciled inventory.
- [x] 1.3 Added deterministic scheduled-slot identity, Render-disable coverage, duplicate-delivery seam, and expired/unleased CAS lease contract.
- [x] 1.2 Added durable statusPath restart reconstruction test with stable run/proof/source results.
- [x] 1.4 Additive migration and bounded ledger prune are covered; the configured PostgreSQL schema was repaired and the real PNA/INA/INMET/SMN matrix persisted successfully.
- [x] 2.1 Added `20260811120000_ibera_ingest_ledger` additive migration with unique scheduled slot, lease/expiry indexes, JSON source results/diagnostics, child linkage, and no destructive SQL.
- [x] 2.2 Added typed ledger repository create/update/read, CAS lease claiming, and bounded ledger prune.
- [x] 1.5 Added RED/GREEN coverage for citation absence and degraded/empty Iberá detail rendering.
- [x] 3.1 Added validated stable Copilot citations from schema-validated telemetry, source URL/timestamp propagation, `citationMode`, and explicit citation-unavailable metadata.
- [x] 3.2 Added bounded coverage-gap propagation through government API/ingest contracts and safe rendering of forecasts, telemetry, alerts, freshness, provenance, source links, timestamps, and missing/degraded local context.
- [x] 3.3 Complete as bounded evidence collection: focused tests, full-suite attempt, build, configured real provider/PostgreSQL smoke, Playwright Iberá journeys, and static Render validation are recorded. The full suite and one unrelated Agronautas Playwright snapshot test remain non-green; production Render/Cron execution and production API/DB proof are unavailable external evidence gaps.

## Current Blocker Root Cause and Correction

- Root cause: the configured PostgreSQL database had only `20260714120000_hydrology_proof_run_id` recorded in `_prisma_migrations` for the hydrology ledger path. It had `hydrology_ingestion_runs` but no `ibera_ingest_runs`, `ibera_run_id`, or `diagnostics`; source writes therefore failed with PostgreSQL `42703` during the real provider smoke. The production app also constructed separate repository instances, so coordinator ledger admission and source writes were not guaranteed to share the same durable repository. Existing provider records lacked station rows for non-alert telemetry, so foreign-key-safe station provisioning was required before telemetry inserts.
- Correction: added `apps/api/prisma/migrations/20260812100000_ibera_ingest_ledger_schema_repair/migration.sql`, an additive/idempotent repair that creates the Iberá parent ledger if absent and adds the child column, diagnostics, FK, and index with no destructive SQL; wired `createApp` to one `HydrologyRepository` for coordinator and runner; and made `HydrologyRepository.saveTelemetry` provision missing provider stations before telemetry writes. Agronautas tables, telemetry history, provider adapters, and product boundaries remain separate.
- Database evidence after migration: `ibera_ingest_runs` exists; `hydrology_ingestion_runs.ibera_run_id` and `diagnostics` exist; `hydrology_ingestion_runs_ibera_run_idx` exists; `_prisma_migrations` records both Iberá migrations as finished; existing counts were `hydrology_telemetry=901` before smoke and `959` after smoke, with one correlated ingestion row per provider.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `packages/zod-schemas/src/agronautas.test.ts` | Unit/contract | Existing schema suite | ✅ Written and initially failed on missing exports | ✅ 18 focused schema tests passed; package suite 30/30 | ✅ Valid PNA citation plus rejected unsupported source | ✅ Exported const-backed schema types; coverage remains pending |
| 1.2 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | API integration/fake durable repository | Existing route suite | ✅ Written and initially failed with recreated coordinator returning undefined | ✅ 50/50 route tests passed after durable fallback | ✅ terminal run plus unknown path behavior | ✅ Durable read isolated from legacy no-ledger tests |
| 1.4 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit/contract | Existing hydrology suite | ✅ Migration/repository tests initially failed on missing migration/methods | ✅ 28/28 hydrology tests passed | ✅ additive migration assertions plus durable source diagnostics; prune/coverage pending | ✅ JSON parsing and typed row projection centralized |
| 2.1 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Migration contract | N/A (new migration) | ✅ Missing migration test failed | ✅ 28/28 passed | ✅ checks indexes, child columns, no DROP/telemetry deletion | ✅ migration is additive/idempotent |
| 2.2 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Repository unit | Existing repository suite | ✅ missing methods failed | ✅ durable create/update/read test passed | ✅ stable results and diagnostics preserved; lease/CAS/prune pending | ✅ typed conversion helper |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Prior PR1: zod-schemas 30/30; hydrology engine 28/28; API route 50/50. Current PR3: zod-schemas 30/30; Copilot 7/7; API route 51/51; focused Iberá web 13/13. |
| Schema validation and build | Contracts validation prior slice PASS; current `pnpm build` → PASS (Turbo 4/4; Next static generation 8/8). Existing web lint warning in `src/app/municipalities/ingest/page.test.tsx` only. |
| Runtime harness command/scenario and exact result | N/A — this slice uses deterministic fakes/contracts only. No Docker, provider, configured PostgreSQL, Render, Cron, or runtime evidence was run or claimed. |
| Rollback boundary | Revert `apps/api/prisma/migrations/20260811120000_ibera_ingest_ledger/migration.sql`, the additive Prisma model/fields, hydrology engine ledger methods/types, route durable fallback, and focused tests. Existing provider adapters, Agronautas tables/queues, telemetry semantics, and UI remain independently revertible. |

## Remaining Gaps

- Phase 1 task 1.5 is complete for the bounded UI citation/degraded-state slice.
- Task 2.3 is complete for the safe static inventory slice: current 17 localities, PNA thresholds/boundaries, 17 SMN mappings, 34 INMET mappings, and INA only at adapter-supported IDs `6764`, `33988`, and `38469`; unsupported INA coverage is explicit through `coverageGapsFor`.
- Task 2.4 is complete for durable-first observation: `observe` reads `getIberaIngestRun` before consulting the bounded in-process observation cache, while active promises are used only for bounded wait behavior.
- Task 2.5 is complete for static ownership wiring: `render.yaml` declares exactly one hourly `ibera-hydrology-cron`, the one-shot requires existing `HYDROLOGY_INGEST_TOKEN` and fixed `HYDROLOGY_CRON_OWNER_ID`, and Render/API in-process scheduling stays disabled. No Cron execution is claimed.
- Phase 3 tasks 3.1, 3.2, and 3.3 are complete for the bounded citation/UI/evidence slice. The full suite and Render/production execution remain non-green or unavailable and are recorded as risks/gaps; configured local PostgreSQL/provider smoke passes.
- Current local configured provider/database evidence is available and passes for all four providers; Render/production evidence remains explicitly unavailable.

## Current Apply Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | API focused suite → PASS 87/87; hydrology-engine focused suite → PASS 32/32. |
| Schema validation/build | Prisma migration status → database schema up to date; Prisma validate → valid; zod-schemas 30/30; contracts 5/5 plus 8 JSON schemas and Agronautas schema validated; `pnpm build` → PASS, Turbo 4/4, Next static generation 8/8. |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/api verify-local` → PASS, proofRunId `proof-20260812T044942Z`; PNA 200/16, INA 200/32, INMET 200/75, SMN 200/29, each with durable DB correlation; `artifacts/hydrology-local-real-matrix.json` records `passed: true`. |
| Database preservation evidence | Read-only post-smoke query: `ibera_ingest_runs=4`, one smoke `hydrology_ingestion_runs` row per source, `hydrology_telemetry=959`; no telemetry or historical ingestion rows were deleted. |
| Runtime/E2E boundary | Playwright completed 13/15 total tests (1 skipped), with one unrelated Agronautas `Snapshot stale detectado` failure; the Iberá journey tests passed. This is reported separately and does not change the provider/database result. |
| Rollback boundary | Revert the new schema-repair migration, `createApp` durable repository wiring, provider-station provisioning, and focused contract tests; preserve existing Iberá ledger migration, provider adapters, telemetry, and Agronautas repositories. |

## PR4 TDD Cycle Evidence

| Task | Test file | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| 2.3 | `apps/api/src/presentation/routes/hydrology-government.test.ts`, `apps/api/src/infrastructure/database/postgres/seed-municipality-alert-coverage.test.ts` | Unit/seed contract | ✅ Reconciliation and unsupported INA expectations added before implementation | ✅ Combined API/seed focused run passed | ✅ Existing rows are reconciled; empty INA mapping exposes an explicit gap | ✅ Seed is idempotent and re-runnable rather than early-returning |
| 2.4 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Coordinator durable-status contract | ✅ Durable-first reconstruction expectation added before implementation | ✅ Terminal reconstruction and focused route suite passed | ✅ Recreated coordinator and in-flight bounded wait paths | ✅ Durable lookup isolated through `activeForRun` helper |
| 2.5 | `apps/api/src/scripts/run-hydrology-scheduler-once.test.ts`, `apps/api/src/build-config.test.ts` | Script/config contract | ✅ Missing token/owner and one-Cron assertions added before implementation | ✅ 83/83 focused API tests passed | ✅ Valid credentials plus each missing credential failure path | ✅ Fixed owner is explicit; no secret value is committed |

## PR4 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts src/infrastructure/database/postgres/seed-municipality-alert-coverage.test.ts src/build-config.test.ts src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts src/scripts/run-hydrology-scheduler-once.test.ts` → PASS, 83/83 tests. |
| Schema validation and build | `pnpm --dir packages/zod-schemas test` → PASS 30/30; contracts schema validation passed; `pnpm build` → PASS, Turbo 4/4, Next static generation 8/8. Existing unused React warning remains in `apps/web/src/app/municipalities/ingest/page.test.tsx`. |
| Runtime harness command/scenario and exact result | N/A — this bounded slice has only static/config/fake-ledger boundaries; no provider, configured PostgreSQL, Render, Cron, Docker, or production runtime was executed. |
| Rollback boundary | Revert `hydrology-government.ts`, its focused tests, the one-shot config guard/test, `render.yaml`, and coverage seed tests; preserve provider adapters, Agronautas state, ledger migration/repository, and prior UI/Copilot work. |

## PR2 TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.3 | `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts`, `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit/contract | ✅ 12/12 and 28/28 baselines | ✅ Missing slot/Render/CAS behavior failed | ✅ 14/14 and 30/30 | ✅ Interval/daily slot, Render override, expired/unleased CAS, bounded delete | ✅ Typed slot helper and SQL projection |
| 2.2 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Repository contract | ✅ Existing hydrology suite | ✅ Missing methods failed | ✅ 30/30 | ✅ Lease claim and no telemetry deletion | ✅ Cutoff/batch constants normalized |

## PR2 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Scheduler/prune → PASS 14/14; hydrology engine → PASS 30/30; API hydrology route in combined run → PASS 64/64. |
| Runtime harness command/scenario and exact result | N/A — deterministic fakes only; no configured PostgreSQL/provider/Render runtime was run. |
| Rollback boundary | Revert scheduler slot/owner metadata, CAS lease, bounded ledger prune, coordinator scheduled path, one-shot metadata, and focused tests; preserve adapters, Agronautas repositories/queues, and telemetry. |

## Verification Snapshot

- Final focused hydrology engine: PASS 30/30.
- Final focused API route suite: PASS 64/64.
- Final schema package: PASS 30/30.
- Prisma schema validation: PASS.
- Contracts schema validation: PASS; contracts tests PASS 5/5.
- Known unrelated baseline failure remains: hydrology-engine full package suite's pre-existing `PnaHttpClient enforces a finite total timeout budget across retry attempts` intermittently/consistently expects 2 calls but observes 1; not modified in this slice.

## PR3 TDD Cycle Evidence

| Task | Test file | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| 3.1 | `packages/hydrology-engine/src/services/hydrology-copilot-service.test.ts` | Unit | ✅ citation metadata expectations failed before implementation | ✅ 7/7 | ✅ citation-present and citation-unavailable contexts | ✅ schema-validated projection |
| 3.1 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | API/SSE | ✅ safe metadata forwarding assertion added first | ✅ 51/51 | ✅ citation metadata survives SSE and provider failures remain redacted | ✅ no adapter changes |
| 3.2 | `apps/web/src/components/government/detail.test.tsx`, `polling.test.ts` | Component/unit | ✅ citation absence and coverage-gap assertions added first | ✅ 13/13 focused web | ✅ empty/degraded/forecast/source-link paths | ✅ bounded sanitization and explicit states |

## Task 3.3 Evidence — 2026-08-12

### TDD / evidence cycle

| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| 3.3 | N/A — evidence-only refactor task; no new production behavior or test contract was introduced | Focused suites, configured real provider/PostgreSQL smoke, static Render checks, and build completed; full-suite/E2E outcomes are recorded truthfully below | Updated OpenSpec and Engram evidence with exact current commands, provider proof ID, durable ledger preservation, Iberá Playwright results, and external Render gap; no application code changed |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | API focused → PASS **85/85**; `pnpm --dir apps/web test` → PASS **94/94**; `pnpm --dir packages/zod-schemas test` → PASS **30/30**; contracts → PASS **5/5**, 8 JSON schemas and Agronautas schema validated; `pytest apps/workflow-runtime-python` → PASS **35/35** |
| Hydrology package result | `pnpm --dir packages/hydrology-engine test` → **70/71**, one known timing-sensitive PNA finite-total-timeout assertion (`expected 2`, `actual 1`); no Iberá ledger/coverage/citation test failure. Prior final rerun recorded 69/69, so this remains intermittent baseline noise. |
| Full suite | `pnpm test` → exit **1**, API **225/226**; unrelated Agronautas Groq degraded-chat assertion failed at `apps/api/src/presentation/routes/agronautas.test.ts:768` (`expected true`, `actual false`). |
| Build and static config | `pnpm build` → exit **0**, Turbo **4/4**, Next static pages **8/8**; Prisma migrate status up to date and Prisma validate PASS. `render.yaml` statically declares exactly one `ibera-hydrology-cron`, hourly schedule, fixed owner, required token, and disabled API schedulers. |
| Runtime harness | `pnpm --dir apps/api verify-local` → PASS, `proofRunId=proof-20260812T044942Z`; PNA HTTP 200/16, INA 200/32, INMET 200/75, SMN 200/29, each durably correlated. `artifacts/hydrology-local-real-matrix.json` → `passed: true`. |
| Durable preservation | Read-only configured PostgreSQL evidence remains: repaired Iberá ledger and child linkage are applied; post-smoke counts were `ibera_ingest_runs=4`, one correlated ingestion row per source, `hydrology_telemetry=959`; no telemetry/history deletion. Citation-unavailable, coverage-gap, degraded/empty, source URL/timestamp, status-path/recovery, and ledger/prune behaviors are covered by focused tests. |
| Playwright | `pnpm --dir apps/web test:e2e` → exit **1**, **15 total**: **13 passed, 1 skipped, 1 failed**. Iberá overview/detail/partial-ingest journeys passed. Sole failure: unrelated Agronautas stale snapshot at `tests/e2e/agronautas-production.spec.js:125`, `getByText('Snapshot stale detectado')` not visible. |
| Production boundary | **Not run and not claimed**: no Render Cron execution, production revision correlation, production durable-status restart, production provider outcome, or production DB/API proof is available in this apply environment. This is an external evidence gap, not substituted by static YAML or historical artifacts. |
| Rollback boundary | Revert only these OpenSpec/Engram evidence updates and, independently, the already-isolated Iberá schema-repair migration/runtime wiring if remediation is required; preserve Agronautas changes, provider adapters, telemetry, and existing ledger migration. |

## PR3 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | zod-schemas 30/30; Copilot 7/7; API hydrology route 51/51; focused Iberá web tests 13/13. |
| Runtime harness command/scenario and exact result | N/A — no provider, configured PostgreSQL, Render, Cron, Docker, or production runtime was executed; only deterministic unit/component/API fakes were used. |
| Rollback boundary | Revert Copilot metadata projection/schema/tests, government coverage-gap response fields, polling sanitizer, and Iberá overview/detail/ingest presentation changes; preserve provider adapters, Agronautas UI/contracts, ledger/lease ownership, and telemetry storage. |
