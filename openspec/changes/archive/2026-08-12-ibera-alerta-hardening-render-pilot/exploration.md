## Exploration: Iberá-Alerta hardening and Render pilot

### Current State

The canonical branch is clean at `continuation/agronautas-ibera-unified-2026-08-04`, HEAD `0be9ba8049dbc6aba01b1900f2c52794f087574d`. This exploration did not modify application code. Iberá-Alerta remains a separate product surface from Agronautas; both reuse the API, PostgreSQL/PostGIS, Redis, Render, observability, and web monorepo infrastructure.

#### Requested-item classification

| Item | Classification | Evidence and boundary |
|---|---|---|
| `statusPath` contract | **Partial** | `POST /api/hydrology/ingest` returns a validated `/api/hydrology/ingest/{runId}` path (`apps/api/src/presentation/routes/hydrology-government.ts:214-246`; `packages/zod-schemas/src/agronautas.ts:504-529`). The path observes a coordinator map, not a durable run store. |
| In-memory status TTL | **Implemented, but non-durable** | Completed/failed observations are kept for 15 minutes and capped at 32 entries (`INGEST_OBSERVATION_TTL_MS`, `INGEST_OBSERVATION_MAX`), with a bounded 150-second wait. The web client polls at most six times and never treats `queued` as terminal (`apps/web/src/lib/visibility/polling.ts:31-50`). |
| Status persistence after restart | **Missing** | `active` and `observations` are local `Map`s inside `createHydrologyIngestionCoordinator` (`hydrology-government.ts:376-426`). Restarting the API, moving the request to another instance, or letting the TTL expire loses status-path state. PostgreSQL does persist source ingestion rows and telemetry, but there is no `getIngestionRun(runId)` path that reconstructs the public status response. |
| Current storage model | **Partial/implemented by layer** | PostgreSQL persists `hydrology_ingestion_runs`, `hydrology_telemetry`, stations, municipalities, mappings, and proof-run correlation; telemetry writes are transactional and deduplicated (`packages/hydrology-engine/src/repository.ts:56-183`; `infra/bootstrap/agronautas/001-postgis-schema.sql:29-92`; `20260714120000_hydrology_proof_run_id/migration.sql`). Redis/PG locking exists for Agronautas signal windows, not for Iberá hydrology runs (`apps/api/src/infrastructure/database/redis/scheduler-lock.ts`). |
| Hydrology scheduler ownership | **Partial and unsafe to claim as deployed** | An in-process hydrology scheduler exists with hourly PNA/INMET/SMN and daily 18:30 UTC INA cadence (`apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts:7-16`), but Render explicitly sets `HYDROLOGY_SCHEDULER_ENABLED=false` and the manifest has no Render Cron service (`render.yaml:20-25`). The protected ingest endpoint is a usable external trigger, but no configured Cron owner or execution receipt is present. |
| Distributed hydrology lock | **Missing** | Per-process `runningSources` and coordinator `active` maps prevent some same-process overlap. The Redis/PG `ScheduledWindowLock` is wired only to Agronautas scheduling, not to `startHydrologySchedulerFromEnv` or external hydrology ingest. There is no cross-instance lease, advisory lock, or unique scheduled-slot idempotency for Iberá. |
| Duplicate-run safety | **Unsafe to claim** | `active` is keyed by `source` or `ALL`; `ALL` and a source-specific request can use different keys, and separate API instances have independent maps. `hydrology_ingestion_runs` has no unique run/slot constraint. Same-process overlap tests pass, but once-only behavior across instances or Cron retries is not proven. |
| Retention/prune | **Missing** | `HydrologyPruneJob` has a daily 03:00 UTC timer and calls `pruneOldData(30, now)`, but the repository implementation is an explicit no-op returning zero deletions (`packages/hydrology-engine/src/repository.ts:243-247`). No server startup wiring for this job was found. Existing tests deliberately assert the non-destructive compatibility hook. |
| PNA adapter and evidence | **Implemented; production claim unavailable** | Bounded official HTML parsing, monitored Corrientes stations, response limits, and bounded retry/timeout logic are present (`pna-adapter.ts`, `http-clients.ts:165-191`). The historical real matrix `artifacts/hydrology-local-real-matrix.json` records HTTP 200, 9 records, remote DB correlation, and local browser visibility on 2026-07-18. No current-HEAD or commit-correlated production proof exists. |
| INA adapter and evidence | **Implemented; production claim unavailable** | Three fixed CSV series (`6764`, `33988`, `38469`) are fetched once per bounded attempt; header/headerless CSV parsing and the 30-day forecast cap are implemented (`http-clients.ts:48-51,213-240`; `ina-adapter.ts`). The same historical matrix records HTTP 200, 36 records, DB correlation, and local rendering. Current production execution is not proven. |
| INMET adapter and evidence | **Partial** | RSS parsing, approved station/state filtering, bounded response handling, and the official “no active alerts” plain-text classification exist (`inmet-adapter.ts`; `http-clients.ts:202-210`). The real matrix records HTTP 200 with a 37-character no-alert response but a failed/zero-record persisted run; older production evidence also shows `NO DISPONIBLE`. It is not valid to claim current INMET telemetry or alert availability. |
| SMN adapter and evidence | **Partial** | Current CAP RSS parsing, Corrientes/Misiones filtering, bounded item count, stable `smn-corrientes` coverage key, and dynamic-ID rejection are implemented (`smn-adapter.ts`). The 2026-07-18 matrix records HTTP 200, 120 records, DB correlation, and local visibility, while earlier evidence records HTTP 403 and production `NO DISPONIBLE`. This is historical/local evidence, not current production proof. |
| Municipality/locality coverage | **Partial with material gaps** | Iberá seeds 17 PNA flood-risk ports and mapping arrays (`PNA_FLOOD_RISK_PORTS`, `seedGovernmentMunicipalitiesIfEmpty`). Alert coverage is separately versioned for the 17 IDs: one SMN key per municipality and INMET keys `A830/A809` or `A846/A826` (`seed-municipality-alert-coverage.ts`). However, existing artifacts report 18 municipality cards, only three Copilot zones (`Mercedes`, `Ituzaingó`, `Virasoro`) are allowed, the bootstrap agricultural boundary is only Mercedes, and non-official square boundaries are generated for the 17-port seed. Coverage count, authoritative municipality geometry, station relationships, and Copilot locality scope need one reconciled source of truth. |
| Copilot zone limits | **Implemented for safety, incomplete for coverage** | The route empties telemetry for municipalities outside `Mercedes`, `Ituzaingó`, and `Virasoro` (`hydrology-government.ts:338-361`); the schema rejects non-null context with sources/telemetry outside those zones (`packages/zod-schemas/src/agronautas.ts:394-410`). The system prompt rejects routing, lag, dam discharge, evacuation authority, invented metrics, and unsupported sources; forecasts over 14 days are marked speculative (`hydrology-copilot-service.ts:53-64`). |
| Copilot citations and grounding | **Partial; citation completeness unsafe to claim** | Context includes source names, stations, telemetry, source URLs, freshness, and `lastSuccessfulObservedAt`, and metadata exposes sources/timestamp/count. The SSE contract has `metadata`, `token`, and `done`, but no validated citation list or per-token evidence references. The model receives JSON context and a restrictive prompt, yet generated text is not citation-validated. The UI displays sources, limits, metadata, and timestamps but not authoritative links for every Copilot claim (`detail.tsx:153-168`). This must remain distinct from Agronautas’ separate structured `citations[]` contract. |
| Existing Iberá UI surfaces | **Implemented, with hardening gaps** | `/municipalities` renders source freshness, province alerts, 17/18 locality cards, filters, thresholds, PNA/INA values, and evidence states (`apps/web/src/components/government/overview.tsx`). `/municipalities/:id` renders telemetry, station mappings, official alerts, INA 30-day forecasts, provenance, evidence states, and Copilot SSE (`detail.tsx`). The operator ingest page verifies a memory-only token, displays statusPath/run/proof IDs, polls boundedly, and exposes safe per-source diagnostics (`ingest-panel.tsx`). Missing are durable post-restart status, current-run history, per-forecast provenance links, explicit coverage-gap views, and validated Copilot citations. |
| Tests and real runtime/provider/database evidence | **Tests mostly implemented; current runtime proof unavailable** | Focused execution on this HEAD: API hydrology/scheduler/prune/lock suites passed 62/62; web Iberá/visibility suites passed 17/17. Hydrology-engine suites passed 56/57: the existing `PnaHttpClient enforces a finite total timeout budget across retry attempts` test fails deterministically with one call instead of two under the current 10ms/25ms timing budget (`http-clients.test.ts:118-133`). Historical real evidence is explicit: PNA/INA/SMN passed local/remote-DB correlation on 2026-07-18, INMET was blocked/failed, and production API/DB/Cron evidence was not run or was blocked/not commit-correlated. No current provider or database smoke was performed in this exploration. |

#### Current persistence and execution flow

1. A protected POST admits work and immediately returns `202`, `runId`, `proofRunId`, and `statusPath`.
2. The coordinator keeps the queued response and eventual response in process memory, then deletes active state after completion while retaining the observation only for the TTL.
3. The runner seeds the 17-port municipality set if needed, calls PNA/INA/INMET/SMN sequentially, persists telemetry plus one source run per provider, and continues after provider failures.
4. Municipality endpoints read PostgreSQL and deliberately exclude `offline-fixture://` data. Source freshness comes from persisted ingestion runs; the public status endpoint does not.
5. The web manifest has two Native Node services and disabled in-process schedulers. It does not declare the required single external Render Cron, nor a worker.

### Affected Areas

- `apps/api/src/presentation/routes/hydrology-government.ts` — in-memory admission, status observation, external ingest route, source runner, municipality/Copilot zone allowlist, and municipality seed.
- `apps/api/src/server.ts` — API startup and the optional in-process hydrology scheduler; no hydrology distributed lock or prune startup wiring.
- `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` — source cadences, per-process overlap guard, and timer lifecycle.
- `apps/api/src/infrastructure/jobs/hydrology-prune-job.ts` — compatibility timer that currently invokes a no-op repository method.
- `apps/api/src/infrastructure/database/redis/scheduler-lock.ts` — reusable Agronautas lock, currently outside Iberá hydrology ownership.
- `packages/hydrology-engine/src/repository.ts` — durable telemetry/run/freshness queries, municipality joins, and non-destructive prune stub.
- `packages/hydrology-engine/src/clients/http-clients.ts` — bounded official HTTP clients, PNA retry behavior, INA series fan-out, and safe diagnostics.
- `packages/hydrology-engine/src/adapters/{pna,ina,inmet,smn}-adapter.ts` — provider normalization, filtering, forecast bounds, and stable alert keys.
- `apps/api/prisma/migrations/20260623210000_government_hydrology_municipalities/migration.sql` — municipality, mapping, geometry, and index model.
- `apps/api/prisma/migrations/20260714120000_hydrology_proof_run_id/migration.sql` — proof correlation index, not public status persistence.
- `apps/api/prisma/migrations/20260718120000_municipality_alert_coverage/migration.sql` and `apps/api/src/infrastructure/database/postgres/seed-municipality-alert-coverage.ts` — reviewed INMET/SMN coverage associations.
- `render.yaml` — current two-service Render Native Node baseline; scheduler flags are false and no Cron is declared.
- `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx` and `apps/web/src/lib/visibility/polling.ts` — current Iberá overview, detail, operator ingest, evidence, and bounded polling surfaces.
- `packages/hydrology-engine/src/services/hydrology-copilot-service.ts` and `packages/zod-schemas/src/agronautas.ts` — Copilot safety prompt, dense context, status, telemetry, and ingest contracts.
- `artifacts/hydrology-local-real-matrix.json`, `hydrology-slice2-runtime-evidence.json`, `hydrology-production-current-observation.json`, and `hydrology-production-post-deploy-20260715.json` — historical evidence; none is current-HEAD production proof.

### Approaches

1. **PostgreSQL-backed run ledger plus one external Render Cron owner** — Persist admission, running, terminal status, source results, diagnostics, and expiry in PostgreSQL; make `statusPath` read from that ledger; use a stable scheduled-slot/run key and a database advisory/lease or unique constraint for cross-instance ownership; keep both in-process scheduler flags false in Render.
   - Pros: Reuses the existing durable hydrology schema and DB correlation model; survives restart; makes status, freshness, audit, pruning, and UI history consistent; keeps Iberá separate while sharing infrastructure.
   - Cons: Requires a schema/API migration and careful lease expiry/recovery semantics; Render Cron configuration and a real bounded smoke are still external prerequisites.
   - Effort: Medium.

2. **Redis-backed coordinator and distributed lock** — Store queued/terminal status and a lease in Redis, using the existing Redis connection and lock patterns, while retaining PostgreSQL source-run records.
   - Pros: Fast TTL-native status and familiar distributed-lock primitive; lower read latency for short-lived observations.
   - Cons: Redis alone is not the durable audit source; restart/failover semantics and result retention become split-brain between Redis and PostgreSQL; requires reconciliation and still needs a single Render Cron owner.
   - Effort: Medium/High.

3. **Queue/worker execution model** — Move Iberá ingest to a separate durable queue/worker service with job state, retries, and an explicit deployment contract.
   - Pros: Strong execution isolation, durable retries, and clearer operational ownership at scale.
   - Cons: Introduces a new service/runtime, conflicts with the current two-service Render baseline, expands scope beyond a pilot, and risks coupling Iberá to the Agronautas/worker product boundary.
   - Effort: High.

### Recommendation

Proceed to proposal with Approach 1 as a narrow Iberá-Alerta hardening/pilot: PostgreSQL is the source of truth for hydrology run state and provider results; one explicitly declared Render Cron is the only scheduled owner; web/API in-process hydrology scheduling remains disabled; a cross-instance DB lease or stable scheduled-slot uniqueness prevents duplicate runs; the prune job gets real, bounded SQL only after retention rules are specified. Preserve the existing provider adapters, source-specific failure semantics, municipality alert coverage rules, and UI evidence states. Add Copilot citations as an explicit response contract only if the pilot can map every displayed claim to a source URL/telemetry record; otherwise expose source/timestamp context and a clear “no citation” boundary rather than implying complete grounding.

The proposal should separate three proof levels: unit/contract tests, local runtime with real provider responses and the configured database, and commit-correlated production/Render Cron evidence. Historical artifacts may guide the plan but must not be reused as current proof. Agronautas’ Redis scheduler lock and risk/signal tables may be reused as infrastructure patterns, not as Iberá domain state or evidence.

### Risks

- The public status path currently returns `404` after process restart or observation expiry even when PostgreSQL contains the underlying source-run rows.
- `ALL` and source-specific coordinator keys can overlap, and independent API instances have independent admission maps; external Cron retries can therefore duplicate provider calls and writes.
- There is no active hydrology Cron in `render.yaml`; enabling the in-process scheduler on multiple Render instances without a hydrology lock would multiply runs.
- `pruneOldData` is a no-op and the prune job is not started by the API, so “30-day retention” is currently an intended parameter, not behavior.
- The municipality count differs across source intent (17 seeded PNA ports) and historical runtime artifacts (18 cards); synthetic square boundaries and the three-zone Copilot allowlist must not be presented as full Corrientes municipal coverage.
- INMET availability is not equivalent to a successful HTTP response: the current real matrix received HTTP 200 no-alert text but persisted zero records and a failed run. SMN has mixed 200/403 historical evidence.
- Copilot prompt restrictions do not provide citation integrity by themselves; generated claims remain unvalidated unless the response contract carries and checks evidence references.
- The focused hydrology-engine test suite has one deterministic timing failure under the current timeout test, so a green full-suite claim is false until that baseline issue is separately understood or the test contract is revised.

### Ready for Proposal

Yes. The change is sufficiently mapped for a focused proposal. The orchestrator should scope the next phase around durable status/run state, explicit Render Cron ownership, cross-instance idempotency/locking, real prune behavior, reconciled municipality coverage, and evidence-grounded Iberá UI/Copilot exposure. It should not claim current production readiness, Cron execution, restart persistence, complete locality coverage, or complete Copilot citations before those proofs exist.
