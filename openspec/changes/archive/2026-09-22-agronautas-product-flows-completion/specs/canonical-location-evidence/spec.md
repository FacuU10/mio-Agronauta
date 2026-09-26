# Canonical Location and Evidence Specification

## Purpose

Define the B0 boundary shared by Agronautas flows: every downstream read MUST use an authorized, traceable location and evidence envelope. This capability describes truth, not provider implementation.

## Requirements

### Requirement: Authorized canonical location

The system MUST represent a selected location with workspace, field, actor scope, geometry type, coordinates or polygon, coverage status, and lineage to the selection action. Every downstream evidence, management, and Copilot request MUST be bound to that envelope.

#### Scenario: Authorized field selection
- GIVEN an authenticated actor can access workspace W and field F
- WHEN F is selected with a valid point or reviewed polygon
- THEN the API returns one canonical location identifier and lineage
- AND downstream requests cannot silently substitute another workspace or field

#### Scenario: Invalid or unauthorized selection
- GIVEN the actor lacks scope, geometry is invalid, or coverage is unsupported
- WHEN the location is submitted
- THEN the API returns typed `unauthorized`, `invalid`, or `unavailable`
- AND no evidence, mutation, or Copilot context is created

### Requirement: Map selection has a truthful fallback

The UI MUST use a configured map/geocoding provider only when its coverage, terms, and response are proven. Without that proof it MUST provide a clearly labeled point/locality or polygon workflow, preserve geometry provenance, and never imply map coverage or territorial correctness.

#### Scenario: Configured map selection
- GIVEN a permitted map provider returns a valid location and provider metadata
- WHEN the operator selects a point or edits a polygon
- THEN the selected canonical location includes provider/geometry lineage and is sent to the authorized backend

#### Scenario: Map unavailable or unconfigured
- GIVEN map coverage, credentials, policy, or response is unavailable
- WHEN the operator opens location selection
- THEN the UI offers the labeled fallback or unavailable state and does not invent coordinates, tiles, or coverage

### Requirement: Evidence lineage and freshness

Every displayed signal MUST carry source, source URL or stable source key, observed/acquired/retrieved times, provider mode, units/schema, request/run lineage, raw-content identity where available, freshness policy, and degradation reason. Freshness MUST be computed from observed time and policy, not request success alone.

#### Scenario: Fresh source-backed evidence
- GIVEN a persisted provider result is within its source freshness policy
- WHEN a location-scoped read is requested
- THEN the result is labeled fresh/current with provenance and lineage

#### Scenario: Stale, partial, or unavailable evidence
- GIVEN a source is stale, failed, maintenance-blocked, or has no record
- WHEN the same read is requested
- THEN the response preserves last-known evidence separately, states the limitation, and exposes retryability
- AND it MUST NOT claim current or complete readiness

### Requirement: Readiness is bounded

Readiness MUST be reported per location, source, and product slice using proven states such as ready, degraded, stale, blocked, unavailable, or unverified. A successful HTTP response, typed adapter result, seeded geometry, or unit test MUST NOT upgrade readiness without corresponding evidence.

#### Scenario: Recovery proves a source
- GIVEN a failed run is retried and a real response is persisted with lineage
- WHEN readiness is recomputed
- THEN only that source/location becomes recovered and the prior failure remains auditable

## Non-goals

This capability MUST NOT create payment, payout, settlement, escrow, copied Alqui/Vialovers behavior, official Iberá geometry, hydraulic authority, or a global production-ready claim. Auth isolation remains immutable.
