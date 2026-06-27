# Archive Report — Iberá-Alerta Phase 1

## Finalized Architecture

- Prisma now owns the hydrology persistence surface with explicit `@map` / `@@map` bindings to the existing PostgreSQL tables.
- `AgronautasJobRun.lease_expiresAt` is preserved as a mapped field when the physical column is present.
- MongoDB remains unchanged and out of scope for this phase.
- Agronautas agricultural coverage stays separate from Iberá-Alerta flood-risk coverage.

## PNA Flood-Risk Ports and Thresholds

The Iberá-Alerta civil-defense set is limited to these 17 PNA flood-risk municipalities/ports:

| Municipality | River | Alert (m) | Evacuation (m) |
|---|---|---:|---:|
| Ituzaingó | Paraná | 3.50 | 4.00 |
| Itá Ibaté | Paraná | 7.00 | 7.50 |
| Yahapé | Paraná | 6.50 | 7.00 |
| Itatí | Paraná | 6.80 | 7.50 |
| Paso de la Patria | Paraná | 6.50 | 7.00 |
| Corrientes Capital | Paraná | 6.50 | 7.00 |
| Empedrado | Paraná | 6.00 | 6.50 |
| Bella Vista | Paraná | 5.50 | 6.00 |
| Goya | Paraná | 5.20 | 5.70 |
| Esquina | Paraná | 5.00 | 5.20 |
| Garruchos | Uruguay | 13.00 | 14.00 |
| Santo Tomé | Uruguay | 11.50 | 12.50 |
| Alvear | Uruguay | 8.50 | 9.50 |
| La Cruz | Uruguay | 7.50 | 8.50 |
| Yapeyú | Uruguay | 7.50 | 8.50 |
| Paso de los Libres | Uruguay | 7.50 | 8.50 |
| Monte Caseros | Uruguay | 7.50 | 8.50 |

## Scheduler Memory Leak Fix

- `HydrologyIngestionScheduler.timeouts` no longer accumulates completed handles.
- Each scheduled callback removes its own timeout handle in `finally`, so daily rescheduling does not retain stale references.
- The cleanup covers both successful runs and failures.

## HTTP Resilience Mitigations

- SMN `403` responses are treated as real upstream failures, not silent success.
- INA and INMET HTML responses now use resilient parsing paths instead of assuming JSON-like payloads.
- Abort timeouts are enforced so hung requests fail fast and can be retried cleanly.

## State Preservation

- MongoDB files, configuration, and health-check surface were preserved unchanged.
- Agricultural locality coverage remains intact for Agronautas use cases.
- Failed or partial ingestion runs are recorded explicitly instead of being masked by mock telemetry.

## Traceability

- Change: `ibera-alerta-phase1`
- Archive mode: `openspec`
