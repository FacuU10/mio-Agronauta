# Delta for Runtime Evidence Foundation

## MODIFIED Requirements

### Requirement: Truthful Access and Failure States

The system MUST protect `GET /fields/:fieldId/status` and `POST /fields/:fieldId/chat` with the existing Agronautas role scope and field-existence boundary. Shared role tokens MUST NOT represent identity, tenant membership, ownership, or collaboration authority. Unsupported landing metrics, monitoring, recency, and insurance claims MUST be illustrative or unavailable.
(Previously: workspace and activity had typed failure states, but status and chat were not both protected and landing claims were not covered.)

#### Scenario: Unauthenticated status or chat request
- GIVEN Agronautas auth is enabled and no valid bearer token is supplied
- WHEN status or chat is requested for any field identifier
- THEN the API returns the established typed `401` contract and executes no field or chat use case

#### Scenario: Authenticated non-owner access
- GIVEN a valid shared reader/operator token exists but no ownership contract exists
- WHEN the caller requests an existing field
- THEN read scope and field existence are enforced, while the response makes no ownership or tenant claim

### Requirement: Evidence Metadata and Lineage

Every provider observation MUST preserve provider, signal, source URL, units, retrieval time, source-observation or forecast time when supplied, freshness, mode, HTTP/schema outcome, run ID, lineage, and degradation reason. Retrieval time MUST NOT be presented as observation time; forecasts MUST identify horizon/model semantics.
(Previously: evidence required source, unit, observed time, retrieval time, and lineage but did not distinguish provider timestamp semantics or adapter outcomes.)

#### Scenario: Provider timestamps are serialized truthfully
- GIVEN Georef has retrieval data only, NASA POWER uses local-solar or requested UTC dates, or Open-Meteo returns forecast dates
- WHEN evidence is normalized
- THEN each timestamp and time standard is labeled explicitly and no invented observation time is emitted

#### Scenario: Provider failure or stale latest-good evidence
- GIVEN an HTTP error, schema drift, timeout, missing credential, or stale prior result occurs
- WHEN the capability is requested
- THEN the response is `unavailable` or degraded with reason and lineage, never a fabricated live value

## ADDED Requirements

### Requirement: Truthful Runtime and Scheduler Boundary

The system MUST expose API/web/worker/cron readiness and keep scheduled ingestion disabled until a scheduled-window envelope is proven from Redis enqueue through worker completion or DLQ. Queue state MUST distinguish waiting, processing, retry, result, and dead-letter outcomes by run and job ID.

#### Scenario: Queue path is proven before enablement
- GIVEN Redis is reachable, the Python worker dependencies are installed, and the compatible worker service is deployed
- WHEN a due source window is dispatched
- THEN the envelope is consumed from `bull:agronautas-runtime:wait`, transitions through processing, and records completion or retry/DLQ telemetry

#### Scenario: Worker topology is incomplete
- GIVEN `jsonschema` or another required worker dependency is absent, or Render has no Python worker service
- WHEN readiness or the scheduler is evaluated
- THEN readiness is unavailable and scheduled ingestion remains disabled; a planning log MUST NOT count as enqueue or completion

### Requirement: Contract Fixtures Are Not Provider Proof

Georef 2.1, NASA POWER Daily, and Open-Meteo adapters MUST use typed envelopes and explicit units: WGS84 degrees/codes; `C` and `mm/day` with POWER time standard; and Open-Meteo forecast horizon/model/retrieval timestamps with `°C` and `mm`. Fixtures MAY prove parsing or failure handling only; real requests alone may produce live evidence.

#### Scenario: Real provider evidence is available
- GIVEN a real successful request passes HTTP and schema validation
- WHEN the adapter result is persisted
- THEN the envelope records source, signal, units, timestamps, mode `live`, run ID, latency, and raw-payload lineage

#### Scenario: Fixture or blocked provider
- GIVEN a fetch-injected fixture, commercial-license decision, credential, rate limit, timeout, or schema failure blocks proof
- WHEN the adapter is evaluated
- THEN mode is `seam`, `mock`, or `unavailable` with a reason and no live claim

### Requirement: Real Runtime Acceptance Evidence

Release acceptance MUST separate RED-GREEN-REFACTOR contract tests from real-runtime evidence. The real suite MUST capture Playwright navigation/snapshots/screenshots, network/console output, authenticated API/BFF calls, Postgres migration/evidence/job state, Redis `PING` and queue transitions, worker execution, owner-authorized cron outcome, and Render service/deploy/log wiring.

#### Scenario: Runtime evidence is complete
- GIVEN the configured isolated runtime permits the required reads and writes
- WHEN the real verification suite runs without Docker
- THEN each captured surface is linked to a run ID and the result identifies live, seam, mock, or unavailable state

#### Scenario: Runtime evidence is missing
- GIVEN only stubbed browser traffic, injected fetches, absent credentials, unsafe writes, or missing worker/Render wiring are available
- WHEN acceptance is evaluated
- THEN production/provider/worker readiness remains unproven and the affected capability is explicitly blocked or unavailable
