# Delta for Runtime Evidence Foundation

## ADDED Requirements

### Requirement: Canonical Risk/Job Envelope

The runtime MUST use one versioned envelope for `risk-recompute` and `scheduled-window`. It MUST carry `contractVersion`, `jobId`, `runId`, applicable `fieldId`, trigger/request time, trace/correlation/causation IDs, runtime mode, and lease attempt metadata. `jobId` identifies the durable job; `runId` identifies one replay-safe execution.

#### Scenario: Shared identity is stable
- GIVEN TypeScript and Python validate the same fixture
- WHEN they serialize it
- THEN identity, operation, trace, runtime mode, and lease values match

#### Scenario: Invalid admission is rejected
- GIVEN a required identity or operation is absent
- WHEN the envelope is validated
- THEN it is rejected without a result or retry

### Requirement: Legal States, One Retry Owner, and Durable ACK

Job state MUST be `queued`, `leased`, `running`, `waiting`, `succeeded`, `failed`, `dlq`, or `cancelled`. Legal progress is `queued → leased → running → succeeded|failed|waiting|dlq|cancelled` and `waiting → leased`; `result` is data, not state. One coordinator MUST own claim, heartbeat, completion, retry, and DLQ persistence. Lease reclaim MUST be atomic. ACK MUST follow durable outcome persistence, and `jobId`/`runId` duplicates MUST be idempotent.

#### Scenario: Transient failure retries once
- GIVEN a running job has a retryable provider/transport error and budget remains
- WHEN the coordinator records it
- THEN attempt increments once, `retryAt` is stored, and state becomes `waiting`

#### Scenario: ACK cannot precede persistence
- GIVEN persistence fails during processing
- WHEN the message is handled
- THEN it is not ACKed, no success is invented, and no second retry owner acts

### Requirement: Result Truth and Provider Lineage

Terminal results MUST state `available`, `degraded`, or `unavailable`; freshness MUST be `fresh`, `degraded`, `stale`, or `missing`; confidence MUST be bounded evidence confidence; uncertainty MUST be `not_calibrated` until approved; and degradation reasons MUST be bounded. `unavailable` MUST omit score, level, drivers, and recommendations. Computed output MUST identify `{id, version, selectionStatus: undecided, calibrationStatus: not_established}`. Lineage MUST preserve provider mode, source/run ID, retrieval/acquisition time, observation/forecast semantics, units, HTTP/schema outcome, and freshness. Forecast dates MUST NOT become observation dates.

#### Scenario: Latest-good fallback is explicit
- GIVEN a new provider value is unusable but identified prior data is usable
- WHEN the prior value is returned
- THEN freshness/status is degraded or stale with reason, confidence, and prior lineage

#### Scenario: No usable value is safe
- GIVEN provider, worker, coordinates, or processor availability is absent
- WHEN execution terminates
- THEN the result is unavailable with a typed reason and no risk value

### Requirement: Cross-Runtime Fixtures and Legacy Compatibility

AJV/JSON Schema, Zod, and Python MUST consume shared positive/negative fixtures for envelope identity, every legal transition, duplicates, lease reclaim, unavailable invariants, lineage, and engine descriptors. Read adapters MUST accept `workflow-job.v1` and risk snapshots `1.0.0`; new writes MAY be feature-flagged. Historical records MUST NOT be rewritten or relabeled, and engine divergence MUST NOT become a parity claim.

#### Scenario: Legacy reads remain truthful
- GIVEN a historical `1.0.0` snapshot or `workflow-job.v1` message
- WHEN an adapter reads it
- THEN the existing BFF/snapshot shape remains available without asserting canonical status

#### Scenario: Negative fixtures block drift
- GIVEN a runtime accepts a score in an unavailable result or an illegal transition
- WHEN the shared suite runs
- THEN validation fails RED until the semantic defect is corrected

### Requirement: Readiness, Telemetry, and Real Acceptance

Readiness MUST distinguish process availability, durable worker capability, scheduler-disabled, processor-not-configured, and unavailable states. Tests, fixtures, queue length, or planning logs MUST NOT enable scheduled work or claim production readiness. Transition telemetry MUST include contract/job/run IDs, from/to, attempt, worker/lease data, result status, provider mode, latency, and bounded reason, never credentials or raw payloads. Acceptance MUST separately identify local contract evidence from an authorized no-Docker API→transport→worker→durable persistence→restart/read-back run.

#### Scenario: Incomplete topology stays disabled
- GIVEN required worker dependency, heartbeat, Redis, PostgreSQL, cron, or authorized field evidence is missing
- WHEN readiness is evaluated
- THEN the gap is explicit, scheduler stays disabled, and production is unproven

#### Scenario: Authorized runtime evidence is labeled
- GIVEN the full runtime path is observed
- WHEN evidence is captured
- THEN queue/worker/durable/lineage/telemetry and browser network/console evidence link to the run as live, seam, mock, or unavailable

## EXPLICIT EXCLUSIONS

This delta MUST NOT select an engine, define management/identity/ownership, modify marketplace or provider/economic qualification, or change Iberá-Alerta. It MUST NOT claim accuracy, autonomy, calibrated probability, or production readiness from local tests alone.
