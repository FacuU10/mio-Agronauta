# Marketplace Catalog and RFQ Specification

## Purpose

Provide a truthful, navigable marketplace catalog and human-reviewed request-for-quote flow within existing Agronautas contracts, without money movement, checkout, escrow, or provider invention.

## Requirements

### Requirement: Catalog discovery is navigable and scoped

The catalog MUST expose searchable/filterable products or services with stable identity, category, availability, source/provenance, freshness, and permitted next action. It MUST preserve actor/workspace scope and show an explicit empty state when no results match.

#### Scenario: User discovers a catalog item
- GIVEN the catalog contract returns normalized items for the authorized scope
- WHEN the user opens the marketplace and applies a supported filter
- THEN matching items, provenance/freshness, result count, and a stable detail link render

#### Scenario: Catalog has no matches
- GIVEN no item matches the query or the catalog is empty
- WHEN discovery completes
- THEN an explicit empty state explains the condition and offers clear filter/reset navigation without invented items

### Requirement: RFQ lifecycle is explicit and reviewable

An authorized participant MUST be able to create, review, and cancel an RFQ through typed validation. The UI MUST show draft, pending, submitted, cancelled, rejected, unavailable, forbidden, and confirmed states only when returned by the contract, and MUST prevent duplicate submissions.

#### Scenario: Valid RFQ is submitted
- GIVEN a permitted item and valid requested quantity/context
- WHEN the participant submits once
- THEN the RFQ enters the confirmed contract state, the request identifier is shown, and no order or payment is implied

#### Scenario: RFQ submission fails
- GIVEN validation, authorization, upstream, or maintenance failure
- WHEN the participant submits
- THEN the RFQ is not shown as submitted, safe draft input is preserved, and the correct retry/sign-in/wait action is provided

### Requirement: Marketplace evidence and boundaries are visible

Catalog and RFQ views MUST display evidence mode, provenance, freshness, authorization scope, and limitations. They MUST NOT imply payment, custody, fulfillment, ownership, live availability, or production proof without explicit contract evidence.

#### Scenario: Demo catalog is active
- GIVEN seam/mock or deterministic demo data supplies the response
- WHEN catalog or RFQ views render at both required viewports
- THEN demo/provenance limitations remain visible and no live claim is made

#### Scenario: User lacks permission
- GIVEN the actor is unauthenticated or forbidden for the requested catalog/RFQ operation
- WHEN the route resolves
- THEN the UI shows the access boundary without leaking private catalog or RFQ data
