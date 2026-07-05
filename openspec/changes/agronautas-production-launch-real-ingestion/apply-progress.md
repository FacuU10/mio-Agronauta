# Apply Progress: Agronautas Production Launch Real Ingestion

## Work Unit 1 — Contracts and Field Scope TDD

### Completed Tasks
- [x] 1.1 RED: Added failing-first zod schema tests for Corrientes non-rice, unsupported regions/crops, evidence, cadence, scheduler, dashboard, and PDF request contracts.
- [x] 1.2 GREEN: Generalized `packages/zod-schemas/src/agronautas.ts` from rice-only to Corrientes-first Argentina agriculture and updated Agronautas JSON schema fixtures/catalog tests.
- [x] 1.3 REFACTOR: Removed the rice-only invariant from API `Field` domain entity and replaced it with Corrientes launch-region plus supported crop/category checks.

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `packages/zod-schemas/src/agronautas.test.ts` | Contract unit | ✅ `pnpm --filter @repo/zod-schemas test` 7/7 baseline | ✅ Tests written first; initial focused run failed before schemas existed / runner lacked TS transform | ✅ `node --test packages/zod-schemas/dist/agronautas.test.js` 11/11 | ✅ Non-rice success, unsupported region, unsupported crop, evidence/cadence/scheduler/dashboard/PDF cases | ✅ Import normalized to `.js` for compiled ESM test execution |
| 1.2 | `packages/contracts/tests/agronautas-contracts.test.ts`, `packages/contracts/fixtures/agronautas/validation-matrix.v1.json` | Contract catalog | N/A (contract additions) | ✅ Added matrix/catalog assertions for new contract fields | ✅ `pnpm --filter @golden/contracts test:agronautas-contracts` 2/2 and `validate:agronautas-schema` passed | ✅ Field intake, evidence, cadence, scheduler, dashboard, PDF fixtures | ✅ Added missing `GroundedChatRequest` validator coverage while extending matrix |
| 1.3 | `apps/api/src/domain/entities/agronautas.test.ts` | Domain unit | ⚠️ `pnpm --filter api test -- agronautas` had pre-existing `build-config.test.ts` expectation failure before changes | ✅ Added non-rice Corrientes and typed unsupported boundary/crop tests before domain change | ✅ `node --import tsx --test src/domain/entities/agronautas.test.ts` 5/5 | ✅ Accepted maize/cereal, rejected `AR-S`, rejected unsupported crop/category | ✅ Replaced rice-only error copy with typed scope checks |

### Test Summary
- **Total tests written/updated**: 12 focused contract/domain cases plus contract matrix/catalog coverage.
- **Total focused tests passing**: zod compiled test 11/11; contracts 2/2; API domain 5/5.
- **Layers used**: Contract unit, contract catalog, domain unit.
- **Approval tests**: None — behavior intentionally changed from rice-only to general Corrientes agriculture.
- **Pure functions created**: 1 (`isSupportedCrop`).

### Tests Run
- `pnpm --filter @repo/zod-schemas test` — passed baseline 7/7.
- `pnpm --filter @repo/zod-schemas build` — passed.
- `node --test packages/zod-schemas/dist/agronautas.test.js` — passed 11/11.
- `pnpm --filter @golden/contracts test:agronautas-contracts` — passed 2/2.
- `pnpm --filter @golden/contracts validate:agronautas-schema` — passed.
- `node --import tsx --test src/domain/entities/agronautas.test.ts` from `apps/api` — passed 5/5.
- `pnpm --filter api test -- agronautas` — failed only on pre-existing `apps/api/src/build-config.test.ts` assertion expecting zod-schemas build script `tsc` instead of current `node scripts/clean-build-output.mjs && tsc`; Agronautas route/domain tests otherwise passed.

### Deviations / Issues
- Did not implement scheduler, UI, PDF generation, persistence, or worker behavior; only contract seams were added for later work units.
- JSON schema catalog was updated manually to match the zod contract additions; no generator was found in the contracts package for this schema.
- Existing OpenSpec proposal/design/spec files had prior modified state before this work unit; this apply only marked Work Unit 1 tasks complete and added this progress artifact.

### Remaining Tasks
- [ ] Phase 2 persistence and ingestion TDD.
- [ ] Phase 3 worker/API/dashboard/PDF TDD.
- [ ] Phase 4 launch verification/runbook.

### Workload / PR Boundary
- Mode: size:exception / exception-ok for this assigned work unit.
- Current work unit: 1 — Contracts, field scope, API domain invariants.
- Boundary: zod/contracts/API domain only; no scheduler/UI/PDF/worker implementation.
- Estimated review budget impact: focused contract/domain slice, but overall change remains above 400-line budget.

## Work Unit 2 — Persistence and API-side Ingestion Scheduler/Adapter Seams

### Completed Tasks
- [x] 2.1 RED: Added repository tests for raw evidence persistence, latest-good fallback, and idempotent source cadence upserts.
- [x] 2.2 GREEN: Added additive Postgres repository methods/source cadence repository plus bootstrap SQL for `signal_ingestion_runs`, `source_cadences`, and `risk_snapshots`.
- [x] 2.3 RED: Added provider adapter and scheduler tests for provider success, duplicate window locks, retry/DLQ, hourly tick windows, and per-source cadence due selection.
- [x] 2.4 RESEARCH: Encoded researched Open-Meteo, SMN, NASA FIRMS, Sentinel, and radar/SINARAME cadences in the scheduler registry with source references/rate-limit notes.
- [x] 2.5 GREEN: Implemented placeholder-real provider adapter seams, `dueSourceWindows`, and `AgronautasSignalScheduler` with scheduled-window locking and DLQ reporting seams.

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 2.1 | `apps/api/src/infrastructure/database/postgres/agronautas-signal-ingestion-repository.test.ts` | Repository unit | ⚠️ `pnpm --filter api test -- ...` still hits pre-existing `build-config.test.ts` failure; existing Agronautas tests otherwise passed | ✅ Tests written for run-id upsert, raw payload storage, latest-good fallback, and cadence upsert | ✅ Direct node focused run passed 10/10 | ✅ Success payload + latest-good fire fallback + cadence idempotency | ✅ Kept assertions SQL/parameter-focused to avoid DB dependency |
| 2.2 | Same as 2.1 plus `infra/bootstrap/agronautas/001-postgis-schema.sql` | Repository/schema | N/A (additive SQL) | ✅ Repository tests failed before `findLatestGood`/cadence repository existed | ✅ Direct node focused run passed 10/10 | ✅ Upsert and read paths covered | ✅ Additive `CREATE TABLE IF NOT EXISTS`/indexes only; no destructive changes |
| 2.3 | `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.test.ts`, `apps/api/src/infrastructure/jobs/agronautas-scheduler.test.ts` | Adapter/job unit | N/A (new seams) | ✅ Tests cover provider success, duplicate lock skip, enqueue failure DLQ, due selection | ✅ Direct node focused run passed 10/10 | ✅ Open-Meteo success + SMN/FIRMS/Sentinel identity + duplicate/DLQ scheduler cases | ⚠️ Scheduler production file was added before its test file in this local cycle; behavior is covered but strict RED ordering was not perfect for that file |
| 2.4 | `apps/api/src/infrastructure/jobs/agronautas-scheduler.test.ts` | Scheduler config unit | N/A (new registry) | ✅ Test asserted researched cadence behavior and disabled radar source | ✅ Direct node focused run passed 10/10 | ✅ Hourly weather due, FIRMS 3h due, Sentinel daily skip, radar disabled | ✅ Registry stores cadence, freshness SLA, rate-limit, sourceRef, researchedAt |
| 2.5 | `apps/api/src/infrastructure/jobs/agronautas-scheduler.ts`, adapter tests | Job/scheduler unit | N/A (new API-side seam) | ✅ Tests drove lock skip, DLQ, hourly window rounding, and due-source selection | ✅ Direct node focused run passed 10/10 | ✅ Success/skip/failure paths covered | ✅ Kept worker implementation out of scope; exposed queue contract seams only |

### Test Summary
- **Total tests written/updated**: 8 new focused API unit/repository cases for Work Unit 2.
- **Total focused tests passing**: 10/10 in direct API node run, including existing ingestion-job tests.
- **Layers used**: Repository unit, adapter unit, scheduler/job unit.
- **Approval tests**: None — additive repository/scheduler seams.
- **Pure functions created**: 1 (`dueSourceWindows`).

### Tests Run
- `pnpm --filter api test -- src/infrastructure/jobs/agronautas-signal-ingestion-job.test.ts` — failed on pre-existing `apps/api/src/build-config.test.ts` assertion expecting zod-schemas build script `tsc`; focused Agronautas tests in that run passed.
- `node --import tsx --test src/infrastructure/database/postgres/agronautas-signal-ingestion-repository.test.ts src/infrastructure/jobs/agronautas-scheduler.test.ts src/infrastructure/adapters/agronautas-provider-adapters.test.ts src/infrastructure/jobs/agronautas-signal-ingestion-job.test.ts` from `apps/api` — passed 10/10.

### Deviations / Issues
- Did not implement UI/PDF or Python worker execution beyond API-side queue/adapter/scheduler seams, per Work Unit 2 scope.
- Full `pnpm --filter api test -- ...` remains blocked by a pre-existing unrelated `build-config.test.ts` expectation mismatch documented in Work Unit 1.
- Strict TDD note: one new scheduler production file was created before its companion test file during this local cycle; tests now cover the behavior, but the RED ordering was not flawless for that file.

### Remaining Tasks
- [ ] Phase 3 worker/API/dashboard/PDF TDD.
- [ ] Phase 4 launch verification/runbook.

### Workload / PR Boundary
- Mode: size:exception / exception-ok for assigned Work Unit 2.
- Current work unit: 2 — persistence plus API-side real ingestion scheduler/adapters seams.
- Boundary: API repositories, adapter seams, scheduler due planning/locks/DLQ seams, additive bootstrap SQL; no UI/PDF and no full Python worker implementation.
- Estimated review budget impact: adds a focused backend ingestion slice, but overall change remains above the 400-line budget.

## Work Unit 3 — Worker, API Dashboard Payload, UI, PDF, Copilot Evidence

### Completed Tasks
- [x] 3.1 RED: Added pytest coverage for Python Agronautas worker success, duplicate claim skip, retryable failure, DLQ exhaustion, stale schema rejection, and risk snapshot computation.
- [x] 3.2 GREEN: Implemented Python worker orchestration that validates queue contracts, claims runs once, fetches field/weather inputs, writes ingestion runs and deterministic risk snapshots, and records retry/DLQ status.
- [x] 3.3 RED: Added API route tests for persisted dashboard payload, recompute/status/no-auth boundaries already present in route coverage, degraded evidence, copilot evidence context, and dashboard PDF parity.
- [x] 3.4 GREEN: Updated API dashboard/PDF routes and Agronautas web dashboard cards so UI renders backend-owned risk, sources, freshness, evidence, PDF action, and copilot grounding without Iberá-Alerta identity copy.

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 3.1 | `apps/workflow-runtime-python/tests/test_agronautas_jobs.py` | Python worker unit | N/A (existing interrupted WU3 state inspected before changes) | ✅ Tests cover success, duplicate, retry, DLQ, stale schema | ✅ `pytest apps/workflow-runtime-python/tests/test_agronautas_jobs.py` 7/7 | ✅ Success + multiple failure/control-flow paths | ✅ Kept DB/weather seams monkeypatchable |
| 3.2 | `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` | Worker orchestration | ✅ Focused pytest after inspection | ✅ Worker tests asserted persisted snapshot/run status before final orchestration | ✅ `pytest apps/workflow-runtime-python/tests/test_agronautas_jobs.py` 7/7 | ✅ Retry vs DLQ and duplicate vs success paths | ✅ Deterministic `compute_risk_snapshot` extracted as pure logic |
| 3.3 | `apps/api/src/presentation/routes/agronautas.test.ts` | API route integration | ✅ Existing route suite run focused | ✅ Added dashboard/degraded evidence/PDF parity assertions | ✅ API route focused run 26/26 | ✅ Dashboard JSON plus PDF same snapshot/score/evidence | ✅ Dashboard payload builder stays backend-side inside route service boundary |
| 3.4 | `apps/web/src/components/agronautas/page-client.test.tsx` | Web component integration | ✅ Existing page-client focused suite run | ✅ Tests assert Agronautas identity, sources/freshness/evidence, and PDF action | ✅ Web focused run 8/8 | ✅ Happy dashboard, stale/recompute, chat, seed locality paths | ✅ Removed remaining Iberá-Alerta user-facing copy/test id from Work Unit 3 UI scope |

### Test Summary
- **Total tests written/updated**: focused Python worker, API route, and web component coverage for Work Unit 3 paths.
- **Total focused tests passing**: Python worker 7/7; API route 26/26; web component 8/8.
- **Layers used**: Python unit, API route integration, web component integration.
- **Approval tests**: None — additive dashboard/worker/PDF behavior.
- **Pure functions created**: 1 (`compute_risk_snapshot`).

### Tests Run
- `pytest apps/workflow-runtime-python/tests/test_agronautas_jobs.py` — passed 7/7.
- `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/agronautas.test.ts` — passed 26/26.
- `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/page-client.test.tsx` — passed 8/8.

### Deviations / Issues
- This batch continued from interrupted local WU3 changes; RED/GREEN evidence is reconstructed from inspected working tree plus successful focused test runs rather than a pristine start.
- PDF export is a minimal server-generated PDF-compatible payload text stream using the same dashboard data; richer branding/templates remain future backlog.
- Full final verification, Playwright, and pessimistic/adversarial review were intentionally not run in apply per scope.

### Remaining Tasks
- [ ] Phase 4 launch verification/runbook.

### Workload / PR Boundary
- Mode: size:exception / exception-ok for assigned Work Unit 3.
- Current work unit: 3 — Python worker orchestration, persisted API dashboard/PDF payload, dashboard UI, copilot evidence wiring.
- Boundary: Worker/API/web dashboard/PDF only; no Phase 4 runbook/full verification/adversarial review.
- Estimated review budget impact: continues the above-budget launch slice; focused verification limits risk but final verify remains required.

## Work Unit 4 — Refactor Helpers, Runbook, Launch Gates

### Completed Tasks
- [x] 4.1 REFACTOR: Centralized backend freshness/confidence helpers in the Agronautas domain entity module and reused confidence clamping from risk computation.
- [x] 4.2 VERIFY BLOCKERS: Fixed verify blockers for FieldIntake caller propagation, stale E2E copy/route interception, Python worker import path, API/web builds, Playwright, API/web tests, and root `pnpm test`.
- [x] 4.4 DOCS: Documented provider credentials, per-source cadence/cron/SLA, rollback, degradation playbook, Playwright verify, and pessimistic fresh-context review requirements.

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 4.1 | `apps/api/src/domain/entities/agronautas.test.ts`, `apps/api/src/application/usecases/compute-field-risk-usecase.test.ts` | Domain unit / approval refactor | ✅ Baseline focused API domain/usecase run 7/7 before production changes | ✅ Added helper tests first; initial run failed because `deriveSnapshotFreshness`/`clampConfidence` were not exported | ✅ Focused API run passed 9/9 | ✅ Stale precedence, degraded state, fresh state, confidence upper bound, rounding, and floor cases | ✅ `RiskSnapshotFoundation.freshness` and `calculateConfidence` now use shared helpers |
| 4.2 | `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/web/src/components/agronautas/page-client.test.tsx`, `apps/web/tests/e2e/agronautas-*.spec.js`, `packages/zod-schemas/package-config.test.mjs`, `apps/api/src/build-config.test.ts`, `apps/workflow-runtime-python/tests/conftest.py` | API/web/Python/build/E2E | ✅ Verify report captured failing API build, web build, Playwright, full pytest import, API/root test gates | ✅ Added failing-first assertions/config checks for FieldIntake v2 callers, zod build ordering, and E2E route behavior before minimal fixes | ✅ Focused API 27/27, web component 9/9, Python 10/10 and full pytest 18/18 passed | ✅ Contract fields, stale banner, route interception, focused/full package and root test paths covered | ✅ `build:ensure` avoids cleaning zod dist during sibling root tests while preserving standalone web build safety |
| 4.4 | `docs/runbooks/agronautas-production-hardening.md` | Documentation | N/A (docs-only) | ➖ Documentation task; no executable behavior changed | ✅ Runbook updated with required launch gates | ➖ Single operational documentation deliverable | ✅ Kept launch verification and pessimistic review as explicit future verify gates, not apply claims |

### Test Summary
- **Total tests written/updated**: 2 domain helper tests added.
- **Total focused tests passing**: API routes 27/27; web component 9/9; Python focused 10/10; full Python 18/18; zod package config 10/10; root Turbo tests all green.
- **Layers used**: Domain unit, API route, web component, E2E, Python unit, build/config regression.
- **Approval tests**: Existing domain/usecase tests 7/7 run before refactor; all remained green after helper extraction.
- **Pure functions created**: 2 (`deriveSnapshotFreshness`, `clampConfidence`).

### Tests Run
- `pnpm --dir apps/api exec node --import tsx --test src/domain/entities/agronautas.test.ts src/application/usecases/compute-field-risk-usecase.test.ts` — baseline passed 7/7 before production changes.
- `pnpm --dir apps/api exec node --import tsx --test src/domain/entities/agronautas.test.ts` — RED failed as expected before helper exports existed.
- `pnpm --dir apps/api exec node --import tsx --test src/domain/entities/agronautas.test.ts src/application/usecases/compute-field-risk-usecase.test.ts` — passed 9/9 after refactor.
- `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/agronautas.test.ts` — passed 27/27.
- `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/page-client.test.tsx` — passed 9/9.
- `pytest apps/workflow-runtime-python/tests/test_agronautas_copilot.py apps/workflow-runtime-python/tests/test_agronautas_jobs.py` — passed 10/10.
- `pnpm --filter api build` — passed.
- `pnpm --filter web build` — passed.
- `pytest apps/workflow-runtime-python` — passed 18/18.
- `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-smoke.spec.js tests/e2e/agronautas-production.spec.js` — passed 2/2.
- `pnpm --filter api test` — passed 105/105.
- `pnpm test` — passed all Turbo package tests/builds (8 successful tasks).

### Deviations / Issues
- Fresh-context pessimistic/adversarial verify task 4.3 was not executed because the user explicitly said no iron-SDD/sub-agents.
- Documentation is partly Spanish to match the existing runbook style.

### Remaining Tasks
- [ ] 4.3 Run a fresh-context pessimistic/adversarial verify agent against the code/diff, launch claims, scheduler cadence behavior, Playwright evidence, and rollback plan.

### Workload / PR Boundary
- Mode: grouped-subagents-by-related-tasks / assigned Work Unit 4 slice.
- Current work unit: 4 — helper refactor, docs, launch gates.
- Boundary: small backend helper centralization and operational runbook only; no major new features and no full verify execution.
- Estimated review budget impact: low incremental code risk; docs/runbook update is the largest change in this slice.

## Fresh-Context Pessimistic Review Blocker Fixes

### Completed Fixes
- [x] Python worker no longer writes invalid ingestion status `success`; success result and DB persistence now use contract-valid `succeeded`.
- [x] Scheduler runtime has an actual hourly startup seam behind `AGRONAUTAS_SCHEDULER_ENABLED`, with safe disabled behavior when config is absent and due-source planning wired through `dueSourceWindows`.
- [x] Open-Meteo, SMN alerts, and NASA FIRMS provider adapters now support injectable real HTTP fetch seams with endpoint/credential handling; Sentinel remains a STAC seam.
- [x] Dashboard API payload now validates against the shared `dashboardSnapshotSchema` (`snapshotId`, `status`, `signals`, `provenance`, `scheduler`, `generatedAt`).
- [x] Dashboard PDF export reuses that same payload and emits a minimal structurally valid PDF with `xref`, `trailer`, and `startxref`.

### TDD Cycle Evidence — Review Blockers
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Worker status enum | `apps/workflow-runtime-python/tests/test_agronautas_jobs.py` | Unit / persistence seam | ✅ Focused worker pytest run | ✅ Added assertions for `succeeded` result and DB insert status | ✅ 8/8 focused pytest passed | ✅ result payload + DB params | ✅ minimal enum change |
| Scheduler startup wiring | `apps/api/src/infrastructure/jobs/agronautas-scheduler.test.ts`, `apps/api/src/server.test.ts` | Scheduler/startup unit | ✅ Existing scheduler tests | ✅ Added disabled and enabled startup seam tests | ✅ API focused/full tests passed | ✅ disabled absent config + enabled hourly path | ✅ runtime helper extracted |
| Provider HTTP seams | `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.test.ts` | Adapter unit with injected fetch | ✅ Existing placeholder seam tests | ✅ Added Open-Meteo URL, SMN normalization, FIRMS credential tests | ✅ API focused/full tests passed | ✅ Open-Meteo + SMN + FIRMS paths | ✅ legacy fetcher seam preserved |
| Dashboard contract/PDF | `apps/api/src/presentation/routes/agronautas.test.ts` | API route | ✅ Existing route suite | ✅ Tests require shared-contract fields and PDF structural markers | ✅ API focused/full tests passed | ✅ JSON contract + PDF parity | ✅ route parses payload through shared zod schema |

### Tests Run — Review Blockers
- `pytest apps/workflow-runtime-python/tests/test_agronautas_jobs.py` — passed 8/8.
- `pnpm --dir apps/api exec node --import tsx --test src/infrastructure/adapters/agronautas-provider-adapters.test.ts src/infrastructure/jobs/agronautas-scheduler.test.ts src/presentation/routes/agronautas.test.ts src/server.test.ts` — passed 38/38.
- `pnpm --dir apps/web test` — passed 15/15.
- `pnpm --filter api test` — passed 111/111.
- `pytest apps/workflow-runtime-python` — passed 19/19.
- `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-smoke.spec.js tests/e2e/agronautas-production.spec.js` — passed 2/2.

## Final Verify Blocker Fixes — Build/Schema/Web Scope

### Completed Fixes
- [x] API build TS4111 blocker: updated provider adapter tests to use bracket access for index-signature-backed normalized/raw payload keys.
- [x] Contracts AJV blocker: switched schema validation to AJV 2020-12 with `ajv-formats`, and pre-registered local schema aliases so relative `$ref`s resolve.
- [x] Web build trace blocker: reran a fresh `pnpm --filter web build`; the previously missing `app/api/agronautas/[...path]/route.js.nft.json` trace artifact did not reproduce after the existing clean build path, so no config churn was needed.
- [x] Web field overview scope: aligned web `fieldOverviewSchema.crop` with shared Agronautas supported crops and added a non-rice Corrientes regression test.

### TDD Cycle Evidence — Final Verify Blockers
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| API TS4111 test types | `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.test.ts` | Type/build regression | ✅ `git status` inspected; unrelated existing changes preserved | ✅ `pnpm --filter api build` failed on TS4111 for `alertCount`/`hotspotCount`/`requested` | ✅ `pnpm --filter api build` passed | ✅ normalized + raw index-signature accesses covered | ✅ test-only bracket access, no production change |
| Contracts AJV draft/ref validation | `packages/contracts/scripts/validate-schemas.mjs` | Contract tooling | ✅ Existing failing `validate:schemas` captured | ✅ `pnpm --filter @golden/contracts validate:schemas` failed first on draft 2020-12 meta-schema, then local relative `$ref` | ✅ `validate:schemas` passed 7 schemas | ✅ draft meta-schema + format handling + local `$ref` alias resolution | ✅ minimal validator script change only |
| Web non-rice field overview | `apps/web/src/components/agronautas/page-client.test.tsx`, `apps/web/src/lib/agronautas/schemas.ts` | Web contract/unit | ✅ Existing web component suite passed before schema change | ✅ Added non-rice field overview parse test before replacing rice literal | ✅ focused web test passed 16/16 | ✅ existing rice UI path plus new maize parse path | ✅ reused shared `agronautasSupportedCrops` constant |
| Web build trace artifact | N/A (Next build) | Build verification | ✅ prior blocker named missing NFT trace file | ✅ ran `pnpm --filter web build` as failing-check attempt | ✅ build passed and generated route trace without ENOENT | ➖ no production change because issue did not reproduce | ➖ no refactor needed |

### Tests Run — Final Verify Blockers
- `pnpm --filter api build` — failed first on TS4111; passed after bracket-access fix.
- `pnpm --filter @golden/contracts validate:schemas` — failed first on AJV draft/ref handling; passed after AJV 2020/local schema registration fix.
- `pnpm --filter web test -- src/components/agronautas/page-client.test.tsx` — passed 16/16.
- `pnpm --dir apps/api exec node --import tsx --test src/infrastructure/adapters/agronautas-provider-adapters.test.ts` — passed 4/4.
- `pnpm --filter @golden/contracts test:agronautas-contracts` — passed 2/2.
- `pnpm --filter web build` — passed; no Next trace ENOENT reproduced.
- `pnpm test` — passed all Turbo package tests/builds (8 successful tasks).

### Remaining Risks
- Scheduler last-success persistence and closer `/dashboard` UI payload alignment remain warnings/follow-ups; not changed in this minimal blocker batch.
- Existing broad working tree contains prior SDD changes and generated/cache artifacts; this batch only touched the files listed in the final blocker fixes.

## Corrective Build Fix — Direct Web Production Build and Schema Export Warnings

### Completed Fixes
- [x] Added a regression check that `@repo/zod-schemas` exposes an explicit ESM `import` condition for Next webpack, then updated the package export map so named schema re-exports are visible during `next build`.
- [x] Added a regression check that `web clean` is Windows-safe, then replaced `rm -rf .next` with a Node `fs.rmSync` command so clean direct build verification works on Windows.
- [x] Verified a clean direct `pnpm --filter web build` after `pnpm --filter web clean`; build passed, schema attempted-import warnings disappeared, and `.next/server/pages-manifest.json` was generated.

### TDD Cycle Evidence — Corrective Build Fix
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Next schema export warnings | `packages/zod-schemas/package-config.test.mjs` | Package/build config regression | ✅ Captured failing direct web build warnings before changes | ✅ Added export-map import-condition assertion; `pnpm --filter @repo/zod-schemas test` failed because `exports["."].import` was missing | ✅ `pnpm --filter @repo/zod-schemas test` passed 12/12 after export-map fix; clean web build compiled without attempted-import warnings | ✅ Asserted both explicit `import` and aligned `default` targets | ✅ Minimal package metadata-only fix |
| Windows clean direct build gate | `packages/zod-schemas/package-config.test.mjs`, `apps/web/package.json` | Script/config regression | ✅ `pnpm --filter web clean` failed on Windows because `rm` was unavailable | ✅ Added clean-script assertion; zod package config test failed against `rm -rf .next` | ✅ `pnpm --filter web clean` passed, followed by direct `pnpm --filter web build` pass | ✅ Regression verifies the exact cross-platform clean command and direct build generated `pages-manifest.json` | ✅ No Next config churn; retained existing App Router routes |

### Tests / Builds Run — Corrective Build Fix
- `pnpm --filter web clean; pnpm --filter web build` — RED baseline: clean failed on Windows `rm`; build continued and reproduced attempted-import warnings from `@/lib/agronautas/schemas` / `./schemas`.
- `pnpm --filter @repo/zod-schemas test` — RED: failed on missing `exports["."].import` and Windows-unsafe web clean script.
- `pnpm --filter @repo/zod-schemas test` — GREEN: passed 12/12.
- `pnpm --filter web clean` — GREEN: passed on Windows.
- `pnpm --filter web build` — GREEN: passed clean direct production build; no attempted-import warnings; `.next/server/pages-manifest.json` exists.

### Remaining Risks
- The informational Next warning about TypeScript project references remains; it did not block the clean production build.
- Scheduler startup `getLastSuccess: async () => new Map()` and single `/dashboard` path consumption remain cheap follow-up warnings, not touched in this scoped build/import fix.

## Current Critical Blocker Fixes — Final Verify NO-GO Follow-up

### Completed Fixes
- [x] Updated `apps/api/src/build-config.test.ts` to expect the intentional `@repo/zod-schemas` export map with explicit `import` plus aligned `default` entry.
- [x] Re-ran the clean direct web production build gate; `pnpm --filter web clean; pnpm --filter web build` passed and the missing Next manifest/route type artifacts did not reproduce.
- [x] Hardened the Playwright landing image readiness check by polling until the first branded optimized images report `complete && naturalWidth > 0`, removing the race that could assert before image decode/load completion.
- [x] Restored/cleaned generated verification artifacts from the working tree where safe (`tsconfig.tsbuildinfo`, Playwright `test-results`, Python `__pycache__`), leaving tracked source changes intact.

### TDD Cycle Evidence — Current Critical Blockers
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| API zod export-map expectation | `apps/api/src/build-config.test.ts` | Build config regression | ✅ `pnpm --filter api test -- build-config.test.ts` failed 110/111 with expected-vs-actual missing `import` | ✅ Existing failing assertion captured the stale expected export map | ✅ `pnpm --filter api test -- build-config.test.ts` passed 111/111 after updating expectation | ✅ Test now asserts `types`, explicit `import`, and aligned `default` | ✅ Test-only update |
| Clean web production build ENOENT | N/A (Next build gate) | Production build verification | ✅ Prior verify reported missing `.next/server/pages-manifest.json`, `_error.js.nft.json`, and route type artifact | ✅ Re-ran the exact clean-build gate as the failing-check attempt | ✅ `pnpm --filter web clean; pnpm --filter web build` passed twice; ENOENT did not reproduce after current clean/build scripts | ➖ No code change because current clean direct build is reliable locally | ➖ No Next config churn |
| Landing image readiness race | `apps/web/tests/e2e/landing.spec.js` | E2E fixture/readiness | ✅ Focused landing E2E passed locally but verify had a reproducible race symptom (`expected true got false`) | ✅ Existing immediate readiness assertion could observe optimized images before load completion | ✅ Focused landing E2E and full Playwright suite passed after polling readiness | ✅ Full Playwright suite covers landing plus Agronautas/government E2E paths | ✅ Test-only wait hardening |

### Tests / Builds Run — Current Critical Blockers
- `pnpm --filter api test -- build-config.test.ts` — RED first: stale export-map expectation failed; GREEN after fix: passed 111/111.
- `pnpm --filter web clean; pnpm --filter web build` — GREEN twice; clean direct production build passed with only the existing informational TypeScript project references warning.
- `pnpm --dir apps/web exec playwright test tests/e2e/landing.spec.js` — GREEN: passed 1/1.
- `pnpm --dir apps/web exec playwright test` — GREEN: passed 5/5.

### Remaining Risks
- `pnpm exec playwright test` from the repo root is not available in this workspace (`playwright` binary is scoped under `apps/web`); the equivalent `pnpm --dir apps/web exec playwright test` passed.
- `TURBO_FORCE=true pnpm test` was not re-run in this final minimal blocker pass due time; previous apply-progress recorded root `pnpm test` green before these test-only follow-ups.
- The broad working tree still contains prior SDD implementation changes; this pass intentionally changed only `apps/api/src/build-config.test.ts`, `apps/web/tests/e2e/landing.spec.js`, and this apply-progress artifact.

## Final Critical Blocker Fixes — Scheduler Cadence and Forced Turbo Proof

### Completed Fixes
- [x] Hardened the landing CTA Playwright step by asserting the `/probar-demo` href and waiting for the navigation promise during click, preventing accidental `chrome-error://chromewebdata/` terminal states from being accepted as progress.
- [x] Wired production scheduler startup to persisted `source_cadences` and latest successful `signal_ingestion_runs` state instead of an empty `Map`, so per-source cadence survives API restarts.
- [x] Added repository/startup regression tests for last-success grouping and persisted cadence/last-success startup behavior.
- [x] Re-proved clean web production build; direct `pnpm --filter web clean; pnpm --filter web build` passed without pages-manifest ENOENT.
- [x] Re-ran `TURBO_FORCE=true pnpm test`; forced uncached Turbo run passed and web tests resolved `@repo/zod-schemas/dist/index.js` after the build/ensure ordering fixes.
- [x] Restored/cleaned generated verification artifacts (`tsconfig.tsbuildinfo`, Playwright `test-results`, Python `__pycache__`) after proof runs.

### TDD Cycle Evidence — Final Critical Blockers
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Scheduler persisted cadence after restart | `apps/api/src/server.test.ts`, `apps/api/src/infrastructure/database/postgres/agronautas-signal-ingestion-repository.test.ts` | Startup/repository unit | ✅ Prior adversarial verify identified `getLastSuccess: async () => new Map()` as a production blocker | ✅ Added tests for persisted last-success grouping and startup using injected persisted cadence/last-success state before wiring production startup | ✅ `pnpm --filter api test -- server.test.ts agronautas-signal-ingestion-repository.test.ts agronautas-scheduler.test.ts` passed 113/113 | ✅ Repository groups multiple provider/signal rows; startup suppresses not-due source from persisted state | ✅ Minimal dependency injection seam for scheduler runtime tests; production defaults use Postgres repositories |
| Landing CTA navigation reliability | `apps/web/tests/e2e/landing.spec.js` | E2E | ✅ Full Playwright previously reported intermittent CTA navigation to `chrome-error://chromewebdata/` | ✅ Test now asserts real href and waits for `**/probar-demo` during click | ✅ Full `pnpm --dir apps/web exec playwright test` passed 5/5 | ✅ `/probar-demo` CTA plus direct `/demo` route still covered | ✅ Test-only reliability hardening |
| Forced Turbo zod-schemas race | `turbo.json`, `apps/web/package.json`, `packages/zod-schemas/scripts/ensure-build-output.mjs` | Build/test orchestration | ✅ Prior `TURBO_FORCE=true pnpm test` failed because web test saw missing `@repo/zod-schemas/dist/index.js` | ✅ Re-ran forced uncached Turbo after ordering fixes | ✅ `TURBO_FORCE=true pnpm test` passed 8/8 tasks | ✅ Forced API and web tests both resolved built shared package output | ✅ No additional script churn needed in this pass |
| Clean web ENOENT | N/A (Next build gate) | Production build | ✅ Prior direct clean build flapped missing pages manifest | ✅ Re-ran exact direct clean/build command | ✅ `pnpm --filter web clean; pnpm --filter web build` passed | ➖ No reproducible ENOENT remains | ➖ No Next config churn |

### Tests / Builds Run — Final Critical Blockers
- `pnpm --filter api test -- server.test.ts agronautas-signal-ingestion-repository.test.ts agronautas-scheduler.test.ts` — passed 113/113.
- `pnpm --dir apps/web exec playwright test` — passed 5/5.
- `pnpm --filter web clean; pnpm --filter web build` — passed; no pages-manifest ENOENT reproduced.
- `TURBO_FORCE=true pnpm test` — passed 8/8 forced uncached Turbo tasks.

### Remaining Risks
- Root `pnpm exec playwright test` is still not the project-supported invocation because Playwright is scoped under `apps/web`; `pnpm --dir apps/web exec playwright test` is the verified command.
- Fresh-context adversarial verify/archive were intentionally not run per user instruction (`NO IRON-SDD`, do not archive).

## Launch Blocker Fix — Disable Turbo Cache for Next Web Production Build

### Completed Fixes
- [x] Added a build-config regression test requiring `web#build.cache=false` so Next production output is not restored from potentially partial/stale Turbo artifacts on Windows.
- [x] Updated `turbo.json` with an explicit `web#build` task override that disables caching while preserving `.next/**` output metadata for task shape clarity.
- [x] Re-proved direct clean web build twice; both runs completed without missing `.next/server/functions-config-manifest.json`, `.next/server/pages-manifest.json`, `_document` page-data, or chunk ENOENT failures.
- [x] Re-proved forced root tests twice with `TURBO_FORCE=true`; both uncached Turbo runs passed all 8 tasks.
- [x] Ran scoped Playwright after build orchestration change; web E2E passed 5/5.

### TDD Cycle Evidence — Turbo/Next Artifact Instability
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| Next web build cache hardening | `apps/api/src/build-config.test.ts`, `turbo.json` | Build/config regression | ✅ Exact blocker commands were run first and passed once, confirming current failure is intermittent/cache-related rather than deterministic source compile failure | ✅ Added `web#build.cache=false` assertion; focused API test failed with `actual undefined` before `turbo.json` change | ✅ Focused API build-config suite passed 114/114 after adding explicit `web#build` override | ✅ Direct clean web build passed twice and forced root Turbo tests passed twice after the cache override | ✅ Minimal Turbo-only production build cache bypass; no Next config or route churn |

### Tests / Builds Run — Launch Blocker Fix
- `pnpm --filter web clean; pnpm --filter web build` — baseline before code change passed once; blocker treated as intermittent/stale artifact instability.
- `TURBO_FORCE=true pnpm test` — baseline before code change passed once.
- `pnpm --filter api test -- build-config.test.ts` — RED first on missing `web#build.cache=false`; GREEN after fix: passed 114/114.
- `pnpm --filter web clean; pnpm --filter web build` — GREEN twice after fix; both clean production builds completed without Next generated artifact ENOENT.
- `TURBO_FORCE=true pnpm test` — GREEN twice after fix; both forced uncached root runs passed 8/8 tasks.
- `pnpm --dir apps/web exec playwright test` — GREEN after build orchestration change: passed 5/5.

### Remaining Risks
- Disabling Turbo cache for `web#build` trades speed for launch reliability; web production builds will always run instead of restoring `.next` from cache.
- Root `pnpm exec playwright test` remains unsupported because Playwright is scoped under `apps/web`; `pnpm --dir apps/web exec playwright test` is the verified equivalent.
- Fresh-context adversarial verify/archive were intentionally not run per user instruction (`NO IRON-SDD`, do not archive).
