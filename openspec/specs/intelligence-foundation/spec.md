# Intelligence Foundation Specification

## Purpose

Define an evidence-first Agronautas contract that explains climate/risk evidence and represents soil, prices, FX, economics, and planting recommendations truthfully. It MUST NOT manufacture values or turn risk evidence into economic advice.

## Requirements

### Requirement: Typed capability states

The intelligence contract MUST expose each capability as exactly one typed state: `available`, `unavailable`, or `insufficient_evidence`. `available` MUST carry a value and metadata; other states MUST carry a reason and MUST NOT carry a usable value.

#### Scenario: Existing climate and risk evidence is available

- GIVEN a field has persisted climate and risk evidence
- WHEN the intelligence view is requested
- THEN climate and risk are returned as typed capabilities with evidence-backed values and metadata

#### Scenario: Domain evidence does not exist

- GIVEN no verified soil, price, FX, or economic observation exists
- WHEN the intelligence view is requested
- THEN each affected capability is `unavailable` or `insufficient_evidence` with a reason and no placeholder value

### Requirement: Evidence metadata and lineage

Every observation-backed value MUST represent source, unit, currency when monetary, observed time, retrieval time, and lineage to its originating observation or ingestion evidence. Metadata MAY be absent only when the state explains why; UI consumers MUST NOT infer it.

#### Scenario: Monetary observation is serialized

- GIVEN a future verified price or FX observation is supplied
- WHEN the capability is serialized
- THEN its source, unit, currency, observed time, retrieval time, and lineage are preserved

#### Scenario: Degraded evidence is served

- GIVEN the latest provider result is unavailable but a prior accepted observation exists
- WHEN the view is requested
- THEN the response identifies observation age and lineage and marks freshness/degradation explicitly

### Requirement: Climate and risk explanation

The intelligence view MUST explain climate and risk using persisted field context, climate observations, freshness, provenance, and risk outputs. It MUST identify the risk engine and retain selection status `undecided`; it MUST NOT select an engine, claim parity, or derive prices, soil, yield, costs, FX, or profitability from risk values.

#### Scenario: Risk explanation preserves engine uncertainty

- GIVEN risk vectors from divergent engines are present
- WHEN an explanation is returned
- THEN both engine identity and `undecided` selection status are preserved

#### Scenario: Missing economic evidence cannot be inferred

- GIVEN climate and risk evidence exists without economic observations
- WHEN economics are requested
- THEN no monetary or profitability value is derived and the capability remains unavailable or insufficient

### Requirement: Typed economic capability states

Soil, prices, dollar/FX, and economics MUST each be independent and MUST NOT be available without verified observations and metadata. Economics MUST distinguish insufficient inputs from provider unavailability and identify missing evidence required for future calculation.

#### Scenario: Capabilities are independently incomplete

- GIVEN climate exists but soil, prices, FX, and costs do not
- WHEN the intelligence view is requested
- THEN each missing domain reports its own typed state and reason without borrowing climate or risk values

### Requirement: Recommendation blocking

A planting recommendation MUST be `insufficient_evidence` and MUST NOT include an actionable crop unless verified soil, crop-history/yield, price, FX, and cost inputs are present, temporally, unit/currency, and lineage qualified. The response MUST list missing or invalid prerequisites.

#### Scenario: Recommendation is blocked by missing inputs

- GIVEN one or more required inputs are unavailable, stale, unqualified, or unlineaged
- WHEN a planting recommendation is requested
- THEN the result is `insufficient_evidence`, names every blocker, and contains no crop or profitability claim

#### Scenario: Complete evidence permits a future recommendation state

- GIVEN all required observations are verified and qualified
- WHEN a recommendation is requested
- THEN the contract MAY return an evidence-backed recommendation with assumptions and lineage; it MUST remain separate from undecided risk-engine selection

Agronautas intelligence MUST remain separate from Iberá-Alerta routes, schemas, storage, vocabularies, and ownership. No requirement in this capability changes Iberá behavior.
