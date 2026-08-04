# Proposal: Data-First Evidence Visibility for Agronautas and Iberá-Alerta

## Intent

Expose the forecasts, indicators, telemetry, alerts, provenance, freshness, diagnostics, and Copilot evidence already available behind the applied journeys. This is a non-repetitive evidence slice: `agronautas-ibera-uiux-mvp-visibility` remains the baseline, including its known pre-existing `government-ui.spec.js:78` locator failure.

## Scope

### In Scope
- Audit current routes/contracts against rendered Agronautas and Iberá-Alerta screens and produce `contract-to-screen-matrix.md` as an acceptance artifact.
- Add only evidence-backed read/view-model/UI visibility needed to show source, provenance, local context, diagnostics, and Copilot evidence.
- Label every value as observed, forecast, cached/latest-good, stale, degraded, missing, or mock/seam; preserve empty/error states rather than inferring live acquisition.
- Define the evidence plan for a later, separate single-field, single-centroid on-demand vertical slice (request, one source, persistence/history, cache/latest-good, limits, latency, and Copilot trace).

### Out of Scope
- Rebuilding the applied UI, Google Maps, WhatsApp, durable/editable polygons, or treating accepted `polygonWkt` as durable.
- Corrientes-wide precomputation, canonical Risk Engine selection, scheduler/queue/worker rewrites, hydraulic simulation, or new provider integrations.
- Iberá map implementation unless a later gated evidence/design decision proves official geometries and impact semantics; current municipality squares remain approximate.

## Capabilities

### New Capabilities
- `agronautas-evidence-visibility`: Evidence-backed field/dashboard/Copilot visibility over existing contracts.

### Modified Capabilities
- `ibera-alerta`: Extend existing canonical municipal/dashboard presentation with explicit evidence-state, diagnostics, provenance, and mapped-threshold semantics without changing acquisition behavior.

## Approach

Use existing API/BFF contracts and applied components as the source of truth. Add minimal typed contract/view-model changes only where current evidence is actually available, with dumb React/Tailwind presentation and strict TDD coverage. The matrix must record source, contract, screen, state label, and proof status. No Docker; runtime evidence must name external Postgres/Redis prerequisites. Preserve the verified baseline and do not claim live results absent observation.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/components/{agronautas,government}` | Modified | Evidence/state rendering only; no second shell. |
| `apps/web/src/lib/agronautas`, `packages/zod-schemas` | Modified | Typed, evidence-backed view contracts. |
| `apps/api/src/presentation/routes/{agronautas,hydrology-government}.ts` | Modified | Return missing proven evidence only. |
| `openspec/changes/...` | New | Contract-to-screen matrix and acceptance evidence. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Mock/seam or fallback data appears live | High | Mandatory mode/source/timestamp/state labels and bounded proof receipts. |
| Approximate geometry implies authority | High | Table/list first; map gated on official geometry and impact semantics. |
| Existing risk/on-demand boundaries are overstated | High | Keep on-demand as a follow-on evidence plan only. |

## Rollback Plan

Revert the evidence contract/view-model/UI commits together; retain existing applied journeys and data unchanged. Remove only newly added matrix/spec artifacts if the slice is abandoned.

## Dependencies

- Existing contracts, configured external Postgres/Redis, and approved later runtime evidence; Docker is not used.

## Success Criteria

- [ ] Matrix covers each existing Agronautas/Iberá-Alerta contract and rendered evidence state.
- [ ] UI distinguishes all seven states without inventing capabilities or live results.
- [ ] Focused tests/build pass while the known baseline E2E failure remains accurately recorded.
- [ ] No Google Maps, WhatsApp, durable polygons, broad precomputation, scheduler rewrite, canonical-engine decision, or hydraulic-simulation claim is introduced.
