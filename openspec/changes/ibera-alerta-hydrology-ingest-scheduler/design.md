# Design: Hydrology Ingest Scheduler

## Technical Approach

Keep `POST /api/hydrology/ingest` as the canonical ingestion trigger and add optional in-process scheduling only for always-on deployments. Render Free uses external cron with `HYDROLOGY_SCHEDULER_ENABLED=false` because sleeping web services stop Node timers. The implementation is additive: startup wiring, route auth, docs, and tests; provider URL overrides already exist in `packages/hydrology-engine/src/clients/http-clients.ts` and should be documented/covered by tests rather than reworked.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Scheduler startup | Add `startHydrologySchedulerFromEnv(env, deps)` in `apps/api/src/server.ts`; call after `startAgronautasSchedulerFromEnv()` | Start unconditionally; separate worker process | Env gate preserves Render Free safety and keeps existing Express lifecycle pattern. |
| Scheduler runner | Wrap `createGovernmentIngestionRunner()` with an adapter from `HydrologyIngestionSource` to `HydrologySource` (`SMN_ALERTS` and `SMN_RAINFALL` both call `SMN`) | Duplicate ingestion logic | Reuses route ingestion path and persistence; each source callback performs one manual-run call. |
| Auth | Add local ingest auth middleware/helper in `hydrology-government.ts` accepting `HYDROLOGY_INGEST_TOKEN`; if absent and `AGRONAUTAS_AUTH_ENABLED=true`, accept existing `AGRONAUTAS_AUTH_TOKEN_OPERATOR`/`ADMIN` | Reuse `requireAgronautasScope` directly | Hydrology token allows cron isolation while operator/admin fallback matches current BFF behavior. Reject before provider calls. |
| Render Free cron | External cron posts all-sources no more than hourly | Keep-awake loop; in-process-only scheduler | Cron wakes the service without burning free hours continuously and avoids retry storms. |

## Data Flow

```text
Render/GitHub/external cron ─POST /api/hydrology/ingest─→ auth gate ─→ government runner
                                                                    └→ PNA/INA/INMET/SMN clients ─→ Postgres

API boot ─→ HYDROLOGY_SCHEDULER_ENABLED? ─no─→ no timers
                                      └yes─→ HydrologyIngestionScheduler ─→ adapter ─→ government runner
```

`HydrologyIngestionScheduler.start()` currently schedules interval sources for the first tick after the cadence and INA at the next 18:30 UTC; it does not ingest immediately at boot. Do not pass `enqueueDelayedRetry` from startup, so no delayed retry is scheduled from this wiring.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/server.ts` | Modify | Import scheduler and route runner; add `startHydrologySchedulerFromEnv`; call it from `startServer`; expose deps for tests. |
| `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` | Modify | Export mapper-friendly types if needed; preserve safe cadences and no immediate boot run. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Add ingest auth guard before schema runner execution; export `createGovernmentIngestionRunner` remains the shared runner. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modify | Add missing/invalid/valid bearer cases and prove unauthorized calls do not invoke `ingestionRunner`. |
| `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` or `server.test.ts` | Modify/Create | Verify env default disables scheduler, `true` starts timers, and startup adapter does not run immediately. |
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modify only if needed | Env overrides already exist: `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`; add/adjust tests if absent. |
| `README.md` or `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` | Modify/Create | Document Render Free envs, cron body/header, local and production smoke commands. |
| `openspec/specs/ibera-alerta/spec.md` | Modify | Sync scheduling/auth/verification requirements during archive. |

## Interfaces / Contracts

Env:
- `HYDROLOGY_SCHEDULER_ENABLED=false` default; set `true` only on always-on hosting.
- Render Free recommended: `HYDROLOGY_SCHEDULER_ENABLED=false`, `HYDROLOGY_INGEST_TOKEN=<secret>`, provider URL overrides, `AGRONAUTAS_API_INTERNAL_URL`/`AGRONAUTAS_BFF_BEARER_TOKEN` for web proxy if smoking through frontend.

External cron:
- Schedule: `0 * * * *` or slower; never below hourly.
- URL: backend `https://<api-host>/api/hydrology/ingest` preferred; frontend `https://<web-host>/api/hydrology/ingest` acceptable if BFF token is configured.
- Headers: `Content-Type: application/json`, `Authorization: Bearer ${HYDROLOGY_INGEST_TOKEN}` or operator token.
- Body: `{ "contractVersion": "1.0.0", "reason": "external-cron-hourly" }`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Env-gated startup and no immediate run | Fake timers/deps around `startHydrologySchedulerFromEnv`. |
| Route | Ingest token/operator auth and all-source/source-scoped contracts | Existing Express route test harness. |
| Client | Provider env overrides | Instantiate clients with env/fetch stubs and assert requested URL/diagnostics. |
| Bounded local | One all-source run without retry storm | Start API with `HYDROLOGY_SCHEDULER_ENABLED=false`; run one `curl -X POST` with body above; inspect one response only. |
| Production smoke | One POST only | Use backend or frontend URL once; no polling/retry loop; accept `partial/failed` with safe diagnostics if provider URLs are invalid. |

## Migration / Rollout

No data migration required. Deploy disabled by default, configure token/provider envs, add external cron, then perform exactly one smoke POST.

## Open Questions

None.
