# Exploration: ibera-alerta production fix

## Current State
Iberá-Alerta exposes government hydrology routes from the Express API under `apps/api/src/presentation/routes/hydrology-government.ts`, mounted at `/api/hydrology` in `apps/api/src/server.ts`. The backend `/api/hydrology/municipalities` currently returns the canonical contract from `hydrologyGovernmentMunicipalitiesResponseSchema`: `province.provinceCode`, `sourceFreshness[].freshness/label`, `municipalities[].gaugeMappings`, and `municipalities[].latestTelemetry`.

The frontend `/municipalities` page is `apps/web/src/app/municipalities/page.tsx` and renders `GovernmentOverview` from `apps/web/src/components/government/overview.tsx`. That component fetches `/api/hydrology/municipalities` directly from the Next.js origin, but `apps/web/src/app/api` only has an Agronautas proxy route at `api/agronautas/[...path]/route.ts`; there is no hydrology BFF/proxy route and `apps/web/next.config.mjs` has no rewrite for `/api/hydrology/*`. Even if the network call reaches the backend by deployment routing, the React component expects an obsolete view model (`riskLevel`, `localizedWarning`, `latest`, `sourceFreshness[].status`, `provinceAlerts[].title/localizedWarning`) that does not match the backend contract. `municipality.latest.pnaHeightM` will throw when backend rows are returned because `latest` is undefined, causing a blank/crashed page after data load.

The detail page `apps/web/src/components/government/detail.tsx` has the same contract drift: backend returns `inaPredictions30d`, `alerts`, and `provenance[].freshness/label`; frontend expects `inaForecast30Days`, `smn`, `inmet`, and `provenance[].lastRunStatus/errorMessage`.

Manual ingest is wired through `POST /api/hydrology/ingest` in `hydrology-government.ts`, but production behavior is brittle. `createGovernmentIngestionRunner()` fetches all requested source clients synchronously, rejects the whole request on first source failure outside tests, and persists failed runs before throwing. Several live clients in `packages/hydrology-engine/src/clients/http-clients.ts` assume JSON for official endpoints (`SMN`, `INMET`, `INA`) whose configured URLs are public web pages or historical portals, so production ingest is likely to fail or return no records unless real machine-readable endpoints are configured. `PnaAdapter` also expects synthetic `<tr data-station="...">` HTML rather than the actual public page structure. Seeding (`seedGovernmentMunicipalitiesIfEmpty`) runs during ingest, calls `CREATE EXTENSION IF NOT EXISTS postgis` at runtime, and uses `ON CONFLICT DO NOTHING` for municipalities, so stale municipal rows are not corrected.

## Affected Areas
- `apps/web/src/app/api/agronautas/[...path]/route.ts` — existing BFF pattern; hydrology needs equivalent proxy or shared upstream builder.
- `apps/web/src/components/government/overview.tsx` — fetches missing local route and renders an obsolete payload shape.
- `apps/web/src/components/government/detail.tsx` — fetches missing local routes and renders obsolete dashboard shape.
- `apps/web/src/app/municipalities/page.tsx` and `apps/web/src/app/municipalities/[id]/page.tsx` — page entry points affected by loading/error/contract behavior.
- `apps/api/src/presentation/routes/hydrology-government.ts` — backend municipal response and ingest orchestration live here; lacks route-level try/catch around ingestion errors and production-ready partial-source semantics.
- `packages/hydrology-engine/src/repository.ts` — returns canonical municipal telemetry contract; SQL is valid for current backend shape but does not produce the legacy frontend aggregate fields.
- `packages/hydrology-engine/src/clients/http-clients.ts` and `packages/hydrology-engine/src/adapters/*.ts` — official source fetching/parsing is not production-realistic for several sources.
- `apps/api/src/presentation/routes/hydrology-government.test.ts` — tests validate backend contracts and fixture fallback, but do not catch frontend contract drift or production ingest partial failures.

## Approaches
1. **Frontend adapter + hydrology BFF proxy** — Keep the backend contract as source of truth, add a Next.js `/api/hydrology/[...path]` proxy, and adapt UI components to derive risk labels, latest PNA/rain values, alerts, and freshness from `latestTelemetry`.
   - Pros: Smallest production fix; preserves tested backend contract; resolves both `/municipalities` loading and render crash.
   - Cons: UI must explicitly derive display fields; needs component tests to prevent future contract drift.
   - Effort: Medium

2. **Backend compatibility view model** — Change `/api/hydrology/municipalities` and dashboard endpoints to emit the legacy frontend shape in addition to the canonical contract.
   - Pros: Minimal frontend changes.
   - Cons: Pollutes API contract, conflicts with existing zod schema/tests, and risks maintaining two representations.
   - Effort: Medium

3. **Full ingest hardening now** — Replace source clients/adapters with verified official machine-readable endpoints, introduce per-source partial success responses, and add operational run status endpoints.
   - Pros: Strongest production posture.
   - Cons: Larger scope; may require official endpoint discovery/API keys and more integration tests.
   - Effort: High

## Recommendation
Use Approach 1 for the frontend/API wiring immediately, combined with a scoped ingest hardening pass: keep the canonical backend contract, add a hydrology BFF proxy, update overview/detail to render from backend schemas, and make ingest production-safe with per-source outcomes, graceful 207/202-style responses, route-level error handling, configurable source URLs, and no runtime PostGIS extension creation. Treat full live-source adapter replacement as a production readiness task with explicit endpoint verification before claiming real-time ingestion.

## Risks
- Official hydrology/public weather sources may not expose stable JSON at the current configured URLs; production ingest cannot be declared reliable until endpoints are verified or source-specific scrapers are updated.
- Changing the frontend to canonical backend shape requires careful empty/degraded states so municipalities with no telemetry still render.
- Ingest currently can fail the whole manual run on one source; preserving existing data while surfacing degraded source status is necessary to avoid operational blank states.
- Runtime seeding may fail in least-privilege production DBs because of `CREATE EXTENSION IF NOT EXISTS postgis`.

## Ready for Proposal
Yes — the proposal should cover: hydrology BFF proxy, frontend contract alignment, robust UI empty/error states, production-safe ingest semantics, source endpoint verification/configuration, and regression tests across backend, frontend, and route proxy.
