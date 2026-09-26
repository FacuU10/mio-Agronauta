# Delta for SEO and Discoverability

## MODIFIED Requirements

### Requirement: Public metadata is complete and canonical

Public pages MUST expose stable title, description, absolute canonical URL, Open Graph, Twitter/social image behavior, and Spanish locale. Metadata MUST describe only content actually rendered and MUST respect whether a route is public, demo, protected, or operational.
(Previously: public metadata had to match rendered content and a stable public origin.)

#### Scenario: Public metadata matches content
- GIVEN a public page renders with an explicitly configured origin
- WHEN head output is inspected at either viewport
- THEN title, description, canonical, locale, and social fields match the page and public origin

#### Scenario: Protected content is not advertised
- GIVEN a demo or operational route requires access or contains private state
- WHEN metadata is inspected
- THEN it exposes no private payload and does not claim public operational evidence

### Requirement: Robots and sitemap reflect access and scope

`robots` and `sitemap` MUST include only intended public URLs and MUST exclude protected, demo-only, parameterized private, unavailable, and operational marketplace surfaces according to their access contract. The route registry and sitemap MUST agree.
(Previously: robots and sitemap excluded protected, demo-only, parameterized private, and unavailable surfaces.)

#### Scenario: Crawler receives bounded index set
- GIVEN the public route set and origin are configured
- WHEN crawler directives and sitemap are requested
- THEN only canonical public URLs appear with no duplicate or private route entries

#### Scenario: Route registry drifts
- GIVEN a rendered route is missing from its declared contract or appears in sitemap without public access
- WHEN SEO checks run
- THEN the check fails and the route is removed or reconciled before acceptance

## ADDED Requirements

### Requirement: Marketplace discovery has an explicit access contract

Marketplace catalog pages MAY be publicly discoverable only when their rendered data and authorization contract explicitly permit it. RFQ, management, participant, and parameterized private views MUST remain bounded from public discovery.

#### Scenario: Catalog access is public
- GIVEN the catalog contract explicitly permits public discovery
- WHEN sitemap and metadata are generated
- THEN only the approved catalog URL is canonicalized and RFQ/private routes remain excluded
