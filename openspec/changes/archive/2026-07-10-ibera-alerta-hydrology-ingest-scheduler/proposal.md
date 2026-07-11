# Proposal: Hydrology Ingest Scheduler

## Intent

Make official hydrology ingestion operational without breaking Render Free Tier deployments or overloading public providers. The manual ingest API remains the canonical trigger; scheduling becomes safe, authenticated, and configurable.

## Scope

### In Scope
- Keep `POST /api/hydrology/ingest` behavior: no `source` loads all sources; `source` loads only that source.
- Add opt-in in-process scheduler wiring behind `HYDROLOGY_SCHEDULER_ENABLED=false` by default for always-on/non-free environments.
- Recommend external cron/Render Cron/GitHub scheduled workflow hitting the manual endpoint at safe cadence for Render Free Tier.
- Add or enforce operator token auth for cron/manual ingest.
- Confirm provider URL overrides: `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`.
- Define bounded local verification: one all-sources ingest or per-source limited calls; no retry storm.

### Out of Scope
- Building a new ingestion engine or changing telemetry storage semantics.
- Scraping/provider reverse engineering beyond configurable URLs.
- Keep-awake loops for Render Free Tier.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `ibera-alerta`: extend production-safe hydrology ingest with authenticated operator triggers, external-cron guidance, optional scheduler startup, provider URL overrides, and anti-DDoS cadence constraints.

## Approach

Use the existing manual endpoint and `HydrologyIngestionScheduler`. Wire scheduler startup in `apps/api/src/server.ts`, guarded by `HYDROLOGY_SCHEDULER_ENABLED=true`; default off. For Render Free Tier, document/configure an external scheduler to `POST /api/hydrology/ingest` no more than hourly for PNA. Enforce a cron/operator bearer token if not already enforced. Preserve one attempt per source per run and avoid aggressive retries.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/server.ts` | Modified | Start scheduler only when env flag is enabled. |
| `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` | Modified | Ensure cadence/retry settings are safe for official providers. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Preserve manual ingest variants and enforce operator token auth. |
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modified | Verify/support provider URL env overrides and degraded results for weak defaults. |
| `openspec/specs/ibera-alerta/spec.md` | Modified | Add scheduling/auth/cron requirements. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Render sleeps and in-process scheduler stops | High | Keep scheduler disabled on free tier; use external cron. |
| Provider blocking / DDoS | Medium | One attempt per source; PNA cadence no more than hourly. |
| Unauthorized manual ingest abuse | Medium | Require operator token for cron/manual POST. |
| Weak provider defaults | Medium | Support env overrides and fail/degrade safely. |

## Rollback Plan

Set `HYDROLOGY_SCHEDULER_ENABLED=false`, remove external cron trigger, and keep the manual endpoint available. If auth rollout fails, revert only the auth middleware/config while preserving existing ingest behavior.

## Dependencies

- Operator token secret for cron/manual ingest.
- External cron facility for Render Free Tier.
- Verified machine-readable provider URLs for production reliability.

## Success Criteria

- [ ] Manual all-sources and source-scoped ingest contracts still work.
- [ ] Scheduler is disabled by default and starts only with env opt-in.
- [ ] Render Free Tier plan uses external cron/manual endpoint, not in-process-only scheduling.
- [ ] Ingest POST is protected by operator token when configured/enforced.
- [ ] Local verification runs bounded once without retries or polling storms.
