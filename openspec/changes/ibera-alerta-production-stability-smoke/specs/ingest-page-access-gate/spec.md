# ingest-page-access-gate Specification

## Purpose

Prevent anonymous access to production ingest controls without creating a browser-persistent session.

## Requirements

### Requirement: Ephemeral ingest authorization

The ingest page MUST keep verification state and the submitted token only in browser memory. It MUST NOT render ingest controls before successful verification, and MUST NOT persist, log, return, or display the token.

#### Scenario: Verified visitor reveals controls
- GIVEN a visitor supplies a valid token
- WHEN verification succeeds
- THEN ingest controls render for the current page lifetime only

#### Scenario: Invalid or refreshed visitor is blocked
- GIVEN verification fails or the page is refreshed
- WHEN the ingest page renders
- THEN controls remain hidden and no token exists in browser storage
