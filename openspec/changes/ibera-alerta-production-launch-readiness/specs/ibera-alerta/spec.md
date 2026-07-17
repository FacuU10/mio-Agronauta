# Delta for ibera-alerta

## ADDED Requirements

### Requirement: Valid unsupported-zone Copilot context (R2-001)

For an unsupported Copilot zone, the system MUST return schema-valid context with `zone: null`, empty official sources, stations, and telemetry, plus the official-data recommendation. It MUST NOT infer a nearest zone or fabricate geography or data.

#### Scenario: Unsupported zone request
- GIVEN a Copilot request names no supported zone
- WHEN context is assembled
- THEN the response contains the defined empty context and recommendation
- AND it contains no substituted location or telemetry

### Requirement: Independent and semantically correct source ingestion (R3-001)

The system MUST execute PNA, INA, INMET, and SMN as independently admitted source requests and persist each source-local terminal result. PNA/INA telemetry MUST remain numeric hydrology; INMET/SMN alerts MUST remain `storm_alert` with `value: null` and MUST NOT be rendered as municipal rainfall.

#### Scenario: One source fails
- GIVEN one requested source returns a terminal failure
- WHEN the same proof run requests the other official sources
- THEN their execution and persisted results proceed independently
- AND the failed source is reported only as its own result

#### Scenario: Alert-only source is rendered
- GIVEN INMET or SMN ingests an official alert
- WHEN `/municipalities` renders the correlated payload
- THEN the alert appears as a province alert with null numeric value
- AND municipal rain/risk is derived only from applicable numeric telemetry

### Requirement: Bounded four-source evidence matrix

Strict TDD changes MUST first demonstrate failing focused regressions, then passing focused and full tests. For each of PNA, INA, INMET, and SMN, the verifier MUST collect one local POST and one terminal status GET, then one canonical-production POST and one terminal status GET, without retries, polling, or substitutions. Every source row MUST correlate `proofRunId`/run identity with redacted provider summary, read-only DB evidence, API/BFF response, and browser state.

#### Scenario: Complete proof after cold start
- GIVEN the commit-correlated main revision is deployed and has had about two minutes to start
- WHEN one bounded matrix runs against all four sources
- THEN every required source cell is terminal, correlated, and passing
- AND each source is independently ingested, persisted, returned, and rendered

#### Scenario: Incomplete proof
- GIVEN any source is failed, empty, non-terminal, uncorrelated, or lacks DB, API/BFF, or UI evidence
- WHEN the matrix is evaluated
- THEN that source row and the release are blocked
- AND tests, builds, historical output, or partial success cannot override the block

### Requirement: Canonical production route and municipality rendering

Production proof MUST use `https://www.agronauta.com.ar`; it MUST NOT use `www.agronautas.com.ar`. The canonical web-origin BFF MUST preserve the hydrology response, and `/municipalities` MUST render current official source states without fixtures.

#### Scenario: Canonical browser proof
- GIVEN the canonical production BFF returns the correlated municipalities payload
- WHEN a browser opens `/municipalities`
- THEN observed official source states render from that payload
- AND the evidence records the singular canonical origin

### Requirement: Honest release blocking and rollback

The system and evidence artifacts MUST NOT fabricate telemetry, provider success, or UI state, expose secrets or raw provider payloads, or treat degraded data as passing proof. On a blocked release, operators MUST revert only the affected stacked slice, redeploy the prior main revision, and retain sanitized evidence; unrelated migrations and historical telemetry MUST NOT be rolled back.

#### Scenario: Official provider is unavailable
- GIVEN an official provider cannot supply valid current data
- WHEN its evidence is recorded
- THEN the source is honestly blocked with redacted diagnostics
- AND no fixture, fallback source, or synthetic success is emitted

#### Scenario: Release rollback
- GIVEN a matrix blocks the launch
- WHEN rollback is initiated
- THEN only the failing slice is reverted and the prior main revision is redeployed
- AND sanitized evidence remains available for audit
