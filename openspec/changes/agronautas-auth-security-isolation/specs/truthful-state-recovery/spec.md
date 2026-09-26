# Delta for Truthful State and Recovery

## MODIFIED Requirements

### Requirement: State transitions are explicit

Each real operation MUST define visible loading, success-with-evidence, empty, failure, unauthorized, forbidden, unavailable, maintenance, and retry states where applicable. A response MUST NOT be treated as success solely because it is HTTP 200 or because authentication succeeded without authorized, usable evidence.
(Previously: operations distinguished loading, evidence-backed success, empty, failure, unauthorized/forbidden, and retry states.)

#### Scenario: Evidence-backed success
- GIVEN a valid response contains usable normalized data and the principal is authorized
- WHEN the operation completes at 1440x900 or 390x844
- THEN the UI shows data, source/freshness where required, and a bounded next action

#### Scenario: Empty or failed response
- GIVEN the response is empty, malformed, unauthorized, forbidden, unavailable, maintenance, or retryable
- WHEN the operation completes at either viewport
- THEN the matching state is shown with no fabricated placeholder data or false success

#### Scenario: Refresh replay is rejected
- GIVEN a refresh response reports replay-family revocation
- WHEN the client receives it
- THEN the UI shows a sign-in/recovery state and does not claim an authenticated session

### Requirement: Retry is safe and observable

Retry controls MUST be available only when retry is allowed, MUST preserve user input/draft context, MUST avoid duplicate requests, and MUST surface retry timing when supplied by the contract. They MUST NOT retry a denied, replayed, or security-critical fail-closed operation as if it were transient.
(Previously: retry was controlled by unauthorized, forbidden, rate-limited, and non-retryable contract states.)

#### Scenario: Retry recovers
- GIVEN a retryable failure includes a permitted retry
- WHEN the user activates retry at either viewport
- THEN one retry occurs, pending status is exposed, and the confirmed result replaces the failure

#### Scenario: Retry is blocked
- GIVEN the contract says unauthorized, forbidden, rate-limited, replayed, or non-retryable
- WHEN the user views the state at 1440x900 or 390x844
- THEN retry is absent or disabled with the required sign-in/wait/support action

## ADDED Requirements

### Requirement: Auth recovery does not weaken isolation

Authentication recovery MUST clear or quarantine invalid session state, preserve truthful error semantics, and MUST NOT enable auth-disabled access or automatic legacy-token fallback.

#### Scenario: Session recovery is required
- GIVEN a session is expired, revoked, or replay-detected
- WHEN the protected route is rendered
- THEN protected content is withheld and recovery directs the user to sign in or maintenance
