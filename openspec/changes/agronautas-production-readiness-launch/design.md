# Design: Agronautas Production Readiness Launch Remediation

## Technical Approach

Keep Agronautas **NO-GO** until remediations produce correlated local, local-with-production-DB, preview/staging when available, and production proof. Implement as ordered, independently executable slices under one final `post-cambios` result: security/provenance first, then release gates, schema/runtime safety, provider-truth UX/API, and live endpoint proof. Authentication and BFF-routing hardening are explicitly deferred to the future `auth-security` library scope. Preserve current Express/Next/Python boundaries: TS application use cases orchestrate, domain/repository ports stay typed, adapters own Postgres/Redis/provider/deploy IO, UI only renders provider mode and proof status.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Secret and release provenance | Rotate/revoke exposed values, remove tracked `env.env`, add secret scan CI and env manifest | Keep manual cleanup | Blocker 1 must be solved before any runtime proof can be trusted. |
| Migration release path | Make Prisma migrations the deploy source; Compose/bootstrap either delegates to or is diff-proven against migrations; API image has explicit migrate release command, not implicit app boot | Continue mixed SQL/bootstrap | Solves clean DB and production schema drift without hiding migration failures. |
| Runtime ownership | Add Redis/Postgres-backed scheduler lock adapter and single-owner config; worker image runs queue consumer entrypoint with heartbeat | In-memory lock, example worker command | Solves duplicate schedulers and non-consuming worker while preserving ports. |
| Done means live endpoint proof | Require local smokes against the production DB and delayed production pings to `https://www.agronauta.com.ar` after `main` deploy | Treat passing builds/tests as sufficient | User explicitly requires real endpoint evidence; tests/builds alone do not prove readiness. |
| Provider truth | Store/serve provider mode `live|seam|mock|unavailable` with evidence; UI degrades fixture/offline data visibly | Hide or relabel stale data | Prevents false live claims for Iberá and Agronautas providers. |

## Data Flow

```text
CI/release ──secret scan/test/build/e2e/pytest──> deploy+migrate ──> smoke runner
API use cases ─ports──> Postgres/Redis/provider adapters ─evidence──> provider matrix
Web/client smokes ─existing API paths──> API ─job queue──> Python consumer ─heartbeat/results──> /ready + dashboard
Local smokes ─local code + production DB──> endpoint proof
main deploy ─wait ~2 min──> https://www.agronauta.com.ar production pings
```

## File Changes

| File | Action | Description |
|---|---|---|
| `env.env`, `.gitignore`, `.gitleaks.toml`, `.github/workflows/*` | Modify/Create | Secret remediation, scan, CI gates. |
| `docs/runbooks/agronautas-production-hardening.md`, `docs/runbooks/agronautas-release.md`, `artifacts/**` | Modify/Create | Env manifest, release, rollback, live proof archive. |
| `apps/api/prisma/migrations/*`, `infra/bootstrap/agronautas/*`, `apps/api/Dockerfile`, `docker-compose.yml` | Modify | Reproducible migrations/bootstrap and release command. |
| `apps/api/src/index.ts`, `apps/api/src/server.ts`, `apps/api/src/infrastructure/jobs/*`, `apps/api/src/infrastructure/database/{postgres,redis}/*` | Modify/Create | Single scheduler ownership, distributed idempotency, DB/Redis capacity checks. |
| `apps/workflow-runtime-python/Dockerfile`, `pyproject.toml`, `src/worker/{main.py,queue/consumer.py,runtime/agronautas_jobs.py}` | Modify | Queue consumer entrypoint, heartbeat/result proof. |
| `apps/api/src/infrastructure/config/*`, `presentation/routes/{agronautas,health,hydrology-government}.ts` | Modify | Runtime/readiness and provider truth contracts; no auth hardening in this change. |
| `apps/web/src/components/agronautas/*`, Playwright specs, smoke scripts/artifacts | Modify/Create | Deterministic endpoint/browser proof and degraded provider rendering without BFF-routing hardening. |

## Interfaces / Contracts

- `ProductionEnvValidatorPort`: validates required production env (`DATABASE_URL`, Redis, runtime required, provider keys, scheduler flags) and exits before listen/deploy when unsafe; auth/BFF config is deferred.
- `SchedulerWindowLockPort`: `acquireWindow(window, ttlSeconds): Promise<boolean>` backed by Redis/Postgres with traceable `runId`.
- `ProviderEvidencePort`: returns `{provider, signalType, mode, observedAt, sourceUrl?, proofRef, degradationReasons}`; no UI/API may mark `live` without current request+DB+API proof.
- `ReleaseProofManifest`: immutable JSON artifact linking commit, migration id, smoke run id, local production-DB endpoint evidence, delayed production ping evidence for `https://www.agronauta.com.ar`, rollback command, and sanitized env fingerprint.

## Testing Strategy

| Layer | RED | GREEN/REFACTOR evidence |
|---|---|---|
| Unit | Env defaults, scheduler lock, provider mode mapper, worker entrypoint tests fail first. | `pnpm --dir apps/api test`, `pnpm --dir apps/web test`, `pytest apps/workflow-runtime-python`; refactor to ports/adapters, no unsafe casts. |
| Integration | Empty Postgres/Redis Compose migration, duplicate API workers, recompute queue, provider evidence matrix fail before fixes. | `pnpm test`, migration drift script, bounded provider fixture/real tests with sanitized logs. |
| E2E/live | Dashboard/PDF/chat fallback, hydrology GET/ingest, field intake/recompute, local production-DB endpoints, and delayed production pings fail without proof. | Deterministic Playwright plus real local/preview/prod smokes archived under `artifacts/`; after `main` deploy wait ~2 minutes before pinging production. |

## Migration / Rollout

1. Pre-change: commit/push current repo to `pre-cambios`; rotate secrets immediately; keep launch disabled.
2. Apply ordered slices: (1) secrets/provenance, (2) CI/release gates, (3) migrations/bootstrap, (4) worker+scheduler, (5) provider truth UI/API, (6) live endpoint proof/observability. Auth and BFF-routing are not part of this change.
3. Migrate preview from empty volumes, then production with `prisma migrate deploy`/approved release command. Rollback app by commit/env flags; never restore exposed secrets. Destructive DB rollback requires explicit manual runbook and backup.
4. Observability: every smoke logs `x-request-id`, `runId`, scheduler owner, worker heartbeat, provider mode, migration id, release commit, endpoint URL, environment, and whether the run used local code with production DB or delayed production ping; `/ready` blocks production when required dependencies fail.

## Open Questions

None blocking design; apply requires maintainer access to production/staging secrets and deploy settings.
