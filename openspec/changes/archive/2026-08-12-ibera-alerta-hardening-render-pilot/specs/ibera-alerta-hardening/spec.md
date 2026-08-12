# Delta for ibera-alerta

## ADDED Requirements

These requirements apply only to Iberá-Alerta and MUST NOT transfer Agronautas queue, risk, signal, or deployment ownership into this product.

### Requirement: Durable run ledger and restart-safe status

Iberá-Alerta MUST persist lifecycle, scheduled-slot identity, source results/diagnostics, terminal status, and expiry in PostgreSQL. `statusPath` MUST reconstruct safe status from any instance after restart without changing last-known telemetry.

#### Scenario: Status survives restart

- GIVEN a committed run is `running` or terminal
- WHEN the API restarts and `statusPath` is requested
- THEN persisted lifecycle and source results are returned, not a process-local `404`

#### Scenario: Retry after transient failure

- GIVEN one provider fails while others complete
- WHEN the run reaches terminal state and is retried
- THEN independent outcomes remain recorded and prior diagnostics/successful data are not erased

### Requirement: Single external Cron ownership and duplicate safety

Exactly one authenticated Render Cron MUST own scheduled ingest. In-process hydrology schedulers MUST remain disabled. A stable slot key or database lease MUST enforce one active owner across instances; duplicate deliveries MUST NOT duplicate provider calls or official writes.

#### Scenario: Duplicate Cron delivery

- GIVEN two instances receive the same authenticated slot
- WHEN both attempt admission
- THEN one owns execution and the other observes the existing run without duplicate provider work

#### Scenario: Expired owner is recoverable

- GIVEN an owner lease expires before completion
- WHEN a later delivery claims the slot
- THEN it may recover the run once and the ledger records prior ownership

### Requirement: Bounded retention and reversible migration

Retention MUST prune only expired ledger/result artifacts in bounded SQL batches and MUST preserve last-known telemetry. Schema and coverage migrations MUST be additive, validated, idempotent, and reversible after dependency checks.

#### Scenario: Prune does not remove current evidence

- GIVEN expired and current records coexist
- WHEN retention runs
- THEN only eligible expired records within the batch bound are removed and current telemetry/provenance remain queryable

#### Scenario: Migration preserves existing data

- GIVEN existing runs, telemetry, municipalities, and mappings
- WHEN migration and seed run repeatedly
- THEN existing data remains intact, associations occur once, and rollback can isolate new ledger state

### Requirement: Reconciled coverage and truthful provider evidence

The system MUST expose one reconciled municipality/locality inventory with geometry status and explicit source/station relationships. PNA, INA, INMET, and SMN MUST distinguish success, empty/no-alert, failed, blocked, stale, and unsupported states; HTTP success alone MUST NOT imply usable evidence.

#### Scenario: Provider failure with stale data

- GIVEN a provider fails after a successful observation
- WHEN its municipality view is requested
- THEN failure and stale timestamp are visible, while last-known data is labeled stale

#### Scenario: Unsupported locality

- GIVEN a locality has no approved source or station relationship
- WHEN ingest or a dashboard targets it
- THEN the contract returns unsupported/unavailable and creates no fabricated evidence or mapping

### Requirement: Grounded Copilot and safe Iberá UI states

Copilot MUST restrict answers to supported zones and expose evidence references with source URL, source, and observation timestamp for supported claims. Without a verified citation it MUST say citation unavailable and not imply grounding. Iberá views MUST render forecasts, telemetry, alerts, freshness, provenance, local context, and unavailable evidence without invented values.

#### Scenario: Citation absence

- GIVEN context has no verified reference for a requested claim
- WHEN Copilot responds
- THEN it marks citation unavailable and does not present the claim as sourced

#### Scenario: UI renders degraded evidence

- GIVEN forecast, alert, or telemetry is stale, failed, or unavailable
- WHEN overview, detail, or ingest status renders
- THEN the UI shows that state and available provenance/local context without fabricated values

### Requirement: Separated proof levels

Verification MUST report unit/contract tests separately from local runtime tests using real providers and the configured PostgreSQL database, and commit-correlated production Render evidence. Historical artifacts MUST NOT substitute for current proof.

#### Scenario: Production ownership evidence

- GIVEN a release is evaluated for the pilot
- WHEN production evidence is collected
- THEN it separately proves one Render Cron owner, disabled in-process scheduling, durable status, and bounded provider outcomes; missing proof remains unclaimed
