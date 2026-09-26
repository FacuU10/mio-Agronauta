# Agronautas Signal Completion Specification

## Purpose

Complete S2 provider evidence and S3 rendering for climate, weather, SMN alerts, and satellite signals without turning adapter availability into live evidence.

## Requirements

### Requirement: Normalize location-scoped signals

Climate, weather, SMN-alert, and satellite adapters MUST emit one versioned evidence envelope with source semantics, timestamps, units, coverage/scene metadata, HTTP/schema outcome, provider mode, and degradation. Satellite MUST remain unavailable or unverified until scene coverage and processing evidence exist.

#### Scenario: Multiple sources normalize
- GIVEN authorized location L and successful provider responses
- WHEN the signal pipeline runs
- THEN each source is independently persisted with its own lineage, freshness, and units
- AND one failed source does not erase valid evidence from another

#### Scenario: Provider or satellite proof is missing
- GIVEN a provider is blocked, malformed, rate-limited, or lacks scene/coverage proof
- WHEN normalization runs
- THEN that source is marked unavailable/degraded with retryability
- AND no fabricated index, alert, scene, or current reading is returned

### Requirement: Durable scheduling and recovery

Scheduled windows MUST be idempotent per location/source/window, use a durable lease, bounded retry/backoff, explicit maintenance handling, and terminal outcomes. A worker restart MUST resume or safely requeue work without duplicate evidence.

#### Scenario: Leased window succeeds
- GIVEN a due window has an available lease and a real provider response
- WHEN the worker completes it
- THEN one durable run and evidence lineage are recorded with success/freshness

#### Scenario: Lease, retry, or maintenance failure
- GIVEN a lease expires, a provider times out, or maintenance blocks the source
- WHEN the scheduler processes the window
- THEN the run is recoverable or terminal with reason, last-known evidence is preserved, and readiness is not upgraded

### Requirement: Evidence dashboard is truthful and responsive

The browser MUST render the canonical evidence contract at desktop and mobile, including source, observed/acquired/retrieved times, freshness, provider mode, confidence where supplied, lineage, and explicit empty/degraded/maintenance states. It MUST use real API/BFF responses in production mode and visibly label demo data.

#### Scenario: Desktop/mobile evidence rendering
- GIVEN authorized fresh and degraded source records are returned
- WHEN the dashboard is opened at 1440x900 and 390x844
- THEN each source state, safe next action, and provenance is readable and no source is silently omitted

#### Scenario: Empty or transport failure
- GIVEN the endpoint returns empty, `401`, `403`, `404`, `503`, or malformed data
- WHEN the dashboard renders
- THEN it shows the typed state, preserves scope boundaries, and offers retry/sign-in guidance without mock replacement

## Non-goals

Do not activate financial flows, copy Alqui/Vialovers behavior, infer geometry or hydraulic impact, or claim production readiness from mocks, route stubs, or unit tests.
