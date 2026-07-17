# Tasks: Iberá-Alerta Production Launch Readiness

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150-250 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Fixes & Tests) -> PR 2 (Verifier & Local Evidence) -> PR 3 (Deployment & Smoke) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal (Semantic Scope) | Likely PR | Focused test command (Verification) | Runtime harness | Rollback boundary | Dependencies |
|------|------|-----------|----------------------|-----------------|-------------------|--------------|
| 1 | R2-001 & R3-001 fixes & tests | PR 1 | `pnpm --filter hydrology-engine test` | N/A (Unit tests cover logic) | Revert PR 1 files | None |
| 2 | Verifier, local evidence, & BFF | PR 2 | `pnpm --filter @monorepo/api test` | `pnpm --filter @monorepo/api run verify:local` | Revert PR 2 files | Unit 1 |
| 3 | Render deployment & smoke test | PR 3 | `pnpm --filter @monorepo/web test` | Playwright e2e smoke against `https://www.agronauta.com.ar` | Redeploy previous main | Unit 2 |

## Phase 1: Core Logic Corrections (Strict TDD)

- [x] 1.1 RED: Write failing test in `apps/api/src/presentation/routes/hydrology-government.test.ts` for unsupported zone Copilot context returning `zone: null` and recommendation (R2-001).
- [x] 1.2 GREEN: Implement minimum change in `apps/api/src/presentation/routes/hydrology-government.ts` to satisfy R2-001 context rules.
- [x] 1.3 RED: Write failing tests in `packages/hydrology-engine/src/hydrology-engine.test.ts` and route tests for source execution isolation and preservation of alert-only null values (R3-001).
- [x] 1.4 GREEN: Implement coordinator and repository corrections in `packages/hydrology-engine/src/repository.ts` and routes to satisfy R3-001.
- [x] 1.5 REFACTOR: Clean up hydrology routes and packages; ensure all unit tests pass with `pnpm test`.

## Phase 2: Evidence and BFF Preparation (Strict TDD)

- [ ] 2.1 RED: Write failing test in `apps/api/src/scripts/verify-hydrology-local-real.test.ts` for verifier executing one-POST and one-GET per source without retry.
- [ ] 2.2 GREEN: Modify `apps/api/src/scripts/verify-hydrology-local-real.ts` to generate redacted per-source local/production evidence cells and status tracking.
- [ ] 2.3 RED: Write failing test in `apps/web/src/app/api/hydrology/[...path]/route.test.ts` for canonical BFF forwarding to `https://www.agronauta.com.ar`.
- [ ] 2.4 GREEN: Correct host origin configuration in `apps/web/src/app/api/hydrology/[...path]/route.ts` to strictly require canonical endpoint.
- [ ] 2.5 REFACTOR: Consolidate mock handlers in tests; ensure test suites pass.

## Phase 3: Deployment and Smoke Verification

- [ ] 3.1 Review: Verify all local tests pass and collect/save the local evidence matrix as `evidence-local.json`.
- [ ] 3.2 Commit: Merge PR 1 and PR 2 to `main` following review receipt approvals.
- [ ] 3.3 Deploy: Trigger deployment of the commit-correlated `main` revision to Render and wait 2 minutes for cold start.
- [ ] 3.4 Smoke: Run Playwright smoke test asserting municipalities render correctly from BFF payload on `https://www.agronauta.com.ar/municipalities`.
- [ ] 3.5 Evidence: Run production verification, generating final `evidence-production.json` containing the redacted post-launch cell matrix.
