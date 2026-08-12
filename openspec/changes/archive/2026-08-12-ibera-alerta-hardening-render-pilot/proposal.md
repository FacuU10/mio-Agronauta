# Proposal: Iberá-Alerta Hardening and Institutional Render Pilot

## Intent

Prepare Iberá-Alerta for a bounded institutional pilot, separate from Agronautas, without overstating readiness. Process-local status/scheduling, non-destructive pruning, inconsistent coverage, and incomplete evidence boundaries require durable PostgreSQL state and explicit ownership.

## Scope

### In Scope
- Add a PostgreSQL ledger for lifecycle, provider results/diagnostics, expiry, and restart-safe `statusPath` reads.
- Use one external Render Cron; keep in-process schedulers disabled; enforce cross-instance ownership with a DB lease or stable scheduled-slot uniqueness.
- Implement bounded retention/prune with additive, reversible migrations/seeds.
- Reconcile municipality/locality coverage, PNA/INA/INMET/SMN evidence semantics, Copilot zones, and citation contracts.
- Preserve adapters, independent failures, and UI evidence surfaces; add safe forecast, telemetry, alert, freshness, provenance, and local-context states without inventing values.
- Separate unit/contract tests, local runtime with real providers/database, and commit-correlated production/Render proof.

### Out of Scope
- Agronautas queues, risk/signal state, UI, or deployment ownership.
- Provider rewrites, unsupported locality expansion, dynamic IDs, historical timelines, long-range forecasts, or a new worker/queue service.
- Claims of current production, Cron, or provider readiness before corresponding proof exists.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `ibera-alerta`: durable status, single-Cron ownership, idempotency, retention, coverage, provider evidence, Copilot grounding, and safe pilot UI states.

## Approach

Extend existing hydrology ports and PostgreSQL repositories. Persist run/slot identity and lease ownership transactionally; reconstruct status after restart; execute one authenticated Cron path; and prune beyond retention. Keep freshness, provenance, timestamps, diagnostics, and unavailable states explicit. Copilot claims require evidence references or a clear citation boundary.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| API, hydrology engine, migrations/seeds | Modified | Ledger, lease, prune, coverage/evidence |
| `render.yaml` | Modified | External Cron; no in-process owner |
| Iberá web overview/detail/ingest | Modified | Durable status and evidence states |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Duplicate/orphaned runs | Med | Lease/slot key and expiry recovery |
| Gaps misread as facts | High | Reconciled source and unavailable states |
| Migration harms data | Med | Additive migration, validation, reversible seed |

## Rollback Plan

Disable Cron and the new scheduler, revert application changes, and isolate ledger data. Roll back migrations after dependency checks; restore coverage by seed version. Preserve last-known telemetry and UI fallbacks.

## Dependencies

- PostgreSQL/PostGIS, provider access, Render Cron, and pilot evidence access.

## Success Criteria

- [ ] Tests prove contracts, restart-safe status, lease/slot uniqueness, retention, coverage, evidence, and safe unavailable states.
- [ ] Local real-provider/database runtime proves persistence and UI rendering without fabricated values.
- [ ] Revision-correlated production proof proves one Cron owner and bounded source/status evidence; absent proof remains unclaimed.
