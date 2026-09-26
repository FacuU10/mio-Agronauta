# Delta for Institutional Expansion

## MODIFIED Requirements

### Requirement: Deferred institutional boundaries

The system MUST NOT publish official geometry, geometry-derived impact models, hydraulic simulation, long-range or generated forecasts, unverified providers, or human case management in this capability. Iberá-Alerta MUST remain separate from Agronautas queue, risk, signal, marketplace, and deployment ownership; approved read-only evidence reuse MUST preserve source and version boundaries.
(Previously: Iberá-Alerta remained separate from Agronautas queue, risk, signal, and deployment ownership.)

#### Scenario: Deferred request is presented
- GIVEN an operator requests an impact map, unsupported provider, or case action
- WHEN the capability evaluates the request
- THEN it returns an unavailable/deferred state and performs no unsupported calculation or mutation

#### Scenario: Approved read-only reuse
- GIVEN an Agronautas consumer requests an explicitly versioned institutional source permitted for reuse
- WHEN the boundary evaluates the request
- THEN only the approved read-only evidence is returned with institutional provenance and no ownership or mutation path

## ADDED Requirements

### Requirement: Institutional recovery and readiness are source-bounded

Iberá readiness MUST expose per-source ingest state, lease/retry/terminal outcome, freshness, coverage, and geometry review state. Readiness MUST remain partial, stale, blocked, or unverified when any prerequisite lacks evidence.

#### Scenario: Partial official coverage
- GIVEN one official source is fresh and another is blocked or stale
- WHEN the institutional dashboard loads
- THEN each source state and last-known evidence are shown and aggregate readiness is partial/degraded

#### Scenario: Recovery is proven
- GIVEN a failed official ingest is retried successfully after restart
- WHEN status is requested
- THEN the durable recovered run and source lineage are visible and readiness upgrades only for that source

## Non-goals

No Agronautas field Copilot context, financial flow, copied Alqui/Vialovers behavior, unverified geometry claim, or evacuation authority is added.
