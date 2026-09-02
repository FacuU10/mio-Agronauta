# Performance and Hydration Specification

## Purpose

Reduce avoidable client work and hydration risk while preserving route behavior, data contracts, and narrow client interaction islands.

## Requirements

### Requirement: Server and client boundaries are deliberate

Routes MUST remain Server Components by default, serialize only required normalized data, and isolate browser interaction, focus, and local state in minimal client islands. Server-only data and credentials MUST NOT cross the client boundary.

#### Scenario: Route renders without client-only dependence
- GIVEN a route can obtain initial data on the server
- WHEN it loads at 1440x900 or 390x844
- THEN initial content is rendered without an avoidable client waterfall or hydration error

#### Scenario: Browser-only behavior is isolated
- GIVEN a feature needs event handlers, browser APIs, or focus management
- WHEN the route is inspected at both viewports
- THEN only the necessary island is client-rendered and no secret, auth token, or server-only payload is serialized

### Requirement: Fetching and assets avoid avoidable waterfalls

Independent data reads MUST be started in parallel where dependencies allow. Heavy or below-fold assets MUST be deferred appropriately; critical assets MUST have dimensions and stable loading behavior.

#### Scenario: Independent reads complete coherently
- GIVEN route data sources are independent
- WHEN the page loads at either viewport
- THEN requests are not serialized unnecessarily and loading boundaries expose truthful progress

#### Scenario: Slow or missing asset does not destabilize layout
- GIVEN a noncritical asset is delayed or unavailable
- WHEN the route is loaded at 1440x900 and 390x844
- THEN layout remains usable, no hydration mismatch is logged, and the asset is not claimed as present

### Requirement: Hydration and runtime evidence are testable

Acceptance MUST record console errors, hydration warnings, request timing/status, and the route state observed at both required viewports. Suppression of hydration warnings MUST be limited to an evidenced expected mismatch.

#### Scenario: Clean hydration
- GIVEN the route is loaded with its supported data mode
- WHEN browser acceptance runs at both viewports
- THEN no unexpected hydration error/warning or duplicate request is recorded

#### Scenario: External dependency is blocked
- GIVEN a provider or auth dependency cannot be reached
- WHEN the route is tested at either viewport
- THEN the evidence records the external blocker and verifies truthful unavailable/retry UI instead of treating the run as performance success
