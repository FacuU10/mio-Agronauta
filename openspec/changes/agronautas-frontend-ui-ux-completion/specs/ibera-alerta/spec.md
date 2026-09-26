# Delta for Iberá-Alerta

## ADDED Requirements

### Requirement: Government routes expose truthful operational states

Municipality overview, municipality detail, ingestion, hydrology, and government Copilot surfaces MUST expose consistent loading, empty, unavailable, forbidden, maintenance, degraded, provenance, and freshness states using their existing contracts. Registration MUST NOT be presented as current telemetry.

#### Scenario: Municipality detail has current telemetry
- GIVEN permitted telemetry and forecast data include source and timestamps
- WHEN municipality detail renders
- THEN current observations, forecast presence, freshness, source, and safe actions are distinguishable

#### Scenario: Government capability is unavailable
- GIVEN ingestion, hydrology, or Copilot has no configured provider or returns forbidden/maintenance
- WHEN the route renders
- THEN the affected capability is bounded with an explicit reason and no forecast, citation, or operational claim is invented

### Requirement: Government recovery preserves context

Government routes MUST preserve the selected municipality and entered form data when a retryable failure occurs, while forbidding retry for non-retryable access or maintenance states.

#### Scenario: Ingestion retry recovers
- GIVEN ingestion fails with a retryable error
- WHEN the user retries
- THEN one request is made, pending status is announced, and the confirmed result replaces the failure without losing municipality context

#### Scenario: Citation is unavailable
- GIVEN Copilot returns `citationMode:none` or `citationUnavailable:true`
- WHEN the user reads the result
- THEN citation unavailable is explicit and the text is not framed as grounded operational advice
