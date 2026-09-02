# Delta for Runtime Evidence Foundation

## ADDED Requirements

### Requirement: Runtime outcome presentation is normalized

The runtime consumer MUST map auth, endpoint, freshness, retryability, and Copilot transport/stream/citation outcomes to stable typed UI states. It MUST preserve compatible API fields and MUST NOT convert a successful HTTP status into a live or actionable claim without usable evidence.

#### Scenario: Response metadata contradicts visible readiness
- GIVEN a Copilot response is HTTP 200 with an empty stream or unavailable citations
- WHEN the client normalizes it
- THEN the typed outcome is non-actionable or unavailable with a reason and retryability

