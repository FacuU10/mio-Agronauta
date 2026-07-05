# Agronautas Ingestion Operations Specification

## Purpose
Operator visibility for provider mode, cadence, freshness, runs, failures, and safe next features.

## Requirements

### Requirement: Provider Status Modes
The system MUST distinguish provider status as `live`, `seam`, `mock`, or `unavailable`, and MUST NOT market seams or mocks as live.

#### Scenario: Live provider requires evidence
- GIVEN a provider has current successful evidence from its real source
- WHEN status is requested
- THEN it is labeled `live` with last-success and freshness metadata

#### Scenario: Non-live modes are explicit
- GIVEN a provider is backed by fixture, adapter seam, mock, or failed integration
- WHEN status is requested
- THEN it is labeled `mock`, `seam`, or `unavailable` with the reason

### Requirement: Per-Source Cadence And Next Due
The system MUST persist cadence per source and expose next-due visibility for each source.

#### Scenario: Next due is visible
- GIVEN weather and satellite sources have different persisted cadences
- WHEN ingestion status is requested
- THEN each source shows cadence, last-success, last-attempt, next-due, and overdue state

#### Scenario: Scheduler survives restart
- GIVEN persisted cadence exists before process restart
- WHEN the scheduler starts
- THEN due calculation uses stored cadence instead of empty defaults

### Requirement: Stabilization-Gated Next Features
The system MUST gate ingestion admin/status, source freshness dashboard, PDF parity polish, and alerts/notifications behind green stabilization gates.

#### Scenario: Admin features wait for stability
- GIVEN stabilization gates are not green
- WHEN an ingestion admin/status enhancement is requested
- THEN it remains blocked or feature-flagged off

#### Scenario: Alerts only launch when safe
- GIVEN provider status or freshness is degraded or unverified
- WHEN alerts or notifications are evaluated
- THEN they remain disabled or clearly marked non-production
