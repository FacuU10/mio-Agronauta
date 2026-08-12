# Exploration: Agronautas Render and Risk-Engine Hardening

**Change:** `agronautas-hardening-render-risk-engine`  
**Project:** `monorepo-js-baseline`  
**Canonical branch:** `continuation/agronautas-ibera-unified-2026-08-04`  
**Observed HEAD:** `0be9ba8049dbc6aba01b1900f2c52794f087574d` (`feat(render): add canonical native node baseline`)  
**Scope:** read-only investigation; no application code was modified.

## Current State

The canonical worktree was clean at the observed HEAD. Agronautas and Iberá-Alerta remain separate products: Agronautas owns field intake, risk snapshots, recompute, alerts, and field evidence; Iberá-Alerta owns municipality hydrology, official alert ingestion, and its related coverage tables. They share API, PostgreSQL/PostGIS, Redis, contracts, and operational infrastructure, but the municipality alert seed is not proof of Agronautas field-risk coverage.

### Risk engines

| Engine | Inputs and formula | Outputs and version | Callers / classification |
|---|---|---|---|
| TypeScript `risk-v0` (`apps/api/src/application/usecases/compute-field-risk-usecase.ts`) | Latest climate (`temperatureC`, `rainfallMm7d`), satellite (`waterStressIndex` or inverse NDVI/EVI), and field context (`growthStage`, locality confidence). Drivers are heat `(temp-24)/12`, rainfall `rain/140`, vegetation stress, and stage sensitivity, weighted `0.35/0.30/0.25/0.10`; weighted value is converted to `0..100`. Confidence averages source/context confidence and subtracts `0.08` per degradation reason, floored at `0.2`. | `RiskSnapshotFoundation`, `risk-v0`, six-hour validity, evidence refs, degradation reasons, and derived `fresh/degraded/stale` freshness. | Only unit tests reference `ComputeFieldRiskUseCase`; no production construction/caller was found. **Partial**: implemented and tested as a pure API path, but not the dispatched recompute path and not parity-compatible with Python. |
| Python `open-meteo-basic-v1` (`apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`) | Reads field centroid from PostgreSQL, fetches Open-Meteo daily seven-day forecast, sums precipitation, takes max/min temperature, then computes `min(100, min(60,rainfall)+heat penalty+ cold penalty)`. It does not consume satellite or field context and fixes confidence at `0.74`. | Snapshot with `open-meteo-basic-v1`, 24-hour validity, `fresh`, empty degradation reasons, normalized weather summary, raw provider evidence, and an Open-Meteo run reference. | The API recompute dispatcher targets this workflow ID. **Partial**: it is the only currently dispatched implementation and has mocked pytest coverage, but its formula, inputs, freshness semantics, and lineage differ from TypeScript. |

Both engines use contract version `1.0.0`, but that is the envelope version, not algorithm parity. The API dispatcher duplicates the job factory instead of importing `packages/workflows/src/index.ts`. No cross-runtime golden vectors, canonical-engine declaration, or retirement rule was found. The current code therefore cannot safely claim that a risk score means the same thing regardless of runtime.

### Recompute, queue, jobs, and persistence

The API route `POST /agronautas/fields/:fieldId/recompute` creates a Redis field lock with a 120-second TTL, generates `runId`, `agro-job-*` `jobId`, request/correlation IDs, persists a PostgreSQL `agronautas_job_runs` row as `queued`, and pushes a serialized job to `bull:agronautas-runtime:wait`. The job contract is checked by the Python handler.

The operational chain is incomplete:

- `WorkflowQueueConsumer()` defaults to `workflow-jobs`, so it consumes `bull:workflow-jobs:wait`, while the API publishes to `bull:agronautas-runtime:wait`. No caller passes the Agronautas queue name.
- The configured Python entrypoints (`workflow-runtime = worker.main:main` and `python -m worker.main`) execute the example graph in `worker/main.py`; they do not start `WorkflowQueueConsumer.consume_forever()`.
- The Render manifest contains only two Native Node web services and no Python worker service. It declares no Docker runtime, and this exploration did not invoke Docker.
- The API job repository exposes `markRunning`, `markHeartbeat`, `markCompleted`, and `markFailed`, but only the dispatch-failure path calls `markFailed`. The Python worker writes status, heartbeat, result, and DLQ data to Redis hashes instead of updating `agronautas_job_runs`.
- The worker writes `payload.requestedAt` as its heartbeat rather than a current worker timestamp. API readiness reads PostgreSQL `heartbeat_at`, not the Redis heartbeat hash.
- The dispatched job has no `lease`, `attempt`, or `maxAttempts`. The Agronautas handler defaults `max_attempts` to `1`, so a handled provider error is immediately classified as `dlq`; because the handler catches the error and returns a result, the consumer's exception retry wrapper does not requeue it. The direct unit tests cover explicit top-level retry fields, not the actual dispatched envelope.

**Queue/job classification:** IDs, schema shape, lock behavior, and dispatch-failure persistence are **partial**. Worker consumption, durable state transitions, heartbeat, and production retry/DLQ semantics are **unsafe to claim**. The end-to-end recompute flow is **missing** as an operationally connected path, despite individual units existing.

### Render and runtime boundary

`render.yaml` now declares exactly `agronautas-api` and `agronautas-web`, both `type: web` with `runtime: node`, current pnpm build/start commands, `PORT` declarations, named secret references with `sync: false`, and both in-process schedulers disabled. The API resolves `PORT > API_PORT > 3001`; the web BFF uses `AGRONAUTAS_API_INTERNAL_URL` in production. This is a static Native Node baseline and is **implemented** by current tests; it is not deployment or runtime evidence.

The Python project is a separate Python 3.12 package with Redis/PostgreSQL settings and pytest coverage, but it has no Render declaration or verified process boundary in the current manifest. Treat “Python worker is available on Render” as **missing**, not as a consequence of the Node baseline.

### Readiness, heartbeats, snapshots, alerts, and provenance

- `/health` is a dependency-free liveness route and `/ready` checks PostgreSQL and Redis with bounded timeouts. Worker readiness is conditional on `AGRONAUTAS_RUNTIME_REQUIRED`, which defaults to `false`; when enabled, it queries the latest PostgreSQL job heartbeat and lease. The route and its tests are **implemented** as API behavior, but actual Python-worker heartbeat integration is **missing/unsafe to claim**.
- TypeScript snapshots persist score, confidence, validity, rule version, drivers, degradation reasons, and evidence refs. Alert snapshots are deterministically upserted by `(field_id, risk_snapshot_id, alert_type)` and stale snapshots do not generate new alerts. These repository/use-case contracts are **implemented** in isolation.
- The Python worker persists signal ingestion and risk snapshots, including raw weather payload evidence, but always writes `fresh` with no degradation reasons on success. The TypeScript summary repository reads only `status = 'succeeded'`, so degraded ingestion fallback records are not candidates for the latest risk inputs. TypeScript provenance is also reduced to `signal_ingestion_runs:{provider}:{signalType}` and drops the concrete run ID. Overall freshness/provenance across runtimes is **partial** and unsafe as a unified claim.
- Recompute persistence does not automatically generate alert snapshots in the Python worker. Alerts are generated separately when `/alerts/current` invokes the API `GenerateAlertsUseCase`; therefore field -> source -> job -> snapshot -> alert is not one connected worker transaction. This is **partial**.

### Corrientes and forced rice paths

Real field intake validates a Corrientes province/crop contract and performs PostGIS coverage lookup, but `CreateFieldIntakeUseCase` deliberately persists `crop: 'rice'` regardless of the submitted crop. Demo seeding also explicitly creates rice fields. The domain entity and contracts still accept non-rice crops, and tests prove a `maize` `Field` can exist; the route test for demo maize does not prove that real persistence preserves maize. Rice forcing is therefore **implemented for the current MVP path**, but generic crop preservation is **unsafe to claim** and the contract/model boundary is inconsistent.

The bootstrap boundary is a placeholder rectangle (`corrientes-rice-zone-v1`) with a Mercedes locality polygon. The five direct demo localities include Mercedes, Curuzú Cuatiá, Paso de los Libres, Santo Tomé, and Ituzaingó, but the demo seed bypasses `resolveCoverage`; the SQL boundary/locality data does not establish all five as covered real intake localities. The municipality alert seed covers 17 municipality IDs for SMN/INMET and belongs to shared/Iberá alert infrastructure, not Agronautas parcel coverage. Corrientes locality coverage is **partial**, and any claim of province-wide or five-locality real coverage is **unsafe to claim**.

### Requested-hardening classification

| Hardening item | Classification | Evidence / reason |
|---|---|---|
| Compare and reconcile `risk-v0` vs `open-meteo-basic-v1` | **Partial** | Both formulas and versions exist and are unit-tested, but they accept different inputs and produce materially different semantics. |
| One canonical, versioned risk engine and parity vectors | **Missing** | No shared algorithm contract, golden vectors, canonical-runtime declaration, or deprecation path. |
| Queue/job IDs and contract envelope | **Partial** | IDs, trace fields, contract `1.0.0`, Redis lock, and JSON Schema exist; the API duplicates the shared factory and queue names disagree. |
| Durable job states and retries | **Unsafe to claim** | Postgres transition methods are not called by the worker; actual dispatched jobs lack retry metadata and worker entrypoint/queue wiring is disconnected. |
| Render Native Node baseline | **Implemented (static only)** | Current manifest/tests establish two Node web services and no Python/Docker service; no deployment result is implied. |
| Python worker Render boundary | **Missing** | No Python worker service or verified process command exists in `render.yaml`. |
| Heartbeat/readiness truth | **Partial; runtime claim unsafe** | API route/tests exist, but the worker heartbeat is Redis/request-time only and readiness reads Postgres. |
| Alert snapshots, freshness, and provenance | **Partial** | API persistence/upsert and freshness rules exist; Python success is always fresh, degraded fallback is not read by TS, and lineage loses run IDs. |
| Forced rice cultivation path | **Implemented for MVP, unsafe as generic crop support** | Intake and demo seed force rice while schemas/domain tests allow non-rice. |
| Corrientes locality coverage | **Partial; broad coverage unsafe to claim** | Placeholder rectangle + Mercedes DB locality; five demo points bypass coverage; municipality alert coverage is a separate product concern. |
| Field -> source -> job -> persistence -> freshness -> retry/error | **Missing as an end-to-end verified flow** | Individual seams pass tests, but Render has no worker, queue/entrypoint mismatch exists, job state is not durable, and no live runtime evidence was observed. |

### Evidence boundary

Current focused evidence gathered without providers, external database, deployment, or Docker:

- API focused Node tests: **27/27 passed** for risk computation, recompute request, readiness, repositories, field coverage seams, and demo seed helpers.
- Python focused pytest: **16/16 passed** for Agronautas worker handling, queue retry helpers, and shared contract tests.
- Contract tests/schema validators: **4/4 tests passed; 7 JSON Schemas validated; Agronautas schema validated**.
- These are unit/contract tests with fakes or monkeypatches where applicable; they do not prove a real Redis/PostgreSQL worker loop, provider response, Render process, or current production state.
- Committed historical receipts `artifacts/agronautas-slice2-verify-receipt.json` and `artifacts/agronautas-slice3-verify-receipt.json` report PostgreSQL/Redis connectivity on 2026-07-18, but they are historical evidence and do not establish current runtime truth for this change.

## Affected Areas

- `apps/api/src/application/usecases/compute-field-risk-usecase.ts` — TypeScript `risk-v0` formula, confidence, evidence, lock, and six-hour snapshot validity.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` — Python Open-Meteo formula, direct field/provider access, persistence, Redis status/heartbeat/result/DLQ writes.
- `apps/api/src/application/usecases/request-risk-recompute-usecase.ts` — API IDs, lock, queued Postgres record, dispatch, and dispatch-failure path.
- `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts` — Agronautas Redis queue name and duplicated job envelope.
- `apps/workflow-runtime-python/src/worker/queue/consumer.py` — default queue, processing queue, retry, and dead-letter behavior.
- `apps/workflow-runtime-python/src/worker/main.py`, `apps/workflow-runtime-python/pyproject.toml` — actual Python process entrypoint versus queue consumer boundary.
- `apps/api/src/domain/repositories/agronautas.ts`, `apps/api/src/infrastructure/database/postgres/agronautas-job-run-repository.ts` — job status/heartbeat contract and Postgres persistence adapter.
- `apps/api/src/presentation/routes/health.ts`, `apps/api/src/infrastructure/database/postgres/agronautas-runtime-readiness-repository.ts`, `apps/api/src/infrastructure/config/agronautas-runtime.ts` — liveness/readiness and optional worker requirement.
- `apps/api/src/domain/entities/agronautas.ts`, `apps/api/src/infrastructure/database/postgres/agronautas-risk-snapshot-repository.ts`, `apps/api/src/infrastructure/database/postgres/agronautas-alert-snapshot-repository.ts`, `apps/api/src/application/usecases/generate-alerts-usecase.ts` — snapshots, freshness, alert lineage, and upserts.
- `apps/api/src/infrastructure/database/postgres/agronautas-signal-summary-repository.ts`, `apps/api/src/infrastructure/database/postgres/agronautas-signal-ingestion-repository.ts` — latest-good selection, ingestion status, freshness, and provenance.
- `packages/workflows/src/index.ts`, `packages/contracts/schemas/workflow-job.schema.json`, `packages/contracts/schemas/agronautas-runtime-recompute-job.schema.json` — shared workflow constants, job shape, and runtime schema.
- `apps/api/src/application/usecases/create-field-intake-usecase.ts`, `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.ts`, `infra/bootstrap/agronautas/001-postgis-schema.sql`, `infra/bootstrap/agronautas/002-corrientes-seeds.sql` — forced rice, PostGIS coverage, placeholder boundary, and seed data.
- `apps/api/src/scripts/seed-corrientes-rice-demo.ts`, `apps/api/src/scripts/corrientes-demo-localities.ts` — direct five-locality demo seeding and offline/live Open-Meteo fixtures.
- `apps/api/src/infrastructure/database/postgres/seed-municipality-alert-coverage.ts` — shared/Iberá municipality alert mapping; not Agronautas field coverage.
- `render.yaml`, `apps/api/src/server.ts`, `apps/api/src/build-config.test.ts` — current Native Node Render manifest, port precedence, commands, and static assertions.

## Approaches

1. **Make the current Python worker path operationally canonical** — Repair queue/entrypoint selection, durable job state/heartbeat, retry metadata, and then define `open-meteo-basic-v1` as the explicit operational algorithm while adding the missing context/satellite decision to a later version.
   - Pros: follows the only recompute path currently dispatched by the API; minimizes a second execution path; aligns implementation and runtime ownership.
   - Cons: requires correcting the worker's overly optimistic freshness and climate-only semantics; still needs a deliberate migration for existing `risk-v0` snapshots.
   - Effort: High

2. **Make TypeScript `risk-v0` canonical and reduce Python to an adapter** — Move/duplicate the full input contract into the worker boundary and ensure Python invokes equivalent rules or stop dispatching Python for risk computation.
   - Pros: preserves the richer climate/satellite/context model and existing API domain types; one explicit source of business rules can serve API and worker.
   - Cons: the current Render baseline has no Python service; cross-language execution and deployment remain unresolved; existing Python snapshots need versioned migration/handling.
   - Effort: High

3. **Transitional contract-first parity slice** — First harden the shared job/state/freshness/provenance contract and add cross-runtime golden vectors; keep the Python path as the only active dispatcher, mark TypeScript `risk-v0` test-only, and choose/implement the canonical algorithm in the next proposal/design.
   - Pros: exposes operational blockers without silently declaring either formula equivalent; enables safe comparison and rollback; keeps Agronautas separate from Iberá-Alerta.
   - Cons: does not immediately eliminate duplicate formulas; requires explicit temporary status/version rules.
   - Effort: Medium

## Recommendation

Use Approach 3 for the proposal, with a hard gate that no risk value is called canonical until a versioned contract and golden vectors reconcile the two formulas. Treat the Python implementation as the current intended execution boundary only because the API dispatches its workflow ID; do not treat that as proof of a working worker. The first implementation slice should close queue/entrypoint mismatch, durable job transitions, actual heartbeat/readiness linkage, retry/DLQ envelope semantics, and concrete provenance/freshness rules before changing the algorithm. Then select one engine or introduce a clearly versioned replacement and retire the other path explicitly. Keep Render as Native Node API/web only unless a separate, approved Python worker deployment contract is created.

## Risks

- The API publishes to `bull:agronautas-runtime:wait`, while the default Python consumer listens to `bull:workflow-jobs:wait`; this can make recompute appear enqueued without consumption.
- The Python package entrypoint runs an example job rather than the queue consumer, so a worker process claim would be false without a separate process command.
- The worker does not update PostgreSQL job rows; enabling `AGRONAUTAS_RUNTIME_REQUIRED=true` can report no healthy worker even when Redis contains worker data.
- The dispatched envelope lacks retry metadata, and handled Python errors can go straight to DLQ while the consumer acknowledges the returned result.
- The two algorithms have incompatible inputs, weights, score units, confidence, validity, and freshness semantics; score comparisons are not meaningful without a migration/contract decision.
- The TypeScript latest-summary query excludes degraded runs and strips concrete ingestion run IDs from provenance.
- `risk_snapshots` may be persisted by the Python path without corresponding API job completion or alert generation.
- The Corrientes boundary and locality seed are placeholders/narrow; direct demo seeding bypasses coverage, so demos must not be used as broad real locality evidence.
- Static Render tests and mocked tests cannot prove deployment, provider availability, external database/Redis state, or production behavior.

## Ready for Proposal

Yes, conditionally. The proposal should scope this as an Agronautas-only hardening change, preserve Iberá-Alerta as a separate consumer of shared infrastructure, explicitly separate static/unit evidence from live runtime evidence, and make queue/worker boundary plus risk-engine canonicalization blocking requirements rather than claiming the current end-to-end recompute is production-ready.
