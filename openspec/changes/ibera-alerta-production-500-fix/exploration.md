# Exploration: ibera-alerta-production-500-fix

## Current State

Production `GET https://www.agronauta.com.ar/api/hydrology/municipalities` still returns HTTP 500, but direct production Neon inspection shows the expected hydrology seed data exists: `agronautas_municipalities` has 18 rows and `hydrology_telemetry` has 38 rows. Therefore the failure should be treated as a runtime/query/proxy/config defect, not as empty seed data.

The Express route is mounted at `apps/api/src/server.ts` as `/api/hydrology`, and `apps/api/src/presentation/routes/hydrology-government.ts` implements `GET /municipalities` by calling `HydrologyRepository.getMunicipalityTelemetryOverview(PROVINCE.provinceCode)`, then validating the response with `hydrologyGovernmentMunicipalitiesResponseSchema.parse(...)`. The repository query in `packages/hydrology-engine/src/repository.ts` reads `agronautas_municipalities`, left-joins `municipality_gauge_mappings`, then uses a lateral subquery over `hydrology_telemetry` with `DISTINCT ON` and array concatenation to select latest telemetry for each mapped station.

The Next.js BFF route at `apps/web/src/app/api/hydrology/[...path]/route.ts` proxies `/api/hydrology/*` to `AGRONAUTAS_API_INTERNAL_URL` or falls back to `http://localhost:3001`. It streams `upstreamResponse.body` into `NextResponse` and has no local try/catch or structured error envelope if `fetch()` fails, if production uses the localhost fallback, or if the upstream body/headers are incompatible with the server runtime.

Important code finding: the overview query itself does **not** invoke PostGIS geometry functions; PostGIS is required for table schema/seed, but this specific GET path only selects `boundary` indirectly never and joins telemetry/mappings by text arrays. Query-level suspects are therefore more likely array typing, missing `municipality_gauge_mappings`, unexpected data values failing Zod validation, or runtime DB/schema drift than geometry operations in `getMunicipalityTelemetryOverview`.

## Affected Areas

- `packages/hydrology-engine/src/repository.ts` — contains `getMunicipalityTelemetryOverview`, `municipalityTelemetrySql`, row-to-contract mapping, and telemetry date/number conversion that can throw on unexpected production rows.
- `apps/api/src/presentation/routes/hydrology-government.ts` — validates the repository result with Zod and currently lets GET errors bubble to the global 500 handler without endpoint-specific diagnostic metadata.
- `packages/zod-schemas/src/agronautas.ts` — defines the municipality/telemetry response contract that may reject production rows with invalid enums, dates, URLs, confidence/horizon combinations, or alert shape.
- `apps/web/src/app/api/hydrology/[...path]/route.ts` — production BFF/proxy path; can emit 500 if upstream URL/env is wrong or server-side fetch/body streaming fails.
- `apps/web/src/app/api/hydrology/[...path]/route.test.ts` and `apps/api/src/presentation/routes/hydrology-government.test.ts` — existing coverage lacks upstream fetch failure, production env guard, and production-shaped DB fixtures.
- `openspec/specs/ibera-alerta/spec.md` — current production hydrology spec should gain failure-diagnostic/500-resilience requirements.

## Approaches

1. **Backend-first diagnostic hardening** — Add focused diagnostics around repository query + schema parse, reproduce against production-shaped rows, and return structured non-secret failure classification.
   - Pros: Directly targets the now-proven non-empty DB case; prevents blind 500s; isolates SQL vs contract validation.
   - Cons: Does not fix BFF env mismatch if the web proxy points to the wrong upstream.
   - Effort: Medium

2. **BFF-first production guard** — Make the Next.js proxy fail closed with explicit upstream error JSON, require non-localhost `AGRONAUTAS_API_INTERNAL_URL` in production, and buffer/forward response safely.
   - Pros: Quickly distinguishes Vercel/Next proxy failure from Express API failure; improves user-visible error evidence.
   - Cons: If Express itself crashes on the query, this only makes the proxy diagnosis clearer.
   - Effort: Low/Medium

3. **Full layered diagnosis and fix** — Implement both backend diagnostics and BFF guards, then run direct API + web-origin production smoke to classify and resolve the actual failing layer.
   - Pros: Best chance of resolving the production 500 without guessing; covers all three stated hypotheses: query bug, proxy crash, env mismatch.
   - Cons: Slightly broader work; needs production logs/env confirmation for final proof.
   - Effort: Medium

## Recommendation

Use Approach 3. The database is seeded, so the next change must stop treating 500 as a seed problem and instead add layered observability/tests around the exact GET path: direct repository query, route-level contract validation, and Next.js BFF upstream forwarding. The fastest decisive proof is to compare direct Express `GET /api/hydrology/municipalities` against web-origin `GET /api/hydrology/municipalities`; if direct API passes and web fails, fix BFF/env; if direct API fails, fix repository/schema handling.

## Risks

- Production secrets and raw DB URLs must not be persisted in artifacts or logs.
- Adding too much error detail to public responses could leak internals; detailed stack/query context should stay in server logs with request IDs.
- The production DB may have schema drift not represented locally, especially missing/empty `municipality_gauge_mappings` or telemetry enum/date values incompatible with Zod.
- The BFF fallback to `localhost:3001` is unsafe for production and can mask deployment env mismatches as generic 500s.

## Ready for Proposal

Yes. Proceed with a layered production-500 fix proposal/spec/design that requires direct API vs BFF classification, endpoint-specific diagnostics, production-shaped tests, and final real smoke against `https://www.agronauta.com.ar/api/hydrology/municipalities`.
