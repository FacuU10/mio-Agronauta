# Proposal: Agronautas Canonical Risk/Job Runtime Contract

## Intent

Agronautas has two honest but incompatible risk implementations and a partially connected queue path. A versioned, engine-neutral contract is needed now so TypeScript and Python agree on job identity, legal transitions, result truth, lineage, and operational readiness without prematurely declaring a canonical engine. `selectionStatus` remains `undecided`.

## Scope

### In Scope
- A shared versioned JSON/Zod/Python envelope for risk recompute and scheduled-window jobs, leases, results, freshness, uncertainty, degradation, engine metadata, and provider lineage.
- A legal state machine with one retry-transition owner, atomic lease reclaim, durable PostgreSQL job/result authority, idempotent `jobId`/`runId`, ACK-after-persistence, and restart/DLQ semantics.
- Cross-runtime fixtures and strict RED-GREEN-REFACTOR tests, plus truthful readiness and bounded telemetry boundaries.

### Out of Scope
- Marketplace, management/identity/ownership, default-workspace redesign, or Iberá-Alerta changes.
- Provider expansion/qualification, economic recommendations, autonomous actions, calibration, model accuracy, or selecting either risk engine.
- Enabling cron or claiming production readiness from tests, fixtures, queue length, or planning logs.

## Capabilities

### New Capabilities
- None; this is a contract-level evolution of the existing runtime foundation.

### Modified Capabilities
- `runtime-evidence-foundation`: add canonical risk/job/result contracts, legal transitions, durable outcome semantics, and readiness gates while preserving typed unavailable/degraded states.

## Approach

Additive schemas and typed ports will normalize the existing factory, dispatcher, API admission, PostgreSQL repository, Python consumer, both risk handlers, readiness, and telemetry. PostgreSQL remains durable authority; Redis remains transport/ephemeral support. Preserve both implementations and emit engine identity plus `selectionStatus: undecided`; unavailable results contain no score, level, drivers, or recommendations. Extend existing telemetry rather than creating a second logger.

## Migration Compatibility

Read adapters accept `workflow-job.v1` and risk snapshots `1.0.0`; new writes are feature-flagged. Reuse existing columns where safe, add only unrepresentable fields, never rewrite historical snapshots or relabel engine/version, preserve BFF shapes and old snapshot reads, and keep scheduler disabled until the complete runtime gate passes.

## TDD and Evidence Plan

- **RED:** shared fixtures, transition matrix, unavailable invariants, legacy adapters, and TypeScript/Python validation fail first.
- **GREEN:** smallest schema/factory/repository/consumer changes; fake Redis/PostgreSQL tests cover claim, heartbeat, retry, duplicate, restart, DLQ, and scheduled-window unavailable paths.
- **REFACTOR:** cross-runtime formula-envelope fixtures, provider timestamp/license/freshness cases, readiness and telemetry contract tests after integration passes.
- **Local:** deterministic tests prove behavior only. **Runtime:** separately capture authorized API→Redis→worker→PostgreSQL completion/recovery. **Production:** require worker/Redis/PostgreSQL/Render/cron/credentials and an authorized field; do not credit absent evidence.

## Dependencies and Decisions Still Needed

Dependencies: baseline `0e84707`, current runtime schemas/factory/repositories/consumer, PostgreSQL/Redis, compatible Python dependencies, and existing risk/evidence adapters. Still needed: risk owner, severity/freshness SLOs, agronomist review, automatic-task policy, liability wording, retry budget, and provider licensing/forecast semantics.

## Affected Areas

`packages/contracts`, `packages/zod-schemas`, `packages/workflows`, API runtime/queue/readiness/telemetry/Prisma, Python consumer/jobs, and contract tests/fixtures.

## Risks

- Retry may double-transition or DLQ: designate one owner and test atomic outcomes.
- Legacy freshness/status semantics may be misread: use explicit adapters and preserve history.
- Readiness may overclaim: require durable heartbeat/lease evidence and keep defaults disabled.

## Rollback Plan

Disable the runtime capability flag and scheduler, stop new-envelope writes, retain legacy read adapters and historical records, and revert additive schema/code changes without deleting jobs, snapshots, or lineage.

## Success Criteria

- [ ] AJV/Zod/Python consume identical fixtures and serialize the same envelope and legal transition outcomes.
- [ ] Both engines remain callable/comparable with `selectionStatus=undecided`; no parity or calibration claim is emitted.
- [ ] Duplicate, retry, lease-expiry, restart, DLQ, and unavailable paths persist exactly one durable outcome before ACK.
- [ ] Historical `1.0.0` snapshot reads and existing BFF behavior remain compatible; scheduler remains disabled absent production gates.
