# Delta for Intelligence Foundation

## ADDED Requirements

### Requirement: Field evidence and intelligence retain source truth

Field evidence, risk, intelligence, and Copilot views MUST render only normalized contract data. Each conclusion MUST retain applicable source, timestamp/freshness, confidence or limitation, permission, and evidence mode. Missing or stale inputs MUST remain visibly non-prescriptive.

#### Scenario: Evidence-backed intelligence renders
- GIVEN normalized field evidence and risk inputs are available
- WHEN the intelligence view opens
- THEN the view shows the result with source/freshness, limitations, and a bounded next action

#### Scenario: Required evidence is missing
- GIVEN climate, soil, price, geometry, or provider evidence required by a conclusion is missing or stale
- WHEN the view renders
- THEN the affected conclusion is marked insufficient, missing, or stale and no economic advice or certainty is derived

### Requirement: Copilot preserves grounded and degraded states

Copilot MUST distinguish grounded, citation-unavailable, degraded, unavailable, forbidden, and maintenance responses. It MUST NOT present generated text as verified advice when citations, required context, or provider status are absent.

#### Scenario: Grounded answer is returned
- GIVEN the request is permitted and the response contains usable citations and context
- WHEN the user opens the answer
- THEN citations, freshness, evidence mode, limitations, and follow-up action are visible

#### Scenario: Copilot is degraded
- GIVEN the response is degraded, lacks citations, or required context is unavailable
- WHEN the answer renders
- THEN the UI labels the limitation, avoids actionable certainty, and offers retry or a safe non-Copilot path
