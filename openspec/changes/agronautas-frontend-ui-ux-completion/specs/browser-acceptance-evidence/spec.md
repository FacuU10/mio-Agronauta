# Delta for Real Browser Acceptance and Evidence

## MODIFIED Requirements

### Requirement: The route matrix exercises real user outcomes

Playwright MUST exercise public entry, demo, protected Agronautas workspace and field detail, `/agronautas/marketplace`, municipality overview/detail, and ingestion at 1440x900 and 390x844. Checks MUST cover truthful navigation, main landmark, keyboard, loading, empty, error, forbidden, maintenance, degraded, retry, auth, provenance, and supported success states.
(Previously: the matrix covered seven public, Agronautas, and Iberá routes but omitted `/agronautas/marketplace` and the expanded state matrix.)

#### Scenario: Local browser acceptance passes
- GIVEN the local app and declared seams, fixtures, or real services are available
- WHEN the matrix runs at both viewports
- THEN it records role/label selectors, screenshots, console/network output, state assertions, and no horizontal overflow

#### Scenario: Unsupported external path is blocked
- GIVEN provider, auth, worker, queue, or production access is unavailable
- WHEN the matrix runs
- THEN it verifies explicit unavailable/recovery behavior and marks the unsupported claim blocked or not-run

### Requirement: Browser evidence is reproducible and attributable

Each run MUST record route, viewport, environment, commit/worktree identity, data mode, evidence mode, expected BFF/API status, screenshot, console result, network result, test identifier, and whether the result is stubbed/demo, local-real, managed-harness, blocked, or production. Local or stubbed evidence MUST NOT be merged into production proof.
(Previously: runs recorded environment, data mode, BFF/API status, screenshots, console/network output, and test identifiers.)

#### Scenario: Evidence bundle is complete
- GIVEN a route test reaches its expected outcome
- WHEN evidence is collected at both viewports
- THEN a reviewer can identify environment, boundary, state, provenance, and screenshot without guessing

#### Scenario: Evidence mixes environments
- GIVEN local fixture, local-real, managed-harness, and production runs differ in data mode or credentials
- WHEN reports are assembled
- THEN bundles remain separated and no combined result is labeled production-ready

## ADDED Requirements

### Requirement: Browser proof excludes Gate G claims

Browser acceptance for this change MUST report functional local and bounded runtime evidence only. It MUST NOT claim Gate G production proof or convert blocked prerequisites into passing evidence.

#### Scenario: Production prerequisite is missing
- GIVEN approved origin, credentials, provider, or topology is absent
- WHEN the report is generated
- THEN the prerequisite is listed as blocked/external and the change remains outside Gate G
