# Delta for Runtime Evidence Foundation

## MODIFIED Requirements

### Requirement: Runtime outcome presentation is normalized

The runtime consumer MUST map auth, endpoint, freshness, retryability, Copilot transport/stream/citation, provider, worker, queue, and persistence outcomes to stable typed states. It MUST preserve compatible API fields and MUST NOT convert a successful HTTP status, queue acknowledgement, or configured provider into a live or actionable claim without usable evidence.
(Previously: the consumer normalized auth, endpoint, freshness, retryability, and Copilot transport/stream/citation outcomes.)

#### Scenario: Response metadata contradicts visible readiness
- GIVEN a Copilot response is HTTP 200 with an empty stream or unavailable citations
- WHEN the client normalizes it
- THEN the typed outcome is non-actionable or unavailable with a reason and retryability

#### Scenario: Queue acknowledgement lacks durable completion
- GIVEN an ingest or runtime request returns 202 but worker completion or PostgreSQL correlation is absent
- WHEN the result is normalized
- THEN it remains pending, blocked, failed, or unavailable and never becomes completed by status code alone

## ADDED Requirements

### Requirement: Runtime evidence is attributable and redacted

Runtime proof MUST preserve request ID, revision ID, proof/run ID, job ID where applicable, environment scope, endpoint, bounded timeout, provider status, and read-only correlation status. Receipts MUST contain names or redacted identifiers only and MUST reject tokens, URLs with secrets, database connection strings, raw chat, stack traces, and client-secret exposure.

#### Scenario: Redacted receipt validates
- GIVEN a local or production runtime run has safe identifiers and classified outcomes
- WHEN its receipt is validated
- THEN it identifies the environment and boundaries without secret values and remains separate from the other environment

#### Scenario: Required correlation is missing
- GIVEN a request, revision, proof/run, worker, or database correlation cannot be obtained
- WHEN evidence is assembled
- THEN the affected capability is `blocked` or `not_run` and the receipt cannot claim a passed live boundary

### Requirement: Configuration composition cannot silently change security

Runtime configuration MUST distinguish safe local defaults from explicit production settings. Missing production auth, readiness, origin, scheduler, or secret configuration MUST fail closed or block launch; local convenience MUST NOT be serialized into client code or treated as production proof.

#### Scenario: Local fallback is present in production
- GIVEN a production service resolves a localhost origin, disabled auth, or optional worker from an implicit default
- WHEN readiness or launch evidence is evaluated
- THEN the configuration is rejected or marked blocked with the resolved policy and no secret value
