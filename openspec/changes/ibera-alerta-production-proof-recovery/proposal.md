# Proposal: Iberá-Alerta Production Proof Recovery

## Intent

Recover from the blocked `ibera-alerta-real-feeds-local-prod` verification by making production readiness depend on current, real, correlated runtime proof for every configured provider: PNA, INA, INMET, and SMN. Tests, lint, and build are supplemental only; they can never establish product readiness.

## Scope

### In Scope
- Fix or instrument the hydrology ingest/proxy/UI path needed to obtain safe one-shot evidence locally and after approved deployment to `https://www.agronauta.com.ar`.
- Capture per-provider proof layers: real outbound request, HTTP response summary, remote production DB insertion tied to the run, local API payload, production API payload, and rendered browser UI.
- Preserve bounded smoke behavior: one-shot only, no retry/polling, redacted secrets, non-destructive reads/writes limited to official telemetry ingestion.

### Out of Scope
- Declaring ready/production-ready, archiving SDD, or treating historical PASS claims as current proof.
- Rewriting hydrology architecture or replacing provider integrations wholesale unless required by specs/design.
- Expanding scheduled ingest cadence or adding automated repeated production probes.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `ibera-alerta`: strengthen production hydrology readiness requirements so all configured providers and all evidence layers MUST pass before completion.

## Approach

Use the existing blocked verification report and local artifact as reference only. Plan fixes around the observed blockers: production ingest timeout/no body, local BFF 503, incomplete INA/INMET/SMN real-success proof, and missing raw upstream response summaries. Verification must correlate each run with timestamps/run IDs and production DB rows, then prove local and deployed API/UI behavior.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api` | Modified | Ingest route/client observability and bounded response evidence. |
| `apps/web` | Modified | Local/production hydrology BFF routing and rendered UI proof path. |
| `packages/hydrology-engine` | Modified | Provider adapters/diagnostics as needed for real HTTP response summaries. |
| `openspec/changes/ibera-alerta-production-proof-recovery` | New | SDD artifacts for recovery. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Production provider or platform timeout blocks evidence | High | Keep one-shot smoke, expose safe per-source diagnostics, block readiness if absent. |
| Provider data is unavailable or not machine-readable | High | Record failed evidence honestly; do not fake success or archive. |
| Smoke accidentally becomes load/retry behavior | Medium | Enforce no retry, no polling, explicit source limits, and evidence count. |

## Rollback Plan

Before application work, backup current state per project policy. Roll back by reverting the approved deployment commit(s) and redeploying the prior stable main/deployment revision. Verification artifacts are audit-only and should remain.

## Dependencies

- Approved commit/deploy to main or deployment branch before production proof.
- Safe access to redacted production API/DB evidence and browser smoke tooling.

## Success Criteria

- [ ] For PNA, INA, INMET, and SMN, every evidence layer passes locally and on `https://www.agronauta.com.ar` after approved deploy.
- [ ] Any missing/failing provider or evidence layer is reported as BLOCKED, not ready.
- [ ] Smoke remains one-shot, redacted, non-destructive, and free of retries/polling.
