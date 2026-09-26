# Delta for Intelligence Foundation

## MODIFIED Requirements

### Requirement: Undecided risk is visibly non-prescriptive

The intelligence view MUST preserve `undecided` risk-engine selection and MUST render missing, stale, degraded, or unavailable inputs without deriving economic advice, crop choices, or confidence claims. Any recommendation-like text MUST cite the authorized evidence envelope and remain non-actionable when required evidence is absent.
(Previously: the view preserved `undecided` risk selection and did not derive economic advice from missing inputs.)

#### Scenario: Risk exists without economic evidence
- GIVEN climate/risk evidence exists but required soil, price, FX, or cost evidence is missing
- WHEN the intelligence view renders
- THEN risk remains explanatory and the economic/recommendation state is insufficient evidence with no actionable value

#### Scenario: Evidence is stale or degraded
- GIVEN a risk input is outside freshness policy or marked degraded
- WHEN intelligence is requested
- THEN the stale/degraded label and provenance are shown and no fresh recommendation is emitted

## ADDED Requirements

### Requirement: Agronautas Copilot is authorized and evidence-grounded

The Agronautas Copilot MUST build context only from the authorized workspace, field, canonical location, and fresh approved evidence. Responses MUST cite evidence/run identifiers and source times, state limitations, and reject unsupported questions or missing grounding. It MUST NOT receive Iberá municipal, marketplace, auth, or cross-workspace context.

#### Scenario: Grounded field question
- GIVEN the actor may access field F and fresh cited evidence exists
- WHEN the actor asks a supported question
- THEN the response is scoped to F, cites the contributing records, and exposes freshness

#### Scenario: Missing citation or cross-boundary request
- GIVEN evidence is missing/stale or the prompt requests another workspace, municipality, marketplace, or auth data
- WHEN Copilot is called
- THEN it returns non-actionable unavailable/boundary language, no unrelated context, and a retry or supported-scope explanation

## Non-goals

Copilot MUST NOT provide financial, legal, evacuation, hydraulic, guaranteed agronomic, or uncited production advice.
