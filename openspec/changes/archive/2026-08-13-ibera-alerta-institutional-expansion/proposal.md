# Proposal: Iberá-Alerta Institutional Evidence Expansion

## Intent

Extend Iberá-Alerta into an institutional read workflow. Make evidence history, coverage limits, and threshold/trend/forecast explanations understandable without turning mappings into hydraulic or impact claims.

## Scope

### In Scope
- Add a reviewed source/zone registry with provenance, version, freshness, and status.
- Add bounded telemetry/alert history and an authenticated workflow over durable outcomes.
- Add coverage statuses plus server-owned threshold, trend, forecast, and mapping explanations.

### Out of Scope
- Official geometry or geometry-derived coverage until authoritative geometry is verified.
- Hydraulic simulation, propagation, routing, discharge, evacuation advice, or impact modeling.
- Provider expansion without verified identifiers/authorization; human case management.
- Transfer of Agronautas queue, risk, signal, or deployment ownership.

## Capabilities

### New Capabilities
- `ibera-source-registry`: Reviewed source, zone, station, coverage, provenance, and geometry status.
- `ibera-evidence-timeline`: Bounded telemetry/alert history, not a human case system.
- `ibera-coverage-status`: Supported, partial, unavailable, stale, failed, blocked, and unverified states.
- `ibera-explanations`: Server-generated threshold, trend, forecast, and mapping explanations.
- `ibera-operator-workflow`: Authenticated durable status history without unapproved browser mutations.

### Modified Capabilities
- `ibera-alerta`: Replace the deferred bounded-history boundary while retaining no-hydraulic-simulation, provider-horizon, reviewed-coverage, and separation constraints.

## Approach

Extend Iberá contracts, repository ports, PostgreSQL read models, authenticated routes, and government components additively. Keep decisions server-side, preserve degraded/empty/unavailable states, and use persisted telemetry, coverage, durable runs, and authoritative provenance. Generated squares remain unverified.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/zod-schemas`, `packages/hydrology-engine` | Modified | Registry, history, status, and explanation read models. |
| `apps/api` and PostgreSQL migrations | Modified | Bounded queries, governance metadata, and protected views. |
| `apps/web/src/components/government` | Modified | Provenance, gaps, history, explanations, and safe states. |
| `openspec/specs/ibera-alerta/spec.md` | Modified | Additive requirements for bounded history and governance. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Synthetic geometry/mapping is read as official impact | High | Unverified/source-mapping language and status gates. |
| History becomes a case system | Med | Time/cursor bounds; read-only evidence events. |
| Forecast/trend wording overclaims | Med | Preserve provider horizon; use bounded observations only. |

## Rollback Plan

Disable new associations and fields behind status gates, revert projections, and retain telemetry, coverage, and durable ingest data. Remove metadata only after dependency checks.

## Dependencies

- Verified official identifiers, URLs, provenance, and authorization for registry additions.

## Success Criteria

- [ ] Views explain evidence, thresholds, trends, forecasts, and gaps with provenance and bounded states.
- [ ] Operator status/history remains authenticated, durable, safe, and separate from case management.
- [ ] No official geometry, hydraulic impact, unsupported provider, or Agronautas ownership claim appears.
