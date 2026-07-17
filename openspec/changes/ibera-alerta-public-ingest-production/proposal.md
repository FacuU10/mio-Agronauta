# Proposal: Secure Iberá Alerta Production Ingest

## Intent

Deliver scheduled hydrology ingestion without an unauthenticated `POST /api/hydrology/ingest`. Preserve provider capacity, telemetry integrity, and secret hygiene.

## Scope

### In Scope
- Retain mandatory `x-hydrology-ingest-token` authorization in every environment; no tokenless direct endpoint.
- Assess a facade only with independent identity and signed requests, WAF/rate limits, replay protection, and audit logs; otherwise reject it.
- Use `.env`, `.env.*`, `*.env`, `*.env.*`, plus `!*.env.example`; audit tracked secret-like files without values.
- Evidence: platform and scheduler secret configuration, one authorized run, structured receipt, and bounded post-deploy health/data reads.
- Plan TDD coverage for credentials, scheduler headers, and ignore rules.
- Delivery: automatic, force-chained and stacked-to-main; each review slice stays within 1200 lines.

### Out of Scope
- Public anonymous ingestion, browser-triggered production ingestion, or IP-only protection.
- Rotating or revealing production secrets; provider/client rewrites; changing unrelated staged work.

## Capabilities

### New Capabilities
- `authenticated-hydrology-ingest-operations`: secure external scheduling, deployment receipt, and evidence for hydrology ingestion.
- `environment-secret-hygiene`: env-file ignore policy that preserves safe example templates.

### Modified Capabilities
- `ibera-alerta`: ingest authorization becomes an explicit production requirement, alongside bounded deployment verification.

## Approach

Use the existing token guard. A “tokenless” facade is viable only when managed identity/signatures replace the token at the edge; anonymous forwarding is rejected. Configure deployment, then verify one authorized scheduler execution and bounded read-only evidence.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Preserve/enforce ingest authorization. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modified | TDD authorization/facade tests. |
| `.gitignore` | Modified | Ignore env variants; retain `*.env.example`. |
| deployment scheduler/platform config | Modified | Inject token securely and retain run evidence. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Anonymous trigger exhausts providers/DB | High | Reject direct tokenless endpoint; require identity and edge controls. |
| Secret leaks or scheduler misconfiguration | Med | Secret manager, masked logs, rotation, authorized-run receipt. |
| Dirty worktree is overwritten | Med | Add only this proposal; stage/review it separately. |

## Rollback Plan

Disable the scheduler/facade, revoke or rotate its credential, and retain the existing authenticated route; revert only this change’s commits. No data migration is introduced.

## Dependencies

- Production secret manager, external scheduler headers, platform logs/metrics, and approved edge identity if a facade is pursued.

## Success Criteria

- [ ] Direct ingest rejects missing/invalid credentials in all environments.
- [ ] No env secret file is tracked; `*.env.example` remains trackable.
- [ ] Production evidence records one authorized scheduled run and bounded post-deploy API/data checks without secret disclosure.
- [ ] A tokenless facade is either proven identity-protected or explicitly not deployed.
