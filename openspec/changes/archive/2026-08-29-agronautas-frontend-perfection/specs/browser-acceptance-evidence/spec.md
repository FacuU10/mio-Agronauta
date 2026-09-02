# Real Browser Acceptance and Evidence Specification

## Purpose

Define repeatable browser proof for the public, Agronautas, and Iberá-Alerta journeys, with local and production evidence kept separate.

## Requirements

### Requirement: The route matrix exercises real user outcomes

Playwright MUST exercise `/`, `/probar-demo`, `/demo`, a field detail, `/municipalities`, a municipality detail, and `/municipalities/ingest` at 1440x900 and 390x844. Checks MUST cover navigation, main landmark, keyboard, loading, empty, error, retry, auth, and supported success states.

#### Scenario: Local browser acceptance passes
- GIVEN the local app and its declared seams/fixtures are available
- WHEN the matrix runs at both viewports
- THEN it records selectors based on roles/labels, screenshots, console/network output, state assertions, and no horizontal overflow

#### Scenario: Unsupported external path is blocked
- GIVEN provider/auth/production access is unavailable
- WHEN the matrix runs at 1440x900 and 390x844
- THEN it verifies explicit unavailable/recovery behavior and marks production proof blocked rather than passing a fabricated success

### Requirement: Browser evidence is reproducible and attributable

Each run MUST record route, viewport, environment, commit/worktree identity, data mode, expected BFF/API status, screenshot, console result, network result, and test identifier. Local seam/mock evidence MUST NOT be merged into production proof.

#### Scenario: Evidence bundle is complete
- GIVEN a route test reaches its expected outcome
- WHEN evidence is collected at both viewports
- THEN a reviewer can identify the environment, request boundary, UI state, and screenshot without guessing

#### Scenario: Evidence mixes environments
- GIVEN a local fixture run and production run have different data modes or credentials
- WHEN reports are assembled
- THEN the bundles remain separate and the combined result is not labeled production-ready

### Requirement: Review and rollback boundaries are explicit

The program MUST prefer one PR while keeping thin dependent slices, track the configured 99,999 authored-line review budget, and define a slice-level rollback that preserves unrelated dirty changes. External blockers MUST be listed separately from product defects.

#### Scenario: Slice is reverted safely
- GIVEN a slice causes a verified route regression
- WHEN rollback is performed
- THEN only that slice is reverted, prior unrelated runtime/API/UI changes remain, and evidence identifies the restored boundary

#### Scenario: Broad redesign is proposed
- GIVEN a request expands into new providers, backend redesign, marketplace/management behavior, or unsupported claims
- WHEN scope review runs
- THEN it is recorded as a non-goal/external blocker and excluded from this program

## Matrix and Evidence Controls

The authoritative route, state, and evidence mapping for these requirements is
`../../route-state-evidence-matrix.md`. It names the exact parameterized route
shapes, expected BFF/API boundary, supported data modes, required states, and
desktop/mobile viewports. The matrix is a planning and acceptance contract; it
does not authorize new endpoints, providers, credentials, or production claims.
