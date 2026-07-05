# Delta for Agronautas Risk Dashboard

## ADDED Requirements

### Requirement: Shared Dashboard And PDF Payload
The dashboard and PDF MUST render from the same persisted payload, including risk, drivers, evidence, provider modes, freshness, and disclaimers.

#### Scenario: PDF matches dashboard
- GIVEN a persisted payload with live, seam, mock, and unavailable sources
- WHEN the dashboard and PDF are generated
- THEN both show the same risk, evidence, freshness, and provider mode labels

#### Scenario: Degraded data is not hidden
- GIVEN a latest-good fallback is served
- WHEN the user views dashboard or PDF
- THEN both surfaces show degraded freshness and fallback disclaimers

### Requirement: Source Freshness Dashboard
The dashboard SHOULD expose per-source freshness only after stabilization gates are green.

#### Scenario: Freshness panel is gated
- GIVEN stabilization gates are not green
- WHEN source freshness UI is evaluated
- THEN it is hidden, disabled, or marked non-production

#### Scenario: Freshness panel is testable
- GIVEN stabilization gates are green and source status exists
- WHEN the dashboard loads
- THEN each source shows status, last-success, next-due, and overdue state
