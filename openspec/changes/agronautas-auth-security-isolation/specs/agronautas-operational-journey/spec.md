# Delta for Agronautas Operational Journey

## MODIFIED Requirements

### Requirement: Intake and workspace expose operational truth

Agronautas intake, workspace, field detail, and geometry editing MUST render normalized status, freshness, evidence, permissions, and recovery states before detailed content. Protected views MUST derive permissions from the trusted principal and workspace membership; missing capabilities MUST remain unavailable.
(Previously: the journey required auth permission but did not require principal-based workspace membership.)

#### Scenario: Authorized evidence-backed workspace
- GIVEN the trusted principal is a member of the requested workspace and normalized field data is returned
- WHEN the operator moves through intake, workspace, and detail at 1440x900 or 390x844
- THEN each view exposes current state, source/freshness where applicable, safe next action, and usable navigation

#### Scenario: Auth or capability boundary fails
- GIVEN auth returns `401`/`403` or geometry/activity/hydrology returns `404`
- WHEN the journey renders at either viewport
- THEN the affected section gives the correct boundary and no fabricated field, activity, or risk result is shown

#### Scenario: Membership is absent or cross-workspace
- GIVEN the principal is authenticated but lacks membership for the requested workspace
- WHEN the journey requests protected workspace content
- THEN the route returns `403` and renders a bounded forbidden state without protected data

### Requirement: Agronautas mutations are honest and recoverable

Forms and geometry actions MUST validate through existing contracts, require membership and operation scope, show pending/error/success only for confirmed outcomes, preserve drafts on failure, and prevent duplicate submissions.
(Previously: permitted mutations were described without an explicit `(actorId, workspaceId)` membership requirement.)

#### Scenario: Valid mutation completes
- GIVEN a permitted member has a valid operation accepted by the established endpoint
- WHEN the operator submits at both viewports
- THEN one request completes, the normalized result is rendered, and focus/status feedback is perceivable

#### Scenario: BFF or schema rejects mutation
- GIVEN the BFF is unavailable, auth fails, or Zod rejects the payload
- WHEN the operator submits at 1440x900 or 390x844
- THEN the operation is not presented as complete, draft input remains when safe, and retry/sign-in guidance is shown

#### Scenario: Member cannot mutate another workspace
- GIVEN the principal lacks membership or scope for the target workspace
- WHEN a mutation is submitted
- THEN the API returns `403`, no write occurs, and the draft remains recoverable
