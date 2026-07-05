# Agronautas Signal Ingestion Specification

## Purpose
Real scheduled multi-signal ingestion with evidence, freshness, idempotency, and failure visibility.

## Requirements

### Requirement: Real Evidence Ingestion
The system MUST ingest real weather, alert, satellite/vegetation, fire, hydric/soil stress, and reusable hydrology signals; it MUST persist raw evidence, normalized summaries, timestamps, confidence, and provider references.

#### Scenario: Successful ingestion persists evidence
- GIVEN provider fixtures or live providers return all required signals
- WHEN an ingestion run completes
- THEN raw evidence and normalized summaries are stored
- AND each summary links to provider, timestamp, freshness, and confidence

#### Scenario: Demo fixture cannot silently replace real mode
- GIVEN real mode is enabled and a provider fails
- WHEN ingestion runs
- THEN the run records degraded status and reason
- AND no demo-only data is marked as fresh real evidence

### Requirement: Scheduled Idempotent Runs
The system MUST tick the scheduler every 1 hour, enqueue only source windows that are due according to recorded real provider cadence, and use stable idempotency keys, locks, retry/DLQ status, next-run visibility, and latest-good fallback.

#### Scenario: Duplicate schedule is safe
- GIVEN two scheduler triggers share the same run window
- WHEN both start
- THEN only one ingestion mutates state
- AND the duplicate records skipped/locked status

#### Scenario: Hourly tick respects source cadence
- GIVEN weather is due hourly and satellite is due weekly by recorded cadence
- WHEN the hourly scheduler tick runs
- THEN weather ingestion is enqueued when due
- AND satellite ingestion is skipped until its next due window

### Requirement: Provider Cadence Research
Before final provider scheduling, the system MUST record each selected provider/source update cadence, rate limits, freshness SLA, and source reference; scheduler configuration MUST use those recorded cadences rather than blindly running all sources hourly.

#### Scenario: Cadence record drives scheduling
- GIVEN a selected provider has a documented update cadence
- WHEN scheduler configuration is built
- THEN next-run windows are derived from that cadence
- AND missing cadence blocks final provider scheduling

#### Scenario: Stale latest-good fallback is visible
- GIVEN all providers fail after a previous good snapshot
- WHEN dashboard data is requested
- THEN the latest-good snapshot is served as degraded
- AND freshness, failed run, and next retry are visible

### Requirement: Ingestion TDD Gate
Adapters, repositories, scheduler, queue/API contracts, and Python worker paths MUST have unit/integration tests proving success, duplicate, retry, DLQ, stale-data, hourly tick, and cadence-based due-selection behavior before implementation is accepted.

#### Scenario: Acceptance gate covers worker path
- GIVEN worker tests run with provider failure fixtures
- WHEN pytest and package tests complete
- THEN failure modes are asserted before green implementation
