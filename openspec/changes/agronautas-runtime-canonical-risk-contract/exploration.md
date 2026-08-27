## Exploration: agronautas-runtime-canonical-risk-contract

### Current State

The approved roadmap makes this the first P0 runtime slice after the baseline: establish one engine-neutral risk/job boundary without choosing the risk engine, changing marketplace/management, or treating tests as production proof. The current baseline is `main` at `0e84707d0de8cc34ac5d14af0eddb4d902f01ced` (`feat: harden runtime and provider evidence`). The application code was not modified during this exploration.

Agronautas currently has two materially different risk implementations:

| Runtime | Current inputs and behavior | Current output semantics |
|---|---|---|
| TypeScript `risk-v0` in `apps/api/src/application/usecases/compute-field-risk-usecase.ts` | Uses latest climate (`temperatureC`, `rainfallMm7d`), satellite stress (`waterStressIndex`/inverse NDVI/EVI), and field context (`growthStage`, locality confidence). Drivers are weighted `0.35/0.30/0.25/0.10`; score is normalized to `0..100`; confidence is derived from source/context confidence and degradation. | `RiskSnapshotFoundation`, `risk-v0`, six-hour validity, source run IDs/acquisition times, drivers and degradation reasons. It is unit-tested but is not the dispatched worker path. |
| Python `open-meteo-basic-v1` in `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` | Reads field centroid from PostgreSQL, directly fetches a seven-day Open-Meteo forecast, sums precipitation, takes max/min temperature, then computes `min(100, min(60, rainfall) + heat penalty + cold penalty)`. It does not consume satellite or field context. | Snapshot uses `open-meteo-basic-v1`, fixed confidence `0.74`, 24-hour validity, `fresh` and no degradation reasons on success, plus direct Open-Meteo raw lineage. This is the current intended dispatch boundary, not proof that a worker is deployed or consuming. |

The existing `risk-engine-contract.v1` and `golden-vectors.json` honestly record both engines as divergent: canonical status is `{status: "undecided", engineId: null}`, both engines are `canonicalEligible: false`, and the two vectors differ in inputs, score, confidence, and validity. Those fixtures validate schema and divergence claims, but do not execute both formulas against a common runtime envelope.

The current shared boundary is split across several contracts. `packages/workflows/src/index.ts` creates risk-recompute and scheduled-window jobs with contract version `1.0.0`, stable `jobId`/`runId`, trace IDs, and a default lease of attempt `1` / max attempts `3`. The generic `workflow-job.schema.json` supports queue states (`pending`, `leased`, `running`, `waiting`, `succeeded`, `failed`, `dlq`, `cancelled`), while `workflow-state.schema.json` represents execution steps. `packages/zod-schemas/src/agronautas.ts` adds evidence envelopes, scheduler status, risk snapshots, runtime readiness, and scheduled-window validation. There is no single typed contract tying job admission, durable transition, result availability, risk lineage, and engine-selection status together.

The present operational path is partially connected:

1. `RequestRiskRecomputeUseCase` acquires a Redis field lock, writes a PostgreSQL `agronautas_job_runs` row as `queued`, and dispatches to `bull:agronautas-runtime:wait` through `RedisAgronautasRuntimeDispatcher`.
2. The shared factory includes lease metadata and `traceId`, `correlationId`, and `causationId`; the current Python consumer defaults to the same `agronautas-runtime` queue.
3. `WorkflowQueueConsumer` moves messages to `processing`, validates the generic workflow schema, records Redis status/heartbeat/results, and invokes `handle_agronautas_job` for risk recompute.
4. When a PostgreSQL DSN exists, `PostgresAgronautasJobStore` claims the row, writes a current heartbeat and lease, and persists completion, retry, or DLQ transitions. Without the DSN, the worker falls back to Redis-only claims, so durable job proof is absent.
5. Scheduled windows use Redis idempotency plus a `signal_ingestion_runs` queued row. The Python scheduled-window handler currently validates the window and returns `unavailable: scheduled_window_processor_not_configured`; it does not execute a provider or complete a durable Agronautas job run.

The main remaining runtime boundary issue is transition ownership. A handled provider failure in `handle_agronautas_job` may already call durable `schedule_retry` and return `retryable_failure`; the consumer converts that result to `RetryableAgronautasJobError`, which is not classified as retryable by `_handle_failure`, so the message can be DLQ'd immediately. The contract must make exactly one layer own retry scheduling and must require an ACK only after the durable outcome is recorded. Scheduled-window unavailable outcomes currently go to a Redis DLQ path without a corresponding `agronautas_job_runs` record.

Freshness and provider lineage are not uniform. The shared evidence envelope distinguishes observed, forecast, retrieval-only, provider mode, units, schema/HTTP status, latency, and last-good lineage. The TypeScript adapters use explicit Open-Meteo forecast semantics and gate commercial use unless approved. The Python direct fetch labels the first forecast date as `observed_at`, forces `fresh`, and does not visibly apply the TypeScript commercial-use gate. The TypeScript summary repository reads successful signal runs for latest risk input; stale/degraded fallback behavior is represented in the API ingestion seams but is not a common worker result contract.

Readiness is truthful but optional: `/ready` checks PostgreSQL and Redis, and only requires the PostgreSQL heartbeat/lease check when `AGRONAUTAS_RUNTIME_REQUIRED=true`; defaults are scheduler disabled and runtime worker not required. `runtimeInfoSchema` exposes scheduler disabled/unavailable/unverified states and currently requires worker `unavailable`. Telemetry is structured logger output (`golden.telemetry.v1`) for dispatch, locks, persisted job runs, queue transitions, heartbeats, results, DLQ, provider evidence, and signal runs, but it is not yet a complete cross-runtime event contract.

### Affected Areas

- `packages/contracts/schemas/workflow-job.schema.json` and `packages/contracts/schemas/workflow-state.schema.json` — generic job/state vocabulary exists but does not express Agronautas risk result, availability, engine decision, or transition ownership.
- `packages/contracts/schemas/risk-engine-contract.v1.schema.json` and `packages/contracts/risk-engine/golden-vectors.json` — current engine comparison is honest but only schema-level divergence evidence; it must remain non-canonical while gaining shared-envelope vectors.
- `packages/contracts/schemas/agronautas-runtime-recompute-job.schema.json` and `agronautas-scheduled-window-job.schema.json` — current payload subcontracts are minimal and separate from result/state/lineage.
- `packages/zod-schemas/src/agronautas.ts` and `packages/zod-schemas/src/agronautas.test.ts` — shared TypeScript runtime, risk, evidence, freshness, and scheduled-window schemas; strict cross-runtime tests belong here or in a dedicated contract module.
- `packages/workflows/src/index.ts` — single shared TypeScript job factory; it should be the only source for job identity, lease defaults, queue name, and trace fields.
- `apps/api/src/application/usecases/request-risk-recompute-usecase.ts` — API admission, idempotency lock, PostgreSQL queued record, and dispatch-failure boundary.
- `apps/api/src/application/usecases/compute-field-risk-usecase.ts` — testable `risk-v0` implementation that must remain available for legacy reads/comparison, not be declared canonical.
- `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts` — Redis transport, scheduled-window idempotency, queue transition telemetry, and dispatch failure behavior.
- `apps/api/src/infrastructure/jobs/agronautas-scheduler.ts` and `apps/api/src/infrastructure/database/redis/scheduler-lock.ts` — due-window calculation, lock ownership, and current `signal_ingestion_runs` scheduler trace.
- `apps/api/src/infrastructure/database/postgres/agronautas-job-run-repository.ts` and `agronautas-runtime-readiness-repository.ts` — PostgreSQL state authority, lease/heartbeat transitions, and worker readiness query.
- `apps/workflow-runtime-python/src/worker/queue/consumer.py` — Redis transport/ACK/requeue/DLQ behavior and the single-retry-owner decision.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` and `src/worker/main.py` — Python risk formula, direct Open-Meteo semantics, durable transitions, scheduled-window unavailable result, and actual queue-worker entrypoint.
- `apps/api/src/presentation/routes/health.ts` and `apps/api/src/infrastructure/observability/agronautas-telemetry.ts` — readiness states and structured operational events.
- `apps/api/prisma/schema.prisma` plus existing migrations — `agronautas_job_runs` already has job/run identity, attempts, lease owner/expiry, retry time, heartbeat, terminal errors, DLQ reason, and JSON result; `risk_snapshots` and `signal_ingestion_runs` already preserve additive lineage fields.
- `openspec/changes/archive/2026-08-04-agronautas-hardening-render-risk-engine/*` and `openspec/changes/archive/2026-08-23-agronautas-reality-hardening-provider-foundation/*` — archived foundation evidence, including prior queue/readiness limitations and current provider/runtime evidence boundaries.
- `apps/api/src/scripts/verify-agronautas-runtime-real.ts` and its tests — existing evidence taxonomy and verifier seam; it has no fresh Agronautas recompute Playwright flow.
- `management-foundation`, current workspace contracts, and marketplace changes — explicitly unaffected; no identity, management, marketplace, or Iberá behavior belongs in this slice.

### Approaches

1. **Declare Python/Open-Meteo canonical now** — repair the worker path and standardize `open-meteo-basic-v1` as the active engine.
   - Pros: follows the only engine ID currently dispatched by the API; removes ambiguity in the immediate execution path.
   - Cons: prematurely chooses an uncalibrated climate-only formula; requires migration of existing `risk-v0` snapshots; does not solve provider licensing, source semantics, or business ownership; violates the roadmap’s explicit undecided gate.
   - Effort: High

2. **Declare TypeScript `risk-v0` canonical now** — move its richer input model into the Python boundary or stop using Python for recompute.
   - Pros: retains context and satellite drivers already represented by API domain types; keeps calculation near current API persistence/alert boundaries.
   - Cons: still selects an uncalibrated rule set; cross-language parity and Python deployment remain unresolved; would make the current worker dispatch misleading; requires a larger migration and operational change.
   - Effort: High

3. **Add a transitional engine-neutral risk/job contract** — normalize job identity, state, lease, result availability, freshness, uncertainty, degradation, and lineage; execute neither engine as canonical; preserve both engine outputs for comparison.
   - Pros: smallest reversible slice; closes runtime and data-truth boundaries without a model decision; supports TypeScript/Python golden fixtures and later engine selection; aligns with the approved P0 roadmap.
   - Cons: duplicate formulas remain temporarily; a later accountable decision is still required; live topology remains externally gated.
   - Effort: Medium

### Recommendation

Use Approach 3. Define a new versioned Agronautas risk-runtime envelope while retaining `1.0.0` adapters for existing API/BFF/snapshot reads. The smallest buildable contract should contain:

- `contractVersion`, `jobId`, `runId`, `fieldId`, `operation` (`risk-recompute` or `scheduled-window`), `triggeredBy`, `requestedAt`, `trace` (`traceId`, `correlationId`, `causationId`), and `runtimeMode`.
- A lease object with `attempt`, `maxAttempts`, `leasedAt`, `leaseExpiresAt`, and worker ownership represented only by the durable state adapter, not by arbitrary payload mutation.
- A state vocabulary: `queued → leased → running → succeeded | waiting | failed | dlq | cancelled`; `waiting → leased` is the only retry loop; expired leases are reclaimable only by an atomic claim. `result` is data, not a queue state.
- A result with `status: available | degraded | unavailable`, optional risk payload, `freshness: fresh | degraded | stale | missing`, bounded `confidence` explicitly described as uncalibrated evidence confidence, `uncertainty: not_calibrated` (no invented probability), `degradationReasons`, and source/provider/run lineage. An unavailable result MUST omit score, level, drivers, and recommendation values.
- An engine descriptor `{ id, version, selectionStatus: "undecided" }` on any computed output. It records which implementation produced a value without claiming that implementation is canonical. `calibrationStatus: "not_established"` should be explicit until a separate approved decision.
- A provider/evidence reference containing provider mode, source run ID, retrieval/acquisition time, observation or forecast time semantics, units, HTTP/schema outcome, and freshness. Forecast dates must not be serialized as observed dates.
- An idempotency identity of `jobId` for the job record and `runId` for the business execution/window. Snapshot and signal writes remain upserts/replay-safe; alert IDs are included only when the alert transaction actually persisted them. Existing separate API alert generation remains outside the worker contract.

Compatibility should be additive. Accept current `workflow-job.v1` and risk snapshot `1.0.0` through read adapters; write the new envelope only behind a runtime capability flag; do not rewrite historical snapshots or relabel their engine/version. Reuse the existing PostgreSQL columns where possible, add only fields that cannot be represented safely, and map legacy `failed`/`completed` rows without claiming whether their worker transition was observed. Preserve the existing field lock, old snapshot reads, current BFF shapes, workspace/default-management behavior, and all Iberá tables/routes. Keep the scheduler disabled until the complete queue/worker/cron gate passes.

Cross-runtime fixtures should have two layers:

1. A shared job/state/result fixture set consumed by AJV (or the existing JSON validator), Zod, and Python `jsonschema`. It must prove canonical serialization, trace/lease identity, every legal transition, idempotent duplicate handling, and no values in unavailable states.
2. The existing engine-specific vectors, extended with deterministic fixed timestamps and evidence metadata. Both runtimes consume the same fixture manifest and emit the same envelope shape and lineage rules, while the inner scores remain engine-specific. Expected outputs must preserve the known `risk-v0` versus `open-meteo-basic-v1` differences and `parityClaim: false`; no tolerance or calibration claim should hide a material difference.

Freshness rules should be deterministic and source-driven: `fresh` only for a schema-valid result within the source SLA; `degraded` for a usable latest-good fallback, provider-mode seam, or incomplete optional inputs; `stale` only with explicit last-successful lineage; `missing`/`unavailable` when no usable value exists. Missing satellite/context must produce a degradation reason, not zero-valued evidence. The contract must distinguish provider unavailable, worker unavailable, scheduler disabled, processor not configured, stale latest-good data, invalid schema, missing field coordinates, license/credential blocked, retryable transport failure, exhausted failure, and engine selection undecided.

Queue boundaries should be explicit: Redis is transport and ephemeral result/telemetry support; PostgreSQL is durable job and snapshot authority. The worker (or one clearly designated transition coordinator) must own claim, heartbeat, completion, retry scheduling, and DLQ persistence exactly once. ACK follows durable transition. Retry only transient transport/provider failures, increments attempt once, records `retryAt`, and returns to `waiting`; non-retryable or exhausted failures become terminal `dlq`. Scheduled-window validation/unavailable must use the same job state record and must never be reported as provider success. No cron or provider is enabled by a planning log or queue length observation.

Observability should extend the existing telemetry names rather than introduce a second logger: every event carries `contractVersion`, `jobId`, `runId`, `fieldId` where applicable, `requestId`, `correlationId`, transition `from/to`, attempt/max attempts, worker ID/lease expiry, result status, provider mode, latency, and bounded reason. Add counters/timers for dispatch, claim, lease expiry/reclaim, retry, DLQ, result status, provider outcome, and freshness. Never log credentials, raw provider payloads, or raw chat. SLO thresholds and automatic actions remain business-owner decisions.

Strict TDD should start RED with shared JSON fixtures and transition matrices, then GREEN with the smallest adapter/factory changes, then REFACTOR after cross-runtime and fake Redis/PostgreSQL integration pass. Required tests include TypeScript and Python validation of identical fixtures; execution tests for both current formulas without parity claims; current dispatched-envelope validation including lease metadata; fake Redis/PostgreSQL claim/heartbeat/retry/DLQ/duplicate/restart cases; scheduled-window unavailable behavior; readiness truth when worker DSN/heartbeat is absent; legacy snapshot read compatibility; and provider freshness/forecast/license/error cases. A live E2E lane should be added later, not credited now: API admission → Redis wait/processing → Python worker → PostgreSQL job/signal/risk read-back → alert read-only projection, with a verified field, authorized credentials, Playwright snapshot/network/console evidence, and separate provider/cron/Render evidence.

### Risks

- The historical foundation reports identified queue/entrypoint and durable-transition gaps; current code has improved queue defaults and lease metadata, but no fresh end-to-end worker transition has been observed in this exploration.
- The current retryable-result path can schedule a durable retry and then be converted by the consumer into an immediate DLQ; a single transition owner and regression test are required before enabling retries.
- Scheduled windows currently terminate as `unavailable` because no provider processor is configured; enabling the scheduler would create false operational expectations.
- Python direct Open-Meteo execution does not share the TypeScript adapter’s explicit commercial-use gate and currently conflates forecast date with observed time; provider policy and timestamp normalization must remain gates.
- `runtimeRequired` defaults false, so `/ready` can be healthy while no worker is available; readiness must not be interpreted as queue completion or production readiness.
- Existing `risk-engine-contract.v1` fixtures record divergence but do not prove formula execution parity; a shared envelope must not turn comparison fixtures into a canonical-engine claim.
- Existing PostgreSQL status columns are broad strings and legacy snapshots have different validity/freshness semantics; migration adapters must preserve meaning and avoid rewriting history.
- Archived real evidence is bounded and stale relative to a new run: Georef/Open-Meteo live HTTP evidence exists, NASA POWER returned a documented missing sentinel, but worker/queue/cron/Render/authenticated real-field proof remains unavailable or blocked.
- Provider access is not provider qualification: coverage, commercial use, units, freshness SLO, agronomic validation, and liability remain separate gates.
- Marketplace, management/default workspace, and Iberá-Alerta are outside this slice; accidental reuse of their state or evidence would create a false tenancy or product-boundary claim.

### Ready for Proposal

Yes. The proposal should be Agronautas-only and contract/runtime-focused: preserve both engines with canonical selection `undecided`, introduce additive cross-runtime job/result/state contracts and compatibility adapters, fix transition ownership before enabling retries or scheduled work, and keep scheduler/worker/provider/cron/Render/authenticated-field acceptance explicitly gated. The next phase should turn the recommended envelope, transition matrix, migration mapping, fixture matrix, and RED-GREEN-REFACTOR test plan into a scoped proposal without modifying application code.
