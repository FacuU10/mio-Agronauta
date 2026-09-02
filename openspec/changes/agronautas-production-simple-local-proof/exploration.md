# Exploration: Agronautas production/simple local proof

## Current State

The repository is a pnpm/Turborepo monorepo with `apps/api`, `apps/web`, and `apps/workflow-runtime-python`; the requested `backend` and `frontend` directories do not exist. The supported commands are package-scoped commands such as `pnpm --dir apps/api dev` and `pnpm --dir apps/web dev`, plus root aliases for verification.

The API exposes public `/health` and `/ready` endpoints, hydrology under `/api/hydrology`, and Agronautas under both `/agronautas/*` and `/agronautas/v1/*`. The Next.js web app proxies Agronautas through `/api/agronautas/*` and hydrology through `/api/hydrology/*`. The Agronautas BFF forwards a server-side bearer token when configured; the hydrology BFF forwards the ingest token only for protected POST paths and enforces a bounded upstream timeout.

Local proof must receive Postgres/PostGIS, Redis, API, and worker services through environment variables or process configuration. The API configuration uses real mode and requires worker readiness. Render statically defines separate API, worker, web, and hourly hydrology Cron services, but leaves runtime worker requirement and API auth at their code defaults and disables the in-process schedulers. The Render Cron currently runs `scheduler:once`, which invokes the ingestion runner directly; the runbook instead defines an external HTTP POST Cron contract. These are two different operational models and must not be presented as equivalent evidence.

The repository has unit/integration tests, worker pytest tests, and Playwright suites. Several smoke suites use route stubs; `agronautas-reality-runtime.spec.ts` is the no-stub browser lane. The managed Playwright harness starts temporary API/web development processes and records local evidence, but explicitly sets `productionProven: false` and does not prove the full Postgres/Redis/worker/Cron/Render topology. No coverage command is configured.

The read-only verification harness is intentionally conservative: queue and hydrology writes require explicit opt-in and credentials, provider evidence distinguishes `live`, `seam`, `mock`, and `unavailable`, and missing capabilities are recorded as blocked/not-run rather than converted into success. Historical verification reports confirm useful local evidence but leave worker, queue, hydrology authorization, Render, and production proof incomplete or unclaimed.

## Affected Areas

- `apps/api/package.json` — actual API development, test, verification, and scheduler commands; no `backend` wrapper exists.
- `apps/web/package.json` — actual web development and E2E commands; no `frontend` wrapper exists.
- `apps/api/src/server.ts` — route namespaces, health aliases, production env validation, and scheduler startup gates.
- `apps/api/src/presentation/routes/health.ts` — required/optional dependency readiness and worker heartbeat classification.
- `apps/api/src/presentation/routes/agronautas.ts` — versioned/unversioned runtime, field, recompute, chat, and management contracts.
- `apps/api/src/presentation/middleware/agronautas-auth.ts` — bearer role/scope authorization; disabled by default unless explicitly enabled.
- `apps/api/src/infrastructure/config/agronautas-runtime.ts` — canonical mode, route prefix, scheduler, readiness, worker, and revision configuration.
- `apps/api/src/infrastructure/config/provider-matrix.ts` — provider configuration and durable-ingestion evidence classification.
- `apps/api/src/scripts/run-hydrology-scheduler-once.ts` — direct in-process Cron runner requiring token/owner names but not using the HTTP ingest path.
- `apps/workflow-runtime-python/src/worker/core/config.py` and `contracts.py` — worker environment and packaged schema fallback behavior.
- `apps/web/src/app/api/agronautas/[...path]/route.ts` — Agronautas BFF; its declared timeout variable is not applied here.
- `apps/web/src/app/api/hydrology/[...path]/route.ts` and `timeout.ts` — protected hydrology forwarding and timeout policy.
- `apps/web/playwright.config.mjs` and `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts` — managed local/no-stub browser evidence topology.
- `render.yaml` — static deployment wiring; API auth/runtime-required flags are not explicitly set, and the Cron model differs from the runbook.
- `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` — authoritative operator path, redacted receipt, and production evidence boundaries.
- `openspec/config.yaml` — hybrid persistence, strict TDD, available runners, and unavailable coverage.
- `openspec/changes/agronautas-runtime-canonical-risk-contract/verify-report.md` and `openspec/changes/agronautas-production-launch-real-ingestion/verify-report.md` — historical blockers/failures that must not be treated as current production proof.

## Approaches

1. **Minimal command wrappers plus one canonical verification lane** — add thin `backend`/`frontend` convenience entry points that delegate to the existing `apps/api` and `apps/web` commands, and standardize local proof on env-backed service processes plus the existing read-only runtime and no-stub browser harness.
   - Pros: small operational change; preserves package boundaries; improves onboarding; reuses existing truthful evidence machinery.
   - Cons: still requires explicit opt-in for queue/hydrology writes and externally supplied services; does not create production evidence by itself.
   - Effort: Low

2. **Deployment-parity proof stack** - align env-backed local service roles with Render service roles and standardize the Cron decision, then add a separately authorized production receipt flow for API/web, provider, worker, Cron, and read-only database correlation.
   - Pros: strongest production confidence; removes ambiguity between direct Cron execution and HTTP Cron operation.
   - Cons: higher coordination and secret-management burden; cannot be fully automated without deployment credentials and owner authorization.
   - Effort: High

## Recommendation

Use Approach 1 as the immediate change: create thin, documented local command wrappers and a single canonical local proof sequence that uses env-backed API, Postgres/PostGIS, Redis, and worker services, the real API/runtime verifier, and the no-stub Playwright lane. Keep evidence scopes explicitly separate (`local` versus `production`) and preserve blocked/not-run cells.

Before claiming production readiness, resolve the operational fork identified in `render.yaml` versus the hydrology runbook: either formally operate the Render Cron as the direct one-shot runner or switch it to the documented authenticated HTTP POST path. Then explicitly configure production auth and worker-required readiness rather than relying on permissive defaults, and execute the redacted operator receipt with deployment revision, Cron execution ID, request ID, proof run ID, completion response, and read-only row correlation.

Do not add a new mock or fixture path. Do not treat the existing root `.env` as a deployable configuration; it contains real secret material and must remain out of artifacts, logs, screenshots, and commits.

## Risks

- The current root `.env` contains real credentials. This is a deployment/security blocker if those values are active or committed; values must not be printed or copied.
- Render API auth is not enabled by the checked-in `render.yaml`; `AGRONAUTAS_AUTH_ENABLED` defaults to false. The BFF bearer token therefore does not imply API authorization.
- Render API runtime-required readiness is not enabled by the checked-in `render.yaml`; the API can report ready without a healthy worker unless the deployment adds `AGRONAUTAS_RUNTIME_REQUIRED=true`.
- Render Cron and the documented external HTTP Cron contract execute different paths, so their evidence and failure semantics differ.
- The Agronautas BFF declares `AGRONAUTAS_BFF_TIMEOUT_MS` in deployment config but does not use it; only the hydrology BFF applies the timeout helper.
- Local managed Playwright runs use temporary development servers and may depend on the operator's configured Postgres/Redis; they cannot be relabeled as production.
- The worker's configured absolute schema path may be absent in a packaged deployment; the packaged fallback currently masks this, so deployment packaging must still be verified.
- Direct browser-to-API hydrology ingest would be constrained by API CORS headers; the intended path is the server-side BFF or a controlled operator client.
- The pre-existing worktree is dirty and must be preserved; no cleanup, reset, or unrelated edits are safe.

## Ready for Proposal

Yes. The next proposal should be limited to thin command ergonomics and a truthful local proof recipe, while recording the Render Cron model, production auth/readiness defaults, secret handling, and separate production operator receipt as explicit follow-up gates. No user clarification is required to draft that proposal; production execution still requires an authorized operator and deployment credentials.
