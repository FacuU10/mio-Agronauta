# Proposal: Agronautas Campaign Planning Context and Assumption Simulators

## Intent

Give Agronautas a truthful next planning slice now that the persisted default workspace and field index exist. The product will provide an explicit campaign-planning context and transparent scenario contracts without turning missing soil, price, or economic evidence into facts.

## Proposal question round

Skipped per autonomous execution. Current evidence resolves the key assumptions: the default workspace is the only supported scope; it has stable fields but no user identity, ownership, collaboration, or campaign lifecycle; scenarios are user-authored calculations, never forecasts or recommendations.

## Scope

### In Scope
- Add a typed, read-oriented campaign context over the default workspace and its existing field index. Campaign name/identity, season, and selected field IDs are template/request values; field IDs MUST resolve to fields in the supported workspace.
- Define versioned assumptions-only scenario/simulator contracts accepting user-provided inputs, explicit units/currency, assumptions, calculation outputs, and missing-input states. Results MUST be labeled `user_assumption_simulation`.
- Render explicit `unavailable` or `insufficient_evidence` states for soil, prices, FX, and external economic sources; keep source, freshness, and provenance boundaries visible where existing evidence exists.

### Out of Scope
- Durable campaign, season, membership, calendar, resource, cost, ownership, responsibility, or collaboration records and migrations.
- Providers, markets, commodities, export, marketplace, credit, insurance, canonical risk/rentability engines, forecasts, recommendations, or profitability claims.
- Any Iberá-Alerta route, schema, persistence, UI, or vocabulary change.

## Capabilities

### New Capabilities
- `campaign-planning-context`: Agronautas-only read model/template connecting explicit campaign planning inputs to the default workspace field index.
- `assumptions-only-simulators`: User-input-only scenario contracts with deterministic, labeled calculations and truthful unavailable/insufficient states.

### Modified Capabilities
- None.

## Approach

Reuse the existing workspace/field context and evidence-state vocabulary. Keep campaign identity, season, and field selection non-persistent because workspace semantics do not establish campaign ownership or lifecycle. Validate selected fields against the default workspace, calculate only from supplied assumptions, and never derive economic values from climate or risk evidence.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/zod-schemas/src/agronautas.ts` and `packages/contracts/schemas/` | Modified | Versioned planning and simulator contracts. |
| `apps/api/src/domain/` and `apps/api/src/presentation/routes/agronautas.ts` | Modified | Read model, validation, and deterministic calculation boundary. |
| `apps/web/src/lib/agronautas/` and `apps/web/src/components/agronautas/` | Modified | Planning context, assumption entry, and explicit unavailable states. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Template values are mistaken for durable campaigns | Med | Mark read-only/non-persistent and omit actor or ownership fields. |
| Assumptions are mistaken for evidence | Med | Label inputs, units, provenance, and result type; block missing inputs. |
| Agronautas concepts leak into Iberá | Low | Keep namespaces, routes, schemas, and tests product-specific. |

## Rollback Plan

Disable the new planning/simulator routes and UI, then revert additive contracts and calculation modules. No migration or existing field/evidence rollback is required because this slice persists no campaign data.

## Dependencies

- Existing persisted default workspace, field index, and typed evidence-state contracts; no external provider dependency.

## Success Criteria

- [ ] A planning context resolves only supported workspace fields and clearly identifies its non-persistent template boundary.
- [ ] Simulator results use only user-provided inputs, explicit units/currency, and `user_assumption_simulation` labeling.
- [ ] Missing soil, price, FX, and external economic evidence renders typed unavailable/insufficient states with no fabricated values.
- [ ] No ownership, collaboration, market, finance, canonical-risk, or Iberá behavior is introduced.
