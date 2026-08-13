# Tasks: Agronautas and Iberá-Alerta Product Completion

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,400 |
| 400-line budget risk | Low (session budget overridden to 99,999) |
| Chained PRs recommended | No |
| Suggested split | One unified PR on `main`, slices A→E |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| A–C | Agronautas index, truthful geometry/report, evidence explanation | Unified PR | `pnpm --dir apps/api test`; `pnpm --dir apps/web test` | Local API + web with seeded Corrientes rice field; no Google setup | Agronautas routes/view models/UI only |
| D–E | Iberá run history, municipality explanation/timeline | Unified PR | `pnpm --dir packages/hydrology-engine test`; API/web tests | Local API + web with ledger/telemetry fixtures; no provider claim | Hydrology read routes/projections/UI only |

## Phase 1: Contracts and ports (strict TDD)

- [x] 1.1 RED: add Node contract tests for namespaced field-index, evidence/report, safe-run, municipality-explanation, and timeline schemas; assert null/empty evidence and no unsafe claims.
- [x] 1.2 GREEN: extend `packages/zod-schemas/src/agronautas.ts` with versioned Agronautas and hydrology schemas; REFACTOR shared constants/types without `any`.
- [x] 1.3 RED: test bounded deterministic `FieldRepository.list` and `listIberaIngestRuns` ordering/cursor/limit behavior; assert no writes or telemetry mutation.
- [x] 1.4 GREEN: modify `apps/api/src/domain/repositories/agronautas.ts`, `agronautas-field-repository.ts`, and `packages/hydrology-engine/src/{types,repository}.ts`; use existing tables/indexes, no migration.

## Phase 2: Agronautas slices A–C

- [x] 2.1 RED: route tests for authorized/unauthorized/empty/unavailable `GET /fields`, stale geometry rejection, and report snapshot metadata.
- [x] 2.2 GREEN: wire `apps/api/src/presentation/routes/agronautas.ts` to `GET /fields` and truthful geometry/report evidence.
- [x] 2.3 RED: web tests for `/demo` loading/empty/error/unauthorized → `/demo/fields/[fieldId]`, saved vs point-only geometry, and observed/forecast/degraded/missing evidence.
- [x] 2.4 GREEN: update `apps/web/src/lib/agronautas/{schemas,service}.ts` and `components/agronautas/{page-client,workspace}.tsx`; preserve provider-neutral editor and no new risk engine.

## Phase 3: Iberá slices D–E

- [x] 3.1 RED: repository/route tests for durable restart reads, authorization without provider calls, degraded source diagnostics redaction, and telemetry immutability.
- [x] 3.2 GREEN: implement bounded ledger projections in `packages/hydrology-engine/src/{types,repository}.ts`; add authenticated `GET /ingest/runs` in `apps/api/src/presentation/routes/hydrology-government.ts`.
- [x] 3.3 RED: test ordered municipal events, threshold comparison, tendency/window, forecast >14-day speculative labeling, missing/stale/error states, and no-hydraulic wording.
- [x] 3.4 GREEN: extend dashboard projections and update `apps/web/src/components/government/{ingest-panel,detail}.tsx` with accessible history/timeline/explanation states.

## Phase 4: Verification and rollout

- [x] 4.1 Run focused Node suites, `pnpm --dir apps/web test:e2e`, `pnpm build`, and regression `pytest apps/workflow-runtime-python`; capture local API/UI evidence separately.
- [x] 4.2 Exercise field→detail→geometry/report/risk and ingest→municipality→timeline locally; defer Google credentials, Render/Cron/provider execution, production proof, and real pilot outcomes.
- [x] 4.3 Roll out A–C then D–E behind capability checks; rollback each route/view-model/UI slice independently, preserving all field geometry, ledger, telemetry, and alert data.

Deferred roadmap: F authoritative Iberá geometry; campaigns, calendars, tasks, responsibles, decisions, productivity/economics, prices/markets, scenarios/simulators, credit, insurance, claims, Google runtime, and hydraulic/impact modeling.
