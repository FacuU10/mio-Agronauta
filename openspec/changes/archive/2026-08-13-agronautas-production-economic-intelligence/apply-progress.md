# Apply Progress: Agronautas Evidence-First Economic Intelligence Foundation

## Status
- Action context: repo-local unified main at baseline `4917f85`; existing worktrees and stashes preserved.
- Delivery: auto-chain, stacked-to-main; one bounded evidence-first slice covering contracts, API read model, and web panel.
- Mode: Strict TDD.
- Tasks: 10/10 checked.

## Scope protection
- No provider selection, external economic data, persistence migration, economic calculation, recommendation engine, or risk-engine selection.
- Climate/risk are composed only from existing snapshots/timelines/evidence. Soil, prices, dollar/FX, economics, and recommendation states remain explicit unavailable/insufficient evidence.
- Risk engine remains `undecided`; Iberá routes, schemas, storage, vocabulary, and ownership were not changed.

## Files changed
- `packages/zod-schemas/src/agronautas.ts`: versioned capability state, observation metadata, lineage, and intelligence contract.
- `packages/zod-schemas/src/agronautas.test.ts`: contract RED/GREEN coverage.
- `packages/contracts/schemas/agronautas-contracts.v1.schema.json`: cross-runtime contract mirror.
- `apps/api/src/application/viewmodels/agronautas-intelligence.ts`: pure evidence mapper.
- `apps/api/src/application/viewmodels/agronautas-intelligence.test.ts`: mapper triangulation and degraded lineage tests.
- `apps/api/src/application/usecases/get-field-intelligence-usecase.ts`: existing repository orchestration.
- `apps/api/src/presentation/routes/agronautas.ts` and `.test.ts`: authenticated read endpoint and integration evidence.
- `apps/web/src/lib/agronautas/schemas.ts`, `service.ts`: typed transport/mock boundaries.
- `apps/web/src/components/agronautas/page-client.tsx`, `workspace.tsx`: narrow query and presentational evidence panel.
- `apps/web/src/components/agronautas/intelligence-panel.test.tsx`: behavioral component test.

## TDD Cycle Evidence
| Task | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| 1.1 | Contract test failed before schema | 38/38 zod tests | available/unavailable/insufficient + invalid value | strict schemas |
| 1.2 | Missing mapper module failed | 2/2 mapper tests | complete and degraded/missing evidence | pure mapper |
| 2.1 | Contract tests failed before additions | 5/5 contract tests and JSON validation | metadata/no-value rejection | JSON mirror |
| 2.2 | Missing mapper failed | 2/2 mapper tests | latest-good lineage | repository-independent mapper |
| 2.3 | Route test added before endpoint | 243/243 API tests | route response and missing-field mapping | use-case boundary |
| 3.1 | Panel behavior test added first | 106/106 web tests | absent domains and blocker list | semantic UI states |
| 3.2 | Service contract referenced first | web suite green | mock/API boundaries | narrow query |
| 3.3 | Playwright/UI assertions first | Playwright 2/2 | desktop and mobile `/demo` | responsive Tailwind |

## Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused tests | zod 38/38; contracts 5/5; API 243/243; web 106/106 |
| Runtime harness | `pnpm --dir apps/web test:e2e --grep 'agronautas muestra snapshot stale|workspace mantiene'` → 2/2 passed |
| Builds | zod, API, and web builds passed; existing unused React warning only |
| Rollback boundary | Remove only additive intelligence contracts, endpoint/use case/viewmodel, service/query/panel, and tests |

## Deviations
- Demo mock service exposes only existing climate/risk fixture values and explicit unavailable economic states; it does not add providers or invented economic values.
- Native status reports missing change-local spec paths even though the repository main spec and Engram spec artifact exist; implementation followed both source-of-truth spec files without changing unrelated planning artifacts.

## Remaining
- Ready for `sdd-verify`.
