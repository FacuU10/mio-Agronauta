# Proposal: Agronautas Render and Risk-Engine Hardening

## Intent

Make Agronautas recompute behavior honest, traceable, and recoverable without conflating it with Iberá-Alerta. The current API, Python runtime, queue, and PostgreSQL contracts pass isolated tests but are not an operationally connected flow. This slice closes the real blockers while preserving Iberá as a separate product using shared infrastructure only.

## Scope

### In Scope
- Define a versioned risk-engine contract and cross-runtime golden vectors for `risk-v0` and `open-meteo-basic-v1`; record divergence and do not declare parity or a canonical algorithm yet.
- Align the Agronautas queue name, shared job factory, worker entrypoint, IDs, lease/attempt envelope, retry, and DLQ semantics.
- Persist worker state transitions and current heartbeats in PostgreSQL; make readiness reflect that durable state.
- Carry run IDs, freshness, provenance, and snapshot-to-alert lineage through recompute results.
- Preserve submitted crops (remove forced rice), and make Corrientes locality coverage explicit and truthful.
- Keep Render limited to the existing Native Node API/web boundary; document the Python worker as a separate runtime dependency, not a fabricated Render deployment.

### Out of Scope
- Any Iberá-Alerta domain, alert, hydrology, or municipality behavior change.
- Selecting/retiring a canonical risk algorithm, rewriting historical snapshots, or claiming end-to-end recompute readiness before queue and entrypoint correction.
- Adding a Python Render service, Docker runtime, provider expansion, or province-wide coverage data.

## Capabilities

### New Capabilities
- `agronautas-risk-engine-contract`: versioned inputs/outputs, golden vectors, explicit non-parity status, and migration boundary.
- `agronautas-recompute-runtime`: queue/entrypoint alignment, durable jobs, heartbeat, retry, and DLQ envelope behavior.
- `agronautas-risk-lineage`: freshness, concrete provider/run provenance, and alert snapshot lineage.
- `agronautas-field-coverage`: generic crop preservation and evidence-backed Corrientes locality coverage.

### Modified Capabilities
- None; the existing `ibera-alerta` capability remains unchanged.

## Approach

Use shared typed contracts and ports, with the API dispatcher and Python consumer importing the same job definition. Keep the Python path as the active intended dispatcher only after its queue and process boundary are corrected; keep TypeScript `risk-v0` comparison/test evidence separate until a later decision. Use additive, backward-compatible persistence/envelope changes and explicit status/version fields for existing records.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/workflows`, `packages/contracts` | Modified | Shared job, engine, retry, lineage, and vector contracts. |
| `apps/api`, `apps/workflow-runtime-python` | Modified | Dispatch, worker entrypoint, Postgres states, heartbeat, snapshots, alerts. |
| `infra/bootstrap/agronautas`, field intake/seeds | Modified | Crop and Corrientes coverage truth. |
| `render.yaml` | Preserved/clarified | Node API/web only; no invented Python deployment. |

## Evidence Boundaries

- **Unit/contract:** fakes, schema validation, and golden-vector comparison; cannot prove provider or runtime availability.
- **Local runtime:** real configured PostgreSQL/Redis and providers, with bounded recompute and lineage evidence.
- **Production/Render:** static manifest and deployed Node API/web evidence only; no worker or end-to-end claim without an approved worker deployment boundary.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Algorithm divergence is mistaken for parity | High | Version outputs, publish vectors, and block canonical claims. |
| Legacy jobs/rows cannot consume new fields | Med | Additive defaults, tolerant readers, and staged activation. |
| Coverage or crop fixes overstate geography | Med | Require persisted coverage lookup and label unsupported localities explicitly. |

## Rollback Plan

Disable the new dispatch/worker activation flag, stop accepting the new envelope version, and resume the prior read-compatible path. Leave additive columns and historical snapshots intact; do not delete or rewrite data. Revert crop/coverage behavior only through a reviewed migration rollback, preserving submitted values for audit.

## Dependencies

- Configured PostgreSQL/PostGIS, Redis, and provider credentials for local runtime evidence.
- A separately approved production worker process boundary before any production recompute claim.

## Success Criteria

- [ ] Queue and Python process consume the dispatched Agronautas job and update durable PostgreSQL state/heartbeat.
- [ ] Retry/DLQ behavior is deterministic from the actual dispatched envelope.
- [ ] Golden vectors expose divergence without claiming parity; lineage includes run IDs, freshness, and alert snapshot linkage.
- [ ] Non-rice intake is preserved and Corrientes coverage claims match persisted evidence.
- [ ] Evidence is reported separately for unit/contract, local real-service/provider runtime, and production/Render Node boundary.
