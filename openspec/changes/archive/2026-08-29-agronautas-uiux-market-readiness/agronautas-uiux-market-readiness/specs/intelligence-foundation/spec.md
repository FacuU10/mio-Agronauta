# Delta for Intelligence Foundation

## ADDED Requirements

### Requirement: Undecided risk is visibly non-prescriptive

The intelligence view MUST preserve `undecided` risk-engine selection and MUST render missing, stale, degraded, or unavailable inputs without deriving economic advice, crop choices, or confidence claims.

#### Scenario: Risk exists without economic evidence
- GIVEN climate/risk evidence exists but required soil, price, FX, or cost evidence is missing
- WHEN the intelligence view renders
- THEN risk remains explanatory and the economic/recommendation state is insufficient evidence with no actionable value
