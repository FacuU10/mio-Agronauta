# Tasks: Iberá-Alerta Institutional Evidence Expansion

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 registry/contracts; PR 2 timeline/explanations; PR 3 operator UI |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Registry, provenance, coverage contracts | PR 1 | `pnpm --dir packages/hydrology-engine test` | N/A—no Docker; repository fakes cover activation/status | migration, hydrology types, schemas |
| 2 | Bounded timeline and explanations | PR 2 | `pnpm --dir apps/api test` | N/A—HTTP route fakes cover bounds/auth/safe copy | repository/routes/seed files |
| 3 | Government/operator rendering | PR 3 | `pnpm --dir apps/web test:e2e` | Existing `/municipalities` routes at desktop/mobile | government components/tests only |

## Phase 1: RED Registry and Contract Boundaries

- [x] 1.1 RED: add failing schema/type tests in `packages/zod-schemas/src/agronautas.test.ts` and `packages/hydrology-engine/src/hydrology-engine.test.ts` for provenance completeness, reviewed activation rejection, seven coverage statuses, geometry `unverified`, and no official polygon.
- [x] 1.2 RED: add failing repository/route tests for bounded time/cursor/limit, source-key joins, empty/degraded separation, authenticated ingest history, and rejection of hydraulic/impact/provider/case actions.

## Phase 2: GREEN Registry and Read Model

- [x] 2.1 Add Iberá-namespaced const-backed contracts to `packages/zod-schemas/src/agronautas.ts`; add flat `IberaEvidenceQuery`, provenance, coverage, geometry, timeline, and explanation types to `packages/hydrology-engine/src/types.ts`.
- [x] 2.2 Add registry/association models and indexed additive migration `apps/api/prisma/migrations/<timestamp>_ibera_source_registry/migration.sql`; update `apps/api/prisma/schema.prisma` without geometry backfill or official-square exposure.
- [x] 2.3 Extend `packages/hydrology-engine/src/repository.ts` with reviewed registry reads, bounded telemetry/alert history, last-known/current status separation, and deterministic same-source tendency summaries; keep forecasts provider-supplied and ≤30 days.
- [x] 2.4 Update `apps/api/src/infrastructure/database/postgres/seed-municipality-alert-coverage.ts` to activate only complete reviewed source metadata, then expose validated overview/detail/operator projections in `apps/api/src/presentation/routes/hydrology-government.ts` while retaining `EXCLUDED_TOPIC_RE`.

## Phase 3: RED/GREEN Government UI

- [x] 3.1 RED: extend `apps/web/src/components/government/{overview,detail,ingest-panel}.test.tsx` for provenance, gaps, bounded timeline, stale/failed/blocked/unavailable/unverified/unauthorized/retry states, safe copy, and no incident actions.
- [x] 3.2 Render server-owned registry/provenance, geometry status, timeline, threshold/trend/forecast limitations, and durable run outcomes in `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx`; keep browser mutations limited to existing authenticated ingest.
- [x] 3.3 GREEN/E2E: run overview/detail/operator Playwright checks at desktop/mobile sizes; assert source mapping language, no official geometry, no hydraulic impact/propagation/routing/discharge/evacuation claims, and no Agronautas ownership vocabulary.

## Phase 4: Rollout and Rollback Verification

- [x] 4.1 Add nullable metadata/read-compatible defaults, deploy registry migration before read projections, run focused tests plus package/API/web builds and hydrology contract validation; no Python worker change is required.
- [x] 4.2 Roll back by disabling registry activation and omitting additive projections first; retain telemetry, alert coverage, ingest ledger, and existing Iberá routes, then remove metadata only after dependency checks.

## Apply Evidence

### Work Unit 1 — Registry, provenance, coverage contracts

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir packages/zod-schemas test`; exit 0; 39 passed, 0 failed. `pnpm --dir packages/hydrology-engine test`; exit 0; 74 passed, 0 failed. |
| Runtime harness command/scenario and exact result | N/A — no separate runtime boundary; repository fakes cover reviewed activation, bounded timeline, coverage states, and geometry safety. |
| Rollback boundary | `packages/zod-schemas/src/agronautas.ts`, `packages/zod-schemas/src/agronautas.test.ts`, `packages/hydrology-engine/src/types.ts`, `packages/hydrology-engine/src/repository.ts`, and registry migration/models. |

### Work Unit 2 — Bounded timeline and explanations

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/api test`; exit 0; 244 passed, 0 failed. |
| Runtime harness command/scenario and exact result | N/A — HTTP route tests exercise `GET /api/hydrology/municipalities/:id/timeline` with bounded limit/cursor and safe unavailable behavior. |
| Rollback boundary | `apps/api/src/presentation/routes/hydrology-government.ts`, `apps/api/src/presentation/routes/hydrology-government.test.ts`, seed and Prisma registry/evidence additions. |

### Work Unit 3 — Government/operator rendering

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web test`; exit 0; 107 passed, 0 failed. |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/web test:e2e -- tests/e2e/government-ui.spec.js`; exit 0; 2 passed. `tests/e2e/hydrology-government.spec.js` was explicitly skipped because its real-source prerequisite was unavailable. `pnpm --dir apps/web build`; exit 0; Next.js production build completed; 8 routes generated. |
| Rollback boundary | `apps/web/src/components/government/detail.tsx` and its focused test; institutional coverage/timeline rendering only. |

### Work Unit 4 — Rollout and rollback verification

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm build`; exit 0; Turbo 4/4 build tasks successful. |
| Runtime harness command/scenario and exact result | Package/API/web builds passed; no production or database runtime was executed because the assigned boundary has no live environment harness. |
| Rollback boundary | Disable reviewed registry activation and omit additive coverage/timeline projections; preserve existing telemetry, alert coverage, ingest ledger, and Iberá routes. |

## Status

- Mode: Strict TDD
- Delivery: auto-chain, stacked-to-main
- Tasks: 11/11 complete
- Note: the repository remains uncommitted and contains unrelated pre-existing Agronautas changes; no commit or push was performed.
