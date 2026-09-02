# Frontend Route Foundations Specification

## Purpose

Define verifiable document, route-boundary, landmark, and discovery foundations for the existing Next.js App Router surfaces without changing product scope or data contracts.

## Requirements

### Requirement: Documents expose truthful identity and boundaries

Each declared route MUST expose the correct Spanish document language, route-appropriate title and description, one main landmark, and loading, not-found, and error behavior appropriate to its boundary. Protected or unavailable content MUST NOT be represented as public success.

#### Scenario: Known route renders its contract
- GIVEN a declared public or product route is requested
- WHEN the route resolves at 1440x900 and 390x844
- THEN the document has `lang="es"`, one `<main>`, a useful heading, and its route-specific metadata

#### Scenario: Slow route exposes a truthful boundary
- GIVEN route data is delayed beyond the initial render
- WHEN the route is viewed at 1440x900 and 390x844
- THEN its loading boundary is perceivable, uses loading copy ending in `…`, and does not show fabricated values or stale success

#### Scenario: Unknown or failed route is contained
- GIVEN a route segment is unknown or its server boundary throws
- WHEN the request settles at 1440x900 and 390x844
- THEN `not-found` or `error` UI explains the condition, offers a safe navigation/retry action, and makes no data claim

### Requirement: Navigation and focus targets are stable

Every audited route MUST provide one keyboard-reachable skip link targeting its actual main content, preserve browser link semantics, and expose a visible focus indicator. The target MUST remain reachable when a product shell or sticky summary is present.

#### Scenario: Keyboard user skips chrome
- GIVEN focus starts on the document at either required viewport
- WHEN the user activates the skip link
- THEN focus moves to the single main landmark without horizontal scrolling or hidden focus

#### Scenario: Missing target is rejected
- GIVEN a route renders a skip link whose target does not exist or is duplicated
- WHEN the route acceptance check runs at both viewports
- THEN the check fails and the route is not accepted as foundation-compliant

### Requirement: Public discovery is explicit and bounded

The public route set MUST provide canonical URLs, robots directives, XML sitemap entries, and social metadata with stable absolute URLs. Authenticated, demo-only, parameterized operational, and unavailable routes MUST be excluded or marked according to their actual discoverability contract.

#### Scenario: Public page is shareable
- GIVEN `/` or `/probar-demo` is a public page
- WHEN metadata is inspected at 1440x900 and 390x844
- THEN canonical, Open Graph, Twitter, title, description, and sitemap behavior identify the same public URL

#### Scenario: Protected page is not indexed
- GIVEN `/demo` or an operational detail requires access or represents a private workflow
- WHEN crawlers inspect robots, sitemap, and document metadata at both viewports
- THEN it is not advertised as an indexable public success and no private payload is placed in social metadata

### Requirement: Existing boundaries remain contract-compatible

Route foundations MUST preserve BFF paths, Zod-normalized payloads, auth outcomes, simulation/seam labels, and current evidence vocabulary. Foundations MUST NOT add providers, infer missing records, or turn a local simulation into production identity.

#### Scenario: Real contract passes through
- GIVEN a route receives a valid BFF response with an explicit evidence mode
- WHEN the page renders at both viewports
- THEN the route preserves the normalized state, source, freshness, and auth semantics

#### Scenario: Contract or upstream is unavailable
- GIVEN BFF, Zod parsing, auth, or upstream access fails
- WHEN the route renders at either viewport
- THEN it shows a bounded recovery/unavailable state and never fabricates provider data or successful tenancy

## Non-goals and controls

- No backend, provider, marketplace, field-management, or broad visual rewrite.
- Each implementation slice MUST be reversible without resetting unrelated dirty files.
- External provider/auth availability is a blocker to production proof, not permission to invent evidence.
