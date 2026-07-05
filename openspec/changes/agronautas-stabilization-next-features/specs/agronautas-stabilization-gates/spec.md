# Agronautas Stabilization Gates Specification

## Purpose
Release hygiene, deterministic gates, and truthful verification before any next feature work.

## Requirements

### Requirement: Clean Release Provenance
The system MUST keep release commits reviewable, with no generated artifacts, no dirty cache outputs, and clear intentional contents.

#### Scenario: Dirty generated outputs block release
- GIVEN a candidate release diff contains `.next`, `dist`, coverage, cache, or generated runtime artifacts
- WHEN the release gate runs
- THEN the gate fails with the offending paths
- AND the commit scope is not accepted until only source, tests, docs, and config remain

#### Scenario: Commit contents are explainable
- GIVEN a stabilization slice is ready
- WHEN provenance is reviewed
- THEN each changed file maps to a stated requirement or test

### Requirement: Deterministic Web Build And Turbo Gates
The system MUST prove a clean direct web build and forced uncached root test pass on the first attempt.

#### Scenario: Clean direct build passes first try
- GIVEN caches and generated build outputs are removed
- WHEN the canonical web build command runs once
- THEN it succeeds without relying on replayed cache logs

#### Scenario: Forced root test rejects false green
- GIVEN Turbo cache is bypassed for the root verification command
- WHEN the root test gate runs once
- THEN tests pass from execution, not cached output

### Requirement: Standardized Verify Gate
The system MUST define one scoped Playwright command and require pessimistic fresh-context review before release.

#### Scenario: Playwright command is scoped
- GIVEN verification starts
- WHEN the Playwright gate runs
- THEN it uses the documented Agronautas-scoped command
- AND unrelated suites do not hide Agronautas failures

#### Scenario: Fresh-context review is mandatory
- GIVEN all automated gates are green
- WHEN release readiness is declared
- THEN a pessimistic fresh-context review has checked the diff, artifacts, and claims
