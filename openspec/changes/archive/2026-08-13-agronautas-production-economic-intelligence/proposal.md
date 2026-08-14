# Proposal: Agronautas Evidence-First Economic Intelligence Foundation

## Intent

Establish a truthful Agronautas intelligence boundary before adding economic providers or calculations. The product should reuse existing field, climate, risk, freshness, provenance, and degradation contracts, while clearly distinguishing available evidence from unavailable or insufficient evidence. It must never present an ungrounded economic or planting recommendation as useful.

## Scope

### In Scope
- Add a versioned, read-only intelligence view contract over existing Agronautas evidence.
- Represent soil, prices, dollar/FX, economics, and recommendations with explicit `unavailable` or `insufficient_evidence` states and reasons.
- Define future-ready observation metadata for source, unit, currency, observed timestamp, retrieval timestamp, and lineage without selecting providers or integrating external data.
- Keep risk-engine identity and selection status unchanged (`undecided`).

### Out of Scope
- Provider selection, external integrations, fabricated/default values, or economic calculations.
- Soil ingestion, crop-yield history, prices, FX, costs, margins, scenarios, or profitability persistence.
- A planting recommendation that lacks the required observed inputs.
- Any Iberá-Alerta route, schema, storage, vocabulary, or ownership change.

## Capabilities

### New Capabilities
- `economic-intelligence-foundation`: Evidence-first Agronautas intelligence states and future-ready observation lineage.

### Modified Capabilities
- None. Existing Agronautas climate/risk/evidence contracts remain compatible; Iberá-Alerta is unchanged.

## Approach

Additive contracts and a backend-owned read model should compose persisted field and climate/risk evidence, expose provenance and freshness, and map missing domains to explicit states. Recommendation eligibility must require verified soil, crop-history/yield, price, FX, and cost inputs; otherwise return explainable `insufficient_evidence` with missing-input reasons. Metadata fields remain nullable only when the state explains why they are absent. UI renders the contract without inventing values. Strict TDD should cover contract states, lineage serialization, degraded evidence, and recommendation blocking.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/zod-schemas`, `packages/contracts` | Modified | Versioned intelligence/evidence metadata contracts. |
| `apps/api/src/domain`, `application`, `presentation` | New | Read model and endpoint over existing Agronautas evidence. |
| `apps/web/src/lib/agronautas`, `components/agronautas` | Modified | Render available, unavailable, and insufficient states. |
| `openspec/changes/.../specs` | New | Capability requirements and scenarios. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing data is mistaken for a value | High | Typed states, reasons, provenance, and blocked recommendations. |
| Economic logic couples to risk-engine choice | Med | Preserve `undecided`; no economic derivation from risk scores. |
| Generic JSON loses lineage semantics | Med | Explicit source/unit/currency/timestamp/lineage fields. |

## Rollback Plan

Remove the additive intelligence contracts, read model, endpoint, UI mapping, and tests as one bounded slice; existing field, climate, risk, evidence, and Iberá behavior remain intact.

## Dependencies

- Existing Agronautas field, climate, risk, freshness, provenance, and degradation contracts.
- Future provider and domain-policy decisions are prerequisites for useful economic outputs, not dependencies of this foundation.

## Success Criteria

- [ ] Every economic domain returns an explicit truthful state; no fabricated values appear.
- [ ] Recommendation output is `insufficient_evidence` until required observed inputs exist.
- [ ] Source/unit/currency/timestamps/lineage are representable without external integration.
- [ ] Existing risk-engine undecided status and Iberá separation remain unchanged.
