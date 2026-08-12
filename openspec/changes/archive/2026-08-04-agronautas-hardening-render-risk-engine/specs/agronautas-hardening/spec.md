# Delta for Agronautas Hardening

## ADDED Requirements

### Requirement: Versioned Risk-Engine Contract

Agronautas MUST distinguish algorithm from envelope versions, compare `risk-v0` and `open-meteo-basic-v1` using shared golden vectors, and record divergence. Neither engine SHALL be canonical or parity-compatible until the contract gate proves equivalence or approves a successor.

#### Scenario: Divergence is honest
- GIVEN both engines receive one supported vector
- WHEN any input, output, validity, confidence, or freshness differs
- THEN the vector is divergent and no parity claim is emitted

#### Scenario: Legacy migration preserves meaning
- GIVEN a snapshot from either existing engine
- WHEN the versioned contract activates
- THEN its engine/version remains readable and history is not rewritten

### Requirement: Aligned Recompute Runtime

The API publisher, Agronautas consumer, queue name, and worker entrypoint MUST form one executable boundary. Every envelope MUST include stable `jobId`, `runId`, request/correlation IDs, lease, attempt, and maximum attempts.

#### Scenario: Valid dispatch
- GIVEN a valid Agronautas recompute request
- WHEN the API enqueues the shared envelope
- THEN the configured consumer reads that queue and identifiers

#### Scenario: Boundary failure
- GIVEN the queue or entrypoint targets another runtime
- WHEN recompute is requested
- THEN processing is not reported successful and the mismatch is recorded

### Requirement: Durable Jobs, Heartbeats, Retry, and DLQ

PostgreSQL MUST durably store job state, lease, heartbeat, attempts, retry schedule, terminal error, and DLQ metadata. Transitions MUST cover queued, running, retryable, succeeded, failed, and dead-lettered; retry decisions MUST be envelope-deterministic.

#### Scenario: Retryable provider failure
- GIVEN a running job with attempts remaining
- WHEN a retryable provider error is recorded
- THEN the attempt and released lease persist with the next retry time

#### Scenario: Restart or exhausted retry
- GIVEN a persisted lease/attempt and a worker restart, or no attempts remaining
- WHEN processing resumes or final failure occurs
- THEN the job is reclaimed safely or dead-lettered with error and lineage IDs

### Requirement: Freshness and Alert Lineage

Every result MUST carry provider/source run IDs, acquisition time, `fresh`/`degraded`/`stale` freshness, degradation reasons, risk snapshot ID, and alert snapshot lineage. Stale or missing-provider data MUST NOT silently become fresh or create a current alert.

#### Scenario: Successful lineage
- GIVEN a provider response and completed recompute
- WHEN snapshots and an alert decision persist
- THEN field, source, job/run, risk, and alert IDs are traceable

#### Scenario: Stale or missing provider
- GIVEN the provider is unavailable or beyond its validity window
- WHEN freshness is evaluated
- THEN the result records the reason and stale-data alert rule applies

### Requirement: Correlated Recompute Path

Agronautas MUST expose field → source → job → persistence → freshness → retry/error as one correlated operation, including success and terminal failure.

#### Scenario: Complete success
- GIVEN a covered field and available provider
- WHEN recompute completes
- THEN every stage shares run/correlation IDs and the job succeeds

#### Scenario: Terminal provider failure
- GIVEN a covered field and unavailable provider
- WHEN retry policy is exhausted
- THEN attempts and final failure/DLQ are queryable without false snapshot success

### Requirement: Generic Crop and Validated Corrientes Coverage

Field intake MUST preserve the submitted crop and accept Corrientes localities only when persisted Agronautas coverage validates them. Demo coordinates and Iberá municipality seeds MUST NOT establish parcel coverage.

#### Scenario: Covered non-rice field
- GIVEN a validated locality and crop `maize`
- WHEN intake persists the field
- THEN crop remains `maize` and locality evidence is attached

#### Scenario: Unsupported locality or migration
- GIVEN an unvalidated locality or legacy forced-rice row
- WHEN intake or migration runs
- THEN new intake is rejected/marked uncovered and legacy data is preserved

### Requirement: Explicit Render, Evidence, and Product Boundaries

Render MUST remain the Agronautas Native Node API/web boundary. Python worker availability, queue consumption, PostgreSQL/Redis/provider access, and production recompute require a separate approved process boundary. Evidence MUST distinguish unit/contract, local real-service/provider, and production/Render Node levels. Iberá-Alerta remains separate.

#### Scenario: No unsupported runtime claim
- GIVEN static Render configuration, tests, or local evidence
- WHEN readiness is reported
- THEN unsupported worker, deployment, provider, and production claims remain unproven

#### Scenario: Iberá evidence is excluded
- GIVEN Iberá municipality coverage or runtime evidence
- WHEN Agronautas readiness is assessed
- THEN it cannot prove field coverage and Iberá behavior is unchanged
