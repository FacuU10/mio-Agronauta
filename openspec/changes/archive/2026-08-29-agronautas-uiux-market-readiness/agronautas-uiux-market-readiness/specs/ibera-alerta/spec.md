# Delta for ibera-alerta

## ADDED Requirements

### Requirement: Hydrology and Copilot states reconcile in the view

Iberá-Alerta views MUST derive one consistent status from telemetry, provenance, freshness, forecast presence, and Copilot metadata. Source registration MUST NOT be presented as a latest observation; empty forecasts MUST be explicit; citation-unavailable Copilot output MUST be non-actionable.

#### Scenario: Current source cards conflict with missing telemetry
- GIVEN a source is registered but its latest telemetry is missing or stale
- WHEN a municipality detail renders
- THEN it labels the observation missing/stale, explains the reason and timestamp, and does not call the source evidence current

#### Scenario: Copilot has no verified citation
- GIVEN Copilot returns `citationMode:none` or `citationUnavailable:true`
- WHEN the user reads the result
- THEN the UI says citation unavailable and does not imply grounded operational advice
