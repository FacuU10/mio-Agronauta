# Shared Accessibility, Status, and Focus Specification

## Purpose

Standardize reusable web presentation invariants while keeping business rules and durable decisions outside UI primitives.

## Requirements

### Requirement: Shared primitives preserve semantic state

Status, evidence, loading, empty, error, retry, and unavailable primitives MUST accept normalized typed state and render distinct text, semantics, and next actions. They MUST NOT derive new provider or risk claims.

#### Scenario: Observed state is announced
- GIVEN normalized observed evidence includes source and timestamp
- WHEN a surface renders at 1440x900 or 390x844
- THEN the primitive exposes the observed label, provenance, freshness, and safe action

#### Scenario: Missing state is not success
- GIVEN evidence is missing, stale, mocked, or unavailable
- WHEN the primitive renders at either viewport
- THEN success/live styling and actionable claims are absent, with an explicit reason or recovery action

### Requirement: Keyboard, focus, and landmark invariants are reusable

Audited surfaces MUST have exactly one `<main>`, a functional skip target, hierarchical headings, keyboard-operable controls, and visible `:focus-visible` treatment. Focus MUST move to the first invalid field or meaningful recovery result where the operation requires it.

#### Scenario: Invalid form is recoverable by keyboard
- GIVEN a required control is empty
- WHEN the user submits with keyboard at either viewport
- THEN the first invalid control is focused, its inline error is associated, and the error is announced

#### Scenario: Pointer-only control is rejected
- GIVEN an action is implemented only by click, lacks a label, or hides focus
- WHEN keyboard acceptance runs at 1440x900 and 390x844
- THEN the route fails accessibility acceptance and no substitute claim is recorded

### Requirement: Async communication is perceivable

Loading, validation, retry, and error updates MUST use appropriate live-region semantics without duplicating announcements. Controls MUST expose pending and disabled behavior only after a request starts.

#### Scenario: Request status changes
- GIVEN a user starts a supported operation
- WHEN status changes from pending to success or failure at either viewport
- THEN the change is announced once and the next safe action is reachable

#### Scenario: Silent failure is rejected
- GIVEN a request fails without an alert/status update or leaves focus trapped
- WHEN the same flow is tested at both viewports
- THEN acceptance fails and the UI does not imply completion

### Requirement: Forms are label-complete and platform-correct

Controls MUST have meaningful labels, `name`, `autocomplete`, correct input type/input mode, associated errors, and paste support. Error copy MUST explain a corrective next step.

#### Scenario: Valid form submits once
- GIVEN valid values are entered at either viewport
- WHEN the submit control is activated
- THEN one request starts, pending state is visible, and confirmed success is rendered only after accepted response

#### Scenario: Invalid or aborted form preserves intent
- GIVEN validation or network delivery fails
- WHEN the user submits at 1440x900 or 390x844
- THEN values remain available, the failure is explicit, and retry is possible without duplicate submission
