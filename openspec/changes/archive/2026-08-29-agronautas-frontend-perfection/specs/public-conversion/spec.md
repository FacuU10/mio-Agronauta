# Public Conversion Specification

## Purpose

Harden the public landing and demo funnel for observable navigation, honest submission, and accessible recovery.

## Requirements

### Requirement: Public calls to action have observable destinations

Every primary CTA MUST use a real link or successful action with an observable destination. Dead, misleading, or capability-inventing CTAs MUST NOT ship.

#### Scenario: CTA reaches demo entry
- GIVEN a visitor activates the primary CTA
- WHEN the action runs at 1440x900 or 390x844
- THEN the browser reaches the declared demo/contact destination and the destination exposes its own main landmark

#### Scenario: Destination is unavailable
- GIVEN the target route is missing or blocked
- WHEN the CTA is activated at either viewport
- THEN the user receives an explicit unavailable/recovery outcome, not a fabricated product result

### Requirement: Demo submission reports confirmed outcomes

The contact form MUST distinguish validation, pending, accepted, aborted/network, server, and duplicate-request outcomes. Success MUST require a confirmed accepted response and failed submission MUST preserve values.

#### Scenario: Accepted lead
- GIVEN valid form data and a controlled endpoint returns accepted
- WHEN the visitor submits at either viewport
- THEN one confirmation with the next step appears and no second request is triggered

#### Scenario: Aborted or rejected lead
- GIVEN delivery aborts, times out, or returns server rejection
- WHEN the visitor submits at 1440x900 or 390x844
- THEN delivery is explicitly unconfirmed, entered values remain, and retry is available when safe

### Requirement: Public motion and content respect access needs

Landing motion MUST honor reduced-motion preferences, content MUST remain readable without animation, and meaningful images MUST have dimensions and alternative text.

#### Scenario: Reduced-motion visitor reads funnel
- GIVEN `prefers-reduced-motion` is enabled
- WHEN the page loads at either viewport
- THEN nonessential motion is reduced/disabled and CTA/form content remains available

#### Scenario: Asset contract is incomplete
- GIVEN a meaningful asset lacks alternative text or dimensions
- WHEN desktop and mobile acceptance runs
- THEN the page fails the public accessibility/performance check rather than silently shipping the omission
