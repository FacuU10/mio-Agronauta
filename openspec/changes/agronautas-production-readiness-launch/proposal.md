# Proposal: Agronautas Production Readiness Launch Remediation

## Intent

Agronautas is **NO-GO for production launch**. This change converts the exploration blockers into a bounded remediation sprint that makes launch claims depend on real runtime proof, rotated secrets, reproducible deploys, and honest provider status—not tests/builds alone.

## Scope

### In Scope
- Rotate exposed credentials, remove/mitigate tracked `env.env`, add secret scanning, and prove local/prod use rotated values.
- Add reproducible CI/deploy/smoke gates: install, lint/security, tests, build, Playwright, pytest, migrations, and post-deploy runtime proof.
- Unify Prisma/bootstrap/migration flow; prove clean DB bootstrap and production schema match.
- Fix worker queue entrypoint, readiness/heartbeat, real recompute completion, and single scheduler ownership/distributed locking.
- Harden auth and BFF defaults fail-closed; prove unauthenticated write/recompute returns 401/403 and browser calls use intended BFF path.
- Publish provider truth matrix for Agronautas and Iberá: `live`, `seam`, `mock`, `unavailable`, with evidence and degraded UI/API claims.
- Execute local, staging/preview, and production smokes with artifacts before any readiness claim.

### Out of Scope
- No claim that the product is production-ready in this phase.
- Deferred: tenant/account ownership, branded PDF polish, CRM/email deliverability, Sentinel/simulation cards, full observability platform, and alert/notification launch unless explicitly made blocking by specs.

## Capabilities

### New Capabilities
- `production-readiness-gates`: release proof, CI/deploy, smoke, rollback, and `size:exception` delivery controls.
- `credential-and-deploy-hygiene`: secret rotation, secret scanning, env manifest, migration release steps.
- `agronautas-runtime-operations`: worker, scheduler, readiness, DB/Redis capacity, recompute proof.

### Modified Capabilities
- `ibera-alerta`: production hydrology MUST stop presenting fixture/offline providers as fresh/live.
- `agronautas-signal-ingestion`: provider modes require current evidence before `live` claims.
- `agronautas-risk-dashboard`: dashboard/PDF/browser proof must show degraded provider status honestly.

## Approach

Use maintainer-approved `size:exception`; no chained PR requirement. Implement as remediation slices with strict TDD plus live-proof gates. Freeze launch messaging until exit criteria pass in a clean branch.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `env.env`, env files, CI | Modified | credential rotation, scan, env manifest |
| `.github/`, deploy docs/config | New | reproducible pipeline and smoke gates |
| `apps/api/prisma`, `infra/bootstrap`, Docker | Modified | migrations/bootstrap/release step |
| API jobs/health/auth/routes | Modified | scheduler, readiness, fail-closed auth |
| Python worker | Modified | queue consumer entrypoint and heartbeat |
| Web BFF/UI | Modified | routing proof and degraded claims |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Secret compromise already occurred | High | rotate, revoke, scan, document incident mitigation |
| Launch slips | High | scope to blockers; defer non-blocking product polish |
| Runtime proof needs provider/deploy access | Med | require staging/prod credentials before readiness review |

## Rollback Plan

Revert remediation commits, restore previous deploy env, disable schedulers/workers via env flags, and keep product in no-go/demo-only mode. Never roll back secret rotation to exposed values.

## Dependencies

- Maintainer approval for `size:exception` and no chained PRs.
- Access to production/staging deploy settings, DB, Redis, provider keys, and secret rotation authority.

## Success Criteria

- [ ] Product is still labeled **not production-ready** until all criteria pass.
- [ ] Secrets rotated; `env.env` remediated; secret scan green.
- [ ] Clean local Compose from empty volumes, staging/preview, and production smokes archived.
- [ ] Production proves `/health`, `/ready`, runtime, field intake, recompute, worker completion, dashboard, PDF/chat fallback, hydrology GET/ingest.
- [ ] Provider matrix is honest: real request, response summary, DB insert, API payload, browser evidence, or explicit degraded status.
- [ ] CI/deploy/migrate/rollback evidence is committed and reproducible.
