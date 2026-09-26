# Real-Service Completion Gate Specification

## Purpose

Require source-by-source operational, persistence, authorization, and browser evidence before any Agronautas or Iberá-Alerta readiness statement.

## Requirements

### Requirement: Evidence matrix covers the real path

The completion gate MUST exercise compiled API, web, and worker paths against authorized real services and record endpoint/provider identity, request outcome, persistence, queue/lease/cron transition, recovery state, and sanitized browser evidence. Mocks and route stubs MAY supplement but MUST NOT satisfy the gate alone.

#### Scenario: Local source verification
- GIVEN required local services and authorized test data are available
- WHEN a source-specific matrix runs
- THEN it proves the real request, normalized result, durable record, browser rendering, and isolation for success and degradation

#### Scenario: Missing prerequisite
- GIVEN a provider credential, service, cron, or database dependency is unavailable
- WHEN the matrix runs
- THEN the slice is marked blocked/unavailable with the missing category and no readiness claim is emitted

### Requirement: Local and production evidence are separate

Reports MUST distinguish local evidence from production evidence, environment, build revision, route/provider, timestamp, and limitation. Production readiness MUST require production evidence for the claimed product/source; local passing tests MUST NOT substitute for it.

#### Scenario: Local passes, production is unproven
- GIVEN compiled local API/Web/worker checks pass and production has no corresponding proof
- WHEN readiness is reported
- THEN local completion is shown separately and production remains unverified

#### Scenario: Production recovery is proven
- GIVEN production executes an authorized real request, persists the outcome, renders it in a browser, and recovers from a controlled failure
- WHEN the gate evaluates the slice
- THEN only the proven source/product state is marked ready, with evidence references

### Requirement: Browser and authorization proof are mandatory

The gate MUST cover desktop and mobile rendering, empty/degraded/maintenance states, BFF/API authorization, workspace/field isolation, and absence of fabricated data. Secrets, tokens, and private runtime data MUST NOT appear in artifacts.

#### Scenario: Boundary and degraded browser check
- GIVEN an unauthorized actor or failed provider response
- WHEN desktop and mobile flows are exercised
- THEN the browser shows the typed boundary/degraded state and no unrelated evidence or mutation

## Non-goals

The gate does not activate providers, alter auth receipts/freezes/hashes, create secrets, or declare global production readiness from aggregate test counts.
