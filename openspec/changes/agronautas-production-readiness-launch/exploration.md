# Exploration: agronautas-production-readiness-launch

**Change**: `agronautas-production-readiness-launch`  
**Mode**: deliberately pessimistic, read-only production-readiness exploration  
**Artifact store**: hybrid  
**Delivery strategy**: exception-ok  
**Date**: 2026-07-13  
**Executor**: `openai/gpt-5.5`  
**Skill resolution**: injected — Project Standards block provided; exact paths loaded per launch instruction: `sdd-explore`, `_shared/global-mindset`. Applied compact project standards from `.atl/skill-registry.md`; Zod v4 rules intentionally not applied because project uses Zod 3.22.x.

## Current State

Agronautas is not safely production-ready. The repo contains a working-looking Next.js 15 web app, Express API, PostgreSQL/PostGIS persistence, Redis queueing, Python worker, hydrology reuse, and historical SDD artifacts with some passing launch gates. However, a pessimistic read of actual code/config/deploy evidence shows the launch claim is still weaker than production reality:

- Production web origin currently serves `/municipalities` and returns JSON for `GET /api/hydrology/municipalities`, but the response still includes fixture-like source URLs for INA/INMET/SMN and only PNA appears current.
- Agronautas runtime endpoint is publicly reachable through `https://www.agronauta.com.ar/api/agronautas/runtime` and reports `mode: real`.
- The latest strict hydrology verification is blocked for production ingest and local rendered UI, despite passing tests/builds.
- There is no committed `.github/`, Render, or Vercel deployment config in the repository; deployment state must be inferred from README/runbook/manual production smoke output.
- The repository is dirty before this exploration: `.atl/skill-registry.md` and `openspec/changes/ibera-alerta-real-feeds-local-prod/verify-report.md` are modified; `openspec/config.yaml` and a hydrology smoke artifact are untracked. This is release-risky because provenance is not clean.
- A tracked `env.env` contains a live-looking database connection string. Ignored local `.env`, `apps/api/.env`, and `apps/web/.env` also contain live-looking secrets/URLs. Values are intentionally not reproduced here.

### Read-only diagnostics executed

| Diagnostic | Result | Evidence |
|---|---|---|
| `git status --short --branch`, `git remote -v`, log/branches | Dirty `main...origin/main`; remote is GitHub repo `MauricioM37/Agronauta`; multiple release branches exist. | `.atl/skill-registry.md`, Iberá verify report modified; `openspec/config.yaml` and strict hydrology artifact untracked. |
| Deployment config discovery | No `.github/**/*`, `*render*`, or `*vercel*` files found. | Repo lacks committed CI/deploy pipeline evidence. |
| Public production GET `/municipalities` | HTTP 200 prerendered/cached page. | Headers include `X-Matched-Path: /municipalities`, `X-Nextjs-Prerender: 1`, `X-Vercel-Cache: HIT`. |
| Public production GET `/api/hydrology/municipalities` | HTTP 200 JSON, but mixed current and fixture/offline source evidence. | PNA freshness `2026-07-13T18:22:09.494Z`; INA/INMET/SMN last successful observed `2026-06-26...`; multiple `offline-fixture://...` source URLs. |
| Public production GET `/api/agronautas/runtime` | HTTP 200 JSON. | `mode: real`, `routePrefix: /agronautas`, compatibility prefix `/agronautas/v1`. |
| Source/config inspection | Several production blockers found without changing app code. | Cited below by exact file paths and lines/sections. |

## Severity-ranked blockers

### BLOCKER 1 — Secret exposure / credential hygiene is not launch-safe

**Evidence**:
- `git ls-files --stage env.env` confirms `env.env` is tracked.
- `env.env`, `.env`, `apps/api/.env`, and `apps/web/.env` contain live-looking DB/Redis/API settings; `.gitignore` ignores `.env` but not `env.env`.
- Prior memory also recorded the tracked credential finding.

**Risk**: credential compromise, unauthorized DB/Redis access, incident before launch.  
**Required proof before launch**: rotate exposed credentials, purge tracked secret from git history or perform documented incident mitigation, prove production and local use rotated secrets, and add a secret-scanning CI gate.

### BLOCKER 2 — No reproducible deploy/CI evidence in repo

**Evidence**:
- `glob .github/**/*`, `**/*render*`, and `**/*vercel*` returned no files.
- README has manual deployment notes only; no committed workflow enforces build/test/migrate/deploy/smoke gates.
- Historical artifacts show launch verdicts changed over time and production API failures were found manually.

**Risk**: production may differ from verified code; deploy can silently omit env vars/migrations; no automated rollback/smoke gate.  
**Required proof before launch**: committed CI with install/build/test/lint/security/Playwright/pytest, production migration plan, deployment env manifest, and post-deploy smoke gate with artifacts.

### BLOCKER 3 — Database bootstrap/migration story is inconsistent

**Evidence**:
- `apps/api/prisma/schema.prisma` defines many core tables (`fields`, `risk_snapshots`, `alert_snapshots`, `agronautas_job_runs`, hydrology tables, `demo_contact_submissions`).
- `apps/api/prisma/migrations/` contains only two migrations, neither creates the base `fields`/risk/job/contact schema.
- `infra/bootstrap/agronautas/001-postgis-schema.sql` creates some hydrology and signal/risk tables but stops at `risk_snapshots`; it does not create `fields`, `alert_snapshots`, `agronautas_job_runs`, or `demo_contact_submissions`.
- API Dockerfile builds and starts `node dist/index.js`; it does not run `prisma migrate deploy`.

**Risk**: fresh production/preview deploys can boot against missing tables; local Compose may not represent migrated production; recovery from an empty DB is not reproducible.  
**Required proof before launch**: a clean DB bootstrap from committed migrations/scripts, `prisma migrate deploy` or equivalent release step, and a read-only schema diff proving production DB matches the app schema.

### BLOCKER 4 — Worker container appears to run the wrong entrypoint for queue consumption

**Evidence**:
- `apps/workflow-runtime-python/Dockerfile` uses `CMD ["workflow-runtime"]`.
- `pyproject.toml` maps `workflow-runtime = "worker.main:main"`.
- `worker.main:main()` runs a single example workflow payload and prints JSON; it does not call `WorkflowQueueConsumer.consume_forever()`.
- The real queue consumer exists in `apps/workflow-runtime-python/src/worker/queue/consumer.py`, but its `main()` is not wired as the container command.

**Risk**: recompute jobs can be enqueued but never consumed in production; readiness can be misleading unless worker heartbeat/runtime-required gates catch it.  
**Required proof before launch**: container entrypoint runs the queue consumer, worker heartbeat is persisted, `/ready` fails when runtime is required and worker is absent/stale, and a real recompute job completes end-to-end in production-like and production environments.

### BLOCKER 5 — API cluster mode can multiply schedulers and exhaust DB/Redis/provider capacity

**Evidence**:
- `apps/api/src/index.ts` forks `os.cpus().length` workers in production.
- `apps/api/src/server.ts` calls `startAgronautasSchedulerFromEnv()` and `startHydrologySchedulerFromEnv()` inside every worker after `listen()`.
- `startAgronautasSchedulerFromEnv()` uses an in-memory lock stub `{ async acquireWindow() { return enabled } }`, not a distributed lock.
- Postgres pool budget is divided per worker, but schedulers/provider calls still multiply across workers.

**Risk**: duplicate scheduler ticks, provider rate-limit abuse, repeated enqueueing, amplified DB connections, inconsistent ingestion windows.  
**Required proof before launch**: only one scheduler owner per deployment (or distributed lock), idempotency evidence across multiple API workers, provider request rate proof, and DB/Redis capacity test under production worker count.

### BLOCKER 6 — Production data still mixes real and fixture/offline hydrology evidence while reporting fresh

**Evidence**:
- Current production `GET /api/hydrology/municipalities` returns PNA current data, but INA/INMET/SMN source URLs include `offline-fixture://...` and observed timestamps from `2026-06-26`.
- Latest strict verify for `ibera-alerta-real-feeds-local-prod` is `BLOCKED / FAIL`: production ingest POST timed out, local UI failed, and INA/INMET/SMN have no current successful real-provider insert proof.

**Risk**: users see official-looking “fresh” status for stale or fixture-derived data; operational trust failure.  
**Required proof before launch**: provider-by-provider matrix with real outbound request, response/body summary, DB insertion, API payload, and local+production browser evidence; fixture/offline data must be visibly degraded or absent from production claims.

### BLOCKER 7 — Auth defaults leave production API open unless env is perfect

**Evidence**:
- `getAgronautasAuthConfig()` defaults `AGRONAUTAS_AUTH_ENABLED` to `false`.
- `requireAgronautasScope()` bypasses all checks when auth is disabled.
- `POST /contact/demo` is intentionally unauthenticated; other read/write/recompute routes depend on env configuration.

**Risk**: production write/recompute endpoints can be public if env flag/token is missing.  
**Required proof before launch**: production `401/403` smoke for write/recompute without token, token rotation policy, and startup fail-fast when production auth is disabled unexpectedly.

### BLOCKER 8 — Web API routing is split and can bypass the intended BFF

**Evidence**:
- `apps/web/src/lib/api-client.ts` uses `NEXT_PUBLIC_API_URL` when set; otherwise it uses `/api/agronautas/v1`.
- Local env sets `NEXT_PUBLIC_API_URL="http://localhost:3001"`; production env is not committed or proven.
- `apps/web/src/app/api/agronautas/[...path]/route.ts` proxies to `AGRONAUTAS_API_INTERNAL_URL || http://localhost:3001` without the production localhost guard that hydrology BFF has.
- Hydrology BFF has a production guard, Agronautas BFF does not.

**Risk**: browser can call an unreachable/internal backend directly; production BFF can point to localhost; auth/header behavior diverges between local/prod.  
**Required proof before launch**: production env must use same intended path, BFF upstream config must forbid localhost in production, and browser network smoke must verify all critical Agronautas API calls.

## Affected Areas

- `env.env`, `.env`, `apps/api/.env`, `apps/web/.env`, `.gitignore` — credential hygiene and release safety.
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/*`, `infra/bootstrap/agronautas/*.sql`, `apps/api/Dockerfile`, `docker-compose.yml` — schema/bootstrap/migration/deploy reproducibility.
- `apps/api/src/index.ts`, `apps/api/src/server.ts`, `apps/api/src/infrastructure/jobs/*`, `apps/api/src/infrastructure/database/postgres/pool.ts` — cluster/scheduler/DB capacity and duplicate work.
- `apps/workflow-runtime-python/Dockerfile`, `apps/workflow-runtime-python/pyproject.toml`, `apps/workflow-runtime-python/src/worker/main.py`, `apps/workflow-runtime-python/src/worker/queue/consumer.py`, `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` — worker runtime entrypoint and recompute proof.
- `apps/api/src/presentation/middleware/agronautas-auth.ts`, `apps/api/src/presentation/middleware/rate-limit.ts`, `apps/api/src/presentation/middleware/cors.ts`, `apps/api/src/presentation/routes/agronautas.ts`, `apps/api/src/presentation/routes/health.ts` — auth defaults, rate limits, readiness, API failure modes.
- `apps/web/src/lib/api-client.ts`, `apps/web/src/app/api/agronautas/[...path]/route.ts`, `apps/web/src/app/api/hydrology/[...path]/route.ts`, `apps/web/src/components/agronautas/*` — BFF/env split and browser proof.
- `packages/hydrology-engine/src/*`, `apps/api/src/presentation/routes/hydrology-government.ts`, `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` — provider truth, fixture degradation, production ingest proof.
- `openspec/changes/agronautas-production-launch-real-ingestion/*`, `openspec/changes/agronautas-stabilization-next-features/*`, `openspec/changes/ibera-alerta-real-feeds-local-prod/*`, `docs/runbooks/agronautas-production-hardening.md` — historical release claims and known gaps.

## Candidate feature/debt inventory

### Must-fix before production launch

1. Secret rotation and tracked-secret remediation.
2. Clean release branch/provenance; resolve dirty/untracked SDD/config artifacts before any launch decision.
3. CI/deploy pipeline with reproducible gates and no manual-only release proof.
4. Database migration/bootstrap unification and production schema drift proof.
5. Worker queue entrypoint and real recompute end-to-end proof.
6. Single scheduler ownership / distributed locks under production cluster mode.
7. Production auth fail-closed for write/recompute/admin routes.
8. Web BFF upstream hardening for Agronautas, matching Hydrology’s production localhost guard.
9. Provider truth matrix: PNA/INA/INMET/SMN and Agronautas climate/soil/satellite/fire sources must be marked live/seam/mock/unavailable honestly in production UI/API.
10. Production smoke suite: `/health`, `/ready`, `/agronautas/runtime`, field intake, current risk, recompute, worker completion, dashboard, PDF, chat fallback, hydrology municipalities, hydrology ingest, browser journeys.

### High-priority product gaps / weak implementations

1. Real Agronautas sources beyond Open-Meteo are mostly seams/placeholders: `createSentinelStacAdapter()` requires injected fetcher, FIRMS requires missing key, SMN endpoint parser assumes JSON for an HTML site, soil/radar/Sentinel are not production-proven.
2. UI includes “Próximamente” Sentinel-1 and simulation cards; these are not launch features.
3. PDF export is a minimal generated text/PDF stream, not a robust branded/auditable report.
4. Chat/Groq has no timeout around `fetch`, no structured provider observability in the client wrapper, and disabled/failure fallback must be production-smoked.
5. Contact/demo submission persistence can 500 behind a generic message; deliverability/CRM/email path is absent.
6. No tenant/user ownership model: field IDs and reads are token-scope only, not per-account authorization.
7. Rate limiting uses Redis by default; if Redis is down, middleware creation/request behavior needs production proof. Memory fallback is env-only.
8. Readiness can be configured with worker optional by default (`AGRONAUTAS_RUNTIME_REQUIRED=false`); launch requires proving the intended production value.

### Observability/deployment debt

1. No committed Sentry/OpenTelemetry/alerting integration; Pino logs exist but no dashboard/runbook for incidents.
2. No committed production env schema/fail-fast validation for all required variables.
3. No migration rollback procedure beyond prose; destructive/non-destructive migration policy is not enforced.
4. No dependency audit/secret scan CI evidence despite README claiming security checks.
5. No synthetic monitoring or scheduled production smoke evidence.

## Evidence versus assumptions

### Directly evidenced

- Current repo is dirty and has no committed CI/deploy config.
- `env.env` is tracked and contains a live-looking secret.
- Worker container command maps to `worker.main:main`, which runs an example payload rather than queue consumer.
- Production `GET /municipalities`, `GET /api/hydrology/municipalities`, and `GET /api/agronautas/runtime` currently return 200.
- Production hydrology JSON currently contains `offline-fixture://` evidence for non-PNA sources.
- Latest strict hydrology verify is blocked despite test/build pass.
- API cluster forks per CPU and starts schedulers in each worker.

### Assumptions needing proof

- Production deployment currently uses the same commit as local `main`.
- Render/Vercel/Neon/Redis env vars match the runbook.
- Production DB schema fully matches `schema.prisma` and bootstrap SQL.
- Real Agronautas field intake/recompute/dashboard flow works in production with a live worker.
- Provider quotas, endpoint contracts, and response sizes are safe under scheduled production load.

## Approaches

1. **No-go hardening sprint before launch** — Treat current state as pre-production; fix blockers in controlled SDD slices, then run strict local/staging/production proof.
   - Pros: safest; aligns with user requirement that tests/builds are insufficient; reduces incident risk.
   - Cons: delays launch; requires deployment/env access and possibly credential rotation/history remediation.
   - Effort: High

2. **Limited demo-only launch** — Launch marketing/demo surfaces only, with real-mode operational features disabled or explicitly degraded.
   - Pros: fastest public presence; avoids claiming unsupported automation.
   - Cons: still requires secret cleanup, auth, and routing safety; product value is reduced; must avoid “real” claims.
   - Effort: Medium

3. **Proceed with current production and monitor manually** — Keep current deployment and patch issues reactively.
   - Pros: minimal short-term work.
   - Cons: unsafe; secrets, worker, schema, auth, and provider-truth gaps can create immediate incidents or false operational claims.
   - Effort: Low now / High incident cost

## Recommendation

Choose **Approach 1: No-go hardening sprint before launch**. Do not declare Agronautas production-ready until the blockers have live proof. The safest path is:

1. Freeze launch claims; clean release provenance and rotate exposed credentials.
2. Add/verify CI, secret scan, migrations, deploy config, and production env schema.
3. Fix worker entrypoint and cluster scheduler ownership.
4. Harden auth/BFF defaults fail-closed.
5. Run clean local Compose from empty volumes, staging/preview deploy, and production smoke with artifacts.
6. Only then run SDD proposal/spec/design/tasks for launch remediation; because this is high-risk and broad, require iron gates in the normal DAG after exploration.

## Risks

- Secret compromise risk exists now because a tracked credential file is present.
- Production data trust risk exists now because fixture/offline hydrology data appears in real-mode API output.
- Operational correctness risk exists now because worker container command likely does not consume jobs.
- Deployment drift risk is high because no committed CI/deploy config proves what production runs.
- DB recovery risk is high because schema, migrations, and bootstrap SQL are inconsistent.
- Scaling risk is high because production cluster mode can duplicate schedulers.
- Security risk is high because auth is opt-in by env and not fail-closed by default.

## Ready for Proposal

**Yes, but only as a no-go remediation proposal, not a launch proposal.** The orchestrator should tell the user: current code/config/prod evidence does not support production readiness; proceed to `sdd-propose` for `agronautas-production-readiness-launch` focused on remediation slices and mandatory live proof.

---

**Status**: success  
**Summary**: Completed a pessimistic read-only production-readiness exploration for `agronautas-production-readiness-launch`. The result is a NO-GO: launch is blocked by secret hygiene, missing CI/deploy proof, migration/bootstrap inconsistency, worker entrypoint risk, scheduler duplication, fixture/real data mixing, auth defaults, and BFF/env routing gaps.  
**Artifacts**: Engram `sdd/agronautas-production-readiness-launch/explore` | `openspec/changes/agronautas-production-readiness-launch/exploration.md`  
**Next**: `sdd-propose` for remediation/no-go hardening; do not run iron agent from this exploration per user instruction.  
**Risks**: See severity-ranked blockers above.  
**Skill Resolution**: injected — Project Standards block plus exact `sdd-explore` and `_shared/global-mindset` paths loaded; compact project standards applied; Zod v4 excluded.
