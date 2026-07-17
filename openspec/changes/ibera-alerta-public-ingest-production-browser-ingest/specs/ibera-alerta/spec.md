# Delta for ibera-alerta

## ADDED Requirements

### Requirement: Authenticated operator ingest interface

`/municipalities/ingest` MUST reject anonymous access and SHALL let an authorized operator submit an ingest token through a password-masked, labelled control. The control and submission feedback MUST be keyboard operable and expose status/errors to assistive technology.

#### Scenario: Authorized operator submits
- GIVEN an authorized operator opens the ingest page
- WHEN they enter a token and submit
- THEN the token is visually masked and one same-origin request is initiated
- AND the pending/result state is announced accessibly

#### Scenario: Anonymous user is blocked
- GIVEN an anonymous visitor requests the page or trigger
- WHEN access control evaluates the request
- THEN ingest is not initiated and a safe rejection is returned

### Requirement: Ephemeral token confidentiality

The token MUST exist only in live component/request memory and MUST be cleared after submission and unmount. The system MUST NOT recover, display, hardcode, persist, put in browser storage/cookies, telemetry, or logs any token value.

#### Scenario: Lifecycle ends
- GIVEN an operator has entered a token
- WHEN submission completes or the panel unmounts
- THEN the input state is cleared
- AND no later page interaction can retrieve it

#### Scenario: Historical secret handling
- GIVEN a historical audit identifies token-like material
- WHEN this capability is implemented or verified
- THEN no value is recovered, reproduced, or committed
- AND suspected active credentials are handled only by external revoke/rotate procedures

### Requirement: Sanitized ingest outcome presentation

The UI MUST render only the safe structured ingest contract for `completed`, `partial`, and `failed` outcomes. It MUST show safe upstream authorization/failure feedback and MUST NOT render token data, credentials, raw stacks, internal network details, or unbounded diagnostics.

#### Scenario: Partial result
- GIVEN the canonical response has `status=partial` and source results
- WHEN the request completes
- THEN the UI identifies successful and unsuccessful sources
- AND displays only contract-safe messages/diagnostics

#### Scenario: Upstream rejection
- GIVEN the upstream rejects an entered token
- WHEN the BFF returns its safe error contract
- THEN the UI reports a safe failure without echoing the token

### Requirement: Browser ingest production evidence and rollback

Production verification MUST perform one bounded authorized browser-origin ingest through the same-origin BFF and confirm safe structured output. Rollback MUST remove browser-trigger capability without changing public read routes or the canonical backend endpoint.

#### Scenario: Bounded production proof
- GIVEN the change is deployed with an authorized operator
- WHEN one browser-origin ingest is submitted
- THEN evidence records the safe status/result without token values
- AND no retry, polling, or duplicate ingest is issued

#### Scenario: Capability rollback
- GIVEN browser ingest must be withdrawn
- WHEN its route, panel, and proxy allowance are reverted together
- THEN browser triggering stops
- AND municipal read endpoints remain available

## MODIFIED Requirements

### Requirement: Hydrology frontend proxy routing

The Next.js app MUST route `/api/hydrology/*` to the Express backend `/api/hydrology/*` in production. This MAY be implemented as `apps/web/src/app/api/hydrology/[...path]/route.ts` or a `next.config.js/mjs` rewrite, but the deployed frontend MUST NOT return a web-origin 404 for hydrology API calls. The proxy MUST support GET and POST, preserve upstream status/body/content-type, use no-store semantics, and forward request body and essential headers. For an authorized same-origin `POST /api/hydrology/ingest`, it MUST forward `x-hydrology-ingest-token` unchanged only to that canonical path; it MUST NOT forward that header to another path or origin.

(Previously: the proxy forwarded essential headers without an explicit, canonical-path-only ingest-token rule.)

#### Scenario: Municipalities proxy succeeds
- GIVEN the browser calls `/api/hydrology/municipalities` on the web origin
- WHEN the Express API returns 200 JSON
- THEN Next.js returns the same status and JSON contract
- AND `/municipalities` exits loading and renders data or explicit empty/error state

#### Scenario: Ingest proxy preserves method and body
- GIVEN the browser/admin client posts JSON to `/api/hydrology/ingest`
- WHEN Next.js forwards the request
- THEN the Express endpoint receives the same method/body
- AND the client receives the upstream structured ingest response

#### Scenario: Canonical token forwarding
- GIVEN an authorized same-origin POST includes `x-hydrology-ingest-token`
- WHEN its path is exactly `/api/hydrology/ingest`
- THEN the backend receives that header unchanged
- AND a noncanonical request does not receive it
