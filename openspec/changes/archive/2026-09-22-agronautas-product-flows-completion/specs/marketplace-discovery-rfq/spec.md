# Marketplace Discovery and RFQ Specification

## Purpose

Define a safe local B2B catalog, discovery, and human-reviewed request-for-quotation handoff for Agronautas.

## Requirements

### Requirement: Local catalog discovery

Listings MUST be explicitly scoped to an approved local market, participant, and visibility policy. They MUST expose provenance, availability timestamp, quantity/unit where known, quality or traceability status where supplied, and an explicit unknown/unavailable state for missing facts.

#### Scenario: Authorized discovery
- GIVEN an actor may view the local workspace market
- WHEN a catalog query is submitted
- THEN only in-scope listings are returned with truthful status and source timestamps

#### Scenario: Empty, stale, or out-of-scope catalog
- GIVEN no listing matches, availability is stale, or a listing belongs to another scope
- WHEN discovery runs
- THEN the response is empty/degraded and excludes the listing without invented availability

### Requirement: Human-reviewed RFQ handoff

An RFQ MUST persist requester, workspace, requested item/quantity/unit, locality, review state, timestamps, and bounded participant references. Submission MUST be reviewable and cancellable according to permission; it MUST NOT imply an offer, order, price guarantee, or acceptance.

#### Scenario: RFQ is submitted and reviewed
- GIVEN an authorized requester provides valid local requirements
- WHEN the RFQ is submitted and a reviewer records a decision
- THEN the durable state and audit trail are visible, with no automatic financial commitment

#### Scenario: Forbidden or duplicate RFQ
- GIVEN the actor lacks scope, input is invalid, or the client retries a submission
- WHEN the request is processed
- THEN it is rejected or deduplicated with no second commitment and a safe reason

### Requirement: Boundary-safe failure handling

Provider, participant, and storage failures MUST yield unavailable/degraded/retryable states. Marketplace routes MUST NOT expose auth records, municipal evidence, unrelated workspaces, or private participant data.

#### Scenario: Provider or maintenance outage
- GIVEN discovery storage or a participant handoff is unavailable
- WHEN the actor opens the flow
- THEN existing last-known data is labeled as such, the RFQ remains pending/unavailable, and no success claim is shown

## Non-goals

Payments, payouts, Checkout Pro, Money Out, settlement, escrow, custody, inventory fulfillment, logistics, credit, guarantees, exports, and copied Alqui/Vialovers behavior are explicitly excluded.
