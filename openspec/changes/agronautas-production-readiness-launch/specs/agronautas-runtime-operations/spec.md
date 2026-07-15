# agronautas-runtime-operations Specification

## Purpose

Define operational runtime behavior for the API, worker, queue, schedulers, readiness, idempotency, and capacity boundaries.

## Requirements

### Requirement: Worker queue consumer is the production entrypoint

The production worker container MUST consume queued recompute jobs continuously and expose/persist heartbeat state. Example workflow/demo commands MUST NOT be the production queue entrypoint.

#### Scenario: Worker consumes a queued job
- GIVEN Redis and DB are available and a recompute job is queued
- WHEN the worker container starts
- THEN it MUST consume the job, persist running/completed status, and update heartbeat
- AND `/ready` MUST report runtime healthy.

#### Scenario: Worker is absent or stale
- GIVEN runtime is required and no heartbeat is recent
- WHEN `/ready` is requested
- THEN readiness MUST fail closed
- AND recompute launch proof MUST be blocked.

### Requirement: Recompute is idempotent and traceable

Every recompute request MUST have a traceable job/run id, field id, input summary, enqueue timestamp, status transitions, error details safe for clients, and idempotency behavior that prevents duplicate work for the same active request.

#### Scenario: Duplicate recompute request arrives
- GIVEN an active recompute exists for the same idempotency key or field/window
- WHEN another request is made
- THEN the API MUST return the existing job/run reference or a safe conflict response
- AND it MUST NOT enqueue duplicate provider/worker work.

#### Scenario: Worker fails a job
- GIVEN a worker error occurs
- WHEN the job finishes unsuccessfully
- THEN status MUST become failed with safe diagnostics
- AND the API/dashboard MUST show degraded/failure state without exposing stack traces or secrets.

### Requirement: Scheduler has singleton ownership

In production cluster mode, scheduled Agronautas and hydrology work MUST have exactly one owner per deployment window or a distributed lock that prevents duplicate ticks across API workers/instances.

#### Scenario: Multiple API workers start
- GIVEN production forks multiple API workers or replicas
- WHEN scheduled ticks become due
- THEN at most one owner MUST enqueue or execute each scheduled window
- AND logs/metrics MUST identify lock owner, window, skipped duplicates, and trace id.

#### Scenario: Lock backend is unavailable
- GIVEN the distributed lock cannot be acquired or verified
- WHEN a scheduled tick is due
- THEN the scheduler MUST fail closed or skip work
- AND it MUST NOT fall back to duplicate in-memory ownership in production.

### Requirement: Runtime capacity is bounded

DB pools, Redis usage, provider calls, and scheduler/worker concurrency MUST be bounded for the production worker count and documented in release evidence.

#### Scenario: Capacity test passes
- GIVEN production-like API worker count, Redis, DB, and provider settings
- WHEN capacity verification runs
- THEN DB/Redis connection budgets MUST remain within configured limits
- AND provider request counts MUST match the scheduler/idempotency plan.

### Requirement: Runtime rollback disables work safely

Rollback MUST be able to disable schedulers and workers while preserving read-only dashboard/API access and existing data.

#### Scenario: Scheduler/worker rollback flag is set
- GIVEN a production incident in runtime jobs
- WHEN disable flags are applied
- THEN no new scheduled/recompute jobs MUST start
- AND health/readiness/smoke evidence MUST show the system is safely degraded.
