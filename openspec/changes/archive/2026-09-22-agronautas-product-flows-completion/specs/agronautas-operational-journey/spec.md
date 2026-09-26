# Delta for Agronautas Operational Journey

## MODIFIED Requirements

### Requirement: Intake and workspace expose operational truth

Agronautas intake, workspace, field detail, and geometry editing MUST render the authorized canonical location, normalized evidence state, freshness, provenance, permissions, and recovery state before detailed content. Missing capabilities MUST remain unavailable, and each downstream query MUST use the selected workspace/field lineage.
(Previously: the journey rendered normalized status, freshness, evidence, permissions, and recovery states before detailed content.)

#### Scenario: Authorized evidence-backed workspace
- GIVEN auth permits the journey and canonical field data is returned
- WHEN the operator moves through intake, workspace, and detail at 1440x900 or 390x844
- THEN each view exposes selected-location lineage, source/freshness, safe next action, and usable navigation

#### Scenario: Auth, scope, or capability boundary fails
- GIVEN auth returns `401`/`403`, location scope fails, or evidence returns `404`/`503`
- WHEN the journey renders at either viewport
- THEN the affected section gives the correct boundary and no fabricated field, activity, risk, or evidence result is shown

### Requirement: Simulation cannot masquerade as production

Demo or simulation modes MUST remain visibly labeled and MUST NOT assert production identity, tenancy, provider connectivity, or live risk evidence. Real mode MUST use the real authorized endpoint or show insufficient evidence.
(Previously: demo or simulation modes were visibly labeled and could not assert production identity, tenancy, provider connectivity, or live risk evidence.)

#### Scenario: Demo mode is active
- GIVEN the established simulation seam supplies a response
- WHEN any Agronautas view renders at either viewport
- THEN the seam/mock label and limitations remain visible in the relevant context

#### Scenario: Production claim lacks proof
- GIVEN no verified provider response, lineage, or browser evidence exists
- WHEN the operator views the journey at both viewports
- THEN the UI uses unavailable/insufficient-evidence language and does not claim production readiness

## ADDED Requirements

### Requirement: Selection and recovery preserve lineage

Changing location MUST invalidate incompatible detail queries and recoverable failures MUST retain the selected location without leaking prior workspace data.

#### Scenario: Selection changes during degraded load
- GIVEN field A is selected and field B is authorized while A evidence is retrying
- WHEN B is selected
- THEN B becomes the only active scope and A results cannot render in B's view

## Non-goals

No payment, copied Alqui/Vialovers behavior, auth change, or unsupported provider result is introduced.
