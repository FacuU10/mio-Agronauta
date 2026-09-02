# SEO and Discoverability Specification

## Purpose

Make public discovery machine-readable and safe while keeping operational and protected routes out of unsupported public claims.

## Requirements

### Requirement: Public metadata is complete and canonical

Public pages MUST expose stable title, description, absolute canonical URL, Open Graph, Twitter/social image behavior, and the declared Spanish locale. Metadata MUST describe only content actually rendered.

#### Scenario: Public metadata matches content
- GIVEN `/` or `/probar-demo` renders public content
- WHEN head output is inspected at either viewport
- THEN title, description, canonical, locale, and social fields match the page and resolve to the same public origin

#### Scenario: Metadata invents content
- GIVEN a route lacks canonical/social fields or advertises unsupported provider, forecast, or capability content
- WHEN metadata is inspected at 1440x900 and 390x844
- THEN SEO acceptance fails and the unsupported claim is removed

### Requirement: Robots and sitemap reflect access and scope

`robots` and `sitemap` behavior MUST include only intended public URLs and MUST exclude protected, demo-only, parameterized private, and unavailable surfaces according to their access contract.

#### Scenario: Crawler receives bounded index set
- GIVEN the public route set is known
- WHEN crawler directives and sitemap are requested
- THEN only canonical public URLs appear, with no duplicate or private route entries

#### Scenario: Private route leaks into discovery
- GIVEN a protected or unavailable route appears in sitemap or is marked indexable
- WHEN SEO checks run at both viewports
- THEN the check fails and the route is removed or explicitly disallowed

### Requirement: Social previews do not overstate evidence

Social metadata MUST avoid private payloads, fabricated imagery, live-data claims, and unsupported outcome language. Missing social assets MUST degrade to truthful text rather than a broken or misleading preview.

#### Scenario: Share preview is truthful
- GIVEN a public page has approved copy and a valid social asset
- WHEN its metadata is inspected at both viewports
- THEN the preview identifies the public page without claiming unavailable operational evidence

#### Scenario: Asset or claim is unavailable
- GIVEN a social asset or provider proof is missing
- WHEN preview metadata is generated at either viewport
- THEN the fallback remains valid and does not imply the missing asset or evidence exists
