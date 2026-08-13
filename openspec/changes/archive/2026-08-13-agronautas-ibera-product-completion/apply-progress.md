# Apply Progress: Agronautas and Iberá-Alerta Product Completion

## Mode

Strict TDD. Unified `main` line; no migration added.

## Completed Tasks

- [x] 1.1–1.4 — Added versioned, namespaced contracts and deterministic read-only field/ledger repository tests and implementations.
- [x] 2.1–2.4 — Added authenticated Agronautas field index, truthful report geometry metadata, browser contract/service wiring, and index UI states.
- [x] 3.1–3.4 — Added authenticated durable ingest history, safe run projection, municipality explanation projection, ordered telemetry/alert timeline, and UI panels.
- [x] 4.1–4.3 — Ran focused tests/builds and documented local-only evidence and rollback boundaries.
- [x] Remediation — Bounded municipality timeline details before schema validation, made optional geometry reads non-blocking for Agronautas detail, extracted the field-index view model, added the long-alert timeline regression assertion, and aligned the production Playwright fixture with the current dashboard route.
- [x] Contract remediation — Added PostGIS geometry read-back to bounded `FieldRepository.list`, mapped `polygon_wkt` and `geometry_source` without inventing geometry, and added a focused SQL/mapping regression.

## TDD Cycle Evidence

| Task | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| 1.1 | Written and executed | Passed | Empty/degraded and populated contracts | Shared schemas typed |
| 1.3 | Written and initially failed | Passed after repository implementation | Limit/order/read-only cases | Cursor/limit bounds |
| 2.1 | Existing route harness extended | Passed focused API suite | Auth/empty/report cases | Safe unavailable fallback |
| 2.3 | Existing component harness extended | Passed focused web suite | Point-only and loaded index states | Provider-neutral UI retained |
| 3.1 | Repository/route cases added | Passed after ledger listing | Durable empty/read-only cases | Diagnostics allowlist |
| 3.3 | Contract cases added | Passed schema suite | Speculative >14 day case | Explicit relation wording |
| Remediation | Existing API regression extended before implementation verification | Passed focused API route suite | Long official alert detail remains source-prefixed and <=300 chars | Shared bounded detail sanitizer retained |
| Playwright fixture remediation | Existing route fixture corrected before targeted rerun | Passed targeted and full E2E suites | Current `/fields/:id/dashboard` response exercises stale/detail/evidence UI | Fixture uses only current route contract fields |
| Contract remediation | Focused repository regression extended before SQL change | Passed focused repository and contracts suites | Persisted polygon WKT is returned when present and remains absent when SQL returns null | List query remains bounded/read-only/deterministic |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `pnpm --dir apps/api exec tsx --test src/presentation/routes/hydrology-government.test.ts` — exit 0, 52/52; `pnpm --dir apps/web test:e2e -- tests/e2e/agronautas-production.spec.js tests/e2e/uiux-journeys.spec.js` — exit 0, 8/8. |
| Runtime harness | `pnpm --dir apps/web test:e2e` — exit 0, 16 passed, 1 skipped of 17; local API/web harness with route fixtures only. No Docker, Google, Render, external provider, or production proof claimed. |
| Rollback boundary | Revert the additive contract exports, field/ledger list methods/routes, and Agronautas/Iberá UI panels; existing geometry, telemetry, alerts, and ledger writes remain intact. |

## Known Gaps

- Full municipality explanation/timeline response is implemented additively; existing web test fixtures omit optional fields and continue to exercise safe fallback rendering.
- No live runtime or external provider execution was claimed.
- The previous Agronautas browser failures were caused by fixture/request drift: the production journey did not provide the current `/fields/:fieldId/dashboard` response, so the dashboard remained loading and stale/detail/evidence assertions could not execute. The current detail flow already treats optional geometry reads as non-blocking.

## Verification Evidence

| Command | Exit | Exact result |
|---|---:|---|
| `pnpm test` | 0 | PASS; API 236/236 and web 103/103; Turborepo 6/6 tasks successful. |
| `pnpm --dir packages/zod-schemas test` | 0 | PASS; 35/35. |
| `pnpm --dir packages/hydrology-engine test` | 0 | PASS; 72/72. |
| `pnpm --dir apps/api test` | 0 | PASS; 236/236. |
| `pnpm --dir apps/web test` | 0 | PASS; 103/103. |
| `python -m pytest apps/workflow-runtime-python` | 0 | PASS; 35/35. |
| `pnpm build` | 0 | PASS; all build tasks successful; Next.js generated 10 application routes. An earlier retry hit a transient Windows `EPERM` while removing `packages/zod-schemas/dist`; the subsequent clean build passed. |
| `pnpm --dir apps/web test:e2e` | 0 | PASS; 16 passed, 1 skipped of 17. |
| `pnpm --dir packages/contracts test:agronautas-contracts` | 0 | PASS; 5/5 after bounded field-list geometry read-back remediation. |
| `pnpm --dir packages/contracts validate:schemas` | 0 | PASS; 8 JSON Schema contracts validated. |
| `pnpm --dir packages/contracts validate:agronautas-schema` | 0 | PASS; Agronautas contract schema validated. |
| `pnpm --dir apps/api exec tsx --test src/infrastructure/database/postgres/agronautas-field-repository.test.ts src/presentation/routes/agronautas.test.ts src/presentation/routes/hydrology-government.test.ts` | 0 | PASS; 97/97. |
| `pnpm --dir apps/api test` | 0 | PASS; 236/236 after building workspace packages required by direct package execution. |
| `pnpm --dir apps/web test` | 0 | PASS; 103/103. |
| `pnpm build` | 0 | PASS; 4/4 build tasks; Next.js generated 10 application routes. |
| `pnpm --dir apps/web test:e2e -- tests/e2e/agronautas-production.spec.js tests/e2e/agronautas-smoke.spec.js tests/e2e/uiux-journeys.spec.js` | 0 | PASS; 10/10. |

## Contract Remediation Evidence

- SQL now selects `ST_AsText(boundary) AS polygon_wkt` in the bounded field index query, matching `findById` and `findByExternalFieldId`.
- The repository maps returned `polygon_wkt` to `Field.props.polygonWkt` and preserves `geometry_source`; null geometry remains undefined.
- No migration, write, telemetry mutation, provider integration, hydraulic behavior, or product-boundary change was introduced.

## Runtime/Test Notes

- The first direct API test attempt occurred before workspace package build outputs existed and failed in unrelated test files with `MODULE_NOT_FOUND` for `@repo/zod-schemas/dist/index.js`; building `packages/zod-schemas` and `packages/hydrology-engine` restored the expected harness state, and the full API suite then passed 236/236.
- The first concurrent build attempt hit a transient Next.js `_document` page-generation error; the immediate rerun passed 4/4 build tasks. No application change was made for either harness condition.
