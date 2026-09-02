# Proposal: Agronautas Production-Simple Local Proof

## Intent

Provide one simple, truthful way to run and prove Agronautas locally across env-backed Postgres/PostGIS, Redis, worker, API, web/BFF, migrations, hydrology, and browser routes. Preserve Spanish UI copy, current auth defaults, package boundaries, evidence semantics, and unrelated dirty work; local proof must never imply production readiness. Delivery is automatic in one PR under the approved 99,999-line maintainer exception.

## Scope

### In Scope
- Use API, Postgres/PostGIS, Redis, and worker services supplied through environment variables or process configuration; add `backend` and `frontend` only as thin aliases to `apps/api` and `apps/web`.
- Document one no-stub proof sequence for API, web/BFF, DB, Redis, worker, migrations, hydrology, and required browser routes.
- Add a production launch checklist and redacted evidence lane for providers, auth, tenant, lead, authorized ingest, worker, Cron, and DB.
- Remove avoidable env variables via safe defaults/composition while retaining explicit production-only secrets and never exposing client secrets.
- Keep local and production evidence separate, attributable, observable, and honestly blocked/not-run when capabilities are unavailable.

### Out of Scope

New providers, fake data, backend redesign, marketplace/new field management, broad dirty-worktree cleanup, UI-copy changes, or any production claim without real deployment evidence.

## Capabilities

### New Capabilities
- `local-proof-workflow`: canonical local setup, aliases, topology, and proof sequence.
- `production-launch-readiness`: gated checklist, redacted receipts, evidence classification, and blockers.

### Modified Capabilities
- `browser-acceptance-evidence`: require the canonical full-stack local lane and strict environment separation.
- `runtime-evidence-foundation`: require attributable redacted evidence and safe config composition without implicit auth changes.

## Approach

Reuse existing runtime verifiers/migrations and `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts`; do not add fake or duplicate proof paths. Keep defaults unchanged until explicit production configuration is validated. The Render Cron direct-run versus authenticated HTTP POST fork is a mandatory owner decision and production blocker: select, document, and live-prove exactly one model, including auth, idempotency, timeout, request/revision IDs, and failure semantics. No model is selected silently or treated as equivalent.

## Affected Areas

| Area | Planned impact |
|---|---|
| `package.json`; `apps/api/package.json`; `apps/web/package.json` | Thin aliases and canonical commands. |
| Root/package manifests; `render.yaml` | Local service ownership and explicit production gates. |
| `apps/api/src/server.ts`; `apps/api/src/presentation/routes/health.ts`; `apps/api/src/infrastructure/config/agronautas-runtime.ts`; `apps/api/src/infrastructure/config/provider-matrix.ts` | Readiness, defaults, and provider evidence. |
| `apps/api/src/scripts/run-hydrology-scheduler-once.ts`; `apps/web/src/app/api/agronautas/[...path]/route.ts`; `apps/web/src/app/api/hydrology/[...path]/route.ts` | Chosen ingest path and bounded BFF configuration. |
| `apps/workflow-runtime-python/src/worker/core/config.py`; `apps/workflow-runtime-python/src/worker/contracts.py`; `apps/web/playwright.config.mjs`; `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts`; `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` | Worker, browser proof, and redacted operator receipt. |

## Risks

| Risk | Mitigation |
|---|---|
| Unsafe/ambiguous Cron model (High) | Block sign-off until owner decision and live receipt for that exact path. |
| Root `.env` secret leakage (High) | Never read values into artifacts/logs, copy it, or commit it. |
| Permissive defaults or local evidence misread as production (High) | Explicit production gates, immutable environment/data labels, and blocked cells. |

## Rollback Plan

Revert this single PR’s aliases, docs, and configuration changes; restore prior Render/API/BFF behavior without resetting unrelated dirty files. Keep migrations additive/idempotent and avoid destructive rollback.

## Dependencies

Env-backed API, Postgres/PostGIS, Redis, and worker services; authorized deployment owner plus Render/provider credentials for production evidence.

## Success Criteria

- [ ] One command sequence proves every local dependency and browser route with redacted, attributable evidence.
- [ ] Aliases delegate to existing packages; no client secret is exposed.
- [ ] Cron choice, auth/readiness settings, and missing production capabilities are explicit blockers.
- [ ] Production readiness is reported only after real deployment evidence; local proof remains separately labeled.
