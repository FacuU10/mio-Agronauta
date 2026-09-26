# Delta for Frontend Route Foundations

## ADDED Requirements

### Requirement: Route registry and navigation agree

The route registry, rendered pages, product shell links, metadata tests, and deep links MUST declare the same in-scope route set, including `/agronautas/marketplace`. A missing or protected route MUST resolve to its documented boundary rather than a misleading success page.

#### Scenario: Marketplace route is reachable
- GIVEN the marketplace page exists and its access contract permits the current actor
- WHEN the user selects Marketplace from the shell or opens `/agronautas/marketplace`
- THEN the URL, heading, active navigation state, route contract, and rendered page agree

#### Scenario: Unsupported deep link is bounded
- GIVEN a parameterized route has an unknown identifier or unavailable capability
- WHEN the user opens the deep link
- THEN the route shows not-found, forbidden, unavailable, or recovery state as applicable and offers safe navigation

## MODIFIED Requirements

### Requirement: Documents expose truthful identity and boundaries

Each declared route MUST expose Spanish document language, route-appropriate identity, one main landmark, and boundary behavior for loading, not-found, error, forbidden, maintenance, and degraded conditions. Protected or unavailable content MUST NOT be represented as public success.
(Previously: routes required language, metadata, main, loading, not-found, and error behavior.)

#### Scenario: Known route renders its contract
- GIVEN a declared public, protected, or product route is requested
- WHEN it resolves at 1440x900 and 390x844
- THEN it has `lang="es"`, one `<main>`, a useful heading, route metadata, and the correct access/evidence label

#### Scenario: Boundary is truthful
- GIVEN auth, upstream, maintenance, or route resolution prevents normal content
- WHEN the request settles
- THEN the matching boundary explains the condition and provides only safe actions without fabricated data

### Requirement: Navigation and focus targets are stable

Every audited route MUST provide a keyboard-reachable skip link to its actual main content, preserve browser link semantics, expose visible focus, and maintain active shell context. Sticky shell or summary content MUST NOT hide the target or the focused control.
(Previously: routes required stable skip links, browser semantics, and visible focus.)

#### Scenario: User navigates the shell by keyboard
- GIVEN focus starts on the document at either required viewport
- WHEN the user activates the skip link and traverses product navigation
- THEN focus reaches the single main landmark, links expose their destinations, and the active section is announced

#### Scenario: Navigation contract fails
- GIVEN a link points to a missing route, duplicates an inaccessible control, or lacks a skip target
- WHEN route acceptance runs at both viewports
- THEN the check fails and the route is not foundation-compliant

### Requirement: Public discovery is explicit and bounded

The public route set MUST provide canonical URLs, robots directives, sitemap entries, and social metadata only for routes whose access contract is public. Protected, demo-only, parameterized, marketplace-operational, and unavailable routes MUST be excluded or explicitly bounded.
(Previously: protected, demo-only, parameterized, and unavailable routes were excluded according to discoverability.)

#### Scenario: Public page is shareable
- GIVEN a public page has an explicitly configured origin
- WHEN metadata and sitemap output are inspected
- THEN canonical, Open Graph, Twitter, title, description, and sitemap identify the same public URL

#### Scenario: Operational route is private
- GIVEN `/agronautas/marketplace` or an operational detail requires access
- WHEN crawlers inspect robots, sitemap, and metadata
- THEN no private payload or unsupported success claim is advertised
