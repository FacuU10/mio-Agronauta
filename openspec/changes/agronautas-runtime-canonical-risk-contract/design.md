# Design: Agronautas Canonical Risk/Job Runtime Contract

## Technical Approach

Add a `2.0.0` Agronautas runtime envelope beside the existing `workflow-job.v1` and `RiskSnapshot` contracts. JSON Schema is the cross-runtime source; Zod derives TypeScript validation/types, while Python loads the same files with `jsonschema`. API admission/factory, Redis dispatch, the Python consumer, and PostgreSQL adapters translate through this envelope. Both `risk-v0` and `open-meteo-basic-v1` remain callable and comparable; every output carries `selectionStatus: undecided` and makes no parity, calibration, or canonical-engine claim.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Versioned envelope plus legacy read adapters | Two formats during migration | Choose; additive and reversible |
| PostgreSQL state/result authority; Redis transport/cache | Durable writes are slower; Redis remains operationally useful | Choose; Redis cannot prove completion |
| One worker transition coordinator | Removes current handler/consumer double-retry path | Choose; handler returns outcome, coordinator owns transitions and ACK gate |
| Preserve both formulas | Temporary divergence | Choose; engine selection stays undecided |

## Data Flow

`RequestRiskRecomputeUseCase` → durable `queued` row → Redis `wait` → consumer claim/lease → engine adapter → transactional snapshot/result write → durable terminal or `waiting` transition → Redis result/telemetry → ACK.

PostgreSQL owns job identity, leases, attempts, transitions, result payload, snapshot and signal lineage. Redis owns queue lists, ephemeral status/heartbeat projections, idempotency hints, and DLQ transport; Redis-only execution is explicitly non-durable. Claim/reclaim uses one atomic conditional update; `jobId` identifies the durable job and `runId` the business execution/window.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/contracts/schemas/agronautas-runtime.v2.schema.json` | Create | Envelope, result, lineage, availability, freshness, engine and transition vocabulary. |
| `packages/contracts/fixtures/agronautas/runtime-contract.v2.json` | Create | Valid/invalid jobs, outcomes, transitions, duplicates and unavailable cases shared by AJV and Python. |
| `packages/zod-schemas/src/agronautas-runtime.ts` | Create | Zod schemas, const-backed enums, types and pure transition/availability guards. |
| `packages/workflows/src/index.ts` | Modify | Make the v2 factory the sole source of IDs, trace, lease and queue defaults. |
| `apps/api/src/application/usecases/request-risk-recompute-usecase.ts` | Modify | Feature-flagged v2 admission while preserving lock and BFF response. |
| `apps/api/src/infrastructure/database/postgres/agronautas-job-run-repository.ts`, `apps/api/prisma/schema.prisma` | Modify | Atomic claim, ownership-checked heartbeat/transition, and only additive unmappable columns. |
| `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts`, `apps/workflow-runtime-python/src/worker/queue/consumer.py`, `.../runtime/agronautas_jobs.py` | Modify | Normalize outcomes; worker coordinator persists once, then ACKs/requeues/DLQs. |
| `apps/api/src/infrastructure/database/postgres/agronautas-runtime-readiness-repository.ts`, `.../observability/agronautas-telemetry.ts` | Modify | Durable readiness evidence and bounded v2 event attributes/counters. |
| `apps/workflow-runtime-python/tests/`, `packages/contracts/tests/`, `packages/zod-schemas/src/agronautas.test.ts` | Modify | RED-GREEN-REFACTOR contract and runtime-boundary coverage. |

## Interfaces / Contracts

```ts
const RUNTIME_STATE = { QUEUED:'queued', LEASED:'leased', RUNNING:'running', WAITING:'waiting', SUCCEEDED:'succeeded', FAILED:'failed', DLQ:'dlq', CANCELLED:'cancelled' } as const
const AVAILABILITY = { AVAILABLE:'available', DEGRADED:'degraded', UNAVAILABLE:'unavailable' } as const
const FRESHNESS = { FRESH:'fresh', DEGRADED:'degraded', STALE:'stale', MISSING:'missing' } as const
type RuntimeState = (typeof RUNTIME_STATE)[keyof typeof RUNTIME_STATE]
type Availability = (typeof AVAILABILITY)[keyof typeof AVAILABILITY]
type Freshness = (typeof FRESHNESS)[keyof typeof FRESHNESS]
interface EngineDescriptor { id: string; version: string; selectionStatus: 'undecided'; calibrationStatus: 'not_established' }
interface ProviderLineage { sourceRunIds: string[]; providerRunIds: string[]; retrievedAt: string; observedAt?: string; forecastAt?: string; providerMode: string; units: Record<string, string>; httpStatus?: number; schemaStatus: string; lastSuccessfulObservedAt?: string }
interface RiskPayload { score: number; level: string; drivers: unknown[] }
interface RiskRuntimeResult { status: Availability; freshness: Freshness; confidence?: number; uncertainty: 'not_calibrated'; degradationReasons: string[]; lineage: ProviderLineage; engine?: EngineDescriptor; risk?: RiskPayload }
```

`unavailable` results MUST omit `risk` (score, level, drivers, recommendations). `ProviderLineage` distinguishes `observedAt`, `forecastAt`, `retrievedAt`, provider mode, source/provider run IDs, units, HTTP/schema status, and last-good lineage; forecast dates can never populate `observedAt`. Legal transitions are `queued→leased→running→succeeded|failed|waiting|dlq|cancelled` and `waiting→leased`; expired leases are reclaimable atomically only. Retry increments once, records `retryAt`, and only transient failures retry.

Legacy adapters read `workflow-job.v1` and snapshot `1.0.0`, mapping `completed`/`failed` conservatively without asserting observed transition ownership. New writes are flag-gated; history is neither rewritten nor relabeled.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Schema, transitions, unavailable invariants, freshness/forecast semantics, both engines | RED fixtures first; TypeScript/Zod, AJV, and Python `jsonschema` consume identical bytes. |
| Integration | Fake Redis/Postgres claim, heartbeat, reclaim, duplicate, restart, retry, DLQ, scheduled-window unavailable, readiness and telemetry | Assert exactly one durable outcome before ACK and no Redis-only proof. |
| E2E/runtime | Authorized API→Redis→worker→Postgres read-back, recovery and cron evidence | Separate real runtime evidence; require provider/worker/Redis/Postgres/Render/credentials and a verified field. Tests, queue length, or fixtures never set production readiness. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and RED test |
|---|---|---|
| Documentation-like paths | N/A — no executable-file classification | No task/test. |
| Git repository selection | N/A — no VCS automation | No task/test. |
| Commit state | N/A — no commit automation | No task/test. |
| Push state | N/A — no push automation | No task/test. |
| PR commands | N/A — no PR automation | No task/test. |

## Migration / Rollout

Enable v2 reads, then writes, behind the runtime capability flag; keep scheduler disabled until durable worker topology is proven. Rollback disables the flag and scheduler, stops new writes, retains adapters and records, and never deletes jobs, snapshots, or lineage. No ownership, management, marketplace, provider qualification, or Iberá-Alerta changes are included.

## Open Questions

- [ ] Risk owner, freshness/retry SLOs, agronomist review, automatic-task policy, liability wording, and provider licensing semantics remain business gates; none changes this additive contract.
