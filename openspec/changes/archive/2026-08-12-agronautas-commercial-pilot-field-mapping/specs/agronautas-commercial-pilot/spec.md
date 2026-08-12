# Agronautas Commercial Pilot Specification

## Purpose

Define an Agronautas-only mapping pilot with durable geometry and truthful evidence. Google is optional; server geometry is authoritative.

## Requirements

### Requirement: Discover and create fields

The system MUST let an authorized operator create a field from a Google address or coordinates while preserving coverage.

#### Scenario: Provider-backed intake
- GIVEN Google is configured and a valid address or coordinate is supplied
- WHEN the operator selects a location and submits
- THEN the field is created with canonical coordinates and saved-state status

#### Scenario: Point fallback
- GIVEN Google capability is unavailable
- WHEN valid coordinates are submitted through fallback
- THEN point intake remains usable without claiming Google evidence

### Requirement: Edit perimeter and metrics

The system MUST provide an editable perimeter and show coordinates, area, and perimeter, distinguishing draft from confirmed values.

#### Scenario: Valid edit
- GIVEN a field has a supported center
- WHEN vertices are added, moved, or removed
- THEN draft geometry and metrics update and an explicit save action is available

#### Scenario: Invalid edit
- GIVEN the polygon is incomplete, self-intersecting, or unsupported
- WHEN save is attempted
- THEN the save is rejected with actionable feedback and the last saved geometry remains

### Requirement: Validate and persist canonical geometry

The server MUST validate geometry, derive or validate area with documented units and precision, persist perimeter and centroid through PostGIS, and return geometry and metrics. Identical updates MUST be idempotent.

#### Scenario: Round trip
- GIVEN an authorized operator submits valid geometry
- WHEN the mutation succeeds and the field is retrieved
- THEN perimeter, centroid, area, and perimeter measurement match the server-confirmed saved values

#### Scenario: Authorization or validation failure
- GIVEN the caller lacks write scope or geometry is invalid
- WHEN create/update is attempted
- THEN the established error is returned and persisted geometry is unchanged

### Requirement: Handle map capability failures

The system MUST treat Google Maps, Places, Geometry, and Drawing as optional browser capabilities and MUST expose missing configuration, unsupported APIs, loading, failure, and retry states without inventing results or credentials.

#### Scenario: Missing or failed provider
- GIVEN configuration is absent or the map fails
- WHEN the workspace initializes
- THEN the reason is visible, coordinate/list fallback remains available, and non-map operations work

#### Scenario: Successful provider search
- GIVEN required services and a restricted browser key are available
- WHEN a search succeeds
- THEN the result is labeled provider-supplied and the key is not exposed as application data

### Requirement: Present an accessible evidence-first workspace

The responsive Tailwind workspace MUST expose existing Agronautas field, risk, alerts, evidence, freshness, provenance, telemetry, recompute, reports, and chat without rebuilding them. Controls MUST be keyboard accessible, labeled, focusable, and honest about loading, empty, missing, error, forbidden, stale, degraded, and retry states.

#### Scenario: Responsive journey
- GIVEN field and capability responses are readable
- WHEN the workspace is viewed on mobile or desktop
- THEN mapping, saved metrics, lineage, freshness, provenance, and existing actions are available without fabricated values

#### Scenario: Partial capability failure
- GIVEN a capability is loading, missing, forbidden, stale, degraded, or failed
- WHEN the workspace renders
- THEN that panel identifies its state and retry boundary without hiding unrelated panels

### Requirement: Preserve product and evidence boundaries

The system MUST remain within Agronautas routes, contracts, components, and narratives; MUST NOT modify or merge Iberá/government surfaces; and MUST distinguish test, local API/PostGIS, credential-backed Google, and pilot/production evidence.

#### Scenario: Agronautas separation
- GIVEN hydrology, risk, alerts, reports, or chat are requested
- WHEN rendered in the pilot
- THEN Agronautas contracts are used and Iberá routes/models remain separate

#### Scenario: Evidence disclosure
- GIVEN provider credentials, runtime, or production access is unavailable
- WHEN evidence is shown
- THEN the missing boundary is stated and lower-level or synthetic data is not presented as production proof
