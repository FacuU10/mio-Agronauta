# Tasks: Agronautas Production-Simple Local Proof

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 700–1,100 authored lines; within the approved 99,999-line review budget |
| 400-line budget risk | High; exception approved |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

**Runtime policy:** Runtime proof uses API, Postgres/PostGIS, Redis, and worker services supplied through environment variables/process configuration; readiness and real service calls determine `pass`, `blocked`, or `not_run`; missing env-backed services remain `blocked`/`not_run`.

**Static topology artifacts:** Historical static topology artifacts remain outside this run and must not be changed or executed.

**Apply allowlist:** `package.json`; `backend/package.json`; `frontend/package.json`; `apps/api/package.json`; `apps/web/package.json`; `render.yaml`; `.env.example`; `apps/api/.env.example`; `apps/web/.env.example`; `apps/api/src/server.ts`; `apps/api/src/presentation/routes/health.ts`; `apps/api/src/infrastructure/config/agronautas-runtime.ts`; `apps/api/src/infrastructure/config/provider-matrix.ts`; `apps/api/src/infrastructure/config/validator.ts`; `apps/api/src/scripts/run-hydrology-scheduler-once.ts`; `apps/web/src/app/api/agronautas/[...path]/route.ts`; `apps/web/src/app/api/agronautas/[...path]/route.test.ts`; `apps/web/src/app/api/hydrology/[...path]/route.ts`; `apps/web/src/app/api/hydrology/[...path]/route.test.ts`; `apps/workflow-runtime-python/src/worker/core/config.py`; `apps/workflow-runtime-python/src/worker/contracts.py`; `apps/workflow-runtime-python/src/worker/queue/consumer.py`; `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`; `apps/web/playwright.config.mjs`; `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts`; `apps/api/src/scripts/verify-local-command-contract.test.ts`; `apps/api/src/infrastructure/config/agronautas-runtime.test.ts`; `apps/api/src/infrastructure/config/provider-matrix.test.ts`; `apps/api/src/infrastructure/config/validator.test.ts`; `apps/api/src/presentation/routes/health.test.ts`; `apps/api/src/presentation/routes/agronautas.test.ts`; `apps/api/src/presentation/routes/hydrology-government.test.ts`; `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts`; `apps/api/src/scripts/verify-hydrology-local-real.test.ts`; `apps/workflow-runtime-python/tests/test_queue_consumer.py`; `apps/workflow-runtime-python/tests/test_runtime_boundary.py`; `apps/workflow-runtime-python/tests/test_agronautas_jobs.py`; `packages/zod-schemas/src/agronautas.test.ts`; `README.md`; `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md`. The on-disk job module is under `worker/runtime`, not `worker/jobs`; it contains the direct `PostgresAgronautasJobStore` adapter. Forbidden: this worktree's root `.env`; any sibling worktree or sibling `.env`; unrelated runtime/API files; unrelated dirty files; broad backend redesign.

**Task 2.3 allowlist additions only:** `apps/api/src/scripts/verify-agronautas-runtime-real.ts`; `apps/api/src/scripts/verify-hydrology-local-real.ts`. The named verifier tests import these two sources directly; no additional local production edit target is required by those tests. Keep every other allowlist entry unchanged.

**Task 4.1 GREEN allowlist:** Add `packages/zod-schemas/src/agronautas.ts` for `hydrologyOperatorReceiptSchema`, alongside only the two verifier sources already allowed above. Harden only those three production sources. Keep `hydrologyGovernmentIngestResponseSchema` outside this fix as a separate Task 2.1 issue.

**Task 2.1/2.2 GREEN allowlist addition:** Add `packages/zod-schemas/src/agronautas.ts` only for the durable-completion response schema, alongside the two existing worker files named in Task 2.2. This does not expand any other task boundary.

**Scope guard:** Task 2.1/2.2 may change only the named durable-completion response schema and the two existing worker files; they may not redesign unrelated API, BFF, auth, queue/worker, marketplace, field-management, or deployment code. Do not authorize broad lint cleanup or OOM workarounds. Never read, copy, print, or edit the repository root `.env` or any sibling worktree `.env`.

**TDD commands:** RED/GREEN API `pnpm --dir apps/api test` (120s); worker `python -m pytest apps/workflow-runtime-python/tests -q` (120s); browser `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-reality-runtime.spec.ts --workers=1` (180s); REFACTOR `pnpm test` + `pnpm build` (300s each).

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Wrapper aliases/env contract | PR 1 | API tests (120s) | env-backed API/service health and readiness checks (180s) | manifests/env contract |
| 2 | Queue/worker/DB/verifier/BFF/browser | PR 1 | worker + named verifier tests + Playwright (180s) | real verifier against env-provided API, Postgres/PostGIS, Redis, and worker endpoints/processes with read-only DB correlation; unavailable inputs remain `blocked`/`not_run` | verifier/BFF/tests |
| 3 | Production gates/evidence | PR 1 | full test/build (300s) | Render receipt or blocked | Render/runbook |

## Phase 1: Code — RED boundaries and command foundation

- [x] 1.1 **RED (API):** Add `apps/api/src/scripts/verify-local-command-contract.test.ts`; cover exact `cd backend && pnpm run dev` then `cd frontend && pnpm run dev`, missing env-backed service endpoints/processes, wrong cwd, unset secret, readiness timeout, unavailable worker, and secret-free `non-zero`/`blocked`/`not_run` output.
- [x] 1.2 **GREEN:** Create only thin `backend/package.json` and `frontend/package.json` wrappers delegating `dev` to `apps/api`/`apps/web` (no apps, dependencies, or workspace ownership); require env-provided API, Postgres/PostGIS, Redis, and worker endpoints/processes for runtime proof, and document root `pnpm run local:dev` only as the app-launch alternative. Web calls local API through the BFF and never the DB directly.
- [x] 1.3 **REFACTOR:** Normalize three env examples; reject web `DATABASE_URL` and client secrets.

## Phase 2: Code — full local topology and durable proof

- [ ] 2.1 **RED (API + worker + schema):** Keep the literal RED tests for migration/PostGIS/Redis/readiness, API→queue→worker→Postgres durable completion (not `202` alone), duplicate terminal IDs, timeout `failureKind`, database readiness, and provider/auth/tenant/lead/ingest classifications, including the acknowledgement-only hydrology response assertion in `packages/zod-schemas/src/agronautas.test.ts`. The worker GREEN boundary remains only `apps/workflow-runtime-python/src/worker/queue/consumer.py` and `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`.
- [ ] 2.2 **GREEN:** Modify only `packages/zod-schemas/src/agronautas.ts` for the durable-completion response schema and the two existing worker files for the durable completion guard, timeout classification, terminal idempotency, and `check_database_readiness`; use the direct Postgres store already in `runtime/agronautas_jobs.py`. The schema fix must reject only acknowledgement-only hydrology ingest responses lacking terminal durable completion evidence, preserve valid `202` acceptance semantics where applicable, and avoid unrelated schema/API/worker redesign. Runtime proof uses API, Postgres/PostGIS, Redis, and worker services supplied through environment variables/process configuration; readiness and real service calls determine `pass`, `blocked`, or `not_run`; missing env-backed services remain `blocked`/`not_run`. Keep required dependencies fail closed, Mongo optional, migrations additive/idempotent, receipts secret-free, and completion distinct from `202`. Do not authorize broad lint cleanup, OOM workarounds, or changes outside these boundaries. The task remains open until the env-backed topology and durable completion path are proven.
- [ ] 2.3 **REFACTOR:** In only the two added verifier sources, enforce bounded request/revision/run/job IDs and exact read-only DB correlation; missing/mismatched evidence is `blocked`/`not_run`, never fake success. Run real verifiers, not fixtures or stubs.

## Phase 3: Code — no-stub web/BFF proof

- [ ] 3.1 **RED (browser):** Test named no-stub lane/BFFs at `1440x900`/`390x844`: routes, keyboard, loading/error/retry/auth/success, 401/403/502/503/timeout, overflow, console/network, secrets.
- [ ] 3.2 **GREEN:** Configure BFF server-only forwarding, bounded timeout, IDs, and the env-provided target; run Playwright `--workers=1`.

## Phase 4: Documentation/evidence — production gate

- [x] 4.1 **RED:** Receipt tests reject tokens, credentialed URLs, DB strings, raw chat, stack traces, missing IDs, mixed scopes.
- [x] 4.1 **GREEN:** Harden only `hydrologyOperatorReceiptSchema` in `packages/zod-schemas/src/agronautas.ts` plus `apps/api/src/scripts/verify-agronautas-runtime-real.ts` and `apps/api/src/scripts/verify-hydrology-local-real.ts`; enforce safe IDs, scope consistency, durable completion, and secret-free evidence. Do not change `hydrologyGovernmentIngestResponseSchema`; its acknowledgement-only completion remains the separate Task 2.1 issue.
- [x] 4.2 **GREEN:** Update `render.yaml`, `README.md`, runbook: explicit auth/readiness/proxy/origin/timeouts/scheduler, boundary matrix, blocked/not-run.
- [x] 4.3 **REFACTOR:** Select direct `scheduler:once` as the authoritative Render Cron contract; retain authenticated POST only as the rejected `not_run` alternative and document schedule, no-HTTP-token auth/permission, idempotency, bounded timeout, execution/request/proof/run/job IDs, durable completion, read-only DB correlation, failure/rollback, and secret-free evidence.

## Phase 5: Verification and handoff

- [ ] 5.1 Run full test/build/worker and focused Playwright within timeouts; retain separate redacted local/production matrices. Keep pending until full verification passes.
- [ ] 5.2 Require Cron choice, env-backed API/Postgres/PostGIS/Redis/worker access, provider access, deployment/revision access, tenant/lead identities, credentials, and read-only DB; absent providers, deployment, identities, credentials, or approved runtime evidence stay `blocked`/`not_run`, never pass.
- [x] 5.3 **RED (web):** Capture the 72 web TypeScript diagnostics by diagnosis before editing; keep `5.1` pending and limit the baseline to the authorized test files below. No production, Playwright-stub, lint/style, or root/sibling `.env` work.
- [x] 5.4 **GREEN slice — DOM/JSDOM types:** Fix only TS-safe DOM/JSDOM annotations/imports in `apps/web/src/app/api/hydrology/[...path]/route.test.ts`, `apps/web/src/components/agronautas/field-detail.test.tsx`, `apps/web/src/components/agronautas/field-geometry-editor.test.tsx`, `apps/web/src/components/agronautas/page-client.test.tsx`, `apps/web/src/components/government/detail.test.tsx`, `apps/web/src/components/government/overview.test.tsx`, `apps/web/src/components/landing/demo-contact-form.test.tsx`, `apps/web/src/components/landing/homepage.test.tsx`, and `apps/web/src/components/visibility/primitives.test.tsx`; preserve assertions/runtime behavior.
- [x] 5.5 **GREEN slice — access/nullability:** Fix only index-signature bracket notation and non-null guards in `apps/web/src/lib/route-contracts.test.ts`, `apps/web/src/lib/agronautas/service.test.ts`, `apps/web/src/lib/agronautas/ingestion-status.test.ts`, `apps/web/src/lib/visibility/chat.test.ts`, and `apps/web/src/lib/visibility/polling.test.ts`; no casts that hide a contract failure.
- [x] 5.6 **GREEN slice — fixtures/contracts:** Correct only fixture literal types and missing required contract fields in the 14 files named in 5.4–5.5, plus `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts` and `apps/web/tests/e2e/municipalities-alerts.spec.ts`; do not alter selectors, stubs, route behavior, or Playwright setup.
- [x] 5.7 **GREEN slice — optional methods:** Add only presence guards for optional test-double methods within the 14 files named in 5.4–5.5; retain existing methods when present and invent no fallback behavior.
- [x] 5.8 **REFACTOR/verify:** Run the web type/build and focused authorized test files in independently bounded slices, record each diagnosis bucket and remaining count, and then run env-backed service, browser, and production gates separately. A clean web check does not complete `5.1`; bounded readiness, real service calls, browser evidence, and approved production evidence must still pass or remain `blocked`/`not_run`.
