# Design: Agronautas Production-Simple Local Proof

## Technical Approach

Add thin root/package command aliases over the existing `apps/api` and `apps/web` packages, and document one env-backed, no-stub proof lane. API `/health` and `/ready`, real calls to Postgres/PostGIS, Redis, and the worker, the existing real runtime verifier, the existing real-traffic Playwright test, and the hydrology receipt remain the evidence authorities. Local and production manifests are immutable, separately labeled, redacted, and never promoted across environments. Spanish UI copy is unchanged.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Command boundary | Root `backend`, `frontend`, and proof aliases delegate to package scripts; service processes are supplied separately by the environment. | New `backend/` or `frontend/` applications; duplicated runners; hidden infrastructure startup. | Matches the actual monorepo and preserves package ownership. |
| Configuration | Safe localhost defaults plus one documented local override file; production values are injected by the platform secret manager. | Reading the root `.env` implicitly; browser-readable `NEXT_PUBLIC_*` secrets. | Prevents leakage and makes local startup deterministic without touching the existing secret file. |
| Runtime proof | Supply PostGIS/Postgres, Redis, API, and worker through environment/process configuration, then run existing real verifiers and no-stub browser evidence. | New mocks, fixture routes, or a second proof harness. | Existing evidence already distinguishes live/seam/mock/unavailable and preserves blocked claims. |
| Production Cron | Direct Render `scheduler:once` versus authenticated HTTP `POST /api/hydrology/ingest` remains an explicit owner decision gate. | Silently treating either path as equivalent. | The paths have different auth, idempotency, timeout, and receipt semantics. |

## Data Flow

```text
local env-backed services → PostGIS + Redis → API health/readiness → web BFF → no-stub browser
                                      └→ runtime verifier → worker heartbeat/queue → DB read-back
provider adapters → redacted runtime/hydrology receipts → local or production gate
```

## File Changes

| File | Action | Description |
|---|---|---|
| `package.json` | Modify | Add thin `backend`, `frontend`, and canonical proof aliases; no infrastructure orchestration beyond delegation. |
| `apps/api/package.json`, `apps/web/package.json` | Modify | Add stable package-local aliases for existing dev/build/verify/E2E commands. |
| `.env.example`, `apps/api/.env.example`, `apps/web/.env.example` | Modify | Canonicalize safe local names; remove web `DATABASE_URL` and all client-secret implication; document production-only secret names without values. |
| `apps/api/src/scripts/run-hydrology-scheduler-once.ts` | Modify | Consume injected environment only; retain one-shot per-source behavior and redacted receipt output. |
| `apps/api/src/infrastructure/config/{agronautas-runtime,provider-matrix,validator}.ts`, `src/presentation/routes/health.ts`, `src/server.ts` | Modify | Preserve defaults, expose bounded readiness/revision/config evidence, and make production auth/runtime-required gates explicit. |
| `apps/web/src/app/api/agronautas/[...path]/route.ts`, `.../hydrology/[...path]/route.ts` | Modify | Keep server-only bearer/token forwarding, apply bounded timeout configuration, and preserve request IDs/status semantics. |
| `apps/web/playwright.config.mjs`, `tests/e2e/agronautas-reality-runtime.spec.ts` | Modify | Point the canonical lane at explicitly configured env-backed services; capture route, viewport, console/network, BFF status, revision, and `productionProven: false`. |
| `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md`, `README.md` | Modify | Publish one command sequence, evidence matrix, receipt schema, release gates, and Cron decision handoff. |

## Interfaces / Contracts

Use existing contracts: `RuntimeEvidenceCell`, `RuntimeVerificationManifest`, `hydrologyOperatorReceiptSchema` (`ibera-alerta-operator-v1`), API `/health`/`/ready`, BFF request IDs, and hydrology `202` acknowledgement plus `statusPath`. The receipt records only names/statuses and safe IDs for provider mode, auth, tenant, lead, ingest, worker heartbeat/transition, Cron execution, revision, and read-only DB row correlation; tokens, URLs containing credentials, raw payloads/chat, and stack traces are rejected.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/contract | Alias argument composition, env redaction, auth/tenant/lead evidence classification, receipt strictness, readiness states. | Node tests plus existing Zod/schema tests; Python pytest for worker config/heartbeat. |
| Integration | Env-backed service health, migrations, PostGIS/Redis connectivity, API→queue→worker→Postgres transition, provider outcomes, one authorized ingest and read-only correlation. | RED tests first; run existing verifiers with bounded timeouts and no fake success. |
| E2E | Required routes at `1440x900` and `390x844`, real BFF traffic, loading/error/retry/auth/success states, no overflow. | Existing Playwright no-stub lane; local evidence remains non-production. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable-file classifier. | Not applicable. | None. |
| Git repository selection | N/A — no Git automation. | Never clean or select sibling worktrees. | None. |
| Commit state | N/A — no commit automation. | Preserve unrelated dirty files. | None. |
| Push state | N/A — no push automation. | No implicit push. | None. |
| PR commands | N/A — one PR is delivery policy, not product automation. | No command composition. | None. |
| Shell/process composition | Applicable — aliases start existing scripts while services are supplied externally. | Missing env/health/worker fails explicitly; no secret output. | Tests for missing dependency, wrong cwd, unset secret, readiness timeout, and worker-unavailable receipt. |

## Migration / Rollout

No destructive migration. Run existing additive migrations before proof, verify status, and use read-only DB correlation against the env-backed database. Rollback reverts this PR’s aliases/docs/config only; never reset data or unrelated work. Production release requires passing build/tests, explicit auth and `AGRONAUTAS_RUNTIME_REQUIRED`, non-local BFF origin, worker heartbeat, provider evidence, tenant/lead flow, one chosen Cron model with live execution ID, and validated redacted receipt. Missing capability is `blocked`/`not_run`, never pass.

## Open Questions

- [ ] Owner must select and live-prove Render direct-run Cron or authenticated HTTP POST; implementation must not infer the choice.
