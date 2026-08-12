## Exploration: Agronautas commercial pilot field mapping

### Current State
Agronautas already has a working product journey for intake, field detail, risk, alerts, freshness, evidence, timelines, recompute, report download, grounded chat, and a hydrology Copilot. The web entry point is `/demo`; field detail is `/demo/fields/[fieldId]`. The browser service uses the same-origin `/api/agronautas/v1` BFF, while the BFF forwards to the Express Agronautas router and can forward GET/POST/PUT/PATCH/DELETE methods.

The current create contract is `POST /fields` with `fieldId`, crop, hectares, locality, province/country, optional growth stage, and `location: { lat, lng, polygonWkt? }`. The API validates the point against the Corrientes rice coverage and locality tables, creates a `Field`, stores a `FieldContext`, and returns the new field ID plus coverage. The domain model already carries optional `polygonWkt`, but the current PostgreSQL field repository does not write or read that value: its SQL persists centroid and boundary metadata only. The Prisma model has an existing PostGIS `boundary` column, but the active repository path does not use it. Hectares are accepted as a positive caller value; there is no server-side polygon-area calculation or perimeter contract.

There is no field update endpoint. The only field mutation currently exposed by the router is `POST /fields`; the generic BFF method support does not create an upstream capability. The current intake UI offers local locality search for two configured Corrientes localities and a provider-neutral point preview. It does not load Google Maps, search Google Places, draw/edit a polygon, calculate a perimeter, or persist geometry. It explicitly tells users that polygon analysis is not promised.

The existing Agronautas API surface that can be safely composed into a richer pilot UI includes:

- `GET /runtime` for mode and route compatibility.
- `POST /fields` and `GET /fields/:fieldId` for create/read.
- `GET /fields/:fieldId/risk/current`, `/risk/timeline`, `/status` for risk and freshness state.
- `GET /fields/:fieldId/alerts/current`, `/alerts/timeline` for alert state and lineage.
- `GET /fields/:fieldId/weather/timeline` for persisted climate history.
- `GET /fields/:fieldId/dashboard` and `/dashboard.pdf` for the composed dashboard and report action.
- `POST /fields/:fieldId/recompute` for an asynchronous, scope-protected request; it returns `enqueued` or `already_in_progress`, not an immediate result.
- `GET /fields/:fieldId/copilot/context`, `POST /fields/:fieldId/copilot/chat` (SSE), and `POST /fields/:fieldId/chat` for bounded grounded assistance.
- `GET /fields/:fieldId/hydrology/dashboard` and `/hydrology/alerts` for the existing Agronautas hydrology view. These must remain an Agronautas adapter surface and must not be confused with the separate Iberá government routes.

Risk snapshots and alert contracts already expose score/level, confidence, computed and validity times, freshness/degradation, drivers, evidence references, source run IDs/acquisition times where available, engine/rule metadata, and alert lineage. Dashboard provenance includes provider mode, observed/ingested times, source URLs, last successful observation, next due time, failure reason, and degradation reasons. Telemetry is currently emitted as structured API logs for signal runs, locks, dispatch, and persisted job runs; the Agronautas router does not expose a general job-run status endpoint. Provider evidence is an internal port used by the API, not a standalone browser endpoint.

The web stack is Next.js 15, React 19, React Query 5, Zustand 5, Tailwind CSS 4, and Playwright. Tailwind is loaded through `@import "tailwindcss"`; semantic CSS variables are defined in `apps/web/src/app/globals.css`, with IBM Plex Sans and Source Serif 4 already providing a distinctive existing type pairing. `framer-motion` is installed. The current Agronautas workspace is already substantially styled, but it still contains legacy arbitrary `var(--...)` utility classes; a new UI slice should use the project tokens and semantic Tailwind classes rather than spreading more raw CSS-variable or hex utility classes.

Google Maps is not present in the web or API dependencies, no Google Maps configuration is documented in `.env.example`, and the checked environment has no Google Maps key variables set. The current map layer is deliberately provider-neutral and point-only. Therefore no Google search, map rendering, drawing, geometry-library behavior, or credential-backed runtime evidence can be claimed from this repository state.

### Affected Areas
- `apps/web/src/components/agronautas/workspace.tsx` — current intake and dashboard composition; the commercial pilot UI should evolve this route rather than create a second Agronautas product surface.
- `apps/web/src/components/agronautas/field-detail.tsx` — existing evidence-first detail, report, recompute, and explicit point-only geometry messaging.
- `apps/web/src/components/agronautas/page-client.tsx` — React Query boundaries and mutation/query state; a mapping editor should remain a narrow client island while server data stays contract-validated.
- `apps/web/src/lib/agronautas/intake-map.ts` and `apps/web/src/lib/visibility/map.ts` — current local locality search and provider-neutral point preview seam; Google Maps can be added behind an adapter rather than coupling domain state to the SDK.
- `apps/web/src/lib/agronautas/service.ts` and `apps/web/src/lib/agronautas/schemas.ts` — browser transport and Zod contracts for the existing routes; field update/geometry response shapes are currently absent.
- `apps/web/src/app/api/agronautas/[...path]/route.ts` — already forwards the HTTP verbs needed for a future update endpoint, but does not itself authorize or implement one.
- `apps/api/src/presentation/routes/agronautas.ts` — current Agronautas create/read/risk/alert/recompute/report/chat/hydrology routes; an update must be additive and protected by the existing write scope.
- `packages/zod-schemas/src/agronautas.ts` — current `fieldIntakeSchema` accepts optional `polygonWkt` but does not define geometry validity, area derivation, or an update contract.
- `apps/api/src/application/usecases/create-field-intake-usecase.ts` — current coverage resolution and Field/FieldContext creation; it passes polygon text into the domain but does not establish durable geometry semantics.
- `apps/api/src/domain/entities/agronautas.ts` — `FieldProps` has `polygonWkt` and centroid, but only positive hectares and coordinate ranges are enforced.
- `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.ts` and `apps/api/prisma/schema.prisma` — persistence boundary to reconcile with the existing PostGIS `boundary` column; current SQL drops geometry on save/read.
- `apps/api/src/presentation/middleware/agronautas-auth.ts` — existing reader/operator/admin scopes; create and future geometry update require write authorization, reads remain read-scoped.
- `apps/web/src/app/globals.css` and `apps/web/package.json` — current Tailwind 4 tokens, typography, gradients, and installed motion/UI dependencies.
- `apps/web/src/components/agronautas/*.test.*`, `apps/api/src/presentation/routes/agronautas.test.ts`, `packages/zod-schemas/src/agronautas.test.ts`, and `packages/contracts/tests/agronautas-contracts.test.ts` — existing unit/contract coverage to extend with verified mapping and update scenarios.
- `apps/web/tests/e2e/agronautas-smoke.spec.js`, `apps/web/tests/e2e/agronautas-production.spec.js`, and `apps/web/playwright.config.mjs` — current Playwright journeys and local two-server harness. The E2E tests stub Agronautas responses and are not proof of Google or provider-backed runtime behavior.
- `apps/web/src/components/government/*`, `apps/api/src/presentation/routes/hydrology-government.ts`, and `openspec/specs/ibera-alerta/` — Iberá/government-owned surfaces; explicitly out of scope for this change.

### Approaches
1. **UI-only Google draft mapping** — Add Google Places/map/drawing to the existing intake client, calculate a draft perimeter/area in the browser, and continue submitting only the current centroid plus manually supplied hectares.
   - Pros: small initial code change; makes search and editing demonstrable quickly; does not alter the current API.
   - Cons: the drawn polygon and calculated area would be lost or misleading after submit; cannot honestly show a persisted boundary; depends on an absent Google credential and SDK; unsafe for a commercial pilot unless clearly labeled as a local draft.
   - Effort: Medium

2. **Contract-safe mapping slice with additive durable geometry** — Keep the existing Agronautas journey and BFF, add Google Maps behind a browser adapter, submit a canonical validated perimeter plus centroid, derive/validate hectares server-side, persist geometry through the existing PostGIS boundary path, and add a narrow authenticated field-boundary update/read contract. Reuse existing risk/alert/evidence/report/chat endpoints without rebuilding those capabilities.
   - Pros: the UI can honestly expose search, coordinates, editable perimeter, perimeter/area, and saved state; preserves current architecture and endpoint behavior; enables later risk queries to use the real boundary; keeps provider credentials out of the API and keeps UI business decisions out of the client.
   - Cons: requires an additive schema/contract/repository change, geometry validation and area semantics, a Google browser key with Maps/Places/Drawing/Geometry services enabled, and focused tests; production behavior remains blocked until credentials and a real runtime are supplied.
   - Effort: High

3. **Replace the current mapping and field model wholesale** — Introduce a new GIS/domain subsystem, replace the current intake/dashboard route, and redesign all field consumers around GeoJSON and geometry-first semantics.
   - Pros: maximum long-term flexibility.
   - Cons: contradicts the existing roadmap and user constraint to avoid unnecessary backend rebuilding; increases migration, review, and Agronautas/Iberá coupling risk; delays the pilot value already available from current risk/evidence journeys.
   - Effort: High

### Recommendation
Proceed with Approach 2, but split it into two explicit implementation slices. First, establish the smallest contract and persistence truth: choose one canonical polygon representation (the current `polygonWkt` seam can be retained if it is strictly validated), define whether hectares are server-derived from the perimeter, reconcile the existing PostGIS `boundary` column with the repository, return geometry/area in field read responses, and add an authenticated update operation with idempotent validation. Do not present a boundary as saved until this slice is complete.

Second, add the richer Tailwind interface as a focused client island: Google Places search and coordinate selection, a map with editable polygon vertices, visible area/perimeter, supported-area preview, save/update states, and accessible list/coordinate fallback. The client may show an immediate area estimate for interaction, but the API must remain the source of truth for accepted geometry and hectares. Preserve loading, empty, error, unauthorized/forbidden, stale/degraded, retry, and no-credential states. Use existing risk, alerts, freshness, provenance, telemetry-derived status, recompute, report, and chat contracts as read-only panels/actions; do not invent provider values or make a new risk engine.

Google Maps should be an optional adapter with an explicit missing-credential state, not a hard dependency for the rest of the workspace. The browser key must be public/restricted and injected only through the web runtime; no secret key belongs in the API or repository. Until a real key and enabled APIs are provided, retain the current local point fallback and make the unavailable map capability visible rather than silently substituting invented map data.

### Risks
- The working tree is already dirty with substantial unrelated Agronautas/Iberá changes. This exploration made no app-code changes and future implementation must not overwrite or mix those changes.
- The current `polygonWkt` intake field is accepted by validation and the use case but is dropped by the active field repository; exposing “saved polygon” today would be a data-integrity defect.
- Hectares are currently caller-provided and only checked as positive. A commercial perimeter editor needs an explicit server-side area rule, unit/precision policy, maximum/minimum bounds, and invalid/self-intersecting polygon behavior.
- Google Maps SDK, Places/Drawing/Geometry APIs, billing/project restrictions, and browser credentials are absent. No credential-backed map runtime or search result may be represented as existing evidence.
- The current Playwright E2E tests route-stub API responses; they prove UI contract handling, not real PostGIS coverage, provider freshness, worker dispatch, Google Maps, or production credentials. No runtime smoke was executed in this exploration.
- Current local Playwright configuration expects API/web processes on ports 3001/3000 and defaults the API internal URL locally, but the shell did not contain `AGRONAUTAS_API_INTERNAL_URL` or `GROQ_API_KEY`; real runtime availability remains environment-dependent.
- Existing demo/mock services intentionally contain synthetic values. They are useful for UI states only and must not be described as commercial pilot evidence.
- The Agronautas hydrology view shares route code but Iberá government components/specs have separate ownership. Mixing their models, routes, or data narratives would violate product separation.

### Ready for Proposal
Yes. The proposal should authorize a bounded Agronautas-only change with an additive geometry contract/persistence slice followed by a richer Tailwind mapping UI. It should explicitly state that Google-backed search/rendering is conditional on supplied credentials, that server-accepted geometry/area is the source of truth, and that existing risk/evidence/freshness/recompute/report/chat capabilities are reused rather than rebuilt.
