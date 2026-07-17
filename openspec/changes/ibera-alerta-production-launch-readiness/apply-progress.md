# Apply Progress: Iberá-Alerta Production Launch Readiness

## Scope

- Unit: PR 1 / Unit 1 only (`stacked-to-main`)
- Tasks: 1.1–1.5
- Frozen blockers: R2-001 and R3-001
- Delivery: no commit, push, deploy, or PR operation
- Correction forecast: 150 lines; authored correction remains below the approved forecast

## Reconciliation

No prior `sdd/ibera-alerta-production-launch-readiness/apply-progress` observation existed. Existing uncommitted work in the checkout was preserved. This apply slice changed only the frozen hydrology source/test paths plus this change's task/progress artifacts; it did not alter verifier, BFF, deployment, or provider configuration work.

## Completed Tasks

- [x] 1.1 RED: Added the unsupported-municipality Copilot context regression for R2-001.
- [x] 1.2 GREEN: Exposed the validated municipality context builder used by the Copilot route; unsupported municipalities retain `zone: null` and empty source/station/telemetry collections.
- [x] 1.3 RED: Added source-isolation and storm-alert semantic regressions for R3-001.
- [x] 1.4 GREEN: Keyed coordinator in-flight admission by requested source and normalized `storm_alert` persistence to `value: null`.
- [x] 1.5 REFACTOR: Kept the correction localized, updated the scheduler regression for independent source admission, and completed the full test suite.

## TDD Cycle Evidence

| Task | Test file | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|
| 1.1 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | API baseline passed | Failing missing context-builder export | Unsupported context test passed | Supported Copilot route test remained green | Shared builder is explicit/exported |
| 1.2 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | API baseline passed | Same R2 regression | Focused API suite passed | Supported and unsupported contexts covered | No additional behavior change |
| 1.3 | Route and hydrology-engine tests | API 150/150; engine 38/38 baseline | Coordinator returned PNA run for INA; alert stored numeric value | Focused route 36/36 and engine 18/18 passed | Same-source dedupe plus different-source admission covered | Scheduler regression updated for two independent calls |
| 1.4 | Route and hydrology-engine tests | Existing suites green before edits | R3 assertions failed before implementation | Coordinator and repository assertions passed | Numeric hydrology tests remained green; alert test verifies null | No source/provider redesign |
| 1.5 | Full workspace suite | Focused suites green | N/A (refactor/verification) | `pnpm test` passed | 152/152 API tests included | Localized diff review and `git diff --check` passed |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts` → 36 passed, 0 failed; `pnpm --dir packages/hydrology-engine exec node --import tsx --test src/hydrology-engine.test.ts` → 18 passed, 0 failed |
| Full test command and exact result | `pnpm test` → 152 passed, 0 failed |
| Runtime harness | N/A — Unit 1 is bounded to coordinator/context/repository logic and its unit/integration tests; runtime verifier and production smoke are PR 2/PR 3 scope |
| Rollback boundary | Revert only the source-keyed coordinator admission, `buildMunicipalCopilotContext` export/use, storm-alert null-value normalization, and their regression tests in the listed hydrology files; preserve unrelated pre-existing edits in those files |

## Changed Lines

- `apps/api/src/presentation/routes/hydrology-government.ts`: lines 263, 303, 344, 351–352, 380–381 (current line numbers)
- `apps/api/src/presentation/routes/hydrology-government.test.ts`: import line 5, coordinator regression lines 271–290, unsupported-context regression lines 843–853 (current line numbers)
- `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts`: lines 95, 99, 111–112 (test expectation reconciled with R3-001)
- `packages/hydrology-engine/src/repository.ts`: line 97 (storm-alert value normalization)
- `packages/hydrology-engine/src/hydrology-engine.test.ts`: lines 214–229 (alert semantic regression)
- `openspec/changes/ibera-alerta-production-launch-readiness/tasks.md`: lines 29–33

## Risks / Limitations

- R2-001 and R3-001 are locally covered and green, but launch readiness remains blocked until the separate verifier/BFF and canonical production evidence units run.
- No live PNA/INA/INMET/SMN request or deployment was performed in PR 1.
