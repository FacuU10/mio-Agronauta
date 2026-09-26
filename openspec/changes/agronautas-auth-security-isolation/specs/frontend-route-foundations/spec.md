# Delta for Frontend Route Foundations

## MODIFIED Requirements

### Requirement: Existing boundaries remain contract-compatible

Route foundations MUST preserve BFF paths, Zod-normalized payloads, trusted-principal auth outcomes, simulation/seam labels, and current evidence vocabulary. The exact BFF handler at `apps/web/src/app/api/agronautas/[...path]/route.ts` MUST strip browser credentials and use only its server-owned authentication contract. Foundations MUST NOT add providers, infer missing records, turn a local simulation into production identity, or expose membership credentials to the browser.
(Previously: foundations preserved BFF and auth outcomes without naming the literal credential-isolation boundary or trusted principal.)

#### Scenario: Real contract passes through
- GIVEN a route receives a valid BFF response with an explicit evidence mode
- WHEN the page renders at both viewports
- THEN the route preserves normalized state, source, freshness, and auth semantics

#### Scenario: Contract or upstream is unavailable
- GIVEN BFF, Zod parsing, auth, or upstream access fails
- WHEN the route renders at either viewport
- THEN it shows a bounded recovery/unavailable state and never fabricates provider data or successful tenancy

#### Scenario: Browser bearer credential is supplied
- GIVEN a browser request includes an authorization header or cookie for an Agronautas BFF call
- WHEN `apps/web/src/app/api/agronautas/[...path]/route.ts` forwards the request
- THEN browser credentials are not forwarded upstream and only the server-owned credential contract is used

## ADDED Requirements

### Requirement: Protected route recovery is explicit

Protected routes MUST distinguish `401`, `403`, maintenance, and unavailable states in their visible recovery copy and MUST NOT represent a denied or degraded response as public success.

#### Scenario: Membership is denied
- GIVEN the upstream returns `403` for a workspace request
- WHEN the route renders
- THEN it shows forbidden guidance without private payload or indexable success metadata
