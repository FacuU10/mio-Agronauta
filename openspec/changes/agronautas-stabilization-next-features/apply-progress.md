# Apply Progress: Agronautas Stabilization and Next Features

## Slice 1 / Work Unit 1: Hygiene and Salvage

**Status:** complete  
**Mode:** Strict TDD  
**Date:** 2026-07-05

### Completed Tasks

- [x] 1.1 Provenance check covers generated/cache/test-output artifacts in `.gitignore`.
- [x] 1.2 Removed generated/test-output artifacts from Git tracking and ignored working tree outputs while keeping source, tests, docs, config, SQL, and OpenSpec artifacts.
- [x] 1.3 Added runbook provenance mapping for kept files and rollback boundary.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `apps/api/src/build-config.test.ts` | Unit/config | Existing targeted run initially exposed missing built zod-schemas output after cleanup | ⚠️ Check added after `.gitignore` update in salvage flow | ✅ `pnpm --dir apps/api exec node --import tsx --test src/build-config.test.ts` passed 4/4 | ✅ Multiple artifact patterns asserted | ✅ Helper extracted for root text reads |
| 1.2 | `git status` / `git clean` evidence | Artifact hygiene | `git status --short` captured dirty generated outputs before cleanup | N/A artifact-removal task | ✅ Generated tracked artifacts now staged as deletions; ignored caches are not reintroduced as source | ✅ Covered TS, Python, Playwright result artifacts | ✅ Reinstalled dependencies after an overly broad targeted clean touched ignored `node_modules` contents |
| 1.3 | `docs/runbooks/agronautas-production-hardening.md` | Docs/provenance | Existing runbook read before edit | N/A docs mapping | ✅ Kept-file provenance table added | ✅ Maps config/tests/contracts/API/web/worker/SQL/OpenSpec areas | ✅ Rollback boundary documented |

### Verification

- `pnpm install --frozen-lockfile` — passed; restored dependencies after ignored-file cleanup.
- `pnpm --filter @repo/zod-schemas build` — passed; recreated required ignored schema build output for local test imports.
- `pnpm --dir apps/api exec node --import tsx --test src/build-config.test.ts` — passed 4/4.
- `git status --short -- "*Ibera*" "*iber*" "*Iberá*"` — no output; Iberá-Alerta files untouched.

### Notes / Deviations

- A first `pnpm --dir apps/api test -- src/build-config.test.ts` invocation ran the package's broad `src/**/*.test.ts` script and failed on missing `@repo/zod-schemas/dist/index.js` after generated outputs were removed. Building `@repo/zod-schemas` and invoking the targeted file directly passed.
- `git clean -fdX` with pathspecs also touched ignored `node_modules` content; dependencies were restored immediately with `pnpm install --frozen-lockfile`. Future cleanup should avoid glob pathspecs that can traverse ignored dependency trees.

### Remaining Tasks

- [x] Phase 2: Deterministic Build / Test Gates.
- [x] Phase 3: Provider Truth + Scheduler.
- [ ] Phase 4: Dashboard / PDF Parity.
- [ ] Phase 5: Gated Next Features.
- [ ] Phase 6: Verification / Review.

## Slice 2 / Work Unit 2: Deterministic Build and Test

**Status:** complete  
**Mode:** Strict TDD  
**Date:** 2026-07-05

### Completed Tasks

- [x] 2.1 Added/updated regression tests for cross-platform clean/build scripts, Turbo build dependencies, forced root test ordering, and schema package output policy.
- [x] 2.2 Replaced unsafe `rm -rf` package scripts with Node `fs.rmSync` scripts and made web/api/hydrology package setup deterministic on Windows.
- [x] 2.3 Verified direct clean web builds and forced root Turbo tests from the monorepo root.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `apps/api/src/build-config.test.ts`, `packages/zod-schemas/package-config.test.mjs` | Unit/config | ✅ Existing `build-config.test.ts` passed 4/4 before edits | ✅ New assertions failed on `rm -rf`, missing direct web clean script, and stale Turbo dependency expectations | ✅ Config tests passed 6/6 and zod package config passed 12/12 | ✅ Covered root/api/web/hydrology scripts, `web#build`, `api#build`, and root `test` dependencies | ✅ Shared assertions kept in build-config tests; package config expectations aligned with forced-test race prevention |
| 2.2 | Same config tests plus package test suites | Unit/config + package integration | ✅ Direct web clean/build initially proved current path; forced root test exposed hydrology/API setup races | ✅ `TURBO_FORCE=true pnpm test` failed first on hydrology `dist` missing and then Prisma client missing | ✅ Added hydrology `build:ensure` and API `prisma:generate` pretest; forced root test passed | ✅ Exercised zod, hydrology, API, and web package tests under forced Turbo | ✅ Clean scripts extracted to committed Node scripts where quoting would be brittle |
| 2.3 | Command verification | Build/test gates | ✅ Prior direct targeted tests green | ✅ Forced root command failed before setup fixes | ✅ Direct clean web build and forced root test passed | ✅ Verified schema build, API config tests, zod package tests, hydrology package tests, web clean/build, root forced tests | ✅ Remaining warning is Turbo no-output warnings for test tasks only; no functional failure |

### Verification

- `pnpm --dir apps/api exec node --import tsx --test src/build-config.test.ts` — passed 6/6.
- `pnpm --filter @repo/zod-schemas test` — passed 12/12.
- `pnpm --filter @repo/hydrology-engine test` — passed 19/19.
- `pnpm --filter @repo/zod-schemas build; pnpm --filter web clean; pnpm --filter web build` — passed; direct clean web build works on Windows first attempt.
- `TURBO_FORCE=true pnpm test` — passed; 6/6 Turbo tasks successful.
- `grep rm -rf -- package.json` equivalent — no remaining `rm -rf` in package scripts.

### Notes / Deviations

- `turbo.json` root `test.dependsOn` is now `[^build]` rather than `[build, ^build]`; package-local `build:ensure` prevents self build/test races that appear under `TURBO_FORCE=true`.
- API tests now run `prisma generate` first because clean installs/forced tests cannot assume generated Prisma client files exist.
- Iberá-Alerta source/module files were not edited.

## Slice 3 / Work Unit 3: Provider Truth, Persisted Scheduler, and Extended Back-off

**Status:** complete  
**Mode:** Strict TDD  
**Date:** 2026-07-05

### Completed Tasks

- [x] 3.1 Added RED tests for provider taxonomy (`live|seam|mock|unavailable`), persisted cadence/last-success runtime reads, and extended retry/desist timing.
- [x] 3.2 Implemented truthful provider mode/status fields, PostgreSQL-backed scheduler last-success/cadence reads, hourly feature-flagged runtime seam, and extended backoff calculation.
- [x] 3.3 Verified scoped schema/API scheduler/provider tests and package builds.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `apps/api/src/infrastructure/jobs/agronautas-scheduler.test.ts`, `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.test.ts`, `packages/zod-schemas/src/agronautas.test.ts` | Unit/schema | ✅ Existing scheduler/provider tests mostly passed before new assertions | ✅ New provider taxonomy/backoff assertions failed (`mode` undefined, `calculateRetryBackoff` missing) | ✅ Targeted API tests passed 12/12 and zod schema tests passed 11/11 | ✅ Covered 45s/5m/10m/15m/desist; live/mock/seam/unavailable; persisted cadence + last-success | ✅ Kept retry timing as pure function |
| 3.2 | Same targeted API/schema tests | Unit/integration seam | ✅ `pnpm --dir apps/api exec node --import tsx --test ...` baseline captured existing pass/fail split | ✅ Runtime expectations required DB-backed `getCadences`/`getLastSuccess` reads and provider mode status | ✅ API build passed after implementation | ✅ Multiple provider modes and retry attempts prevent hardcoded fake-it | ✅ Introduced `TaxonomyProviderAdapter` while preserving `PlaceholderRealProviderAdapter` alias for compatibility |
| 3.3 | Command verification | Build/test gates | ✅ Prior Slice 2 gates green | ✅ Scoped command initially failed on missing taxonomy/backoff implementation | ✅ Scoped tests and builds passed | ✅ Verified API targeted tests, zod package test, zod direct schema test, API build, zod build | ✅ No Iberá-Alerta files edited |

### Verification

- `pnpm --dir apps/api exec node --import tsx --test src/infrastructure/jobs/agronautas-scheduler.test.ts src/infrastructure/adapters/agronautas-provider-adapters.test.ts` — passed 12/12 after RED failure.
- `pnpm --dir apps/api exec node --import tsx --test ../../packages/zod-schemas/src/agronautas.test.ts` — passed 11/11.
- `pnpm --filter @repo/zod-schemas test` — passed 12/12 package config tests.
- `pnpm --filter api build` — passed.
- `pnpm --filter @repo/zod-schemas build` — passed.

### Notes / Deviations

- The existing `PostgresSignalIngestionRepository.getLastSuccessfulObservedAtBySource()` already queried `signal_ingestion_runs`; this slice added/verified runtime wiring rather than replacing repository SQL.
- `pnpm --filter @repo/zod-schemas test` does not execute `src/agronautas.test.ts`, so the schema contract test was run directly through the API package's installed `tsx` dependency.
- Provider HTTP failures are surfaced as `unavailable:*` errors; persisted unavailable status can be materialized by the ingestion job/route layer in later slices if needed.
- Iberá-Alerta source/module files were not edited.

### Remaining Tasks

- [x] Phase 4: Dashboard / PDF Parity.
- [ ] Phase 5: Gated Next Features.
- [ ] Phase 6: Verification / Review.

## Slice 4 / Work Unit 4: Dashboard and PDF Parity

**Status:** complete  
**Mode:** Strict TDD  
**Date:** 2026-07-05

### Completed Tasks

- [x] 4.1 Added RED tests proving `/dashboard`, `/dashboard.pdf`, schema contracts, and web rendering expose the same contract-aligned dashboard payload with last-data, degradation, disclaimer, and confidence fields.
- [x] 4.2 Implemented dashboard contract fields (`risk.confidence`, `lastDataFetchedAt`, `presentation`) and wired the web dashboard to read `getDashboard()` while the PDF route renders from the same `buildDashboardPayload()` output.
- [x] 4.3 Verified targeted API/schema/web tests; Iberá-Alerta was not touched.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.1 | `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/web/src/components/agronautas/page-client.test.tsx`, `packages/zod-schemas/src/agronautas.test.ts` | API contract + component + schema | ✅ Existing route/web tests ran before GREEN; new assertions initially failed on missing fields/text | ✅ PDF/dashboard/web assertions failed for missing `lastDataFetchedAt`, disclaimer, confidence, and degraded-source flags | ✅ API 28/28, web 10/10, schema 11/11 passed | ✅ Covered API JSON, PDF text, schema parse, and UI card text paths | ✅ Kept shared source-of-truth in API payload and avoided client recalculation for presentation indicators |
| 4.2 | Same targeted tests | API/web integration seam | ✅ Built `@repo/zod-schemas` after schema changes to refresh package dist used by API imports | ✅ Web test failed until `getDashboard()` was wired and rendered | ✅ Web dashboard now renders last fetch, source degradation, disclaimer, and confidence from dashboard payload | ✅ Mock service and API route both exercise degraded and stale payload variants | ✅ Dashboard loading no longer blocks existing overview if dashboard payload query is slower |
| 4.3 | Command verification | Build/test gates | ✅ Prior Slice 3 targeted tests green | ✅ Initial schema/API runs exposed required-field drift and stale built schema output | ✅ All targeted commands passed after implementation and zod build | ✅ Verified schema, API route/PDF, and React/JSDOM presentation tests | ✅ No Iberá-Alerta files edited |

### Verification

- `pnpm --dir apps/api exec node --import tsx --test ../../packages/zod-schemas/src/agronautas.test.ts` — passed 11/11.
- `pnpm --filter @repo/zod-schemas build` — passed.
- `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/agronautas.test.ts` — passed 28/28.
- `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/page-client.test.tsx` — passed 10/10.

### Notes / Deviations

- `pnpm --filter web test:e2e -- agronautas` was not run in this apply slice; targeted JSDOM presentation tests covered the requested disclaimer/stale text, and full/scoped Playwright remains for verify or Phase 6.
- API tests import `@repo/zod-schemas` through built package output, so `pnpm --filter @repo/zod-schemas build` is required after schema edits before route tests can observe new contract fields.
- Iberá-Alerta source/module files were not edited.

### Remaining Tasks

- [x] Phase 5: Gated Next Features.
- [ ] Phase 6: Verification / Review.

## Slice 5 / Work Unit 5: Next Features

**Status:** complete  
**Mode:** Strict TDD  
**Date:** 2026-07-05

### Completed Tasks

- [x] 5.1 Added RED tests for admin ingestion rows, per-source freshness cards, next-run formatting, React rendering, and non-production operational alerts.
- [x] 5.2 Implemented a dashboard admin panel, freshness monitor, and explicit anegamiento/estrés/heladas indicators from the persisted dashboard payload without touching Iberá-Alerta.
- [x] 5.3 Verified scoped web tests for new data-contract logic and rendering.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 5.1 | `apps/web/src/lib/agronautas/ingestion-status.test.ts`, `apps/web/src/components/agronautas/page-client.test.tsx` | Unit + React/JSDOM | ✅ Existing page-client tests were exercised in the targeted run | ✅ New tests failed on missing `ingestion-status` module and missing `agronautas-ingestion-admin-panel` | ✅ Targeted web tests passed 14/14 | ✅ Covered live/seam/fallback/mock modes, fresh/stale/unavailable cards, null/ISO next-run formatting, and unsafe alert labeling | ✅ Extracted pure functions for row/card/alert derivation |
| 5.2 | Same targeted tests | Component integration | ✅ Existing dashboard/PDF rendering test remained green after insertion | ✅ UI test failed until admin/freshness/alerts panels rendered dashboard payload data | ✅ Panel rendering passed with mock persisted payload | ✅ Weather, soil, satellite paths each render distinct freshness and SLA labels | ✅ Kept UI sourced from dashboard payload; no client recomputation of risk scores |
| 5.3 | Command verification | Web test gate | ✅ Slice 4 targeted web test command was the baseline | ✅ First RED command showed expected failures before implementation | ✅ `pnpm --dir apps/web exec node --import tsx --test src/lib/agronautas/ingestion-status.test.ts src/components/agronautas/page-client.test.tsx` passed 14/14 | ✅ Contract logic and React rendering ran in one scoped gate | ✅ React 19 manual memoization removed from touched client component; JSX runtime shim retained for current tsx test transform |

### Verification

- `pnpm --dir apps/web exec node --import tsx --test src/lib/agronautas/ingestion-status.test.ts src/components/agronautas/page-client.test.tsx` — passed 14/14 after RED failures.

### Notes / Deviations

- The admin panel trigger is intentionally UI-disabled for non-live, stale, failed, seam, fallback, and mock rows; no backend trigger endpoint was added in this slice.
- Operational alerts are explicit but marked `no producción` while the persisted payload reports degraded or unavailable sources.
- Iberá-Alerta source/module files were not edited.

### Remaining Tasks

- [ ] Phase 6: Verification / Review.
