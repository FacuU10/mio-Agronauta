# Tasks: Data-First Evidence Visibility

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated authored changed lines | 700–1,200 |
| 99999-line budget risk | No |
| Chained PRs recommended | No |
| Suggested split | One PR; work-unit commits |
| Delivery strategy | single-pr |
| Chain strategy | size-exception (not required) |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low (99999-line budget)

### Suggested Work Units

| Unit | Goal / commit grouping | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | RED fixtures, contracts, matrix, normalizer | `pnpm --dir apps/web test` + contract tests | N/A: pure fixtures | Revert tests, normalizer, matrix refs |
| 2 | GREEN typed adapters and existing screens | `pnpm --dir apps/web test` | Fixture seams; no Docker | Revert evidence-only contract/UI files |
| 3 | Refactor, regression, browser/runtime evidence | `pnpm test && pnpm build`; hydrology evidence must distinguish root parallel from the serialized `node --test --test-concurrency=1` command | External PostgreSQL/Redis/providers; no Docker | Revert receipts/matrix refs |

## Phase 1: Strict TDD RED and Acceptance Inventory

- [x] **1.1 (deps: none)** Paths `contract-to-screen-matrix.md` and component tests; add deterministic complete/empty/error/stale/degraded/mock fixtures, one assertion/row. **RED:** rows fail before rendering. **Implement/green:** executable fixture assertions. **Accept/rollback:** no invented fields; revert matrix/tests.
- [x] **1.2 (deps: 1.1)** Paths conditional `apps/web/src/lib/visibility/evidence-state.test.ts`, `apps/web/src/lib/agronautas/schemas.ts`, `packages/zod-schemas/src/agronautas.test.ts`; **RED:** seven states, timestamp rules, conditional-field rejection. **Implement:** tests only. **Green:** specific failures. **Accept/rollback:** observed/forecast require source+timestamp; revert tests/fixtures.
- [x] **1.3 (deps: 1.1)** Paths `apps/web/src/components/agronautas/{page-client,field-detail}.test.tsx` and `apps/web/src/components/government/{overview,detail,ingest-panel}.test.tsx`; workspace behavior is covered by `page-client.test.tsx` and field detail by `field-detail.test.tsx` (there is no separate workspace test file). **RED:** evidence/Copilot, telemetry, INA-if-returned, alerts, freshness, diagnostics, mappings, local context, accessibility. **Implement/green:** semantic assertions then pass. **Accept/rollback:** stable roles/labels; revert tests.
- [x] **1.4 (deps: 1.3)** Deterministic paths `apps/web/tests/e2e/{agronautas-smoke,agronautas-production,government-ui,hydrology-ingest}.spec.js`; `agronautas-production.spec.js` includes the workspace and field-detail browser assertions. `hydrology-government.spec.js` remains a live-provider check and is explicitly skipped when its authorized runtime prerequisite is absent; it is not counted as a deterministic pass. **RED:** fresh validator batch reproduced 4 passed/2 failed: the known `Snapshot stale detectado` baseline plus the field-detail exact-heading strict-mode failure. **Implement/green:** scope the exact heading to the semantic field-detail header containing `Agronautas · field-demo-1`; narrow command passed 1/1, and final deterministic command `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-smoke.spec.js tests/e2e/agronautas-production.spec.js tests/e2e/government-ui.spec.js tests/e2e/hydrology-ingest.spec.js --timeout=60000 --reporter=line` passed 5/6 with only the unchanged `Snapshot stale detectado` failure. **Accept/rollback:** preserve the baseline failure and unavailable live-provider limitation; revert only the selector assertion and receipt edits.

## Phase 2: GREEN Contracts and View Model

- [x] **2.1 (deps: 1.2)** Path `apps/web/src/lib/visibility/evidence-state.ts`; add typed `EVIDENCE_STATE`, `EvidenceState`, `EvidenceViewModel`, freshness/timestamp and missing/mock helpers. **RED:** 1.2. **Green:** web tests pass. **Accept/rollback:** no fetch-based claim; revert pure module.
- [x] **2.2 (deps: 2.1)** Paths `apps/web/src/lib/agronautas/{schemas,service}.ts`, conditional API routes `apps/api/src/presentation/routes/{agronautas,hydrology-government}.ts`, `packages/zod-schemas/src/agronautas.ts`; retain only route-produced fields proven by 1.2/API tests. **RED/green:** contract then API/web tests. **Accept/rollback:** if none are dropped, no API/schema edit; revert additive fields.

## Phase 3: GREEN Existing-Shell Rendering

- [x] **3.1 (deps: 2.2)** Paths `apps/web/src/components/agronautas/{page-client,workspace,field-detail}.tsx`; render normalized field/source/freshness, risk, weather/hydrology forecasts, alerts, diagnostics and returned Copilot evidence. **RED:** 1.3/1.4. **Green:** component tests. **Accept/rollback:** geometry/scheduler/full trace remain missing; no on-demand; revert Agronautas UI.
- [x] **3.2 (deps: 2.2)** Paths `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx`, `overview-summary.ts`; render telemetry, returned INA forecasts, alerts, provenance/freshness, mappings, threshold/non-hydraulic context, diagnostics, bounded TTL status and Copilot trace. **RED:** 1.3/1.4. **Green:** component tests. **Accept/rollback:** list/accessibility and non-goals preserved; revert Iberá UI.

## Phase 4: Refactor and Verification

- [x] **4.1 (deps: 3.1, 3.2)** Update every matrix row with an exact assertion and deterministic receipt; refactor; run the focused component suite and deterministic Playwright paths. Preserve prior full-suite/API/hydrology/worker receipts and their known failures separately. Record prerequisites/evidence separately (external PostgreSQL/Redis/provider credentials; production `not_run` unless observed), no Docker. Observed correction evidence: narrow field-detail browser test 1/1; final deterministic browser batch 5/6 with only the unchanged `Snapshot stale detectado` failure; fresh hydrology runs distinguish standalone `64/64` then `63/64`, root parallel `63/64`, and serialized `--test-concurrency=1` `64/64` then `63/64`. The exact hydrology failure is the pre-existing 25 ms retry-timing assertion at `packages/hydrology-engine/src/clients/http-clients.test.ts:128`; no hydrology fix is in this UI slice. **Accept/rollback:** baseline failures and skipped live-provider evidence remain explicit; revert receipts/matrix refs and the selector assertion only.
- [x] **4.2 (deps: 4.1)** Add an executable readiness-boundary assertion in `apps/api/src/presentation/routes/health.test.ts`: `GET /agronautas/ready` remains dependency/runtime readiness and does not claim the later on-demand request/run/source/centroid/persistence trace. **RED:** assertion added before the matrix boundary was documented. **Green:** focused health test passed 12/12. **Accept/rollback:** revert only the test and matrix receipt; do not add an acquisition route.
- [x] **4.3 (deps: 4.1)** Add executable scope assertions in `packages/contracts/tests/agronautas-contracts.test.ts` for the single-centroid/single-source follow-on proof sequence and explicit non-goals. Assertions exercise the SDD scope documents, provider-neutral point-only map seam, absence of Google Maps dependency, and non-durable field polygon persistence. **RED:** new readiness wording and persisted-field boundary checks failed before this correction. **Green:** focused contracts test passed 4/4. **Accept/rollback:** revert only the scope test and matrix/task evidence; do not add providers, maps, polygons, scheduler/Risk Engine changes, or hydraulic simulation.

## Explicit non-goals

Do not implement on-demand acquisition, Google Maps, WhatsApp, durable/editable polygons, broad precomputation, scheduler/Risk Engine rewrites, new providers, or hydraulic simulation.
