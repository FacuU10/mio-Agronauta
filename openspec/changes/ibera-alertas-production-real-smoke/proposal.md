# Proposal: ibera-alertas-production-real-smoke

## Problem

The user reports that production still does not show old Iberá Alertas data and hydrology endpoints do not work. Prior local verification proved code/tests/build, but it explicitly did not run real deployed HTTP smoke against production web/API URLs or real provider env vars. This phase could not safely run production smoke because no public production base URL is discoverable from repo/docs/config or current process env.

## Goals

- Prove production behavior with real HTTP endpoint checks, not unit tests.
- Verify that the deployed web origin serves `/municipalities` and proxies `/api/hydrology/*` to the deployed Express API.
- Verify `GET /api/hydrology/municipalities` returns the canonical contract and contains the 17 Corrientes monitoring localities or a clear empty/degraded state.
- Verify `/api/hydrology/ingest` method/auth expectations without destructive guessing; execute a controlled ingest only when the production URL, auth, and provider envs are confirmed.
- Record endpoint evidence and operational blockers in OpenSpec + Engram.

## Non-Goals

- Do not replace provider parsers or fix deployment config in this phase.
- Do not run unit tests as proof of production behavior.
- Do not guess production domains or trigger mutating ingest without a confirmed URL/auth/method/body.
- Do not expose or persist secrets in artifacts.

## Proposed Changes / Execution Plan

### 1. Collect required deployment inputs

Require these values from repo config, deployment env, or the operator before running smoke:

- `WEB_BASE_URL` — public deployed Next.js origin.
- `AGRONAUTAS_API_INTERNAL_URL` — deployed web env pointing to the Express API base, never localhost in production.
- Optional `API_BASE_URL` — direct Express API base if direct backend smoke is allowed.
- Auth state: whether `AGRONAUTAS_AUTH_ENABLED=true`; if yes, confirm `AGRONAUTAS_BFF_BEARER_TOKEN` or operator token is set in deployment secrets.
- Provider URL envs: `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`.

### 2. Run non-mutating real HTTP smoke first

Against `WEB_BASE_URL`:

1. `GET /api/hydrology/municipalities`
   - Expect `200` JSON, `contractVersion: hydrology-government-municipalities-v1`, `province.provinceCode: AR-W`, and a `municipalities[]` array.
   - Record count, sample municipality IDs, freshness labels, and whether any `latestTelemetry[]` exists.
2. `GET /municipalities`
   - Expect `200` HTML, no obvious Next.js error page, and visible text for the monitoring UI such as `Centro de Monitoreo Hídrico Provincial` or localities.

If direct `API_BASE_URL` is provided, also run `GET /api/hydrology/municipalities` directly to isolate web BFF vs API failures.

### 3. Identify ingest method/auth safely

The repo documents and implements ingest as `POST /api/hydrology/ingest`; `GET` is not documented for ingest. Before a mutating POST, run only safe discovery when allowed:

- `OPTIONS /api/hydrology/ingest` if the deployment supports it, or inspect returned status/headers from a non-body request without assuming success.
- Do not treat `405/404/401/403` as proof of business failure; use it to identify routing/auth requirements.

### 4. Controlled ingest smoke only after confirmation

When URL/auth/provider config is confirmed, execute a scoped POST through the web BFF or API:

```http
POST /api/hydrology/ingest
Content-Type: application/json

{"source":"PNA","reason":"production-real-smoke"}
```

Expected result: `202` JSON with `contractVersion: hydrology-government-ingest-v1`, `requestedSources: ["PNA"]`, `results[0].status` in `success|empty|failed`, and an explicit `errorMessage` if the provider cannot be parsed. A `failed` result may be acceptable as honest production evidence if old data remains visible and the error points to missing provider configuration.

## Acceptance Criteria

- No smoke is run against guessed or memory-only domains; every target URL is sourced from repo/config/env/operator input.
- `GET {WEB_BASE_URL}/api/hydrology/municipalities` produces recorded real HTTP status/body evidence.
- `GET {WEB_BASE_URL}/municipalities` produces recorded real HTTP status/render evidence.
- Ingest is either safely verified as `POST` with required auth/config documented, or executed once with scoped body and recorded structured response.
- Any production failure is classified by layer: DNS/web route, BFF upstream config, API route, database/seed, provider URL/parser, or auth.

## Required Runtime Values Missing Now

- Public production `WEB_BASE_URL`.
- Confirmation that deployed `AGRONAUTAS_API_INTERNAL_URL` points to the production Express API.
- Direct `API_BASE_URL` if backend checks should bypass the web BFF.
- Auth/operator token status for production hydrology routes.
- Verified hydrology provider URL envs (`HYDROLOGY_*_URL`) if ingest should succeed rather than honestly degrade.

## Rollback / Safety

- GET checks are non-destructive.
- Ingest POST is mutating; run it source-scoped, once, and only after operator confirmation.
- If smoke fails, do not keep retrying ingest. Capture response and route to deployment config/API/provider diagnosis.

## Next Recommended Phase

Run an SDD verify/smoke phase as soon as the production URL and env/auth expectations are supplied. If production env is unavailable, run a deployment-config apply phase to expose/document the required URL variables and add a guarded smoke script.
