# Delta for Browser Acceptance Evidence

## MODIFIED Requirements

### Requirement: The route matrix exercises real user outcomes

Playwright MUST exercise `/`, `/probar-demo`, `/demo`, a parameterized field detail, `/municipalities`, a municipality detail, and `/municipalities/ingest` at 1440x900 and 390x844. The canonical lane MUST use env-backed API, Postgres/PostGIS, Redis, worker, and BFF services with no route stubs; checks MUST cover navigation, landmarks, keyboard, loading, empty, error, retry, auth, supported success, and Spanish UI copy preservation.
(Previously: the route matrix allowed declared seams/fixtures and did not require the full local stack.)

#### Scenario: Full-stack local browser acceptance passes
- GIVEN env-backed services, migrations, API, worker, and web/BFF are ready
- WHEN the route matrix runs at both viewports
- THEN it records role/label selectors, screenshots, console/network output, state assertions, and no horizontal overflow

#### Scenario: Unsupported browser capability is blocked
- GIVEN provider, auth, worker, database, or production access is unavailable
- WHEN its route is evaluated
- THEN the UI shows explicit unavailable/recovery behavior and the report records `blocked` or `not_run`, never fabricated success

### Requirement: Browser evidence is reproducible and attributable

Each run MUST record route, viewport, environment scope, commit/worktree identity, deployment revision when applicable, data mode, BFF/API status, request ID, proof/run ID when applicable, screenshot, console result, network result, and test identifier. Local seam/mock evidence MUST NOT be merged into production proof, and client secrets MUST NOT appear in artifacts.
(Previously: evidence recorded route, viewport, environment, commit/worktree, data mode, BFF/API status, screenshot, console, network, and test ID.)

#### Scenario: Evidence bundle is complete
- GIVEN a route test reaches an expected real or explicitly unavailable outcome
- WHEN evidence is collected at both viewports
- THEN a reviewer can identify the environment, boundary, IDs, UI state, and screenshot without guessing or seeing secrets

#### Scenario: Evidence mixes environments
- GIVEN local and production runs use different data modes or credentials
- WHEN reports are assembled
- THEN bundles remain separate and the combined result is not labeled production-ready

## ADDED Requirements

### Requirement: Browser operational failures remain visible

The browser lane MUST preserve timeout, 401/403, 502/503, missing-worker, stale-data, and failed-ingest states with recovery affordances and explicit result classification.

#### Scenario: BFF times out
- GIVEN the upstream API exceeds the bounded BFF timeout
- WHEN the browser renders the route
- THEN it shows a recoverable error and records the upstream boundary and timeout without retrying silently
