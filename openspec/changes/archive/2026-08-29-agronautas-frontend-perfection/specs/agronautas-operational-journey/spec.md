# Agronautas Operational Journey Specification

## Purpose

Harden the Agronautas demo/intake/workspace/detail journey while preserving BFF, Zod, auth, simulation, and evidence contracts.

## Requirements

### Requirement: Intake and workspace expose operational truth

Agronautas intake, workspace, field detail, and geometry editing MUST render normalized status, freshness, evidence, permissions, and recovery states before detailed content. Missing capabilities MUST remain unavailable.

#### Scenario: Authorized evidence-backed workspace
- GIVEN auth permits the journey and normalized field data is returned
- WHEN the operator moves through intake, workspace, and detail at 1440x900 or 390x844
- THEN each view exposes the current state, source/freshness where applicable, safe next action, and usable navigation

#### Scenario: Auth or capability boundary fails
- GIVEN auth returns `401`/`403` or geometry/activity/hydrology returns `404`
- WHEN the journey renders at either viewport
- THEN the affected section gives the correct boundary and no fabricated field, activity, or risk result is shown

### Requirement: Agronautas mutations are honest and recoverable

Forms and geometry actions MUST validate through existing contracts, show pending/error/success only for confirmed outcomes, preserve drafts on failure, and prevent duplicate submissions.

#### Scenario: Valid mutation completes
- GIVEN a permitted valid operation is accepted by the established endpoint
- WHEN the operator submits at both viewports
- THEN one request completes, the normalized result is rendered, and focus/status feedback is perceivable

#### Scenario: BFF or schema rejects mutation
- GIVEN the BFF is unavailable, auth fails, or Zod rejects the payload
- WHEN the operator submits at 1440x900 or 390x844
- THEN the operation is not presented as complete, draft input remains when safe, and retry/sign-in guidance is shown

### Requirement: Simulation cannot masquerade as production

Demo or simulation modes MUST remain visibly labeled and MUST NOT assert production identity, tenancy, provider connectivity, or live risk evidence.

#### Scenario: Demo mode is active
- GIVEN the established simulation seam supplies a response
- WHEN any Agronautas view renders at either viewport
- THEN the seam/mock label and limitations remain visible in the relevant context

#### Scenario: Production claim lacks proof
- GIVEN no verified production response or identity evidence exists
- WHEN the operator views the journey at both viewports
- THEN the UI uses unavailable/insufficient-evidence language and does not claim production readiness
