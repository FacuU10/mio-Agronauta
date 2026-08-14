# Tasks: Agronautas Evidence-First Economic Intelligence Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 400–550 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 contracts/use-case; PR 2 API; PR 3 UI |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Versioned capability and lineage contract | PR 1 | `pnpm --dir packages/contracts test:agronautas-contracts` | N/A—no provider; contract fixtures are the harness | shared schema/JSON files |
| 2 | Read-only intelligence endpoint | PR 2 | `pnpm --dir apps/api test` | N/A—repository fakes prove field intelligence reads | API viewmodel/use-case/route files |
| 3 | Evidence-first panel | PR 3 | `pnpm --dir apps/web test:e2e` | Existing `/demo` with mock climate/risk and absent economics | web service/panel files |

## Phase 1: RED Contract and Eligibility Tests

- [x] 1.1 RED: add failing cases in `packages/zod-schemas/src/agronautas.test.ts` and contract fixtures for discriminated `available`/`unavailable`/`insufficient_evidence`, required metadata, no value on unavailable states, and lineage serialization.
- [x] 1.2 RED: add failing `agronautas-intelligence` viewmodel/use-case tests for climate/risk evidence, `selectionStatus: undecided`, absent soil/prices/FX/economics, degraded latest-good lineage, and all five recommendation blockers.

## Phase 2: GREEN Backend Read Model

- [x] 2.1 Add const-backed intelligence states, `ObservationMetadata`, capability schemas/types, and blocked recommendation contract to `packages/zod-schemas/src/agronautas.ts`; mirror it in `packages/contracts/schemas/agronautas-contracts.v1.schema.json`.
- [x] 2.2 Implement pure mapping in `apps/api/src/application/viewmodels/agronautas-intelligence.ts` and orchestration in `apps/api/src/application/usecases/get-field-intelligence-usecase.ts` using only existing field/context/signal/risk ports; do not add providers, persistence, calculations, or engine selection.
- [x] 2.3 Add authenticated `GET /agronautas/fields/:fieldId/intelligence` to `apps/api/src/presentation/routes/agronautas.ts`, including not-found/unavailable mapping; GREEN all Phase 1 API/contract tests and preserve existing dashboard/risk behavior.

## Phase 3: RED/GREEN Web Slice

- [x] 3.1 RED: add `apps/web/src/components/agronautas/intelligence-panel.test.tsx` cases for loading/error, climate/risk metadata, unavailable soil/prices/FX/economics, blocked recommendation, and absence of invented monetary/crop values.
- [x] 3.2 Export the contract in `apps/web/src/lib/agronautas/schemas.ts`, add `getFieldIntelligence` to `service.ts` without mock economic values, and wire a narrow React Query boundary in `page-client.tsx`.
- [x] 3.3 Render the responsive `IntelligencePanel` in `apps/web/src/components/agronautas/workspace.tsx`; GREEN component tests and Playwright `/demo` smoke, using semantic Tailwind classes and no UI calculations.

## Phase 4: Verification and Rollback

- [x] 4.1 Run contract/API/web focused tests, then package builds and existing Agronautas Playwright smoke; confirm Iberá routes/schemas/storage and risk-engine `undecided` status are unchanged.
- [x] 4.2 Roll back by removing the additive contract, endpoint, service mapping, panel, and tests together; retain all existing field, climate, risk, evidence, and Iberá behavior.

## Apply Evidence

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `packages/zod-schemas/src/agronautas.test.ts` | Unit | ✅ 12/12 baseline | ✅ Written and failed before schema | ✅ 38/38 passed | ✅ available + unavailable + insufficient | ✅ strict unions/metadata |
| 1.2 | `apps/api/src/application/viewmodels/agronautas-intelligence.test.ts` | Unit | ✅ new file | ✅ Missing module failed | ✅ 2/2 passed | ✅ complete + degraded/missing paths | ✅ pure mapper |
| 2.1 | shared schema tests | Contract | ✅ 38/38 | ✅ schema test failed before implementation | ✅ 38/38 | ✅ invalid unavailable value rejected | ✅ JSON Schema mirror |
| 2.2 | `apps/api/src/application/viewmodels/agronautas-intelligence.test.ts` | Unit | ✅ new file | ✅ Missing module failed | ✅ 2/2 | ✅ latest-good lineage | ✅ pure mapping |
| 2.3 | `apps/api/src/presentation/routes/agronautas.test.ts` | Integration | ✅ 159/159 before route | ✅ route test added first | ✅ 243/243 | ✅ not-found and available evidence | ✅ use-case boundary |
| 3.1 | `apps/web/src/components/agronautas/intelligence-panel.test.tsx` | Component | ✅ 28/28 relevant | ✅ panel test added first | ✅ 106/106 | ✅ absent domains and blocker list | ✅ semantic state rendering |
| 3.2 | `apps/web/src/lib/agronautas/service.ts` | Integration | ✅ 106/106 | ✅ service contract referenced first | ✅ 106/106 | ✅ mock and API service boundaries | ✅ narrow React Query |
| 3.3 | `apps/web/src/components/agronautas/workspace.tsx` | E2E | ✅ existing smoke | ✅ panel assertion first | ✅ Playwright 2/2 | ✅ desktop route + mobile route | ✅ responsive Tailwind |
| 4.1 | package and E2E commands | Integration/E2E | ✅ current suite | ✅ command assertions | ✅ API 243/243, web 106/106, contracts 5/5, Playwright 2/2 | ✅ build green | ✅ no Iberá edits |
| 4.2 | rollback boundary | Structural | N/A | ✅ bounded files identified | ✅ additive slice | ➖ structural only | ✅ rollback documented |

### Work Unit Evidence
| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --dir packages/zod-schemas test` → 38/38 passed; `pnpm --dir packages/contracts test:agronautas-contracts` → 5/5; `pnpm --dir apps/api test` → 243/243; `pnpm --dir apps/web test` → 106/106 |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/web test:e2e --grep "agronautas muestra snapshot stale|workspace mantiene"` → 2/2 passed; `/demo` rendered the existing stale evidence flow and mobile fallback |
| Build evidence | `pnpm --dir packages/zod-schemas build`, `pnpm --dir apps/api build`, `pnpm --dir apps/web build` → all passed; pre-existing unused React warning only |
| Rollback boundary | Remove the additive intelligence schema/JSON definitions, API viewmodel/use case/route/test, web service/schema/panel/query/test; retain existing field/climate/risk/Iberá paths |
