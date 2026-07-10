# Tasks: Iberá Alertas Production Real Smoke Verification

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 0 application code changes; SDD evidence artifacts only |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Real-HTTP Smoke Environment Setup
- [x] 1.1 Verify internet connectivity and DNS resolution for `www.agronauta.com.ar`
- [x] 1.2 Confirm target host is reachable on HTTPS (`https://www.agronauta.com.ar`) with HTTP fallback config (`http://www.agronauta.com.ar`)

## Phase 2: GET /api/hydrology/municipalities Verification
- [x] 2.1 Fetch `GET /api/hydrology/municipalities` using selected protocol schema
- [x] 2.2 Verify HTTP status and Content-Type evidence
- [x] 2.3 Verify or classify `contractVersion` / `province.provinceCode` outcome
- [x] 2.4 Verify or classify `municipalities` / telemetry data structure outcome
- [x] 2.5 Extract/Record response headers, timings, and body details

## Phase 3: GET /municipalities Page Verification
- [x] 3.1 Fetch `GET /municipalities` from the production origin
- [x] 3.2 Verify HTTP status 200 and Content-Type contains `text/html`
- [x] 3.3 Verify response contains `Centro de Monitoreo Hídrico Provincial` or known locality text
- [x] 3.4 Record status code, content-type, and matched text evidence

## Phase 4: POST /api/hydrology/ingest Safe Verification
- [x] 4.1 Perform safe `POST /api/hydrology/ingest` with body `{"contractVersion":"1.0.0","source":"PNA","reason":"production-real-smoke"}`
- [x] 4.2 Inspect response and classify if non-202
- [x] 4.3 Classify 4xx/5xx failure type and capture response snippet safely
- [x] 4.4 Record execution status, result status, or failure classification in evidence

## Phase 5: Verification Evidence Compilation
- [x] 5.1 Compile all HTTP outcomes and JSON/HTML structural inspections into a markdown report
- [x] 5.2 Validate that no secret bearer tokens, cookies, or authorization headers are included in the compiled logs
- [x] 5.3 Save finalized smoke execution progress to `openspec/changes/ibera-alertas-production-real-smoke/apply-progress.md` per phase-5 launch instruction
