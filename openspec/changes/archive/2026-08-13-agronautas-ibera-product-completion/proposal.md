# Proposal: Agronautas and Iberá-Alerta Product Completion

## Intent

Starting from `main` at `ccb8a63` (`fix: stabilize unified production continuation`), close the smallest evidence-backed pilot workflows in the two products. Agronautas needs a usable field index and truthful geometry, report, and risk explanation loop; Iberá-Alerta needs durable operator run history and municipality explanations. This proposal does not convert partial code paths, seeded data, manifests, or test fixtures into external production proof.

## Scope

### In Scope
- **A→C Agronautas:** read-only field index; existing-field pilot navigation; geometry save/read-back/report evidence; explanatory risk/climate decision view using current snapshots, timelines, provenance, and engine metadata without selecting a new engine.
- **D→E Iberá-Alerta:** operator history backed by `ibera_ingest_runs`; municipality threshold/tendency/forecast explanation and a read-only telemetry/official-alert incident timeline; preserve explicit non-hydraulic semantics.
- Strict TDD: RED-GREEN-REFACTOR tests for contracts, ports/adapters, persistence, routes, UI states, and focused browser journeys before implementation; run applicable Node, Python, build, and Playwright evidence separately.

### Out of Scope
- Authoritative Iberá geometry (F), hydraulic simulation, propagation/impact modeling, or evacuation decisions.
- Campaigns, calendars, tasks, responsibles, human decisions, productivity/economics/markets, simulators, credit, insurance, pricing, and claims.
- Google Maps/Places/Drawing setup, credentials, Render/Cron/provider execution proof, and external pilot outcomes. These remain evidence/configuration follow-ups, not hidden dependencies.

## Capabilities

### New Capabilities
- `agronautas-pilot-evidence`: field index, pilot navigation, geometry/report evidence, and explanatory risk/climate presentation over existing contracts.

### Modified Capabilities
- `ibera-alerta`: durable read-only ingest-run history and explicit municipality threshold/trend/forecast plus incident-timeline projections, without changing the no-hydraulic boundary.

## Approach

Sequence A, B, C, then D, E. Reuse existing Clean/hexagonal ports, Prisma/PostGIS persistence, Zod contracts, React Query/Zustand adapters, and dumb UI components. Additive migrations/contracts only where required; retain separate Agronautas and Iberá routes, models, authorization, copy, and evidence levels. A depends on current field persistence; B on geometry paths; C on A/B; D on the existing ledger; E on persisted telemetry/alerts and benefits from D. F starts only after an approved authoritative dataset with provenance/version/validity.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/presentation/routes/agronautas.ts`, field repository, `packages/zod-schemas` | Modified | Field index, evidence, geometry/report contracts. |
| `apps/web/src/components/agronautas`, `apps/web/src/lib/agronautas` | Modified | Pilot navigation and evidence-first states. |
| `apps/api/src/presentation/routes/hydrology-government.ts`, `packages/hydrology-engine` | Modified | Run history and municipality explanation projections. |
| `apps/web/src/components/government`, `apps/api/prisma` | Modified | Operator timeline UI and additive persistence only if needed. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Partial or stale evidence is overclaimed | Med | Required freshness, provenance, source/run IDs, evidence labels, and explicit unavailable states. |
| Seeded Iberá geometry is mistaken for authority | High | No geometry exposure in this change; defer behind F gate. |
| Cross-product coupling grows | Med | Separate capability/spec namespaces, routes, repositories, authorization, and sequencing. |

## Rollback Plan

Revert each slice independently; additive contracts and UI routes can be disabled without rewriting existing telemetry or field geometry. Roll back any additive migration only after dependency checks, preserving existing tables and last-known data. External configuration and provider state is untouched.

## Dependencies

- Current `fields`/PostGIS geometry path and existing Agronautas evidence contracts.
- Existing `ibera_ingest_runs` migration, repository, and coordinator.
- No new external provider, credential, or authoritative dataset.

## Success Criteria

- [ ] A–E pass strict RED-GREEN-REFACTOR contract, unit/integration, build, and applicable browser evidence.
- [ ] Agronautas supports field index → detail → geometry/report/risk explanation with truthful evidence states.
- [ ] Iberá supports durable run history and municipality explanation/timeline without hydraulic claims.
- [ ] Evidence distinguishes local tests/runtime from unavailable Google, Render, provider, and real-pilot proof.
