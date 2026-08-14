# Design: Agronautas Campaign Planning Context and Assumption Simulators

## Technical Approach

Add an Agronautas-only, non-persistent planning boundary beside the existing workspace/field-index use cases. The API composes the default workspace, selected persisted fields, and already available evidence metadata into a read model; a separate pure calculator consumes only validated user assumptions. The web workspace renders the read model and keeps draft campaign/assumption interaction local. No Prisma model, repository mutation, provider adapter, economic source, or Iberá route is introduced.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Add planning contracts to existing Agronautas Zod boundary | Keeps API/web types aligned; expands a large shared file | Chosen; versioned schemas are the existing contract pattern. |
| Persist campaigns and scenarios | Would require ownership, actor, lifecycle, and audit semantics that do not exist | Rejected; requests and drafts are explicitly non-persistent. |
| Calculate in React or derive values from risk/climate | Fast UI, but duplicates rules and fabricates economic meaning | Rejected; pure API/domain calculator uses only submitted assumptions. |
| Add economic providers or FX conversion | More complete narrative, but unsupported evidence and policy | Rejected; currency must already match and FX remains unavailable. |

## Data Flow

```text
workspaceRepository + fieldRepository + evidence viewmodels
                 └──→ planning context use case ──→ API response
user draft ──→ Zod request ──→ pure assumption calculator ──→ labeled result
                                      └──→ insufficient_evidence (no result)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add versioned planning-context, assumption request/result, availability, units, currency, and validation schemas/types. |
| `packages/contracts/schemas/agronautas-contracts.v1.schema.json` | Modify | Mirror the public JSON contracts and strict enums. |
| `apps/api/src/domain/planning/agronautas-planning-simulator.ts` | Create | Pure deterministic arithmetic and typed missing/incompatible-input outcomes; no imports from persistence or providers. |
| `apps/api/src/application/usecases/agronautas-planning.ts` | Create | Resolve the default workspace and selected field IDs, then invoke the calculator without saving. |
| `apps/api/src/application/viewmodels/agronautas-planning.ts` | Create | Map fields/evidence into facts, provenance, and explicit capability states; parse output schemas. |
| `apps/api/src/presentation/routes/agronautas.ts` | Modify | Add read-scoped planning context and simulator POST routes; map invalid selections to typed 400/422 errors. |
| `apps/api/src/domain/repositories/agronautas.ts` | Modify | Reuse existing workspace/field ports; add no planning repository. |
| `apps/web/src/lib/agronautas/schemas.ts` / `service.ts` | Modify | Re-export schemas/types and add validated context/simulation calls. |
| `apps/web/src/components/agronautas/workspace.tsx` | Modify | Add accessible planning section using existing Card/Input/Label/Button conventions; local drafts only. |
| `apps/api/src/**/agronautas-planning*.test.ts`, `packages/zod-schemas/src/agronautas.test.ts`, `apps/web/src/**` tests | Create/modify | Contract, calculator, route, viewmodel, accessibility, and no-persistence boundary coverage. |

## Interfaces / Contracts

`PlanningContextRequest`: `{ contractVersion, workspaceId, campaignName, season, fieldIds }`; workspace ID is restricted to the supported default workspace and fields must resolve there. The response carries `persistent: false`, selected field facts (`fieldId`, crop, hectares, locality, geometry status), evidence references/metadata, and availability entries for `soil`, `prices`, `fx`, and `external_economics`.

`AssumptionSimulationRequest`: `{ contractVersion, areaHa, expectedYieldKgPerHa, pricePerKg, variableCostPerHa, fixedCost, currency, precision, assumptions[] }`. All numbers are finite and non-negative; area/yield are positive, precision is an integer 0–6, currency is uppercase ISO-like three letters, and every monetary input uses the same currency. No FX or unit conversion is accepted.

The deterministic result is labeled `user_assumption_simulation`, exposes normalized inputs/units/assumptions, and returns production kg, gross value, total cost, and scenario difference in the submitted currency, rounded to the requested precision. It never calls these values a forecast, recommendation, valuation, profitability claim, or market fact. Missing, zero-where-required, incompatible, or malformed inputs return `insufficient_evidence` with `missingInputs` and no numeric result. Unsupported source domains return `unavailable` with reason and dependency boundary; existing climate/risk metadata is display-only and preserves `engine.selectionStatus: undecided`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Schema bounds, units/currency, deterministic arithmetic, rounding, missing inputs | Node built-in tests with identical-input repeatability and invalid fixtures. |
| Integration | Supported/unsupported field resolution, read auth, typed errors, no repository save | API route tests with in-memory repository doubles and spies. |
| UI/E2E | Facts/provenance, unavailable states, local assumptions, keyboard/focus/errors, non-color status | React tests plus Playwright planning-surface smoke at desktop/mobile sizes. |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary; routes are ordinary typed HTTP handlers.

## Migration / Rollout

No migration required. Additive routes/UI can be disabled or reverted without data rollback because no campaign, scenario, ownership, or membership is stored.

## Open Questions

None. Provider-backed economics, durable planning, ownership, markets, finance, risk-engine selection, and Iberá remain explicitly deferred.
