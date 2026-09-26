# Delta for Runtime Evidence Foundation

## MODIFIED Requirements

### Requirement: Runtime outcome presentation is normalized

The runtime consumer MUST map authenticated-principal status, authorization outcome, endpoint, freshness, retryability, and Copilot transport/stream/citation outcomes to stable typed UI states. It MUST preserve compatible API fields and MUST NOT convert a successful HTTP status, an auth success, or a Redis-degraded response into a live or actionable claim without usable evidence.
(Previously: normalization covered auth and endpoint metadata but did not explicitly bind readiness to principal authorization and infrastructure evidence.)

#### Scenario: Response metadata contradicts visible readiness
- GIVEN a Copilot response is HTTP 200 with an empty stream or unavailable citations
- WHEN the client normalizes it
- THEN the typed outcome is non-actionable or unavailable with a reason and retryability

#### Scenario: Authentication is denied
- GIVEN the API returns `401` or `403` for a protected operation
- WHEN the runtime outcome is normalized
- THEN the state is unauthorized or forbidden and never ready, live, or evidence-backed

#### Scenario: Required Redis policy cannot be proven
- GIVEN a security-critical Redis check fails during a protected operation
- WHEN the response is normalized
- THEN the state is unavailable/maintenance according to the contract and no readiness claim is shown
