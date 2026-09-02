# Apply Progress: ibera-alerta

## Status

Mode: Standard  
Delivery: size:exception / exception-ok

## Completed

- [x] Phase 1: Frontend proxy foundation.
- [x] Phase 2: Canonical frontend data mapping.
- [x] Phase 3: Backend ingest robustness.
- [x] Phase 4.1: Web BFF route tests cover GET municipalities and POST ingest forwarding.
- [x] Phase 4.2: Overview component runtime tests cover canonical payloads, empty telemetry, PNA/rain derivation, and error state.
- [x] Phase 4.3: Detail component runtime tests cover canonical dashboard rendering, degraded provenance, empty telemetry, and SSE token parsing.
- [x] Phase 4.4: API hydrology tests adjusted to the new resilient ingest contract.
- [x] Phase 4.5: Zod ingest schema variant tests added for completed, partial, and failed responses.
- [x] Phase 4.6: Targeted and full repo checks executed.
- [x] Build, test, and lint verification executed.
- [x] Zod Schemas test runner fixed so `pnpm test` executes both `package-config.test.mjs` and every `src/**/*.test.ts` file through Node's native runner with `tsx` TypeScript loading.

## Files Changed

- `apps/web/src/app/api/hydrology/[...path]/route.ts` — new Next.js BFF proxy for `/api/hydrology/*` with method/body/header forwarding and no-store upstream fetch.
- `apps/web/src/components/government/overview.tsx` — canonical backend payload mapping via `latestTelemetry`, `freshness`, `label`, null-safe empty states, and derived PNA/rain/risk fields.
- `apps/web/src/components/government/detail.tsx` — canonical dashboard mapping for `inaPredictions30d`, `alerts`, `provenance[].freshness/label`, empty telemetry fallback, and robust SSE token parsing.
- `packages/zod-schemas/src/agronautas.ts` — ingest response schema now supports `completed|partial|failed`, `requestedSources[]`, and per-source `results[]`.
- `apps/api/src/presentation/routes/hydrology-government.ts` — ingest now catches startup errors, continues per-source failures, persists failed/empty runs, avoids production fixture writes, uses `observedTo` as successful timestamp, and removes request-time PostGIS extension creation.
- `packages/hydrology-engine/src/clients/http-clients.ts` — hydrology provider URLs can be overridden with `HYDROLOGY_*_URL` env vars.
- `apps/api/src/presentation/routes/hydrology-government.test.ts` — tests updated for the new ingest response and production no-fixture behavior.
- `apps/web/src/app/api/hydrology/[...path]/route.test.ts` — Next.js BFF proxy tests for GET and POST forwarding semantics.
- `apps/web/src/components/government/overview.test.tsx` — runtime rendering tests for canonical municipality payloads and null/empty telemetry resilience.
- `apps/web/src/components/government/detail.test.tsx` — runtime rendering tests for dashboard payloads and SSE parsing.
- `packages/zod-schemas/src/agronautas.test.ts` — ingest schema variant tests for completed, partial, and failed responses.
- `packages/zod-schemas/package.json` — package test script now runs `node --import tsx --test package-config.test.mjs src/**/*.test.ts`, and declares `tsx` as a dev dependency for focused and Turbo test runs.
- `packages/zod-schemas/package-config.test.mjs` — config guard updated to enforce the native Node test runner plus `tsx` loader and inclusion of package `.test.ts` files.
- `packages/zod-schemas/.eslintrc.json`, `packages/hydrology-engine/.eslintrc.json`, `apps/api/.eslintrc.json` — workspace ESLint config coverage so `pnpm lint` can run package lint tasks.
- `packages/hydrology-engine/src/clients/http-clients.ts`, `packages/hydrology-engine/src/hydrology-engine.test.ts` — small lint fixes surfaced after enabling package ESLint config.
- `openspec/changes/ibera-alerta/tasks.md` — completed implementation tasks marked.

## Verification

- `pnpm --filter web test -- src/app/api/hydrology/[...path]/route.test.ts src/components/government/overview.test.tsx src/components/government/detail.test.tsx` ✅ passed (26/26 web tests in the web task).
- `pnpm --filter @repo/zod-schemas test` ✅ passed.
- `pnpm --filter @repo/zod-schemas test` ✅ passed after runner fix; it now executes 24 tests, including `src/agronautas.test.ts`.
- `pnpm test` ✅ passed (all repo test tasks passed; Turbo still warns about missing coverage outputs).
- `pnpm lint` ✅ passed.
- `pnpm build` ✅ passed.

## Remaining

- None for apply. Ready for re-verification.

## Deviations

- Implemented the proxy as the designed App Router BFF route rather than `next.config.mjs` rewrites to preserve body/status/content-type behavior.
- Kept `sources?` in the ingest response schema for backward compatibility while adding canonical `requestedSources` and `results`.
- Added test-only initial data hooks to `GovernmentOverview` and `GovernmentDetail` to avoid global fetch races in Node test concurrency while keeping production fetch behavior unchanged.
- Added package-level ESLint config for API/hydrology packages as part of making repo-level `pnpm lint` pass; API keeps existing dedicated `lint:security` config separate, so standard lint disables noisy security/no-explicit-any warnings already covered elsewhere.
