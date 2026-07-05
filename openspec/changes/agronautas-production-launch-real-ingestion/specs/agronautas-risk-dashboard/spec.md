# Agronautas Risk Dashboard Specification

## Purpose
Dashboard-first risk presentation, PDF export, copilot evidence, observability, and acceptance gates.

## Requirements

### Requirement: Deterministic Risk Dashboard
The system MUST present deterministic persisted risk snapshots with signal cards, risk modules, alerts, timelines, provenance, recompute status, freshness, confidence, and degradation reasons.

#### Scenario: Dashboard renders persisted snapshot
- GIVEN a field has a persisted risk snapshot
- WHEN the dashboard loads
- THEN cards, alerts, timeline, risk drivers, evidence refs, and scheduler status match persisted data
- AND no client-only business rule changes the risk level

#### Scenario: Recompute status is observable
- GIVEN a recompute is queued, running, failed, or complete
- WHEN the status endpoint is queried
- THEN the dashboard shows that state with last-success and next-run timestamps

### Requirement: PDF From Dashboard State
The system MUST generate PDF reports from the same persisted dashboard payload, including timestamp, risk, drivers, evidence, confidence, freshness, and degradation disclaimers.

#### Scenario: PDF matches dashboard payload
- GIVEN a persisted dashboard payload
- WHEN a PDF is generated
- THEN risk, drivers, evidence refs, timestamps, and disclaimers match the payload

### Requirement: Copilot Evidence Boundary
Copilot or explanatory text MUST cite persisted evidence and MUST NOT invent unsupported recommendations or hide degraded data.

#### Scenario: Evidence-backed explanation
- GIVEN a degraded satellite signal and valid weather signal
- WHEN explanation text is requested
- THEN it cites both evidence states
- AND labels uncertainty rather than asserting unsupported certainty

### Requirement: Observability and TDD Gates
Dashboard, PDF, API, E2E, Playwright, observability tests, and a fresh-context pessimistic/adversarial code-diff verification MUST verify happy paths, empty states, provider degradation, no-auth boundary, scheduler cadence behavior, and screenshot/PDF assertions before launch; tests/build alone MUST NOT be treated as sufficient.

#### Scenario: Launch acceptance suite
- GIVEN CI runs `pnpm test`, package tests, Playwright, worker pytest, and a fresh-context adversarial diff review
- WHEN the MVP launch gate is evaluated
- THEN all real-ingestion dashboard/PDF/failure-mode tests pass before release
- AND the adversarial review finds no unresolved launch blockers
