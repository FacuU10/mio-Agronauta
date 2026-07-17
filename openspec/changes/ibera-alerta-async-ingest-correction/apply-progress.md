# Apply Progress: ibera-alerta-async-ingest-correction

**Native review lineage:** `review-ibera-alerta-async-ingest-20260715`
**Mode:** Focused correction executor; no auth, bearer, provider semantic, deployment, commit, or push changes
**Budget:** <=200 correction lines

## Completed Corrections

- [x] Replaced global in-flight rejection with bounded per-key rate limiting plus idempotent accepted status for the active in-process run.
- [x] Routed manual and hydrology scheduler execution through the same in-process coordinator.
- [x] Persisted background runner failures to `hydrology_ingestion_runs` through the existing repository API using bounded `Promise.allSettled` finalization.
- [x] Propagated provider `AbortSignal` through official clients, stopped INA series iteration after abort, and retained an explicit deadline race with late-rejection handling.
- [x] Added partial-write observability fields (`recordsAttempted`, `proofRunId`) to existing persistence error logs.

## Evidence

- `pnpm --filter @repo/hydrology-engine build` — passed.
- `pnpm --filter api build` — passed.
- `node --import tsx --test src/hydrology-engine.test.ts src/clients/http-clients.test.ts` — 23/23 passed.
- `node --import tsx --test src/presentation/routes/hydrology-government.test.ts` — 30/30 passed.
- `node --import tsx --test src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` — 10/10 passed.
- `git diff --check` — passed.

## Remaining Risks

- The coordinator is process-local; multi-instance deployments still need a database/Redis lease for cross-instance idempotency.
- Provider clients that ignore the supplied signal may continue their own work after the caller deadline; official clients now propagate and honor the signal.
- Targeted lint invocation remains noisy because the repository lint script scans generated `dist` declarations; it also reports an existing `no-constant-condition` warning on the bounded response reader.
