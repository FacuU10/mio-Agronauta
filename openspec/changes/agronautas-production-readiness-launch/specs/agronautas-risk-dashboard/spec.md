# agronautas-risk-dashboard Specification

## Purpose

Define truthful production dashboard and user-facing risk behavior for Agronautas launch remediation. Authentication and BFF-routing hardening are out of scope for this change and deferred to the future `auth-security` library.

## Requirements

### Requirement: Dashboard and PDF/chat claims are truthful

Dashboard cards, PDF export, and chat fallback MUST display provider mode/freshness and degraded states honestly. They MUST NOT imply Sentinel/simulation/branded PDF/CRM/alerts are live when deferred.

#### Scenario: Provider is degraded
- GIVEN a risk snapshot includes degraded, seam, mock, unavailable, or stale provider evidence
- WHEN the dashboard, PDF, or chat fallback renders
- THEN the user MUST see degraded status and last successful time where available
- AND launch smoke MUST capture browser or artifact proof.

#### Scenario: Deferred feature is visible
- GIVEN Sentinel, simulation, branded PDF polish, CRM/email deliverability, tenant ownership, or alert/notification launch is incomplete
- WHEN UI/API copy references it
- THEN it MUST be labeled upcoming/deferred/demo-only
- AND it MUST NOT be included in production-ready claims.

### Requirement: Observability is sufficient for launch proof

Release-critical flows MUST emit structured logs or trace events for request id, provider mode, job id, scheduler owner, DB/Redis health, endpoint URL, environment, release commit, and smoke correlation id.

#### Scenario: Smoke artifact is reviewed
- GIVEN a production smoke run completed
- WHEN artifacts are inspected
- THEN each critical flow MUST be correlated across browser/API/worker/provider evidence
- AND missing correlation MUST fail readiness.

### Requirement: Safe dashboard rollback preserves read-only access

Rollback MUST preserve read-only dashboard access when possible while disabling unsafe writes/recompute/providers.

#### Scenario: Write paths are disabled after incident
- GIVEN a production incident affects jobs or providers
- WHEN rollback disables writes/recompute/schedulers
- THEN existing dashboard data MUST remain readable with degraded labels
- AND disabled writes MUST return safe 503 or disabled responses.
