# Delta for Runtime Evidence Foundation

## MODIFIED Requirements

### Requirement: Runtime outcome presentation is normalized

The runtime consumer MUST map auth, endpoint, provider mode, freshness, retryability, maintenance, and Copilot transport/stream/citation outcomes to stable typed UI states. It MUST preserve compatible API fields and MUST NOT convert a successful HTTP status into a live or actionable claim without usable evidence, lineage, and freshness.
(Previously: it mapped auth, endpoint, freshness, retryability, and Copilot transport/stream/citation outcomes to stable typed UI states.)

#### Scenario: Response metadata contradicts visible readiness
- GIVEN a Copilot response is HTTP 200 with an empty stream or unavailable citations
- WHEN the client normalizes it
- THEN the typed outcome is non-actionable or unavailable with a reason and retryability

#### Scenario: Provider response is typed but not fresh
- GIVEN an adapter returns data with stale timestamps or degraded provider mode
- WHEN the client normalizes it
- THEN the UI preserves the data as stale/degraded and does not label it current or ready

## ADDED Requirements

### Requirement: Recovery states are durable and distinguishable

Consumers MUST distinguish empty, unavailable, unauthorized, forbidden, invalid, maintenance, retrying, failed, stale, and recovered states from server contracts. A retry MUST reconcile the latest durable run before replacing a previous state.

#### Scenario: Retry recovers a source
- GIVEN a source was persisted as failed and a later real run succeeds
- WHEN the response is consumed
- THEN recovered/current status includes the new run lineage while the prior failure remains visible in history

#### Scenario: Empty is not failure
- GIVEN a valid scope has no records
- WHEN the endpoint responds with an empty result
- THEN the UI renders an explicit empty state rather than an error or fabricated placeholder

## Non-goals

No client-side authorization, source fabrication, auth modification, or production claim based only on HTTP status is permitted.
