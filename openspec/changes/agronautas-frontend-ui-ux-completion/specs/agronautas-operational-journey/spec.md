# Delta for Agronautas Operational Journey

## ADDED Requirements

### Requirement: Operational capabilities are deep-linkable within one workspace

The Agronautas workspace MUST provide stable route-level entry points or anchors for fields, activity, geometry, management, planning, evidence, intelligence, and Copilot where a contract exists. Each entry MUST preserve selected field/workspace context and expose a safe return path.

#### Scenario: Operator moves between operational sections
- GIVEN an authorized field and workspace are selected
- WHEN the operator opens activity, management, evidence, intelligence, or Copilot
- THEN the destination preserves context, shows its own state boundary, and returns to the workspace without losing selection

#### Scenario: Capability is not contracted
- GIVEN a requested section has no valid backend contract or permission
- WHEN the operator opens its link
- THEN the section is marked unavailable or forbidden and no placeholder capability is presented as complete

## MODIFIED Requirements

### Requirement: Intake and workspace expose operational truth

Agronautas intake, workspace, field detail, and geometry editing MUST render normalized status, freshness, evidence, permissions, and recovery states before detailed content. Missing capabilities MUST remain unavailable, and route-level context MUST be visible when a section is entered directly.
(Previously: intake, workspace, field detail, and geometry rendered normalized truth before detail.)

#### Scenario: Authorized evidence-backed workspace
- GIVEN auth permits the journey and normalized field data is returned
- WHEN the operator moves through intake, workspace, and detail at 1440x900 or 390x844
- THEN each view exposes state, source/freshness where applicable, safe next action, selected context, and usable navigation

#### Scenario: Auth or capability boundary fails
- GIVEN auth returns `401`/`403` or geometry/activity/hydrology returns `404`
- WHEN the journey renders
- THEN the affected section gives the correct boundary and no fabricated field, activity, or risk result is shown

### Requirement: Agronautas mutations are honest and recoverable

Forms and geometry actions MUST validate through existing contracts, show pending/error/success only for confirmed outcomes, preserve drafts on failure, prevent duplicate submissions, and invalidate or refresh the affected view only after a confirmed mutation.
(Previously: mutations validated, exposed pending/error/success, preserved drafts, and prevented duplicates.)

#### Scenario: Valid mutation completes
- GIVEN a permitted valid operation is accepted by the established endpoint
- WHEN the operator submits
- THEN one request completes, the normalized result is rendered, affected state is refreshed, and focus/status feedback is perceivable

#### Scenario: BFF or schema rejects mutation
- GIVEN the BFF is unavailable, auth fails, or Zod rejects the payload
- WHEN the operator submits
- THEN the operation is not presented as complete, draft input remains when safe, and retry/sign-in guidance is shown
