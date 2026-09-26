# Proposal: Agronautas Product Flows Completion

## Intent

Complete Agronautas and Iberá-Alerta as truthful, evidence-backed products through independently verifiable slices. Current field/workspace, provider, Copilot, municipal, management, and recovery seams are incomplete around canonical location/evidence, satellite/SMN presentation, scheduling, management actions, and marketplace discovery. Users need actionable context with freshness, provenance, permissions, and recovery states; operators need proof before readiness claims.

## Scope

### In Scope
- Canonical authorized location, workspace/field selection, evidence, freshness, provenance, degradation, and readiness contracts.
- Evidence-first slices for climate/weather/SMN/satellite, normalized UI, evidence-grounded Copilot, Iberá recovery/readiness, management, and local B2B catalog/discovery/RFQ.
- A phase DAG with strict TDD/build and real-service local/production gates for scheduler/worker, persistence, queue/cron, BFF/auth, browser, and providers.

### Out of Scope
- Payments, payouts, Checkout Pro, Money Out, settlement, escrow, custody, or financial guarantees.
- Copied Alqui/Vialovers behavior, hydraulic/evacuation authority, unverified geometry, or readiness claims without evidence.
- Reopening, verifying, archiving, or modifying `agronautas-auth-security-isolation`; preserve the dirty checkout and unrelated artifacts.

## Scope Amendment

- The current change acceptance scope is B0–S7, including management workflows and marketplace discovery/RFQ workflows.
- Gate G is moved out of the active task count and deferred to a later change; it remains incomplete and must not be represented as production-ready.
- The later G change may proceed only after the external provider/production prerequisites are supplied, including provider credentials/approval, authorized production field fixtures, and Render/worker/cron evidence.
- This amendment changes acceptance and task accounting only; the technical G rationale, prerequisites, and evidence remain retained in the SDD artifacts.

## Capabilities

### New Capabilities
- `canonical-location-evidence`: scoped locations plus evidence lineage/freshness.
- `agronautas-signal-completion`: climate, weather alerts/SMN, satellite, scheduling, and rendering.
- `management-workflows`: durable campaigns/operations/tasks, permissions, and audit semantics.
- `marketplace-discovery-rfq`: local listings and human-reviewed RFQ handoff only.
- `real-service-completion-gate`: source-by-source operational/browser proof.

### Modified Capabilities
- `agronautas-operational-journey`: truthful selection, evidence, and recovery.
- `intelligence-foundation`: canonical authorized evidence-grounded Copilot.
- `runtime-evidence-foundation`: provider/freshness/provenance outcomes.
- `ibera-alerta`, `institutional-expansion`: recovery/readiness and geometry/coverage truth.
- `management-foundation`: approved management paths beyond read-only context.

## Approach

Use additive ports/adapters and versioned contracts; keep UI dumb and enforce workspace/field/actor isolation in backend use cases. Active DAG: `B0 boundary → S1 location → S2 providers + scheduler/worker → S3 evidence UI → S4 Agronautas Copilot → (S5 Iberá readiness || S6 management) → S7 marketplace RFQ`. Gate G real-service completion is a deferred follow-up after its external provider/production prerequisites are supplied. Satellite is not live without scene/coverage/processing proof; Iberá official-source Copilot remains separate/read-only.

## Affected Areas

`apps/api`, `apps/web`, `apps/workflow-runtime-python`, `packages/zod-schemas`, Prisma/PostGIS/Redis jobs, Iberá government routes, `render.yaml`, and runtime/browser harnesses. Proposal only; no application source changes.

## Risks

| Risk | Mitigation |
|---|---|
| Provider/licensing or scheduler gaps create false freshness | Per-source modes, lineage, last-success timestamps, idempotent retries, and unavailable/degraded states. |
| Geometry, auth/workspace, or boundary leakage | Backend scope checks, reviewed geometry, separate ownership, immutable auth/Iberá boundaries. |
| Mega-SDD review/rollback risk | Independently releasable slices; forecast the approved single-PR size exception before apply. |

## Rollback Plan

Release behind additive routes/flags, preserve old contracts, stop the affected worker/cron/provider, roll back its migration, retain last-known evidence as degraded, and restore the prior frontend contract without touching auth.

## Dependencies

Categories only: PostgreSQL/PostGIS/migrations; Redis/queue; worker DSN/contract root; BFF/API/CORS; auth/session/bootstrap; map/geocoding; Open-Meteo policy; SMN; FIRMS; Sentinel/Copernicus or approved STAC; Copilot model service; hydrology token/cron ownership; Render/deployment/log access. No secret values.

## Success Criteria

- [ ] Each in-scope B0–S7 slice passes strict TDD, build, contract, and browser checks without fabricated data.
- [ ] Separate local and production evidence proves provider outcomes, persistence, queue/cron transitions, isolation, recovery, and rendering.
- [ ] Readiness is reported per proven source/product state only; no unverified global claim; B0–S7 acceptance does not claim production readiness for deferred G.
