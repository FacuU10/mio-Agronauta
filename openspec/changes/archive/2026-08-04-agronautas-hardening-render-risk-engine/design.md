# Design: Agronautas Render and Risk-Engine Hardening

## Technical Approach

Implement a contract-first, additive slice. JSON Schema and the shared workflow factory own the job envelope; API and Python use `bull:agronautas-runtime` and an explicit consumer entrypoint. PostgreSQL owns job state, lease, heartbeat, retry, and DLQ metadata. Risk engines remain non-canonical until versioned vectors establish their boundary. Intake preserves submitted crops and persisted Corrientes coverage. Iberá-Alerta is untouched.

## Architecture Decisions

| Decision | Choice | Alternatives / rationale |
|---|---|---|
| Job contract | Extend the shared factory/schema with lease, attempt, and lineage fields; Python validates the same JSON Schema. | Avoid duplicated factories and TypeScript imports from Python; schema is the cross-runtime authority. |
| Runtime ownership | Python remains the intended consumer; `worker.main`/package entrypoint starts it. Render remains two Node services. | No Python Render service or Docker runtime; production worker hosting is separate. |
| Durable execution | Add atomic claim, heartbeat, completion, retry, and DLQ ports backed by PostgreSQL. | Redis is transport/result cache, never readiness or state authority. |
| Risk semantics | Version both engines and publish separate golden vectors with explicit divergence. | Do not choose/retire an engine or rewrite historical scores here. |

## Data Flow

```text
POST recompute -> API lock + PostgreSQL queued row -> shared job factory
      -> bull:agronautas-runtime -> Python claim/lease
      -> PostgreSQL running + heartbeat -> provider/field reads -> snapshot
      -> PostgreSQL completed result + lineage -> API alert generation/upsert
      -> readiness reads current PostgreSQL heartbeat/lease
```

The worker acknowledges Redis only after durable completion or retry/DLQ classification. Retryable failures requeue with an incremented attempt; exhausted/non-retryable failures become terminal `dlq` records. Delivery is idempotent by `jobId`/`runId`.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/workflows/src/index.ts` | Modify | Shared queue/job, lease, status, and lineage contracts. |
| `packages/contracts/schemas/{workflow-job,agronautas-runtime-recompute-job,risk-engine-contract.v1}.schema.json`, `packages/contracts/risk-engine/golden-vectors.json` | Modify/Create | Envelope/engine schemas and non-parity golden vectors. |
| `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts` | Modify | Shared factory and queue constant. |
| `apps/workflow-runtime-python/src/worker/{main.py,queue/consumer.py,runtime/agronautas_jobs.py}` | Modify | Entrypoint, claim/heartbeat, durable transitions, retry/DLQ, lineage. |
| `apps/api/src/{domain/repositories/agronautas.ts,infrastructure/database/postgres/agronautas-job-run-repository.ts,application/usecases/request-risk-recompute-usecase.ts}` | Modify | Lease-aware ports and guarded transitions. |
| `apps/api/src/infrastructure/database/postgres/agronautas-runtime-readiness-repository.ts` | Modify | Active-job heartbeat/lease truth. |
| `apps/api/src/application/usecases/create-field-intake-usecase.ts` | Modify | Persist `input.crop`; retain coverage evidence. |
| `apps/api/prisma/migrations/<timestamp>_agronautas_runtime_hardening/migration.sql` | Create | Add missing operational/lineage columns and indexes additively. |
| `render.yaml` | Verify/test only | Preserve exactly the two Native Node services; add no worker. |

## Interfaces / Contracts

```typescript
const JOB_STATUS = { QUEUED: 'queued', LEASED: 'leased', RUNNING: 'running', WAITING: 'waiting', COMPLETED: 'completed', FAILED: 'failed', DLQ: 'dlq' } as const
type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS]

interface Lease { attempt: number; maxAttempts: number; leasedAt: string; leaseExpiresAt: string }
const SNAPSHOT_FRESHNESS = { FRESH: 'fresh', DEGRADED: 'degraded', STALE: 'stale' } as const
type SnapshotFreshness = (typeof SNAPSHOT_FRESHNESS)[keyof typeof SNAPSHOT_FRESHNESS]
interface RiskLineage { snapshotId: string; sourceRunIds: string[]; freshness: SnapshotFreshness; engineId: string; engineVersion: string; alertSnapshotIds: string[] }
```

Guard transitions by `job_id`, expected status, and lease ownership. Keep `risk_snapshots.rule_version` as historical truth and add explicit engine identity to new results. Do not rewrite forced-rice rows; mark provenance legacy/unknown if a column is added, while new rows use the submitted value.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/RED | Factory/schema, state guards, leases, retry/DLQ, crop, coverage, vectors | Node tests and pytest; RED precedes implementation. |
| Integration | API → Redis → Python → PostgreSQL transitions, readiness, lineage | Local configured services and bounded provider request; separate mocked evidence. |
| E2E | Recompute response and Agronautas UI status/lineage | Playwright local API/web; no Iberá assertions. |
| Production | Render manifest and Node health/readiness | Record API/web evidence only; no worker claim without its own boundary. |

## Observability

Emit structured transition events with `jobId`, `runId`, `fieldId`, attempt, lease age, engine version, freshness, and error code. Track queue depth, heartbeat age, retries, DLQ, and vector divergence; never log provider secrets or raw payloads.

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable documentation classification | None | None |
| Git repository selection | N/A — no VCS automation | None | None |
| Commit state | N/A — no commit automation | None | None |
| Push state | N/A — no push automation | None | None |
| PR commands | N/A — no PR automation | None | None |

## Migration / Rollout

Deploy additive SQL first; backfill null operational fields (`attempt = 1`, bounded `max_attempts`) only. Never rewrite scores or infer historical crops. Activate behind a flag, observe queue depth, transition failures, lease expiry, retries, DLQ, and engine divergence, then remove the flag after local real-service evidence. Roll back by disabling activation and retaining additive data.

## Open Questions

- [ ] Which engine, if any, becomes canonical after vector review is a later change, not a blocker for this contract slice.
- [ ] Where the Python worker runs in production remains an explicit deployment approval; Render must not imply it.
