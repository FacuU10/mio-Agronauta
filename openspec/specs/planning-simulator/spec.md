# Planning Simulator Specification

## Purpose

Define a safe Agronautas slice: read-only field context and user-input-only calculations. It MUST distinguish facts, assumptions, outputs, and unavailable evidence without creating ownership or financial claims.

## Requirements

### Requirement: Campaign planning context

The system MUST expose a non-persistent template with campaign name, season, and field IDs resolved against the default workspace. It MUST show facts and provenance without implying ownership, membership, or responsibility.

#### Scenario: Resolve supported fields

- GIVEN a planning request contains a season and field IDs present in the default workspace
- WHEN the context is generated
- THEN it identifies selected fields, facts, and the non-persistent boundary

#### Scenario: Reject unsupported field selection

- GIVEN a planning request contains a field ID absent from the supported workspace
- WHEN the context is generated
- THEN it reports a typed validation failure and MUST NOT fabricate or persist a field relationship

### Requirement: Assumptions-only deterministic calculator

The system MUST accept user numeric inputs with explicit units, precision, currency, and assumptions. Complete inputs MUST produce deterministic outputs labeled `user_assumption_simulation`; the result MUST NOT be called a forecast, recommendation, valuation, profitability claim, or market fact.

#### Scenario: Calculate a complete scenario

- GIVEN the user supplies valid area, yield, price, cost, units, currency, and assumptions
- WHEN the scenario is calculated twice with identical inputs
- THEN outputs are identical, expose assumptions/units, and carry the label

#### Scenario: Missing required input

- GIVEN a required input is absent, invalid, or has incompatible units
- WHEN the scenario is calculated
- THEN no result is returned and it is `insufficient_evidence` with the missing-input explanation

### Requirement: Evidence availability states

The system MUST represent soil, prices, FX, and external economic sources as `unavailable` without a supported path, or `insufficient_evidence` when evidence is missing. It MUST NOT substitute zero, demo, inferred, climate-derived, or risk-derived values.

#### Scenario: Render unavailable domains

- GIVEN soil, price, FX, or external economic evidence has no supported path
- WHEN planning status is displayed
- THEN each domain shows state, reason, and dependency boundary instead of a value

#### Scenario: Preserve available evidence metadata

- GIVEN existing field, climate, or risk evidence is available
- WHEN it is included in planning context
- THEN source mode, freshness, and provenance remain visible, not economic inputs

### Requirement: Safe boundaries

The system MUST NOT persist campaign, season, field membership, actor, owner, collaborator, or responsibility data while ownership is unavailable. Risk-engine selection MUST remain undecided. The slice MUST NOT modify Iberá-Alerta routes, schemas, persistence, UI, or vocabulary.

#### Scenario: Ownership unavailable

- GIVEN the workspace has no proven user identity or ownership model
- WHEN a planning context is requested
- THEN it is read-only with no durable ownership or campaign mutation

#### Scenario: Risk and Iberá isolation

- GIVEN a scenario includes existing risk evidence or an Iberá route exists
- WHEN contracts and routes are exercised
- THEN no canonical risk engine is selected and no Iberá behavior changes or is referenced

### Requirement: Accessible UI and verification

The UI MUST render context, assumptions, results, and unavailable/insufficient states with semantic labels, keyboard controls, visible focus, associated errors, and non-color-only status. Tests MUST cover schemas, calculations, boundaries, API/UI rendering, accessibility, and absent persistence.

#### Scenario: Accessible scenario interaction

- GIVEN a keyboard or assistive-technology user opens the planning surface
- WHEN they enter assumptions or encounter an unavailable state
- THEN controls are reachable and labeled, errors are associated, and status is announced without color

#### Scenario: Regression boundary coverage

- GIVEN planning contract and UI tests run
- WHEN supported, unsupported, complete, missing, and unavailable cases are exercised
- THEN tests prove labels, no fabricated evidence, no persistence, and no Iberá coupling

### Deferred boundaries

Durable campaigns/calendars/costs, ownership, providers, markets, export, marketplace, credit, insurance, forecasts, recommendations, canonical risk/rentability engines, and source-backed economics are deferred pending identity, policy, provenance, and evidence contracts.
