# Proposal: Agronautas Commercial Pilot Field Mapping

## Intent

Make Agronautas `/demo` commercially demonstrable without overstating evidence. Operators need field search, editable perimeter, coordinates/area, and clear real/stale/degraded/unavailable states for existing risk, alerts, provenance, telemetry, recompute, reports, and chat. Today `polygonWkt` is dropped and Maps is absent.

## Scope

### In Scope
- Additive authenticated geometry read/update; reconcile PostGIS and make server area authoritative.
- Optional Google Maps/Places/Geometry/Drawing adapter with search, coordinates, editable perimeter, area/perimeter, fallback, and no-credential state.
- Tailwind 4 upgrade of workspace/detail surfaces with existing evidence/actions and truthful state handling.

### Out of Scope
- Iberá/government routes, components, specs, narratives, or shared models.
- Backend/GIS rebuild, risk engine, provider acquisition, broad modules, or invented data.
- Google claims before restricted credentials, enabled APIs/billing, and runtime; no Docker.

## Capabilities

### New Capabilities
- `agronautas-field-geometry`: Persisted, server-authoritative perimeter, centroid, area, update/read semantics.
- `agronautas-commercial-pilot-ui`: Map editing and evidence-first presentation.

### Modified Capabilities
- None (no existing Agronautas source spec is present; Iberá remains unchanged).

## Approach

Use strict RED-GREEN-REFACTOR TDD across schema, domain, use case, PostGIS, route/auth, browser contracts, and UI states. Keep geometry in typed API/domain boundaries, Google behind a replaceable adapter, and React narrow. Reuse routes; add only the geometry seam. Label evidence: Level 0 tests; Level 1 local API/PostGIS smoke; Level 2 credential-backed Google runtime; Level 3 pilot/production evidence. Lower levels are not production proof.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api`, `packages/zod-schemas` | Modified | Geometry validation, update/auth, PostGIS, area. |
| `apps/web/src/components/agronautas`, `apps/web/src/lib/agronautas` | Modified | Mapping editor, evidence UI, adapter. |
| `apps/web/tests/e2e`, API/schema tests | Modified | TDD and contract coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Invalid geometry or misleading area | High | Server validation/derivation, idempotent update, rejection, saved-state distinction. |
| Missing Google credentials/runtime | High | Optional adapter, point fallback, visible prerequisite and evidence boundary. |
| Dirty unrelated tree | High | Touch approved pilot artifacts only; preserve Agronautas/Iberá changes. |

## Rollback Plan

Disable Google and revert additive route/UI commits; retain point intake/read. For migration rollback, restore the prior repository path without deleting records, then remove pilot writes after backup checks.

## Dependencies

- Configured PostgreSQL/PostGIS and API/web runtimes; restricted Google browser key, APIs, and billing for Level 2. No Docker.

## Success Criteria

- [ ] TDD proves geometry validation, server area, auth, idempotency, persistence round-trip, and UI states.
- [ ] Local smoke proves saved geometry/read-back; Google remains unavailable without credentials.
- [ ] UI exposes existing evidence/actions without invented values and keeps Iberá untouched.
- [ ] Rollback leaves point intake functional; broader modules remain deferred pending pilot evidence.
