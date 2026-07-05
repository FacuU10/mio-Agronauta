# Design: Agronautas Production Launch Real Ingestion

## Technical Approach

Complete the MVP by extending the existing Agronautas hexagonal slice: contracts in `packages/zod-schemas`, domain ports/entities in `apps/api/src/domain`, Postgres/Redis adapters under `infrastructure`, Python runtime jobs for scheduled recompute, and dumb dashboard/PDF rendering from persisted API contracts. Real ingestion is provider-adapter first, idempotent by `runId`/field/signal window, and always exposes freshness, confidence, degradation, and evidence.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Scope model | Corrientes-first Argentina agriculture with `cropCategory/crop` contracts, keeping rice as supported crop not product boundary | Rice-only; all-Argentina day one | Matches launch scope while preserving MVP constraints and future crops. |
| Ingestion | TS provider ports plus Python worker orchestration for scheduled runs | UI fetches providers; one-off scripts | Reuses existing `AgronautasRuntimeDispatcher`, Redis queue, and Python worker; keeps UI non-orchestrating. |
| Scheduler/locks | Single cron endpoint/command ticks every 1 hour, then enqueues only due source/field/signal windows; Redis lock + Postgres `job_runs` status + idempotent repository upserts | Blind hourly provider fan-out; per-provider crons; no locks | Prevents duplicate scheduled jobs, respects real provider cadence/rate limits, and provides operational status. |
| Persistence | PostGIS fields/features, raw `signal_ingestion_runs`, normalized summaries, deterministic risk snapshots | Snapshot-only storage | Highest priority is correct real ingestion with auditable provenance. |
| PDF | Server-side PDF generated from persisted dashboard contract | Separate PDF calculations; browser print only | Avoids drift and includes evidence/degradation disclaimers. |
| Copilot | Ground answers only on latest persisted dashboard/evidence refs | Direct provider calls in chat | Prevents hallucinated state and aligns with provenance. |

## Data Flow

```text
Hourly cron tick ─→ API scheduler due-source planner ─→ Redis lock/job queue ─→ Python worker
       │                  │                    │                  │
       └ status API ← job_runs/summaries ← provider adapters ← real APIs/fixtures
                                      │
                         risk engine → risk_snapshots/alerts
                                      │
                  dashboard contract → web UI + server PDF + copilot context
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add Argentina/Corrientes field scope, multi-signal evidence, dashboard, scheduler, PDF contracts. |
| `packages/contracts/schemas/*agronautas*` | Modify | Regenerate TS/Python schemas; keep contract-first validation. |
| `apps/api/src/domain/entities/agronautas.ts` | Modify | Replace rice-only invariant with supported crop/category rules; add evidence/freshness value objects. |
| `apps/api/src/domain/repositories/agronautas.ts` | Modify | Add provider run, feature store, dashboard snapshot, scheduler, PDF ports. |
| `apps/api/src/infrastructure/adapters/agronautas-*.ts` | Modify/Create | Weather, satellite/vegetation, fire, hydric/soil adapters with fixture seams. |
| `apps/api/src/infrastructure/jobs/agronautas-signal-ingestion-job.ts` | Modify | Fan out signal jobs, normalize summaries, apply latest-good degradation. |
| `apps/api/src/infrastructure/database/postgres/agronautas-*.ts` | Modify/Create | PostGIS schemas/repositories for fields, evidence, summaries, risk, alerts, dashboard snapshots. |
| `apps/api/src/infrastructure/database/redis/agronautas-recompute-lock-repository.ts` | Modify | Extend lock keys to scheduled windows and signal groups. |
| `apps/api/src/presentation/routes/agronautas.ts` | Modify | Add scheduler/status/dashboard/PDF endpoints; remove rice-only messages in real mode. |
| `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` | Modify | Execute scheduled real ingestion and deterministic risk modules with schema validation. |
| `apps/web/src/components/agronautas/*` | Modify | Dashboard-first UI consumes contract; PDF action calls API. |
| `docs/runbooks/agronautas-production-hardening.md` | Modify | Provider credentials, cron, SLA, rollback, degradation playbook. |

## Interfaces / Contracts

Core contracts: `FieldIntakeV2 { cropCategory, crop, provinceCode, centroid, polygonWkt? }`; `SignalEvidence { evidenceId, provider, signalType, observedAt, sourceUrl, rawHash, confidence, degradationReasons[] }`; `SourceCadence { provider, signalType, updateCadence, rateLimit, freshnessSla, researchedAt, sourceRef }`; `DashboardSnapshot { field, status, freshness, signals[], risk, alerts, provenance, scheduler }`; `PdfReportRequest { fieldId, snapshotId }`; `SchedulerStatus { lastRunAt, nextRunAt, lockStatus, failures[], nextDueBySource[] }`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Contract | Crop scope, evidence, dashboard/PDF/job schemas | Failing-first Zod and JSON-schema TS/Python tests. |
| Unit | Risk modules, freshness math, degradation, adapters | Fixture providers; no network in unit tests. |
| Repository | Idempotent upserts, PostGIS fields, latest-good fallback | Existing `pg` fake/pool tests plus migration assertions. |
| Scheduler | Hourly base tick, per-source due selection from recorded cadence, Redis locks, duplicate prevention, DLQ | Deterministic clock and fake Redis/dispatcher. |
| API/UI/PDF | Dashboard contract, status, PDF provenance, no demo swap | Route tests, React tests, Playwright production smoke with persisted real-mode fixtures. |
| Fresh-context verification | Code/diff review beyond test/build output | A pessimistic/adversarial verify agent reviews the fresh diff and launch claims after implementation. |
| Worker | Python schema validation, provider failure, persisted snapshot | `pytest` with mocked HTTP/Postgres/Redis. |

## Migration / Rollout

Add additive tables/columns first, deploy contracts behind real-mode flags, run backfill for Corrientes seed fields, research/record source cadences, enable the 1-hour scheduler tick with per-source due planning, monitor run status/freshness, then expose dashboard/PDF. Rollback: disable cron/real providers and serve latest-good snapshots while keeping evidence tables intact.

## Open Questions

- [ ] Final provider list, credentials, rate limits, and cron host.
- [ ] Exact provider/source cadence, rate limits, and freshness SLA per signal before final scheduling.
