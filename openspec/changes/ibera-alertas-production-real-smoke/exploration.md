# Exploration: ibera-alertas-production-real-smoke

## Current State

Iberá Alertas has local SDD/spec evidence for the hydrology production fix, but the archived verification explicitly says it did not exercise deployed infrastructure or real provider environment variables. The current codebase wires the Express API at `/api/hydrology` in `apps/api/src/server.ts` and implements the Next.js BFF route at `apps/web/src/app/api/hydrology/[...path]/route.ts`, which forwards browser-origin `/api/hydrology/*` calls to `AGRONAUTAS_API_INTERNAL_URL` or `http://localhost:3001`.

The frontend `/municipalities` path renders `GovernmentOverview` from `apps/web/src/components/government/overview.tsx`; it fetches `/api/hydrology/municipalities` and maps the canonical backend payload (`latestTelemetry`, `sourceFreshness.freshness`, province alerts). The detail page fetches `/api/hydrology/municipalities/{id}/dashboard` and consumes `inaPredictions30d`, `alerts`, and `provenance`.

Manual ingest is implemented as `POST /api/hydrology/ingest` in `apps/api/src/presentation/routes/hydrology-government.ts`. The endpoint returns `202` with `contractVersion: hydrology-government-ingest-v1`, top-level `status`, `requestedSources`, and per-source `results`. In non-test mode, failed/empty source fetches are recorded as `failed` or `empty` and do not write offline fixture telemetry. Provider URLs are configurable through `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, and `HYDROLOGY_SMN_URL`; defaults are public pages/portals and should not be treated as verified production machine-readable endpoints.

No public production web/API base URL is discoverable in repo config/docs/env examples. The only URL expectations found are internal/local defaults: `AGRONAUTAS_API_INTERNAL_URL=http://localhost:3001`, `API_PORT=3001`, and local BFF usage through `/api/hydrology/*`. Environment variables in the current shell for common production URL names (`PRODUCTION_URL`, `PUBLIC_URL`, `SITE_URL`, `APP_URL`, `VERCEL_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`, `AGRONAUTAS_API_INTERNAL_URL`) are unset. Therefore no real production HTTP smoke was run in this phase.

## Affected Areas

- `apps/web/src/app/api/hydrology/[...path]/route.ts` — deployed BFF path that must forward `GET /api/hydrology/municipalities` and `POST /api/hydrology/ingest` to the deployed Express API.
- `apps/web/src/components/government/overview.tsx` — `/municipalities` runtime page depends on the BFF returning canonical hydrology data.
- `apps/web/src/components/government/detail.tsx` — detail runtime path depends on dashboard and copilot hydrology BFF calls.
- `apps/api/src/server.ts` — mounts Express hydrology routes at `/api/hydrology`.
- `apps/api/src/presentation/routes/hydrology-government.ts` — production ingest method/contract and seed/runtime data path.
- `packages/hydrology-engine/src/clients/http-clients.ts` — source URL env override expectations and default provider endpoints.
- `.env.example`, `apps/web/.env.example`, `apps/api/.env.example` — document internal API URL and auth token expectations, but not public production URL.
- `openspec/specs/ibera-alerta/spec.md` — production spec says final deployed smoke is still required.

## Real Smoke Discovery

- `GET /api/hydrology/municipalities`: documented and implemented, but no safe production base URL was discoverable.
- `GET /municipalities`: documented and implemented as frontend route, but no safe production web base URL was discoverable.
- `/api/hydrology/ingest`: documented and implemented as `POST`; no safe production base URL was discoverable. It may require `AGRONAUTAS_BFF_BEARER_TOKEN`/`AGRONAUTAS_AUTH_TOKEN_OPERATOR` if auth is enabled in deployment. Triggering it is operationally mutating, so a smoke must be controlled and preferably source-scoped (for example `{"source":"PNA","reason":"production-smoke"}`) only after operator approval and provider URLs are verified.

## Missing to Run Real Production Smoke

The next phase needs these runtime inputs from deployment/ops:

- Public web base URL, e.g. `https://<production-web-host>`; smoke targets: `GET {WEB_BASE_URL}/municipalities` and `GET {WEB_BASE_URL}/api/hydrology/municipalities`.
- Internal API URL configured in the web deployment as `AGRONAUTAS_API_INTERNAL_URL`, pointing at the deployed Express API base, not localhost.
- If direct API smoke is desired, public or private API base URL for `GET {API_BASE_URL}/api/hydrology/municipalities` and controlled `POST {API_BASE_URL}/api/hydrology/ingest`.
- Auth/operator token expectations if `AGRONAUTAS_AUTH_ENABLED` is true: `AGRONAUTAS_BFF_BEARER_TOKEN` or `AGRONAUTAS_AUTH_TOKEN_OPERATOR` must be configured as deployment secrets.
- Verified provider URL envs: `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`; defaults are not sufficient evidence of working production ingestion.

## Approaches

1. **Real smoke with supplied production base URL** — Run non-mutating GET checks first, then a controlled ingest POST only with operator confirmation and valid auth/provider config.
   - Pros: Directly answers the user's concern with production evidence.
   - Cons: Requires deployment URL and may mutate ingestion state.
   - Effort: Low once URLs/tokens are provided.

2. **Repo-only readiness audit** — Keep the current phase to code/config tracing and produce a smoke checklist.
   - Pros: Safe without unknown production targets or secrets.
   - Cons: Does not prove production behavior.
   - Effort: Low.

3. **Add a dedicated production smoke script/checklist in the repo** — Later implementation could encode safe GET checks and guarded ingest behavior.
   - Pros: Repeatable operator evidence.
   - Cons: Requires apply phase and careful secret handling.
   - Effort: Medium.

## Recommendation

Proceed to proposal/tasks for a real-smoke execution gate, not more unit tests. The immediate blocker is operational, not code-local: obtain a production web/API base URL and deployment env confirmation, then run real HTTP checks. Do not run `POST /api/hydrology/ingest` blindly; treat it as mutating and require auth/method/body confirmation before execution.

## Risks

- The deployed web may still point `AGRONAUTAS_API_INTERNAL_URL` to localhost or an unset value, causing production BFF failures even though local code is correct.
- Provider defaults may return HTML/non-machine-readable payloads, so ingest may correctly return `partial`/`failed` while old data remains stale.
- Running ingest without auth/operator confirmation can mutate production run history and create noisy failed runs.
- No public production URL in repo/config/env means any smoke against guessed domains would violate the user's safety constraint.

## Ready for Proposal

Yes. The proposal should capture the missing production URL/env inputs, the exact non-destructive GET smoke sequence, and a guarded ingest smoke procedure.
