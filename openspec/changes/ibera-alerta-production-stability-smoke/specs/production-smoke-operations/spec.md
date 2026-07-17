# production-smoke-operations Specification

## Purpose

Define redacted operator evidence for Render runtime settings, hourly execution, and bounded production acceptance.

## Requirements

### Requirement: Render runtime control evidence

Operator approval MUST precede smoke execution and MUST record redacted proof of the BFF timeout, approved connection policy, and regional routing. Missing approval MUST defer, not automate, configuration changes.

#### Scenario: Approved controls are evidenced
- GIVEN an operator approves the required Render controls
- WHEN the smoke record is produced
- THEN it identifies each control and omits secrets and tokens

#### Scenario: Approval is absent
- GIVEN any required control lacks redacted approval
- WHEN production smoke is requested
- THEN the smoke is deferred without infrastructure mutation

### Requirement: Hourly cron proof

The production record MUST prove one hourly cron execution with a timestamp, redacted run identity, and outcome. A failed run MUST retain its safe outcome rather than be represented as success.

#### Scenario: Scheduled execution completes
- GIVEN the approved cron schedule is active
- WHEN one hourly invocation runs
- THEN evidence records its timestamp, outcome, and safe run identifier

### Requirement: Bounded production evidence

Acceptance evidence MUST correlate deployment revision, health/readiness, BFF behavior, access-gate behavior, cron proof, and provider outcomes. INMET and SMN MUST be independently classified; regional blocks MUST be recorded as degradation, not scraper failure.

#### Scenario: Evidence contains independent provider outcomes
- GIVEN production smoke reaches both providers
- WHEN the evidence is assembled
- THEN each provider has a separate redacted outcome and classification
