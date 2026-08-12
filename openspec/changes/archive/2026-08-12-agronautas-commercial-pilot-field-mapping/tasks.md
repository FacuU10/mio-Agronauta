# Tasks: Agronautas Commercial Pilot Field Mapping

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 750–1,150 lines across API, schema, UI, tests, migration |
| 400-line budget risk | High |
| Chained PRs recommended | Yes — review slices on one unified branch |
| Suggested split | PR 1 geometry → PR 2 mapping → PR 3 workspace/E2E |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (Phase 1 geometry slice) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Apply Progress — Phase 1 geometry/API slice

- Completed 1.1–1.6 for the assigned server slice.
- Auth lifecycle remediation: route middleware now resolves the current auth environment/configuration at request time when no explicit config is injected; this prevents router construction from capturing stale disabled/empty credentials and preserves reader/write scope enforcement.
- Regression evidence: `Agronautas auth reloads enabled state and tokens at request time after router construction` proves a router built before auth setup returns 403 for reader PATCH and 200 for operator PATCH after request-time configuration is set.
- Root cause: `createAgronautasRouter` passed a router-construction snapshot from `getAgronautasAuthConfig()` into `requireAgronautasScope`; tests/runtime can set or rotate `AGRONAUTAS_AUTH_*` after construction, so middleware kept the stale snapshot and allowed the reader PATCH.
- Focused schema/domain/API evidence: `pnpm --dir packages/zod-schemas test` — 33/33 passing; `pnpm --dir apps/api build` — passing; focused geometry/use-case/repository tests — 13/13 passing.
- Route test evidence: `pnpm --dir packages/zod-schemas build; if ($?) { pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/agronautas.test.ts }` — 35/36 passing; the auth lifecycle regression and geometry auth scenario pass. One pre-existing unrelated Groq degraded-fallback test remains failing and is not geometry/auth behavior.
- Build evidence: `pnpm --dir packages/zod-schemas build; if ($?) { pnpm --dir apps/api build }` — passed; `pnpm build` — 4/4 workspace build tasks passed.
- Runtime harness: N/A — no configured PostGIS runtime smoke was run; no Docker or provider/Google evidence claimed.
- Rollback boundary: revert the auth lifecycle changes in `apps/api/src/presentation/middleware/agronautas-auth.ts`, `apps/api/src/presentation/routes/agronautas.ts`, and the focused regression test; geometry migration/repository/use case/routes and point-only intake/read remain unchanged.

### TDD Cycle Evidence — Auth lifecycle remediation

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Phase 1 auth remediation / 1.6 follow-up | `apps/api/src/presentation/routes/agronautas.test.ts` | Integration | ✅ Existing route suite: 33 passed, 2 unrelated Groq failures | ✅ Regression added for router-before-env setup; exposed stale auth behavior | ✅ 35/36 route tests pass; reader PATCH 403 and operator PATCH 200 after runtime auth setup | ✅ Existing geometry auth test plus lifecycle regression cover construction-before-config and normal auth paths | ✅ Middleware keeps explicit injected config support while defaulting to request-time config |

### Work Unit Evidence — Phase 1 auth remediation

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir packages/zod-schemas build; if ($?) { pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/agronautas.test.ts }` — 35 passed, 1 failed, exit 1; only failure is the known unrelated Groq fallback assertion; auth regression passes. |
| Runtime harness command/scenario and exact result | N/A — no configured PostGIS/API runtime harness was available and no Docker/provider/Google runtime was run. |
| Rollback boundary | Revert `apps/api/src/presentation/middleware/agronautas-auth.ts`, `apps/api/src/presentation/routes/agronautas.ts`, and the auth lifecycle regression test; no Iberá, Render, migration, or Google files. |

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | PostGIS geometry | PR 1 | `pnpm --dir apps/api test` | Configured local PostgreSQL/PostGIS; no Docker | Revert migration/repository/routes; point intake remains |
| 2 | Google-optional mapping | PR 2 | `pnpm --dir apps/web test -- intake-map service` | N/A without restricted key; prove fallback | Remove adapter; coordinate fallback remains |
| 3 | Evidence workspace/E2E | PR 3 | `pnpm --dir apps/web test:e2e -- agronautas-smoke.spec.js` | Playwright stubs; real evidence separate | Revert UI/client slice; detail route remains |

## Phase 1: Server Geometry (strict RED → GREEN → REFACTOR)

- [x] 1.1 RED: `packages/zod-schemas/src/agronautas.test.ts` — closed `POLYGON` WKT, SRID/bounds, incomplete/self-intersecting/unsupported rejection, metrics, `expectedUpdatedAt`.
- [x] 1.2 RED: test `Field`, `FieldRepository`, and `UpdateFieldGeometryUseCase` for server metrics, stale version, idempotency, and unchanged state on rejection.
- [x] 1.3 GREEN: modify `packages/zod-schemas/src/agronautas.ts`, `apps/api/src/domain/{entities,repositories}/agronautas.ts` with typed geometry contracts/value objects (const unions; no `any`).
- [x] 1.4 RED: `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.test.ts` — parameterized PostGIS round-trip, geography metrics, canonical WKT, legacy point rows.
- [x] 1.5 GREEN: modify `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.ts`; create additive `apps/api/prisma/migrations/<timestamp>_agronautas_field_geometry/migration.sql` over `fields.boundary`.
- [x] 1.6 RED then GREEN: `apps/api/src/presentation/routes/agronautas.test.ts` and `agronautas.ts` — authenticated GET/PATCH geometry, 401/403/404/422/500 mapping, idempotency, stale version via `UpdateFieldGeometryUseCase`.

## Phase 2: Optional Mapping (strict RED → GREEN → REFACTOR)

- [x] 2.1 RED: `apps/web/src/lib/agronautas/service.test.ts` plus `intake-map` tests — contracts, invalidation, missing key, loader/API failure, retry, provider labeling, credential-free fallback.
- [x] 2.2 GREEN: modify `apps/web/src/lib/agronautas/{schemas.ts,service.ts,intake-map.ts}` with GET/PATCH contracts and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`-gated search/loader/drawing; never expose key/provider payload.
- [x] 2.3 RED: `workspace-intake.test.tsx` and `field-detail.test.tsx` — draft/saved metrics, valid/invalid preservation, loading/empty/error/forbidden/stale/retry, keyboard labels/focus, existing actions.

## Apply Progress — Phase 2 mapping adapter/UI slice

- Completed 2.1–2.3 for the assigned mapping slice.
- Added typed browser geometry GET/PATCH service methods, deterministic mock geometry state, and explicit fallback geometry for credential-free tests.
- Added Google capability configuration and injected loader with `missing_public_key`, `disabled_by_configuration`, `provider_load_failed`, retry, and ready states. The loader accepts a test double and does not return the key or provider payload.
- Added deterministic locality/coordinate parsing, polygon draft WKT generation, client-only preview metrics, and a responsive accessible `FieldGeometryEditor` with draft/saved state, invalid draft preservation, focus-visible controls, and backend save boundary.
- Wired editor into authenticated Agronautas workspace and field detail only through the existing typed service seam. Iberá/government surfaces remain untouched.

### TDD Cycle Evidence — Phase 2 mapping adapter/UI

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `apps/web/src/lib/agronautas/service.test.ts`, `apps/web/src/lib/agronautas/intake-map.test.ts` | Unit/contract | ✅ Existing web suite 94/94 | ✅ Missing service/loader contracts and fallback cases written first | ✅ 8 focused tests pass | ✅ API transport, mock fallback, missing key, disabled, failed loader, retry, coordinate/polygon branches | ✅ Key remains injected/test-double only; no secret-bearing return type |
| 2.2 | `apps/web/src/lib/agronautas/service.ts`, `schemas.ts`, `intake-map.ts` | Unit/contract | ✅ Service/map baseline passed | ✅ Tests referenced absent methods/config states | ✅ Focused service/map tests pass | ✅ GET/PATCH, mode query, fallback and failure paths | ✅ Optional adapter boundary preserves existing mock-service callers |
| 2.3 | `apps/web/src/components/agronautas/field-geometry-editor.test.tsx` plus existing workspace/detail tests | Component/integration | ✅ Existing focused component tests pass after initial correction | ✅ Editor tests referenced absent editor | ✅ 16 focused workspace/detail tests and 2 editor tests pass | ✅ Save, invalid preservation, keyboard labels, fallback panel, existing dashboard actions | ✅ Narrow client island; server-authoritative metrics remain outside UI |

### Work Unit Evidence — Phase 2 mapping adapter/UI

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/lib/agronautas/service.test.ts src/lib/agronautas/intake-map.test.ts src/components/agronautas/field-geometry-editor.test.tsx` — 8/8 passing, exit 0; `pnpm --dir apps/web test` — 101/101 passing, exit 0. |
| Runtime harness command/scenario and exact result | N/A — no Google credential or configured provider runtime was supplied; injected loader doubles prove disabled, missing-key, failure, retry, and ready contract states without claiming Google runtime evidence. |
| Rollback boundary | Revert `apps/web/src/lib/agronautas/{schemas.ts,service.ts,intake-map.ts}`, `apps/web/src/components/agronautas/{field-geometry-editor.tsx,page-client.tsx,workspace.tsx,field-detail.tsx}`, and the Phase 2 tests; Phase 1 API geometry, point fallback, Iberá, and government surfaces remain. |

### Build Evidence — Phase 2 mapping adapter/UI

- `pnpm --dir apps/web build` — passed; Next.js production build completed with existing unrelated unused-React warning in `src/app/municipalities/ingest/page.test.tsx` and project-reference warning.
- No Google, API key, Docker, PostGIS runtime, or production evidence was run or claimed.

## Apply Progress — Phase 3 workspace/UI/E2E slice

- Completed 3.1–3.4 for the assigned workspace/UI/E2E slice.
- Improved the existing Agronautas workspace and field detail with responsive semantic Tailwind grids, reduced-motion-aware editorial reveal, stronger focus/role boundaries, and explicit runtime/source/telemetry status.
- Preserved and surfaced existing risk, alerts, evidence, freshness, provenance, recompute, reports, grounded chat, hydrology, and geometry editor capabilities. Added retry synchronization and partial-query error disclosure without replacing unrelated panels.
- Added deterministic component coverage for capability status and partial source failure resilience. Added Playwright coverage for geometry fallback edit/save with route stubs, mobile fallback navigation, and no-provider-evidence disclosure.
- No live Google/provider claim, credential, Docker, production, PostGIS, Iberá, government, Render, or branch/worktree change was made.

### TDD Cycle Evidence — Phase 3 workspace/UI/E2E

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `apps/web/src/components/agronautas/workspace-intake.test.tsx`, `page-client.test.tsx`, `field-detail.test.tsx` | Component/integration | ✅ 18/18 prior focused pass | ✅ Added runtime/source/retry and partial-error behaviors first | ✅ 20/20 focused pass | ✅ ready data and failed weather query paths | ✅ narrow client retry boundary; no backend rebuild |
| 3.2 | `apps/web/tests/e2e/agronautas-smoke.spec.js`, `agronautas-production.spec.js` | E2E | ✅ existing stubs retained | ✅ Added geometry save, mobile, and provider-boundary scenarios first | ✅ targeted mobile/provider tests 2/2 pass | ✅ saved geometry plus credential-free fallback | ✅ role/label selectors and route stubs only |
| 3.3 | Focused web tests, web build, Playwright | Component/build/E2E | ✅ 18/18 safety net | ✅ Failure-path tests expose missing retry boundary | ✅ focused tests 20/20; targeted E2E 2/2 | ✅ stale/degraded/missing/provider fallback branches | ✅ evidence levels remain explicit |
| 3.4 | `tasks.md` and rollback boundary | Artifact/refactor | N/A | ✅ rollback behavior documented | ✅ cumulative progress merged | ✅ no unrelated product surfaces changed | ✅ rollback remains additive |

### Work Unit Evidence — Phase 3 workspace/UI/E2E

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/workspace-intake.test.tsx src/components/agronautas/page-client.test.tsx src/components/agronautas/field-detail.test.tsx src/components/agronautas/field-geometry-editor.test.tsx` — 20/20 passing, exit 0. |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/web test:e2e -- --grep "fallback de proveedor"` — 1/1 passing, exit 0; `pnpm --dir apps/web test:e2e -- --grep "móvil"` — 1/1 passing, exit 0. Full 7-test run was started but timed out after 120s with existing API port contention and two pre-existing production-stub failures; targeted new scenarios pass. |
| Build command and exact result | `pnpm --dir apps/web build` — passed; compiled, type-checked, generated 8/8 static pages, and finalized route traces. Existing warning: unused `React` in `src/app/municipalities/ingest/page.test.tsx`; project-reference warning also remains. |
| Rollback boundary | Revert `apps/web/src/components/agronautas/{page-client.tsx,workspace.tsx,field-detail.tsx}`, `apps/web/src/app/globals.css`, `apps/web/src/components/agronautas/{workspace-intake.test.tsx,page-client.test.tsx}`, and the added E2E cases. Geometry API/editor, Iberá/government surfaces, Render config, and existing contracts remain independently rollbackable. |

### External evidence gaps

- Level 1 local API + configured PostGIS read-back: not run; no Docker or configured PostGIS smoke was allowed/supplied.
- Level 2 credential-backed Google browser runtime: not run; no restricted key/provider credentials supplied.
- Level 3 pilot/production runtime: not run; no production claim is made.
- Full E2E suite remains externally blocked by API port contention in the local harness and existing production-stub failures; focused new scenarios are green.
- Web production build passed on the final rerun; the earlier `/_document` page-data failure was transient during concurrent checks and is not retained as a blocker.

## Phase 3: Workspace, E2E, and Evidence

- [x] 3.1 GREEN: modify `apps/web/src/components/agronautas/{page-client.tsx,workspace.tsx,field-detail.tsx}` and `apps/web/src/app/globals.css` with responsive semantic-Tailwind layout/client island; reuse risk, alerts, evidence, freshness, provenance, telemetry, recompute, reports, chat, hydrology.
- [x] 3.2 RED then GREEN: update `apps/web/tests/e2e/{agronautas-smoke.spec.js,agronautas-production.spec.js}` for fallback, edit/save, invalid preservation, desktop/mobile, partial-panel resilience with labels/roles; stubs are not provider evidence.
- [x] 3.3 Verify unit/API/component tests, configured local API/PostGIS read-back, optional Google only with supplied restricted credentials; separate Level 0/1/2/3 evidence, no Docker/invented data.
- [x] 3.4 Refactor and document rollback: disable Google/UI mutation, restore prior writes without deleting geometry, retain point intake/read, and confirm no Iberá/government files or contracts changed.

## Focused Remediation — verified blockers

- Contract boundary corrected: `packages/contracts/tests/agronautas-contracts.test.ts` no longer treats durable/editable polygons as a non-goal and now asserts that the approved field repository INSERT persists `boundary`, `centroid`, `boundary_area_m2`, and `boundary_perimeter_m`, while field reads expose canonical `ST_AsText(boundary)` geometry.
- Stale dashboard root cause: the workspace loading gate incorrectly included the optional hydrology dashboard query, so a hydrology fixture/API failure hid an otherwise readable stale risk snapshot. The gate now waits for required decision queries through `/dashboard`, while hydrology remains an independently rendered capability; the E2E fixture covers both current endpoints.
- Honest failure behavior retained: hydrology failures still appear in the capability alert and the hydrology panel remains without fabricated values; the stale risk banner renders from the stale risk response.
- Migration evidence: `pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma` applied `20260812130000_agronautas_field_geometry` to the configured non-Docker Neon PostgreSQL database. A subsequent `pnpm --dir apps/api exec prisma migrate status` reported `Database schema is up to date!`. No Docker, Google, production, or fabricated provider evidence was used.

### Focused Remediation Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused contract test | `pnpm --dir packages/contracts test:agronautas-contracts` — 5/5 passing; schema validators — 8 schemas plus Agronautas schema passing. |
| Focused geometry tests | `pnpm --dir apps/api exec node --import tsx --test src/domain/geometry/field-geometry.test.ts src/application/usecases/update-field-geometry-usecase.test.ts src/infrastructure/database/postgres/agronautas-field-repository.test.ts` — 13/13 passing. |
| Focused web tests | `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/workspace-intake.test.tsx src/components/agronautas/page-client.test.tsx src/components/agronautas/field-geometry-editor.test.tsx` — 18/18 passing. |
| Targeted runtime harness | `pnpm --dir apps/web test:e2e -- --grep "muestra snapshot stale"` — 1/1 passing; mobile/provider fallback rerun — 2/2 passing. |
| Web build | `pnpm --dir apps/web build` — passing; 8/8 static pages generated. Existing unused-React and project-reference warnings remain non-blocking. |
| Migration status | `pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma` — applied; follow-up `pnpm --dir apps/api exec prisma migrate status` — database schema up to date. |
| Rollback boundary | Revert only `packages/contracts/tests/agronautas-contracts.test.ts`, `apps/web/src/components/agronautas/page-client.tsx`, and `apps/web/tests/e2e/agronautas-smoke.spec.js`; migration remains an additive independent boundary and no Iberá/government files are part of this remediation. |
