# Delta for Agronautas Field Scope

## ADDED Requirements

### Requirement: No Rice-Only Regression
The system MUST preserve Argentina agriculture-wide scope with Corrientes-first rollout and MUST NOT reintroduce rice-only copy, validation, or dashboard assumptions.

#### Scenario: Non-rice Corrientes field remains valid
- GIVEN a Corrientes agricultural field with non-rice crop metadata
- WHEN field validation and dashboard rendering run
- THEN the field is accepted
- AND no rice-only text or risk assumption appears

#### Scenario: Next features preserve scope
- GIVEN ingestion status, freshness dashboard, PDF parity, or alerts are added
- WHEN those features render field context
- THEN they use agriculture-wide/Corrientes-first language and metadata

#### Scenario: Iberá-Alerta remains separate
- GIVEN Agronautas ingestion backoff policy is updated
- WHEN scope boundaries are checked
- THEN Iberá-Alerta is not modified or merged into Agronautas
