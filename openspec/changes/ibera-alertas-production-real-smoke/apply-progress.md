# Apply Progress: ibera-alertas-production-real-smoke

**Change**: `ibera-alertas-production-real-smoke`  
**Phase**: 5 — Apply / Execution  
**Mode**: Standard; real production HTTP only  
**Base URL**: `https://www.agronauta.com.ar`  
**Executed at**: 2026-07-09 23:44 UTC  
**Executor**: sdd-apply (`openai/gpt-5.5`)

## Executive Summary

Real network smoke requests were executed against production. HTTPS DNS/TCP/TLS connectivity is healthy and the `/municipalities` page serves valid cached HTML containing the hydrology monitoring UI, but both hydrology API routes tested through the web origin return `500 Internal Server Error` with empty bodies. No mock data, unit tests, or test runners were used.

## Environment / Connectivity Evidence

| Check | Evidence |
|---|---|
| DNS | `www.agronauta.com.ar` resolved to `172.67.161.168`, `104.21.42.115` |
| HTTPS port | `Test-NetConnection` to port 443: `TcpTestSucceeded=True` |
| HTTPS SSL/connectivity | HTTPS connected successfully; no SSL fallback was required |
| HTTP fallback spot-check | `http://www.agronauta.com.ar/api/hydrology/municipalities` returns `308 Permanent Redirect` to HTTPS, then HTTPS returns `500` |

## Real HTTP Evidence

### 1. GET `/api/hydrology/municipalities`

| Field | Value |
|---|---|
| URL | `https://www.agronauta.com.ar/api/hydrology/municipalities` |
| Tool | `curl.exe` and PowerShell `Invoke-WebRequest` |
| Status | `500 Internal Server Error` |
| Redirects | `0` |
| Body | Empty (`Content-Length: 0`) |
| Content-Type | Not present |
| Timing | DNS `0.032874s`; TCP `0.147752s`; TLS `0.260821s`; start-transfer `0.517064s`; total `0.517295s` |
| Relevant headers | `Server: cloudflare`; `Strict-Transport-Security: max-age=63072000`; `X-Matched-Path: /api/hydrology/[...path]`; `X-Vercel-Cache: MISS`; `CF-Cache-Status: DYNAMIC` |

**Structural result**: Failed. Because the response is `500` with an empty body and no JSON content type, the smoke could not verify `contractVersion`, `province.provinceCode`, `municipalities`, `sourceFreshness`, `freshness`, or `latestTelemetry`.

**Classification**: Production web/BFF or upstream API failure on the Next.js catch-all hydrology API route. The request reached Vercel/Cloudflare and matched `/api/hydrology/[...path]`, so this is not a DNS/TLS failure.

### 2. GET `/municipalities`

| Field | Value |
|---|---|
| URL | `https://www.agronauta.com.ar/municipalities` |
| Tool | `curl.exe -L` |
| Status | `200 OK` |
| Redirects | `0` |
| Content-Type | `text/html; charset=utf-8` |
| Timing | DNS `0.123790s`; TCP `0.155956s`; TLS `0.264140s`; start-transfer `0.362609s`; total `0.362864s` |
| Relevant headers | `X-Matched-Path: /municipalities`; `X-Nextjs-Prerender: 1`; `X-Vercel-Cache: HIT`; `Server: cloudflare`; `Strict-Transport-Security: max-age=63072000` |
| Matched HTML evidence | `Defensa Civil · Corrientes`; `Centro de Monitoreo Hídrico Provincial`; `Localidades bajo monitoreo`; `Cargando…` |

**Structural result**: Passed for server-rendered page availability. The HTML is valid Next.js output for `/municipalities`, contains the expected hydrology UI text, and is not a 404/global error document. It appears prerendered/cached and shows loading placeholders for client-side data.

### 3. POST `/api/hydrology/ingest`

| Field | Value |
|---|---|
| URL | `https://www.agronauta.com.ar/api/hydrology/ingest` |
| Method/body | `POST` with `Content-Type: application/json` and body `{"contractVersion":"1.0.0","source":"PNA","reason":"production-real-smoke"}` |
| Tool | `curl.exe` and PowerShell `Invoke-WebRequest` |
| Status | `500 Internal Server Error` |
| Redirects | `0` |
| Body | Empty (`Content-Length: 0`) |
| Content-Type | Not present |
| Timing | DNS `0.012939s`; TCP `0.041355s`; TLS `0.080621s`; start-transfer `0.348001s`; total `0.348149s` |
| Relevant headers | `Server: cloudflare`; `Strict-Transport-Security: max-age=63072000`; `X-Matched-Path: /api/hydrology/[...path]`; `X-Vercel-Cache: MISS`; `CF-Cache-Status: DYNAMIC` |

**Structural result**: Failed. The endpoint did not return the expected `202` JSON, `contractVersion: hydrology-government-ingest-v1`, `requestedSources`, or `results` array.

**Classification**: Production web/BFF or upstream API failure on the hydrology API catch-all route. It is not an auth-style `401/403`, missing route `404`, or wrong method `405`; it is a server-side `500` with no diagnostic body.

## Task Completion

| Task group | Status | Notes |
|---|---|---|
| Phase 1 — Environment | Complete | DNS and HTTPS TCP connectivity verified; HTTP fallback redirects to HTTPS. |
| Phase 2 — Municipalities API | Complete as executed; smoke failed | Real request returned `500` empty body, so JSON contract/data could not be validated. |
| Phase 3 — Municipalities page | Complete; smoke passed | Page returned `200` HTML with expected hydrology text. |
| Phase 4 — Ingest API | Complete as executed; smoke failed | Real scoped POST returned `500` empty body. |
| Phase 5 — Evidence compilation | Complete | This artifact contains sanitized real network evidence; no auth/cookie/bearer headers included. |

## Deviations from Design

- No application code was changed, matching the design.
- HTTPS connected successfully, so the HTTP fallback was not used as the primary scheme. A non-primary HTTP spot-check showed HTTP redirects to HTTPS.
- The earlier task artifact mentioned `verification-report.md`; the phase-5 launch instruction explicitly required `apply-progress.md`, so the smoke evidence was saved here.

## Issues Found

- `GET /api/hydrology/municipalities` fails in production with `500` and empty body.
- `POST /api/hydrology/ingest` fails in production with `500` and empty body.
- `/municipalities` serves cached/prerendered HTML successfully, but the live hydrology API behind the page is not healthy through the production web origin.

## Risk / Safety Notes

- The ingest POST was executed once with the scoped `PNA` smoke body requested by the user.
- No bearer tokens, cookies, authorization headers, or secret-bearing values were persisted.
- Empty `500` responses prevent deeper root-cause classification without production server/Vercel/API logs.

## Recommended Next Step

Run an SDD verify/deployment-diagnosis phase focused on production server logs and environment routing for `/api/hydrology/[...path]`, especially the deployed `AGRONAUTAS_API_INTERNAL_URL`, backend availability, auth configuration, and hydrology provider/database env vars.
