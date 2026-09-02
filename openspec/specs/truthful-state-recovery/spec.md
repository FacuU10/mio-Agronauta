# Truthful State and Recovery Specification

## Purpose

Make every asynchronous surface distinguish loading, empty, error, unauthorized, forbidden, unavailable, retryable, and confirmed states.

## Requirements

### Requirement: State transitions are explicit

Each real operation MUST define visible loading, success-with-evidence, empty, failure, unauthorized/forbidden where applicable, and retry states. A response MUST NOT be treated as success solely because it is HTTP 200.

#### Scenario: Evidence-backed success
- GIVEN a valid response contains usable normalized data
- WHEN the operation completes at 1440x900 or 390x844
- THEN the UI shows data, source/freshness where required, and a bounded next action

#### Scenario: Empty or failed response
- GIVEN the response is empty, malformed, unauthorized, forbidden, unavailable, or retryable
- WHEN the operation completes at either viewport
- THEN the matching state is shown with no fabricated placeholder data or false success

### Requirement: Retry is safe and observable

Retry controls MUST be available only when retry is allowed, MUST preserve user input/draft context, MUST avoid duplicate requests, and MUST surface retry timing when supplied by the contract.

#### Scenario: Retry recovers
- GIVEN a retryable failure includes a permitted retry
- WHEN the user activates retry at either viewport
- THEN one retry occurs, pending status is exposed, and the confirmed result replaces the failure

#### Scenario: Retry is blocked
- GIVEN the contract says unauthorized, forbidden, rate-limited, or non-retryable
- WHEN the user views the state at 1440x900 or 390x844
- THEN retry is absent or disabled with the required sign-in/wait/support action

### Requirement: No fabricated provider or capability claims

The UI MUST preserve `live`, `seam`, `mock`, and `unavailable` semantics and MUST label simulation or fixture data. It MUST NOT invent maps, forecasts, citations, activity, identity, tenancy, or provider freshness.

#### Scenario: Simulation is labeled
- GIVEN a seam or mock response is used
- WHEN the route renders at both required viewports
- THEN the mode is visible and cannot be mistaken for production evidence

#### Scenario: Missing provider data
- GIVEN a provider returns no data or is not configured
- WHEN the view renders at either viewport
- THEN the affected capability is unavailable or missing and available evidence remains intact
