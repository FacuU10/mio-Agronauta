# Institutional Expansion Specification

## Purpose

Define an evidence-first institutional read workflow for Iberá-Alerta. The system SHALL expose governed source provenance, bounded evidence history, coverage limits, server-owned explanations, and safe operator states without inventing territorial or hydraulic meaning.

## Requirements

### Requirement: Reviewed source registry and provenance governance

The system MUST register a municipality or zone only with an approved official identifier, source/station or coverage key, source URL, freshness policy, registry version, review status, and reviewed-at metadata. Registry associations MUST describe source coverage, not influence, causality, or impact.

#### Scenario: Approved association is published

- GIVEN a municipality has verified identifiers and reviewed provenance
- WHEN the registry is activated
- THEN its source, station/coverage key, version, freshness, and review metadata are returned

#### Scenario: Incomplete association is rejected

- GIVEN a proposed locality lacks an official identifier or provenance
- WHEN it is evaluated for activation
- THEN it remains unavailable or unverified and creates no official evidence mapping

### Requirement: Bounded evidence timeline

The system MUST provide a server-bounded, read-only timeline of persisted telemetry and official-alert evidence with explicit observation time, source, freshness, and outcome. Queries MUST enforce time and result bounds and MUST NOT create acknowledgement, assignment, escalation, resolution, or case entities.

#### Scenario: Timeline returns evidence

- GIVEN persisted observations and alerts exist for a municipality
- WHEN an operator requests a bounded window
- THEN events are ordered, capped, source-attributed, and returned with their evidence state

#### Scenario: Empty or degraded timeline

- GIVEN no events exist or the requested source is stale/failed
- WHEN the timeline is requested
- THEN the response identifies empty or degraded evidence without fabricated events

### Requirement: Coverage gap and status model

The system MUST expose explicit statuses for supported, partial, unavailable, stale, failed, blocked, and unverified geometry coverage. Statuses MUST preserve last-known evidence separately from current availability and MUST NOT infer coverage from generated geometry or unrelated sources.

#### Scenario: Partial coverage is visible

- GIVEN a municipality has one reviewed source and one unavailable source
- WHEN its overview or dashboard loads
- THEN partial coverage and each source state are visible with available last-known evidence

#### Scenario: Geometry is not verified

- GIVEN only a generated or unreviewed boundary exists
- WHEN territorial coverage is displayed
- THEN geometry is marked unverified and no official polygon or geometry-derived alert claim is shown

### Requirement: Server-owned threshold, trend, forecast, and mapping explanations

The system MUST generate explanations from authoritative persisted values. Threshold text MUST identify source mapping and threshold comparison; trend text MUST use a bounded observed window and deterministic rule; forecasts MUST remain provider-supplied within the existing 30-day horizon and confidence labels. Explanations MUST NOT claim hydraulic simulation, impact, propagation, routing, discharge, evacuation authority, or generated forecasting.

#### Scenario: Explanation is grounded

- GIVEN a reviewed source supplies an observed value, threshold, bounded tendency/window, or forecast
- WHEN the municipality explanation is requested
- THEN it names the source and observation window, states the comparison or provider forecast, and exposes provenance

#### Scenario: Evidence is insufficient

- GIVEN no stable window, threshold, or eligible provider forecast exists
- WHEN an explanation is requested
- THEN the missing or unavailable state is shown and no inferred conclusion is emitted

### Requirement: Authenticated operator workflow and safe UI states

The system MUST keep operator status and ingest-history reads authenticated, durable, restart-safe, and separate from Agronautas workflows. UI components MUST render loading, empty, stale, failed, blocked, unavailable, unverified, unauthorized, and retry states from server contracts; browser clients MUST NOT edit registry policy, geometry, mappings, or incidents.

#### Scenario: Operator observes a durable run

- GIVEN an authenticated operator requests an ingest status or history
- WHEN the API instance has restarted
- THEN persisted lifecycle and safe source outcomes are returned without exposing secrets or internal diagnostics

#### Scenario: Safe degraded rendering

- GIVEN a source or explanation is unavailable
- WHEN an Iberá overview or detail view renders
- THEN it shows the explicit status and available provenance, with no invented value or action workflow

### Requirement: Deferred institutional boundaries

The system MUST NOT publish official geometry, geometry-derived impact models, hydraulic simulation, long-range or generated forecasts, unverified providers, or human case management in this capability. Iberá-Alerta MUST remain separate from Agronautas queue, risk, signal, and deployment ownership.

#### Scenario: Deferred request is presented

- GIVEN an operator requests an impact map, unsupported provider, or case action
- WHEN the capability evaluates the request
- THEN it returns an unavailable/deferred state and performs no unsupported calculation or mutation
