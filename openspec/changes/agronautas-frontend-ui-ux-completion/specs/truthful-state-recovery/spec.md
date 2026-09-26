# Delta for Truthful State and Recovery

## MODIFIED Requirements

### Requirement: State transitions are explicit

Each real operation MUST define visible loading, evidence-backed success, empty, failure, unauthorized, forbidden, unavailable, maintenance, degraded, and retry states where applicable. A response MUST NOT be treated as success solely because it is HTTP 200; confirmed UI success requires normalized data or an explicit accepted transition.
(Previously: operations defined loading, success-with-evidence, empty, failure, unauthorized/forbidden, and retry states.)

#### Scenario: Evidence-backed success
- GIVEN a valid response contains usable normalized data
- WHEN the operation completes at 1440x900 or 390x844
- THEN data, source/freshness, evidence mode, and a bounded next action are shown

#### Scenario: Empty, degraded, or failed response
- GIVEN the response is empty, malformed, unauthorized, forbidden, unavailable, maintenance, degraded, or retryable
- WHEN the operation completes
- THEN the matching state is shown with no fabricated placeholder data or false success

### Requirement: Retry is safe and observable

Retry controls MUST be available only when retry is allowed, MUST preserve user input, selected context, and draft data, MUST avoid duplicate requests, and MUST surface retry timing when supplied by the contract. Non-retryable maintenance, forbidden, and authorization states MUST provide their required next action instead.
(Previously: retry preserved draft context, avoided duplicate requests, and surfaced timing.)

#### Scenario: Retry recovers
- GIVEN a retryable failure includes a permitted retry
- WHEN the user activates retry
- THEN one retry occurs, pending status is exposed, and the confirmed result replaces the failure

#### Scenario: Retry is blocked
- GIVEN the contract says unauthorized, forbidden, maintenance, rate-limited, or non-retryable
- WHEN the user views the state
- THEN retry is absent or disabled with sign-in, wait, support, or safe-navigation guidance

## ADDED Requirements

### Requirement: Recovery is bounded by capability and provenance

Recovery controls MUST retain the affected capability's route, evidence mode, and provenance. Recovery MUST NOT silently substitute a mock, stale response, or unrelated product surface for a failed live operation.

#### Scenario: Live request cannot recover
- GIVEN a live capability fails and no approved fallback exists
- WHEN the user selects recovery
- THEN the UI keeps the capability visible as unavailable and does not relabel fixture data as live
