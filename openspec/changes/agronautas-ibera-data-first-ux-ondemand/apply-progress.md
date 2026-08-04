# Apply Progress: Data-First Evidence Visibility

## Status

- Change: `agronautas-ibera-data-first-ux-ondemand`
- Mode: Strict TDD
- Delivery: single PR, one bounded evidence-visibility work unit
- Scope: repository-grounded evidence-state normalization and existing Agronautas/Iberá-Alerta shell rendering, plus executable on-demand/non-goal boundary assertions
- No Docker, on-demand acquisition, new providers, maps, WhatsApp, polygon persistence, scheduler rewrite, Risk Engine consolidation, or hydraulic simulation

## Completed Tasks

- [x] 1.1 Deterministic fixtures, matrix acceptance rows, and component acceptance assertions
- [x] 1.2 Seven-state typed normalization and timestamp/conditional-field tests
- [x] 1.3 Agronautas and Iberá-Alerta component evidence-state assertions (`page-client.test.tsx`, `field-detail.test.tsx`, `overview.test.tsx`, `detail.test.tsx`, `ingest-panel.test.tsx`; workspace behavior is covered by `page-client.test.tsx` and there is no separate workspace test file)
- [x] 1.4 Focused Playwright semantic assertions for Agronautas workspace/detail, Iberá overview/detail, and ingest (`agronautas-smoke.spec.js`, `agronautas-production.spec.js`, `government-ui.spec.js`, `hydrology-ingest.spec.js`); live `hydrology-government.spec.js` remains explicitly skipped without authorized provider runtime
- [x] 2.1 `EVIDENCE_STATE`, `EvidenceState`, `EvidenceViewModel`, normalization, list, missing, and mock helpers
- [x] 2.2 Contract audit confirmed existing API/schema fields are already retained; no speculative route/schema changes were made
- [x] 3.1 Agronautas workspace and field-detail evidence-state panels
- [x] 3.2 Iberá overview, municipal detail, and ingest diagnostics evidence-state panels
- [x] 4.1 Matrix update, focused/full checks, build, API/hydrology/worker regression attempts, and runtime evidence recording
- [x] 4.2 Executable `GET /agronautas/ready` boundary assertion proving dependency readiness is not on-demand acquisition readiness
- [x] 4.3 Executable on-demand proof-plan and explicit non-goal assertions tied to SDD documents and current map/field persistence contracts

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `apps/web/src/components/{agronautas,government}/*.test.tsx` | Component | ⚠️ Pre-edit safety count was not captured; post-change web suite is 92/92 | ✅ Added role/region assertions before panels existed; failed on missing regions | ✅ Panels rendered and focused component suites passed | ✅ Complete, empty, stale, degraded, mock/seam, and error paths represented by deterministic fixtures | ✅ Shared `EvidenceStateBadge` removed duplicate status-role collisions |
| 1.2 | `apps/web/src/lib/visibility/evidence-state.test.ts` | Unit | N/A (new module) | ✅ Import failed before `evidence-state.ts` existed | ✅ 5 tests passed | ✅ Seven states, mode override, invalid timestamp, source/timestamp rejection, and list normalization | ✅ Pure helpers and compact optional view-model output |
| 1.3 | `apps/web/src/components/agronautas/{page-client,field-detail}.test.tsx`, `apps/web/src/components/government/{overview,detail,ingest-panel}.test.tsx` | Component | ⚠️ Pre-edit safety count was not captured; post-change web suite is 92/92 | ✅ Semantic region assertions failed before rendering support existed | ✅ Focused correction rerun: 33/33 passed | ✅ Happy, empty, stale/degraded, missing, Copilot, partial ingest, and accessibility assertions | ✅ Presentation-only panels; existing shells/navigation retained; workspace behavior is covered by `page-client.test.tsx` and field detail by `field-detail.test.tsx` |
| 1.4 | `apps/web/tests/e2e/{agronautas-smoke,agronautas-production,government-ui,hydrology-ingest}.spec.js` | E2E | Existing Playwright baseline retained | ✅ Fresh pre-correction batch reproduced 4/6: the known `Snapshot stale detectado` failure plus the field-detail strict-mode selector failure | ✅ Corrected field-detail browser test passed 1/1; final deterministic batch passed 5/6 because only the unchanged Agronautas production-smoke baseline failed at `Snapshot stale detectado` | ✅ Workspace stale, field-detail observed/stale/missing, municipal forecast/degraded detail, and partial ingest assertions | ✅ Scoped semantic header/field selector; live `hydrology-government.spec.js` remains explicitly skipped without authorized runtime; no live/production result claimed |
| 2.1 | `apps/web/src/lib/visibility/evidence-state.test.ts` | Unit | N/A (new module) | ✅ Missing-module RED | ✅ 5/5 passing | ✅ Two-path mode/timestamp cases force generalization beyond fake returns | ✅ Constants, pure normalization, no fetch or transport coupling |
| 2.2 | `packages/zod-schemas/src/agronautas.test.ts`, API route suites, web tests | Contract/integration | Existing contract/API suites | ✅ Conditional contract expectations were covered by existing schema tests | ✅ Existing schemas/routes retained all proven fields; no new field required | ✅ API tests confirm telemetry, INA, ingest diagnostics, and Copilot contracts | ✅ No unnecessary API/schema edits; unproven acquisition fields remain missing/conditional |
| 3.1 | Agronautas component tests | Component | Existing web component coverage | ✅ Region assertions failed before panels | ✅ Agronautas focused tests passed | ✅ Observed, forecast, cached/latest-good, stale, degraded, missing, mock/seam | ✅ Shared primitive and one normalizer boundary |
| 3.2 | Government component tests | Component | Existing government coverage | ✅ Region/diagnostics assertions failed before panels | ✅ Government focused tests passed | ✅ Observed, forecast, degraded, missing, partial outcomes, Copilot metadata | ✅ Existing list/table fallback and bounded ingest status preserved |
| 4.1 | Focused web components and deterministic Playwright paths; prior Web/API/hydrology/worker receipts retained | Regression/build/runtime | Existing baseline runs captured | ✅ Acceptance assertions were added before their render targets; corrective field-detail selector was changed only after the fresh 4/6 failure reproduced | ✅ Focused component rerun 33/33; narrow field-detail browser test 1/1; final deterministic browser batch 5 passed, 1 unchanged Agronautas production-smoke failure | ✅ Matrix rows now name concrete assertion titles and receipts; live hydrology check is explicitly skipped; hydrology timeout evidence is split by execution mode | ✅ Matrix and progress artifacts document rollback, prerequisites, exact commands, the remaining baseline failures, and no live-provider claim |
| 4.2 | `apps/api/src/presentation/routes/health.test.ts` | API route | Existing readiness route tests | ✅ Test was added before the matrix boundary wording; it asserts the current route response cannot be mistaken for acquisition evidence | ✅ Focused health test passed 12/12 | ✅ Real local HTTP request to `/agronautas/ready` verifies dependency checks and absence of request/run/source/centroid/persistence acquisition fields | ✅ No route or production behavior changed; readiness remains dependency-only |
| 4.3 | `packages/contracts/tests/agronautas-contracts.test.ts` | Contract/scope | Existing JSON Schema/matrix contract suite | ✅ New scope test failed before the explicit matrix boundary text and field persistence assertions were present | ✅ Focused contracts test passed 4/4 | ✅ Assertions inspect the follow-on proof sequence, SDD non-goals, unconfigured point-only map seam, package dependencies, and field persistence SQL; no mere file-existence assertion | ✅ Scope stays evidence-only; no provider, Docker, map, WhatsApp, polygon, scheduler/Risk Engine, or hydraulic implementation added |

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command and exact result | `pnpm --dir packages/contracts test:agronautas-contracts` — exit 0; 4 tests passed, 0 failed. `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/health.test.ts` — exit 0; 12 tests passed, 0 failed. Existing `pnpm --dir apps/web test` — exit 0; 92 tests passed, 0 failed after the sequential build. |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/health.test.ts` exercised a real local HTTP request to `/agronautas/ready` and passed 12/12, including the new boundary assertion. No provider, production, Docker, or browser evidence was needed for these contract/scope assertions; no live or production result was claimed. |
| Build command and exact result | `pnpm build` — exit 0; zod schemas, API, hydrology engine, and Next.js web build successful. Existing warning in `apps/web/src/app/municipalities/ingest/page.test.tsx` for unused `React` remains non-blocking. |
| API regression | `pnpm --dir apps/api test` — 193/194 passed; pre-existing `POST /fields/:id/chat cae a modo degradado cuando Groq no está disponible` failed because the current environment's response was not degraded. No API files changed. |
| Hydrology regression | Package script is `pnpm run build:ensure && node --import tsx --test src/**/*.test.ts`. Fresh evidence is execution-mode sensitive: one standalone package run passed 64/64, a subsequent standalone run passed 63/64, and the root `pnpm test` run passed 63/64. The exact failure is `PnaHttpClient enforces a finite total timeout budget across retry attempts` in `packages/hydrology-engine/src/clients/http-clients.test.ts:128`, where `calls` was `1` instead of `2`. The supported serialized command `pnpm --dir packages/hydrology-engine exec node --import tsx --test --test-concurrency=1 ...` also produced 64/64 once and 63/64 once. This is a pre-existing timing/concurrency-sensitive test limitation: the 25 ms test budget can expire before the second retry under scheduler/load variance. No hydrology files changed and no clean global-suite claim is made. |
| Worker regression | `pytest apps/workflow-runtime-python` — exit 0; 19 passed. |
| Root suite | `pnpm test` — exit 1; Turbo runs workspace `test` tasks in parallel because `turbo.json` has no test concurrency override. Web and zod suites passed in the observed run; hydrology failed only at the pre-existing timeout test above. This is not a clean global suite. |
| Runtime prerequisites | Live PostgreSQL, Redis, provider endpoints, provider credentials/tokens, and production configuration were not used/observed. Docker was not used. Production smoke is `not_run`. |
| Rollback boundary | Revert only the new boundary assertions in `apps/api/src/presentation/routes/health.test.ts` and `packages/contracts/tests/agronautas-contracts.test.ts`, plus the related `tasks.md`, `contract-to-screen-matrix.md`, and `apply-progress.md` evidence. Preserve all unrelated working-tree changes, application code, existing shells, routes, contracts, and navigation. |

## Deviations and Risks

- No API route or shared Zod schema change was made because route and schema tests already prove the relevant telemetry, INA, ingest, provenance, and Copilot fields are retained. This avoids inventing fields.
- The UI uses exact semantic state vocabulary in accessible evidence badges while retaining existing Spanish explanatory copy and shells.
- Current fixture/demo providers are labeled `mock/seam`; missing and degraded values are not presented as live acquisition.
- The existing Agronautas E2E stale assertion failed before the new semantic assertion in the local runtime harness; it is not caused by the changed rendering files and requires separate baseline investigation.
- API Groq fallback and the hydrology timeout test are pre-existing and outside this bounded UI slice. The hydrology result is timing/concurrency-sensitive rather than a production behavior failure; the test-only budget should be addressed in a separate hydrology maintenance change, not here.
- The on-demand boundary assertions prove only that current readiness is dependency-only and that the later single-centroid/source proof remains conditional; they do not claim provider, persistence, latency, or production evidence.
- The explicit non-goal assertions are contract/scope checks against current map and field-persistence behavior plus the SDD artifacts; they do not use Docker or add Google Maps, WhatsApp, polygon persistence, scheduler/Risk Engine rewrites, or hydraulic simulation.

## Corrective Apply Pass Evidence

- Corrected task 1.3 references to the actual component test files. No separate workspace test file was fabricated; workspace rendering is covered by `page-client.test.tsx` and field detail by `field-detail.test.tsx`.
- Corrected only the deterministic browser assertion in `apps/web/tests/e2e/agronautas-production.spec.js` for `/demo/fields/field-demo-1`: the fresh validator reproduced 4 passed/2 failed, with the new failure caused by two exact `Detalle del lote` headings. Scoping the exact heading to the semantic field-detail header containing `Agronautas · field-demo-1` produced a narrow 1/1 pass. The final deterministic batch was 5 passed/1 failed, with only the pre-existing `Snapshot stale detectado` smoke failure remaining. No application code changed.
- Narrowed task/design/matrix browser wording to the observed deterministic paths: `agronautas-smoke.spec.js`, `agronautas-production.spec.js`, `government-ui.spec.js`, and `hydrology-ingest.spec.js`. The live `hydrology-government.spec.js` check is recorded as skipped, not passed.
- Updated all matrix rows with concrete component assertion titles and command receipts. No row is represented as a live-provider result.
- Added a deterministic `GET /agronautas/ready` route assertion and linked it from the later on-demand gate row; the response remains dependency readiness only and contains no acquisition trace.
- Added deterministic contract/scope assertions for the required single-centroid/single-source follow-on proof and explicit non-goals. The checks exercise current map provider configuration, point-only coverage, field persistence SQL, package dependencies, and the SDD documents rather than checking only that files exist.

## Hydrology Evidence Reconciliation

- **Configured command:** `packages/hydrology-engine/package.json` runs `pnpm run build:ensure && node --import tsx --test src/**/*.test.ts`; the root command is `turbo run test`, whose workspace tasks run in parallel under the current `turbo.json`.
- **Standalone result:** fresh runs were not stable: one `pnpm --dir packages/hydrology-engine test` run passed `64/64`, and the next passed `63/64`.
- **Root parallel result:** `pnpm test` passed `63/64`; the failure was the same `PnaHttpClient enforces a finite total timeout budget across retry attempts` test at assertion line 128 (`1 !== 2`).
- **Supported serialized result:** the explicit Node command with `--test-concurrency=1` passed `64/64` once and reproduced `63/64` once. Therefore serialization reduces workspace interference but does not create a clean deterministic receipt for this 25 ms timing test.
- **Classification:** known baseline/concurrency-only test limitation. No production or hydrology test/config fix was made because the issue is outside the approved data-first UI scope. The prior claim of two standalone `64/64` runs is not used as current proof.

## Remaining Tasks

None for the bounded implementation/correction slice. Separate follow-on work remains for verified on-demand acquisition proof, live runtime prerequisites, and baseline regression fixes. The hydrology timeout, API Groq fixture, and stale-demo E2E failures remain intentionally untouched.
