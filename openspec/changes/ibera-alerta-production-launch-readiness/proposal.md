# Proposal: Iberá-Alerta Production Launch Readiness

## Intent

Resolve the frozen launch blockers so the canonical deployment, `https://www.agronauta.com.ar` (not NXDOMAIN `www.agronautas.com.ar`), can demonstrably ingest all official sources and render current municipal data. **Definition of done is non-negotiable:** after a main/Render deployment and cold start of about two minutes, one fresh, correlated production proof shows PNA, INA, INMET, and SMN independently ingested, persisted, returned by API/BFF, and rendered at `/municipalities`; no source may be fabricated, degraded, or substituted.

## Scope

### In Scope
- Remediate review `review-23e62f51150fd8a5` blockers: valid Copilot context for unsupported zones and source-isolated ingestion coordination (R2-001, R3-001).
- Preserve source semantics: PNA/INA are numeric hydrology; INMET/SMN RSS alerts are `storm_alert` with null numeric value and must not become municipal rainfall.
- Produce bounded local and canonical-production evidence after deployment: one POST plus one terminal status GET per source, read-only DB correlation, API/BFF response, and browser rendering.
- Deliver stacked-to-main work units: 1) review fixes/tests, 2) readiness/proof harness, 3) Render deployment and canonical smoke; notify reviewers if aggregate authored change exceeds 2,000 lines.

### Out of Scope
- Review lifecycle commands, provider bypasses, fabricated telemetry, retries/polling, new sources, or architecture rewrites.
- Treating the plural hostname, historical evidence, tests/build, or partial source success as launch proof.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `ibera-alerta`: require independent source execution, semantically correct municipal rendering, corrected canonical production URL, and all-provider post-deploy launch evidence.

## Approach

Apply strict-TDD, bounded corrections before deployment. Keep decisions in API/domain paths and UI presentational. Deploy the commit-correlated main revision to Render, allow the expected cold start, then collect a redacted one-shot evidence matrix. A failed source, non-terminal result, unavailable BFF, missing DB correlation, or missing UI state blocks release.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Source isolation and valid Copilot context. |
| `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` | Modified | Focused scheduler safety coverage if needed. |
| `packages/hydrology-engine` | Modified | Preserve provider semantics and correlation. |
| `apps/web/src/app/api/hydrology/[...path]/route.ts` | Modified | Canonical BFF evidence path. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Render timeout/cold start | Medium | Wait ~2 minutes; one bounded terminal observation/source. |
| Official feed changes | Medium | Classify honestly; block release, never synthesize data. |
| Review regression | High | Fix only corroborated blockers with focused tests. |

## Rollback Plan

Revert the affected stacked slice(s), redeploy the prior main revision, and retain sanitized evidence. Do not roll back unrelated migrations or historical telemetry.

## Dependencies

- Main/Render deployment authority and read-only production DB evidence access.

## Success Criteria

- [ ] All four sources pass the non-negotiable production definition of done at `https://www.agronauta.com.ar` after cold start.
- [ ] `/municipalities` renders current, semantically correct source states with no fixture data.
- [ ] Review blockers R2-001 and R3-001 have focused regression evidence; release remains blocked on any missing layer.
