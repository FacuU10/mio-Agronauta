# Proposal: Iberá Alerta Production Stability Smoke

## Intent

Make production health, hydrology proxying, and the ingest page reliable and diagnosable during Render cold starts without weakening security or misclassifying regional provider blocks as scraper defects.

## Scope

### In Scope
- Make API database-readiness timeout configurable and expose non-secret build revision metadata in health responses.
- Add a memory-only token-verification gate before ingest controls render; never persist, log, or return the token.
- Operator-gate Render BFF timeout/keep-alive, regional ingestion/proxy routing, and hourly cron execution proof.
- Define bounded acceptance smoke evidence, including independent INMET/SMN regional-block classification.

### Out of Scope
- Changes to INMET/SMN scraping, retries, parsing, or fixture fallback for US-datacenter geo-blocking.
- Authentication redesign, persistent sessions, new secret storage, or automatic infrastructure mutation.

## Capabilities

### New Capabilities
- `ingest-page-access-gate`: Ephemeral client authorization to reveal ingest controls.
- `production-smoke-operations`: Operator-controlled Render and cron evidence requirements.

### Modified Capabilities
- `ibera-alerta`: Configurable readiness, health revision metadata, and resilient production proxy behavior.

## Approach

Keep the changes narrow: inject bounded runtime configuration at the API/BFF boundaries, return only safe revision metadata, and retain verification state solely in React memory. Specify operator changes as prerequisites with recorded, redacted proof. Apply strict TDD: acceptance tests precede implementation tasks.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/presentation/routes/health.ts` | Modified | Configurable readiness and safe revision metadata |
| `apps/web/src/app/api/hydrology/[...path]/route.ts` | Modified | Operator-aligned BFF timeout/keep-alive behavior |
| `apps/web/src/app/municipalities/ingest/page.tsx` | Modified | Memory-only verification gate |
| Render service/cron configuration | Modified | Regional route and cron proof; no secrets in artifacts |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Longer waits hide outages | Med | Explicit bounded timeout and readiness diagnostics |
| Token leakage | Low | Memory only; redact all evidence and logs |
| Regional providers remain blocked | High | Mark environmental degradation; do not alter scrapers |

## Rollback Plan

Revert the narrow API/web changes, restore prior bounded proxy settings, and disable the operator keep-alive/cron configuration. Preserve existing telemetry and redact all verification evidence.

## Dependencies

- Render operator approval for timeout, keep-alive, regional ingress/proxy, and cron configuration.
- `RENDER_GIT_COMMIT` or equivalent non-secret revision metadata.

## Success Criteria

- [ ] Cold-start readiness completes within its configured bound and `/health` exposes only safe revision metadata.
- [ ] Anonymous visitors cannot reveal ingest controls; verified state disappears on refresh and no token is persisted or disclosed.
- [ ] Approved operator smoke proves BFF/keep-alive, regional routing, and hourly cron execution with redacted evidence.
- [ ] INMET/SMN geo-blocking is reported as an environmental limitation, not a scraper regression.
