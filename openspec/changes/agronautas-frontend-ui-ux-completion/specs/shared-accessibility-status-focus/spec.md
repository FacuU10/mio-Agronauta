# Delta for Shared Accessibility, Status, and Focus

## MODIFIED Requirements

### Requirement: Keyboard, focus, and landmark invariants are reusable

Audited surfaces MUST have exactly one `<main>`, a functional skip target, hierarchical headings, keyboard-operable controls, visible `:focus-visible` treatment, and reachable shell navigation. Focus MUST move to the first invalid field or meaningful recovery result when the operation requires it, including forbidden, maintenance, and degraded outcomes.
(Previously: surfaces required one main, skip target, headings, keyboard controls, focus treatment, and invalid/recovery focus.)

#### Scenario: Invalid form is recoverable by keyboard
- GIVEN a required control is empty
- WHEN the user submits with keyboard at either viewport
- THEN the first invalid control is focused, its inline error is associated, and the error is announced

#### Scenario: Boundary result is recoverable by keyboard
- GIVEN a route resolves to forbidden, maintenance, degraded, or unavailable state
- WHEN the boundary renders
- THEN focus can reach the explanation and its safe action without a pointer or hidden focus

### Requirement: Async communication is perceivable

Loading, validation, retry, error, forbidden, maintenance, degraded, and recovery updates MUST use appropriate live-region semantics without duplicate announcements. Controls MUST expose pending and disabled behavior only after a request starts.
(Previously: loading, validation, retry, and error updates were announced.)

#### Scenario: Request status changes
- GIVEN a user starts a supported operation
- WHEN status changes from pending to success or failure
- THEN the change is announced once and the next safe action is reachable

#### Scenario: Silent failure is rejected
- GIVEN a request fails without an alert/status update or leaves focus trapped
- WHEN the flow is tested at both viewports
- THEN acceptance fails and the UI does not imply completion

## ADDED Requirements

### Requirement: Shared state primitives remain typed and label-complete

Status, evidence, shell, and recovery primitives MUST receive normalized typed state and expose accessible names, role/state semantics, and corrective next actions without deriving business or provider claims.

#### Scenario: State primitive is complete
- GIVEN a normalized missing, stale, mock, or live state is supplied
- WHEN the primitive renders
- THEN visible text and assistive semantics identify state, provenance, freshness, and next action consistently
