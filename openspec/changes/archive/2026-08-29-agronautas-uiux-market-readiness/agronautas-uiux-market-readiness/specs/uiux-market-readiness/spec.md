# Market-Readiness UI Specification

## Purpose

Make Agronautas and Iberá-Alerta trustworthy to operators and evaluators without adding providers, forecasts, marketplace behavior, or field-management features. All work follows strict TDD: RED acceptance tests precede implementation.

## Requirements

### Requirement: Evidence and Copilot outcomes are truthful

The UI MUST render one explicit state per capability: `live`, `seam`, `mock`, or `unavailable`, with freshness, source, reason, and safe next action where applicable. `live` requires real successful evidence; `seam` and `mock` MUST be labeled and MUST NOT appear as live. Copilot MUST distinguish transport success, tokens, citations, provider failure, rate limit, and empty stream; HTTP 200 MUST NOT imply actionable success.

#### Scenario: Grounded evidence is actionable
- GIVEN a real response contains tokens and verified citations
- WHEN the municipality or field view renders
- THEN it shows source, observation time, freshness, and grounded Copilot status

#### Scenario: HTTP 200 has no usable evidence
- GIVEN Copilot returns no tokens, no citation, or `unverifiedClaims:true`
- WHEN the response is rendered
- THEN it shows citation-unavailable/non-actionable state and never success styling or advice

### Requirement: Auth, demo, and unavailable boundaries are explicit

The UI MUST distinguish authenticated production access, labeled demo mode, missing capability (`404`), unauthorized access (`401`), and backend unavailable states. It MUST replace observed geometry/activity/intelligence/hydrology `404` noise with an intentional unavailable explanation and MUST NOT imply that demo access proves production identity or tenancy.

#### Scenario: Protected route is unauthenticated
- GIVEN auth is enabled and `/demo` or a field route receives `401`
- WHEN the page settles
- THEN it offers sign-in or clearly labeled demo entry, not a generic loaded/error success state

#### Scenario: A capability endpoint is absent
- GIVEN geometry or activity returns `404`
- WHEN the field detail renders
- THEN the affected section says unavailable, preserves available evidence, and offers no fabricated substitute

### Requirement: Landing and demo submission recover honestly

The landing CTA MUST navigate to an observable destination or be removed. Demo submission MUST distinguish validation, aborted/network, server, and success outcomes; success MUST only follow a confirmed accepted response. Failed submissions MUST preserve entered values and provide a retry path.

#### Scenario: Demo lead is accepted
- GIVEN valid data and a controlled endpoint returns success
- WHEN the visitor submits
- THEN a confirmation appears with the next step and no duplicate submission is triggered

#### Scenario: Submission aborts
- GIVEN the observed contact request ends with `ERR_ABORTED`
- WHEN the visitor submits
- THEN the UI states that delivery was not confirmed, preserves the form, and exposes retry without fake success

### Requirement: Operators see safe next actions and recovery

Field and municipality pages MUST place status, freshness, threshold comparison, evidence confidence, and the next safe action before long detail sections. Ingest MUST expose unauthorized, progress, completed, partial, failed, and retry states without persisting or exposing its token. A `429` chat result MUST show retry timing/backoff and preserve the draft question.

#### Scenario: Rate-limited chat recovers
- GIVEN chat returns `429`
- WHEN the operator views the error
- THEN retry guidance is visible, the draft remains intact, and retry is unavailable until permitted

#### Scenario: Ingest authorization fails
- GIVEN token verification returns `401`
- WHEN the ingest panel settles
- THEN the error and retry action are announced and focus can reach the retry control

### Requirement: Core routes are accessible by landmark, form, and keyboard

Each audited route MUST have exactly one document `<main>`, a skip link, hierarchical headings, labeled controls with meaningful `name`/`autocomplete`, associated inline errors, visible `:focus-visible` styling, and keyboard-operable actions. Async status and errors MUST use an appropriate live region.

#### Scenario: Keyboard user submits invalid form
- GIVEN a required field is empty
- WHEN the user submits with the keyboard
- THEN the first invalid control is identified/focused and its corrective error is announced

### Requirement: Detail navigation remains coherent at mobile and desktop

The visual system MUST use consistent status labels, capitalization, timestamps, badges, source cards, and empty-state copy across Agronautas and Iberá-Alerta. Detail pages SHOULD provide a compact section index or sticky status summary without covering focused content or introducing horizontal overflow at 390px.

#### Scenario: Empty forecast is shown
- GIVEN no forecast rows exist
- WHEN a municipality detail page renders
- THEN the forecast boundary prominently says no forecast is available and does not present planning copy as a forecast

### Requirement: Browser acceptance proves the real boundary

Playwright MUST exercise `/`, `/probar-demo`, `/demo`, a field detail, `/municipalities`, a municipality detail, and `/municipalities/ingest` at desktop `1440x900` and mobile `390x844`. Evidence MUST include screenshots, console/network output, one main landmark, no horizontal overflow, keyboard/error paths, and expected BFF/API status. Local demo, seam/mock fixtures, unavailable services, and external production/provider proof MUST be reported separately.

#### Scenario: Acceptance captures a degraded but truthful run
- GIVEN local auth, provider, or endpoint access is unavailable
- WHEN the browser suite runs at both viewports
- THEN it passes only for explicit unavailable/recovery UI and records the blocked external proof separately
