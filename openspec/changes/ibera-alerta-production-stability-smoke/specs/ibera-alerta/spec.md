# Delta for ibera-alerta

## ADDED Requirements

### Requirement: Configurable readiness and revision metadata

The API MUST use a deployment-configurable, finite readiness timeout for database checks. `/health` MUST expose the configured non-secret revision when available and MUST NOT expose credentials, URLs, or environment values.

#### Scenario: Cold-start readiness uses configured bound
- GIVEN a valid readiness timeout is configured
- WHEN the database check completes within that bound
- THEN readiness succeeds without using a hard-coded timeout

#### Scenario: Health metadata is safe
- GIVEN a non-secret revision is configured
- WHEN `/health` is requested
- THEN the response includes that revision and no secret configuration

### Requirement: Geo-blocked provider degradation

The ingest/proxy contract MUST classify independently verified INMET or SMN regional blocking as environmental degradation, not a scraper regression. It MUST preserve last-known data and MUST NOT add retries, parsing changes, or fixture fallback.

#### Scenario: Provider is blocked from the deployment region
- GIVEN an INMET or SMN request receives a regional access block
- WHEN ingestion reports the source result
- THEN it records safe degraded diagnostics and leaves prior data readable

## MODIFIED Requirements

### Requirement: Hydrology frontend proxy routing

The Next.js app MUST route `/api/hydrology/*` to the Express backend `/api/hydrology/*` in production. This MAY be implemented as `apps/web/src/app/api/hydrology/[...path]/route.ts` or a `next.config.js/mjs` rewrite, but the deployed frontend MUST NOT return a web-origin 404 for hydrology API calls. The proxy MUST support GET and POST, preserve upstream status/body/content-type, use no-store semantics, and forward request body and essential headers. Each upstream request MUST use the operator-approved finite BFF timeout and MUST return a safe timeout response when that bound expires; persistent connections MAY be used only when operator-approved.

(Previously: proxy routing required forwarding and response preservation but did not require an operator-aligned timeout or connection policy.)

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

#### Scenario: Upstream exceeds the BFF bound
- GIVEN the upstream does not respond before the configured BFF timeout
- WHEN the proxy deadline expires
- THEN the browser receives a safe timeout response without connection or secret details
