# Delta Spec: ibera-alertas-production-real-smoke

## ADDED Requirements

### Requirement: Real production hydrology smoke evidence

The verification phase MUST prove Iberá Alertas production behavior with real HTTP requests against `https://www.agronauta.com.ar`. If HTTPS cannot connect, verification MUST retry the same paths against `http://www.agronauta.com.ar` and record both outcomes. Unit, contract, local, or mocked tests MUST NOT be accepted as proof for this change.

#### Scenario: Production municipalities API returns canonical payload

- GIVEN the production base URL is available
- WHEN verification fetches `GET /api/hydrology/municipalities`
- THEN the response MUST be `200` JSON with `contractVersion: "hydrology-government-municipalities-v1"`
- AND `province.provinceCode` MUST equal `AR-W` and `municipalities` MUST be an array
- AND evidence MUST record municipality count, sample ids/names, `sourceFreshness`, and whether `latestTelemetry` is present

#### Scenario: Production municipalities page renders real HTML

- GIVEN the production web origin is available
- WHEN verification fetches `GET /municipalities`
- THEN the response MUST be `200` HTML, not a framework error page
- AND the HTML MUST contain `Centro de Monitoreo Hídrico Provincial` or monitored locality text
- AND evidence MUST include status, content-type, and matched text

#### Scenario: Production ingest endpoint is verified safely

- GIVEN ingest is implemented as `POST /api/hydrology/ingest`
- WHEN verification posts JSON `{"contractVersion":"1.0.0","source":"PNA","reason":"production-real-smoke"}`
- THEN the response MUST be structured JSON with `contractVersion: "hydrology-government-ingest-v1"` when routing/auth allows execution
- AND expected status SHOULD be `202` with `requestedSources: ["PNA"]` and `results[0].status` in `success|empty|failed|skipped`
- AND if the response is `401`, `403`, `404`, `405`, or `5xx`, evidence MUST classify the failure as auth, missing route, wrong method, upstream/BFF, API, database, or provider failure

### Requirement: Smoke result classification and artifact evidence

The verification report MUST preserve direct production evidence without secrets: URL scheme tried, path, HTTP status, content-type, key payload fields, and failure classification. It MUST NOT persist bearer tokens, cookies, or full secret-bearing headers.

#### Scenario: HTTPS fails and HTTP fallback is attempted

- GIVEN `https://www.agronauta.com.ar` fails DNS/TLS/connectivity
- WHEN verification retries `http://www.agronauta.com.ar`
- THEN both attempts MUST be recorded
- AND the final verdict MUST state which scheme, if any, proved production behavior

#### Scenario: Production returns degraded but valid hydrology data

- GIVEN the API returns a valid contract with empty/degraded telemetry
- WHEN verification inspects the payload directly
- THEN the smoke MAY pass API contract verification
- AND it MUST mark data freshness/provider health as degraded instead of replacing evidence with local tests

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
