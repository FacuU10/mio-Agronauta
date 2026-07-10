# Delta Spec: ibera-alerta-production-500-fix

## ADDED Requirements

### Requirement: Municipalities production 500 must be classified by layer

`GET /api/hydrology/municipalities` failures in production MUST be classified as one of: BFF upstream configuration, BFF upstream fetch/runtime failure, API database query failure, API contract validation failure, API environment/configuration failure, or unknown. Classification MUST be supported by request-correlated logs and MUST NOT expose secrets in public responses.

#### Scenario: Direct API succeeds but web-origin BFF fails

- GIVEN direct Express API smoke for `/api/hydrology/municipalities` returns `200` JSON
- WHEN `https://www.agronauta.com.ar/api/hydrology/municipalities` returns a non-2xx response
- THEN the failure MUST be classified as BFF proxy/runtime or BFF environment configuration
- AND logs MUST include the upstream base classification and request ID without printing tokens or database URLs

#### Scenario: Direct API fails before contract validation

- GIVEN the Express route receives `GET /api/hydrology/municipalities`
- WHEN `getMunicipalityTelemetryOverview` throws or the database rejects the SQL
- THEN the failure MUST be classified as API database query failure
- AND the public response MUST be structured JSON with a stable error code and request ID
- AND server logs MUST include the sanitized database error message and query phase

#### Scenario: Direct API query succeeds but contract parse fails

- GIVEN the repository returns production rows
- WHEN `hydrologyGovernmentMunicipalitiesResponseSchema.parse` rejects the payload
- THEN the failure MUST be classified as API contract validation failure
- AND server logs MUST include sanitized Zod issue paths/counts, not full sensitive payloads

### Requirement: Seeded production data must produce a valid municipalities contract

When production contains seeded Corrientes municipality rows and hydrology telemetry rows, `GET /api/hydrology/municipalities` MUST return `200` JSON with `contractVersion: "hydrology-government-municipalities-v1"`, `province.provinceCode: "AR-W"`, and a non-empty `municipalities` array. Empty telemetry for an individual municipality MUST be represented as `latestTelemetry: []`, not as a server error.

#### Scenario: Production-shaped seeded database

- GIVEN the database contains the seeded municipality set and telemetry from PNA, INA, INMET, and SMN
- WHEN the repository resolves the overview for `AR-W`
- THEN all eligible municipalities MUST be returned once
- AND each municipality MUST include `gaugeMappings` with array fields defaulted to `[]`
- AND telemetry dates, numeric values, nullable values, URLs, forecast horizon, and confidence fields MUST satisfy the shared Zod contract

#### Scenario: Municipality has no mapping or telemetry

- GIVEN a municipality row exists without matching telemetry or with absent gauge mappings
- WHEN the overview endpoint is requested
- THEN the municipality MUST still appear in the response
- AND `latestTelemetry` MUST be `[]`
- AND the endpoint MUST NOT throw due to null array concatenation or null date conversion

### Requirement: Hydrology BFF must fail safely in production

The Next.js hydrology BFF route MUST NOT silently use a localhost upstream fallback in production. If `AGRONAUTAS_API_INTERNAL_URL` is missing, localhost, unreachable, or fails during `fetch`, the BFF MUST return structured JSON with `502` or `503`, preserve/generate `x-request-id`, and avoid leaking secrets.

#### Scenario: Missing production upstream URL

- GIVEN the web app is running in production
- AND `AGRONAUTAS_API_INTERNAL_URL` is unset or points to localhost
- WHEN `/api/hydrology/municipalities` is requested
- THEN the BFF MUST return a structured upstream configuration error
- AND MUST NOT attempt to call `http://localhost:3001`

#### Scenario: Upstream fetch throws

- GIVEN `AGRONAUTAS_API_INTERNAL_URL` points to an unavailable backend
- WHEN the BFF proxies `/api/hydrology/municipalities`
- THEN it MUST return `502` or `503` JSON with a request ID
- AND logs MUST classify the error as upstream fetch failure

### Requirement: Real production smoke must prove the fix

After deployment, verification MUST use real HTTP requests against `https://www.agronauta.com.ar/api/hydrology/municipalities`. Local tests or direct database row counts alone MUST NOT be accepted as proof that the production 500 is resolved.

#### Scenario: Production municipalities API resolves

- GIVEN the fix is deployed
- WHEN verification fetches `GET https://www.agronauta.com.ar/api/hydrology/municipalities`
- THEN the response MUST be `200` JSON
- AND it MUST include `contractVersion: "hydrology-government-municipalities-v1"`, `province.provinceCode: "AR-W"`, and non-empty `municipalities`
- AND evidence MUST record status, content-type, municipality count, sample municipality ids/names, and whether telemetry is present

## MODIFIED Requirements

### Requirement: Hydrology frontend proxy routing

The existing hydrology frontend proxy routing requirement is modified to require production-safe upstream configuration and structured BFF failures. In production, the proxy MUST use an explicitly configured non-localhost `AGRONAUTAS_API_INTERNAL_URL`; fallback to `http://localhost:3001` is allowed only for local development/test.

## REMOVED Requirements

None.
