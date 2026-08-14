# Tasks: Agronautas Campaign Planning Context and Assumption Simulators

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–450 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 contracts/calculator → PR 2 API/context → PR 3 web/E2E |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Versioned schemas and pure deterministic calculator | PR 1 | `pnpm --dir packages/zod-schemas test; pnpm --dir apps/api test -- agronautas-planning-simulator` | Node tests with fixed fixtures; no provider needed | Revert schema, JSON contract, and calculator files |
| 2 | Read-only planning context and typed API routes | PR 2 | `pnpm --dir apps/api test -- agronautas-planning` | API route tests with in-memory repositories; no persistence | Revert planning use case/viewmodel/routes only |
| 3 | Accessible local-draft UI and browser flow | PR 3 | `pnpm --dir apps/web test; pnpm --dir apps/web test:e2e -- agronautas-planning` | Playwright desktop/mobile planning smoke | Revert web planning surface and tests |

## Phase 1: Contracts and Calculator (RED → GREEN → REFACTOR)

- [x] 1.1 **RED:** Extend `packages/zod-schemas/src/agronautas.test.ts` and `packages/contracts/tests/agronautas-contracts.test.ts` for version, strict enums, field selection, finite non-negative numbers, positive area/yield, precision 0–6, uppercase three-letter currency, same-currency units, and unavailable/insufficient states.
- [x] 1.2 **GREEN:** Modify `packages/zod-schemas/src/agronautas.ts` and `packages/contracts/schemas/agronautas-contracts.v1.schema.json` with versioned planning/simulation schemas and inferred types; preserve existing contracts.
- [x] 1.3 **RED:** Create calculator tests for repeatability, rounding, complete outputs, missing/incompatible inputs, and absence of numeric results on `insufficient_evidence`.
- [x] 1.4 **GREEN/REFACTOR:** Create `apps/api/src/domain/planning/agronautas-planning-simulator.ts` as framework/provider-free arithmetic using submitted assumptions only; label results `user_assumption_simulation` and never select risk/economic sources.

## Phase 2: Read Model and API (RED → GREEN → REFACTOR)

- [x] 2.1 **RED:** Add route/use-case/viewmodel tests for supported fields, unsupported IDs as typed 400/422, `persistent: false`, facts/provenance, unavailable soil/prices/FX/external economics, undecided risk engine, and zero repository saves.
- [x] 2.2 **GREEN:** Reuse existing read ports; create `apps/api/src/application/usecases/agronautas-planning.ts` with schema parsing and no mutation.
- [x] 2.3 **GREEN/REFACTOR:** Modify `apps/api/src/presentation/routes/agronautas.ts` with read-scoped context and simulator POST handlers, typed validation errors, and no Iberá route/schema coupling.

## Phase 3: Web Surface and Verification (RED → GREEN → REFACTOR)

- [x] 3.1 **RED:** Add web component coverage for facts, local drafts, accessible labels/errors, announced non-color statuses, and unavailable/insufficient rendering.
- [x] 3.2 **GREEN/REFACTOR:** Modify `apps/web/src/lib/agronautas/schemas.ts`, `service.ts`, and `apps/web/src/components/agronautas/workspace.tsx`; use existing wrappers/Tailwind tokens, keep calculations server-side, and persist nothing.
- [x] 3.3 **RED → GREEN:** Create `apps/web/tests/e2e/agronautas-planning-page.ts` and `agronautas-planning.spec.ts`; verify keyboard entry, complete labeled result, unavailable domains, desktop/mobile layout, and no Iberá vocabulary.
- [x] 3.4 **VERIFY:** Run contract, API, web, Playwright, and build commands; confirm no Prisma migration/model, provider, economic claim, ownership, market, finance, or Iberá file change is introduced.

## Apply Evidence

### TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1–1.2 | `packages/zod-schemas/src/agronautas.test.ts`, `packages/contracts/tests/agronautas-contracts.test.ts` | Unit | ✅ existing 39/39 | ✅ written first | ✅ 41/41 | ✅ valid + invalid | ✅ schemas aligned |
| 1.3–1.4 | `apps/api/src/domain/planning/agronautas-planning-simulator.test.ts` | Unit | N/A new | ✅ written first | ✅ 2/2 focused scenarios | ✅ complete + missing/units | ✅ pure deterministic function |
| 2.1–2.3 | `apps/api/src/application/usecases/agronautas-planning.test.ts`, `apps/api/src/presentation/routes/agronautas-planning.test.ts` | Integration | ✅ API baseline 248/248 | ✅ written first | ✅ planning route/context passes | ✅ supported + unsupported | ✅ no write port |
| 3.1–3.3 | `apps/web/src/components/agronautas/planning.test.tsx`, `apps/web/tests/e2e/agronautas-planning.spec.ts` | UI/E2E | ✅ web baseline 108/108 | ✅ written first | ✅ component path passes | ✅ complete + unavailable | ✅ local draft only |

### Work Unit Evidence
| Evidence | Required value |
|---|---|
| Focused test command and exact result | `pnpm --dir packages/zod-schemas test`; 41/41 pass. `pnpm --dir packages/contracts validate:schemas; validate:agronautas-schema; test:agronautas-contracts`; 8 schemas validated, 6/6 tests pass. API planning tests: 5/5 pass. Web planning test: 1/1 pass. Full API with `RATE_LIMIT_STORE=memory`: 253/253 pass. Full web suite: 109/109 pass. Python worker: 35/35 pass. |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/web test:e2e -- agronautas-planning`; 1 passed in 38.2s using the no-Docker API/web harness with routed simulation/context fixtures, selected field facts, source/freshness/provenance metadata, keyboard focus traversal, associated validation error, unavailable domains, and Iberá vocabulary absence. Full Playwright: 17 passed, 1 skipped, 0 failed. |
| Rollback boundary | Revert the planning additions in `packages/zod-schemas/src/agronautas.ts`, `packages/contracts/schemas/agronautas-contracts.v1.schema.json`, API planning domain/use-case/routes/tests, and web planning service/UI/tests. No migration or existing evidence behavior is required to roll back. |

### Focused blocker remediation

- [x] Render selected field facts and available `planningContext.evidence` metadata (`source`, `freshness`, `provenance`) in the planning context panel.
- [x] Prove zero-save behavior with a repository save spy in the planning use-case test.
- [x] Prove keyboard focus traversal and input-to-error association in the planning Playwright flow; invalid assumptions remain local and do not reach persistence.

| Remediation | RED | GREEN | REFACTOR |
|---|---|---|---|
| Planning facts/evidence metadata | E2E assertion added before UI rendering | Component and Playwright assertions pass | Shared `PlanningEvidenceDetails` keeps available/unavailable rendering explicit |
| Zero repository saves | Save spy assertion added before implementation change | Planning use-case tests pass with `saveCalls === 0` | Existing read ports remain unchanged; no planning write port added |
| Keyboard focus and associated errors | Focus/error assertions added before validation UI | Playwright passes focus, Tab traversal, `#simulation-error`, and `aria-describedby` checks | Native labelled inputs and semantic alert retained |
