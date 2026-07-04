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
The system MUST run every configured X hours with stable idempotency keys, locks, retry/DLQ status, next-run visibility, and latest-good fallback.

#### Scenario: Duplicate schedule is safe
- GIVEN two scheduler triggers share the same run window
- WHEN both start
- THEN only one ingestion mutates state
- AND the duplicate records skipped/locked status

#### Scenario: Stale latest-good fallback is visible
- GIVEN all providers fail after a previous good snapshot
- WHEN dashboard data is requested
- THEN the latest-good snapshot is served as degraded
- AND freshness, failed run, and next retry are visible

### Requirement: Ingestion TDD Gate
Adapters, repositories, scheduler, queue/API contracts, and Python worker paths MUST have unit/integration tests proving success, duplicate, retry, DLQ, and stale-data behavior before implementation is accepted.

#### Scenario: Acceptance gate covers worker path
- GIVEN worker tests run with provider failure fixtures
- WHEN pytest and package tests complete
- THEN failure modes are asserted before green implementation
