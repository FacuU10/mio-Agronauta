# Tasks: Agronautas Management Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 foundation; PR 2 API projection; PR 3 web journey |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Workspace persistence/backfill and ports | PR 1 | `pnpm --dir apps/api test` | N/A—no Docker; repository fakes and migration harness | schema, migration, repository files |
| 2 | Typed API context, index, activity projection | PR 2 | `pnpm --dir apps/api test` | N/A—no Docker; route fakes exercise `/workspace*` | API, schema, use-case files |
| 3 | Agronautas navigation and activity UI | PR 3 | `pnpm --dir apps/web test:e2e` | Existing `/demo` with mock service and empty/error fixtures | web service/components only |

## Phase 1: RED Contracts and Persistence

- [x] 1.1 RED: add failing tests in `packages/zod-schemas/src/agronautas.test.ts` for `WorkspaceContext`, cursor pagination, field summary, source-labeled `ActivityItem`, and forbidden actor/ownership fields.
- [x] 1.2 RED: add failing tests for idempotent default seed/backfill, preserved field/evidence IDs, new-field default association, and repeat-run count stability in `apps/api/src/**` tests.

## Phase 2: GREEN Management API

- [x] 2.1 Add `Workspace`/`Field.workspaceId` to `apps/api/prisma/schema.prisma` and staged migration `apps/api/prisma/migrations/<timestamp>_agronautas_management_foundation/migration.sql`; seed one deterministic default and backfill only unassigned fields.
- [x] 2.2 Add management/activity ports in `apps/api/src/domain/repositories/agronautas.ts`, then implement `EnsureDefaultWorkspace`, read use cases, viewmodels, and source-union adapter in `apps/api/src/application/{usecases,viewmodels}/agronautas-management.ts` and `apps/api/src/infrastructure/database/postgres/agronautas-management-repository.ts`.
- [x] 2.3 Register `GET /workspace`, `GET /workspace/fields`, and `GET /fields/:fieldId/activity` in `apps/api/src/presentation/routes/agronautas.ts`; map invalid IDs/storage failure to existing typed errors and never mutate projection reads.
- [x] 2.4 GREEN: make all Phase 1 tests pass; REFACTOR deterministic IDs/order and keep default global role semantics free of auth, membership, collaboration, and Iberá vocabulary.

## Phase 3: RED/GREEN Web Integration

- [x] 3.1 RED: extend `apps/web/src/lib/agronautas/service.test.ts` and Agronautas component tests for loading, empty, unavailable, invalid-field, source labels, and no ownership/collaboration copy.
- [x] 3.2 Add typed methods in `apps/web/src/lib/agronautas/{schemas,service}.ts`; update `page-client.tsx` and `workspace.tsx` to render default context, paginated fields, field selection, activity, and truthful states with existing Tailwind tokens.
- [x] 3.3 GREEN/E2E: extend the Agronautas Playwright journey for `/demo`, pagination, selected field, activity labels, and error/empty states; verify Iberá routes and vocabulary remain untouched.

## Phase 4: Rollout and Rollback Verification

- [x] 4.1 Run migration/backfill before enabling reads; verify association counts and unchanged field/evidence identities through API tests, then run `pnpm test` and `pnpm build`.
- [x] 4.2 Document rollback order: disable UI/routes, remove write-path dependency, then drop FK/column/table; retain field, risk, alert, ingestion, and recompute records.

## Apply Evidence

| Evidence | Result |
|---|---|
| Focused tests | Superseded by remediation evidence below; final full results: zod 37/37, API 240/240, web 105/105 |
| Runtime harness | Superseded by remediation browser evidence below; 17 Playwright journeys discovered and targeted Agronautas journeys passed. |
| Build | Ordered zod → API → web build passed; existing unused-import warning in `src/app/municipalities/ingest/page.test.tsx`. |
| Rollback boundary | Revert management migration/schema, management ports/adapters/routes, shared contracts, and Agronautas UI/service changes; retain existing field/evidence tables and rows |

## Remediation Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/workspace-intake.test.tsx`: 6/6; `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/agronautas.test.ts src/infrastructure/database/postgres/agronautas-management-repository.test.ts`: 40/40. |
| Runtime harness | `pnpm --dir apps/web test:e2e -- --grep "Agronautas first journey" --workers=1`: 2/2 passed. |
| Full/build evidence | `pnpm --dir packages/zod-schemas test`: 37/37; `pnpm --dir apps/api test`: 240/240; `pnpm --dir apps/web test`: 105/105; ordered zod/api/web builds passed. |
| Rollback boundary | Revert workspace pagination/heading UI, E2E fixtures, and added repository/route tests without removing the existing management migration/contracts/routes. |

## Focused Remediation Evidence

| Evidence | Result |
|---|---|
| Workspace UI contract | `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/workspace-intake.test.tsx`: 6/6 passed; the new behavioral test proves `listWorkspaceFields` and cursor progression while failing if legacy `listFields` is called. |
| Backfill/repository proof | `pnpm --dir apps/api exec node --import tsx --test src/infrastructure/database/postgres/agronautas-management-repository.test.ts`: 1/1 passed; repeated default initialization preserves field/evidence identity and timestamps and associates a field created after the first run. |
| Management route proof | `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/agronautas.test.ts`: 39/39 passed; auth, invalid workspace/field IDs, unavailable storage, empty page, source projection and non-mutation are covered. |
| Browser runtime harness | `pnpm --dir apps/web test:e2e -- --grep "Agronautas first journey" --workers=1`: 2/2 passed; mocked `/workspace` and `/workspace/fields` routes exercise the unified UI without changing Iberá routes. |
| Build | Ordered `pnpm --dir packages/zod-schemas build; pnpm --dir apps/api build; pnpm --dir apps/web build`: passed; existing unused-import warning in `src/app/municipalities/ingest/page.test.tsx`. |
| Rollback boundary | Revert `apps/web` workspace pagination/heading and E2E fixture changes plus the added API repository/route tests; keep the previously implemented management contracts/routes and migration intact. |

## TDD Cycle Evidence

| Task | Test file | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|
| 1.1 | `packages/zod-schemas/src/agronautas.test.ts` | ✅ written, failed on missing exports | ✅ 37/37 | ✅ populated + forbidden fields | ✅ |
| 1.2 | `apps/api/src/application/viewmodels/agronautas-management.test.ts` | ✅ written before implementation completion | ✅ API suite 236/236 | ✅ newest/older source ordering | ✅ |
| 2.1–2.4 | API contracts/routes/repository | ✅ contract and route seams | ✅ API build + 236/236 | ✅ invalid/unavailable paths | ✅ |
| 3.1–3.3 | `apps/web/src/lib/agronautas/service.test.ts`, component tests | ✅ service test first | ✅ 104/104 | ✅ empty + source activity | ✅ |
| 4.1–4.2 | API/web/build harnesses | ✅ verification assertions | ✅ builds and suites pass | ✅ E2E discovery | ✅ |
