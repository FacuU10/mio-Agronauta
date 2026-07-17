# Tasks: Secure Iberá Alerta Production Ingest

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60 - 100 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Env/Gitignore & Tests) -> PR 2 (Scheduler configuration) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Baseline Security & Env | PR 1 | `npm run test -- apps/api/src/presentation/routes/hydrology-government.test.ts` | N/A: pure configuration and test assertion | Revert PR 1 commits |
| 2 | Operational Evidence | PR 2 | `npm run test -- apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` | Complete a real manual ingestion check via external trigger | Disable scheduler job & revert PR 2 |

## Phase 1: Environment Safety & Baseline Audit

- [x] 1.1 Audit staged/unstaged changes and git untracked workspace files for secrets; log non-disclosure results.
- [x] 1.2 RED test: Verify `.gitignore` rejects named/nested env variants but explicitly retains `*.env.example`.
- [x] 1.3 GREEN: Expand root `.gitignore` to match `.env`, `.env.*`, `*.env`, `*.env.*`, then keep `!*.env.example`.
- [x] 1.4 REFACTOR: Clean up gitignore comments and verify untracked files are correctly ignored.

## Phase 2: Route Protection & Test Isolation

- [x] 2.1 Audit `/api/hydrology/ingest` vs requested `/hidrology/ingest` route; verify existing route is preserved.
- [x] 2.2 RED test: Write unit tests in `apps/api/src/presentation/routes/hydrology-government.test.ts` for missing/invalid tokens.
- [x] 2.3 GREEN: Implement/enforce `isHydrologyIngestAuthorized` guard in `apps/api/src/presentation/routes/hydrology-government.ts`.
- [x] 2.4 REFACTOR: Standardize HTTP 401 error message format and log format in hydrology-government router.

## Phase 3: Scheduler Security

- [x] 3.1 RED test: Assert `startHydrologySchedulerFromEnv` startup state matches configured environment variables.
- [x] 3.2 GREEN: In `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts`, confirm disabled-startup.
- [ ] 3.3 Operator-Gated: Configure external HTTP scheduler with `x-hydrology-ingest-token` masked header on provider.

## Phase 4: Verification & Integration

- [x] 4.1 Execute full test suite to guarantee 100% test pass on route protection and env checks.
- [x] 4.2 Document placeholders in `apps/api/.env.example` for hydrology token and scheduler values.

## Apply note

PR 2 / Unit 2 completed the safe code slice in the hybrid workspace. The existing `/api/hydrology/ingest` route remains the only direct ingest route; `/hidrology/ingest` was not introduced. Route tests cover missing, invalid, unset-server-token, and valid-token behavior across development, test, and production environments, including zero runner calls on 401. The existing all-environment authorization guard was verified and retained. Scheduler startup remains disabled unless `HYDROLOGY_SCHEDULER_ENABLED=true`, including explicit `false`. No provider, credential, external scheduler, deployment, commit, push, or deploy action was performed. Operator-gated scheduler configuration and production smoke evidence remain for verification/operations.
