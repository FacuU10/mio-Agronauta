# Tasks: Hydrology Ingest Scheduler

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150-250 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Full implementation of gated scheduler and authenticated route | PR 1 | Targets main; tests and docs included |

## Phase 1: Authentication and Auth Gate (Foundation)

- [x] 1.1 Enforce auth in `apps/api/src/presentation/routes/hydrology-government.ts` using `HYDROLOGY_INGEST_TOKEN` bearer guard before runner execution.
- [x] 1.2 Fallback to `AGRONAUTAS_AUTH_TOKEN_OPERATOR`/`ADMIN` when `AGRONAUTAS_AUTH_ENABLED=true` and `HYDROLOGY_INGEST_TOKEN` is unset/missing.
- [x] 1.3 Add test cases in `apps/api/src/presentation/routes/hydrology-government.test.ts` for authorized (valid token), unauthorized (missing/invalid), and fallback behavior.

## Phase 2: In-Process Scheduler Startup (Core Implementation)

- [x] 2.1 Add `startHydrologySchedulerFromEnv(env, deps)` in `apps/api/src/server.ts` gated behind `HYDROLOGY_SCHEDULER_ENABLED=false` default.
- [x] 2.2 In `startHydrologySchedulerFromEnv`, instantiate `HydrologyIngestionScheduler` and call `start()` only if enabled, avoiding any immediate startup run.
- [x] 2.3 Expose startup wiring stubs in `apps/api/src/server.ts` and add tests in `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` to verify disabled by default and correct opt-in behavior.

## Phase 3: Anti-DDoS and Resiliency Configuration

- [x] 3.1 Document and enforce maximum frequency limits (e.g., cron hourly) for PNA and other interval sources.
- [x] 3.2 Add validation tests in `packages/hydrology-engine/src/clients/http-clients.ts` to verify default provider URLs are overridden properly by `HYDROLOGY_*_URL` envs.

## Phase 4: Documentation and Deployment Guides

- [x] 4.1 Create `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` covering Render Free tier external cron configuration, headers, auth bearer, hourly schedule, and provider URL overrides.
- [x] 4.2 Document bounded local all-source verification commands (e.g., `curl` mock headers/body) and the production smoke plan (exactly one manual test POST).
