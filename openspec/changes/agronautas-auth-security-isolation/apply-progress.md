# Apply Progress: Agronautas Auth Security Isolation

## Status

- Delivery: `size:exception` single-PR implementation, as approved in the task artifact.
- Mode: Strict TDD with explicit test-only dependency injection.
- Completed: 13/13 implementation and verification tasks; corrective audit blockers resolved in code/tests, with the complete local runtime matrix synchronized below.
- Remaining: official Corrientes seed `42P08` follow-up and production evidence remain open; no production/deployment claim exists.

## Completed Tasks

- [x] 1.1 Auth secret validation, bcrypt cost 12, and login/refresh/logout/status contracts.
- [x] 1.2 Exact bootstrap input/result, membership principal, mappings, conflicts, rollback, and refresh replay tests.
- [x] 1.3 HTTP auth boundaries, Redis fail-closed behavior, rollback health boundary, and BFF credential stripping.
- [x] 1.4 Typed auth/recovery and existing Agronautas/Iberá regression coverage.
- [x] 2.1 Additive Prisma schema and ordered auth migration.
- [x] 2.2 Auth contracts, ports, service, bcrypt hashing, rotation, replay revocation, and typed failures.
- [x] 2.3 PostgreSQL authoritative repository with transactional/idempotent bootstrap.
- [x] 2.4 Versioned Zod auth/status contracts.
- [x] 3.1 Trusted-principal middleware, scope enforcement, route wiring, and fail-closed startup.
- [x] 3.2 PostgreSQL session authority plus bounded Redis deny markers.
- [x] 3.3 Server-owned BFF bearer forwarding with browser credential stripping.
- [x] 4.1 Refactor and verification completed for migration, bootstrap repeatability, safe metadata/count assertions, API/contracts/web/root suites, and health-only rollback coverage.
- [x] 4.2 Playwright operator/member sign-in, forbidden, maintenance, refresh recovery, draft preservation, and both viewport smoke evidence.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1–1.2 | `apps/api/src/application/auth/agronautas-auth-service.test.ts` | Unit | N/A (new) | ✅ Initial auth contract suite failed before implementation for missing secrets/session membership behavior. | ✅ Current API suite includes these tests and passes 368/368. | ✅ Valid, disabled, replay, malformed, conflict, and repeat-input paths covered. | ✅ Contracts, ports, atomic refresh rotation, and typed failures consolidated. |
| 1.3 | API route tests, BFF route tests, and `apps/web/src/lib/agronautas/auth-recovery.test.ts` | Integration/unit | ✅ Existing route and recovery suites passed before final enforcement changes. | ✅ Initial HTTP/BFF assertions failed before service injection and explicit BFF credential wiring. | ✅ API auth routes 2/2, API route regression 47/47, and web recovery 2/2 passed. | ✅ 401, 403, 422, 503, rollback, and browser-credential stripping branches covered. | ✅ Failure mapping and trusted-principal scope middleware centralized. |
| 1.4 | Zod contract tests and web route-contract tests | Contract/unit | ✅ Existing contract/recovery assertions covered affected boundaries. | ✅ Written against versioned typed auth/recovery and preserved legacy contracts. | ✅ `pnpm --dir packages/zod-schemas build; pnpm --dir apps/web test` — 244/244 passed. | ✅ Typed auth, evidence, Iberá, browser recovery, and degraded-state scenarios covered. | ✅ Existing field, evidence, Iberá, and UI contracts preserved. |
| 2.1–2.3 | `apps/api/src/infrastructure/database/postgres/agronautas-auth-repository.test.ts` | Integration seam/unit | N/A (new auth repository tests) | ✅ Tests written for atomic bootstrap, constraints, idempotency, and mapping conflicts before implementation. | ✅ Current API suite passes 368/368; Prisma validation passes. | ✅ Same-workspace repeat, different-workspace conflict, rollback, unknown status, and constrained status paths covered. | ✅ PostgreSQL remains authoritative; mapping persistence is compare-and-preserve. |
| 3.1–3.2 | Auth service, field/management repository, and route tests | Integration seam/unit | ✅ Focused RED run identified six workspace/refresh boundary failures. | ✅ Six tests failed because predicates, default-backfill removal, principal workspace, and refresh rotation were missing. | ✅ Reconciliation run passed 67/67; current API suite passes 368/368. | ✅ Selected workspace, explicit mapping, activity/planning, disabled status, replay, and Redis failure covered. | ✅ Workspace-aware contracts, no default ownership inference, and transactional refresh rotation. |
| 3.1 supplementary activity/planning audit | Auth/management repository and planning tests | Integration seam/unit | ⚠️ Added after the earlier GREEN cycle. | ⚠️ No separate RED cycle was captured; not standalone completion evidence. | ✅ Focused command passed 5/5. | ✅ Different workspace/activity and planning branches covered. | ✅ Planning authorizes selected workspace and activity requires explicit mapping. |
| 4.1 | API auth/bootstrap/rollback tests and storage harness | Integration/runtime | ✅ Existing API baseline passed before storage verification. | ➖ Verification-only slice; no production source change required. | ✅ Migration status, bootstrap repeatability, metadata/count assertions, API/contracts/web/root suites, and health-only rollback coverage passed. | ✅ Existing bootstrap state repeated as `already_initialized`; member/forbidden-workspace structural paths confirmed. | ➖ No source refactor in this verification-only slice. |
| 4.2 | `apps/web/tests/e2e/agronautas-auth-security.spec.ts` | Runtime/E2E | N/A — this verification slice records compiled local runtime evidence rather than a production run. | ➖ Acceptance verification after the runtime harness was available. | ✅ Latest compiled local matrix passed `10/10`: desktop `5/5`, mobile `5/5`, including maintenance `2/2`. | ✅ Operator/member sign-in, forbidden access, refresh/replay recovery, protected mutation `422` with draft preservation, and truthful readiness without fabricated positive state passed. | ✅ Task acceptance complete; evidence is local-only. |

### Test Summary

- **Total tests written**: Auth/security tests plus existing regression suites; authored delta not separately enumerated.
- **Total tests passing**: API `368/368`; web `244/244`; root `pnpm test` completed with API `368/368` and web `244/244`.
- **Layers used**: Unit, integration seams, HTTP fetch-based tests, and authored E2E discovery; no live E2E execution.
- **Approval tests**: Existing route, contract, and recovery suites used as safety nets; separate count not recorded.
- **Pure functions created**: No separate count recorded.

## Work Unit Evidence

### Unit 1 — Auth contracts, persistence, and bootstrap

- Focused test: `pnpm --dir packages/zod-schemas build; pnpm --dir apps/api test` — exit 0, 363/363 passed. The dependency build is required before the API test process because the package test script does not build generated shared schemas.
- Runtime harness: `node --import tsx --test --test-concurrency=1 --test-force-exit src/presentation/routes/agronautas-auth.test.ts` — exit 0, 2/2 passed using explicit in-memory auth injection; durable PostgreSQL migration was not applied because no disposable database was running.
- Schema validation: `pnpm --dir apps/api exec prisma validate` — exit 0, schema valid.
- Rollback boundary: `apps/api/prisma/schema.prisma`, the additive migration, `apps/api/src/domain/auth/**`, `apps/api/src/application/auth/**`, and `apps/api/src/infrastructure/database/postgres/agronautas-auth-repository.ts`.

### Unit 2 — Middleware, routes, Redis policy, and BFF

- Focused test: `node --import tsx --test --test-concurrency=1 --test-force-exit src/presentation/routes/agronautas.test.ts src/application/auth/agronautas-auth-service.test.ts` — exit 0, 61/61 passed.
- BFF/UI test: `pnpm --dir packages/zod-schemas build; pnpm --dir apps/web test` — exit 0, 244/244 passed; jsdom emitted known React `attachEvent`/`detachEvent` diagnostics without test failures.
- Runtime harness: Express fetch-based auth HTTP tests and BFF route tests passed; no live external DB/Redis deployment was exercised.
- Rollback boundary: `apps/api/src/presentation/middleware/agronautas-auth.ts`, `apps/api/src/presentation/routes/agronautas.ts`, `apps/api/src/server.ts`, `apps/api/src/infrastructure/database/redis/agronautas-auth-deny-store.ts`, and `apps/web/src/app/api/agronautas/[...path]/route.ts`.

### Unit 3 — Recovery and regression proof

- Focused test: `pnpm --dir packages/zod-schemas build; pnpm --dir apps/web test` — exit 0, 244/244 passed, including auth recovery, BFF, and auth-client tests.
- Runtime harness: `node --import tsx --test --test-concurrency=1 src/scripts/verify-agronautas-runtime-real.test.ts` — exit 0, 16/16 passed; live provider/database/browser smoke was not attempted because no configured runtime environment was available.
- Rollback boundary: `apps/web/src/lib/agronautas/auth-recovery.ts`, its tests, and the auth-related BFF tests.

## Full Suite Evidence

- `pnpm test` — exit 0; Turbo completed 8/8 tasks successfully, including API 368/368 tests and web 244/244 tests.
- `pnpm --dir packages/zod-schemas build; pnpm --dir apps/api run build` — exit 0; shared schemas and API TypeScript compilation passed.
- `pnpm --dir apps/api exec prisma validate` — exit 0; Prisma schema valid.
- `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-auth-security.spec.ts --list` — exit 0; 10 authored desktop/mobile tests discovered, not executed against a live environment.
- `git diff --check` — only LF/CRLF normalization warnings remain; the prior EOF blank-line warning was removed.
- The API test script now forces single-file concurrency and process exit so environment-mutating fixtures cannot race and Redis test clients cannot leave the process hanging. Running API tests concurrently with the schema build can produce transient `MODULE_NOT_FOUND` failures while the build cleans `dist`; the verified command is sequential.
- Web tests emit known React/jsdom `attachEvent`/`detachEvent` diagnostics, but exit 0 with 244/244 passing tests.
- Running `pnpm --dir apps/web test` without first building `packages/zod-schemas` fails with nine `MODULE_NOT_FOUND` errors for the package's generated `dist/index.js`; the workspace/root test path builds dependencies first and passes.

## Deviations and Risks

- Production auth is fail-closed when secrets or Redis policy cannot be proven. Anonymous access exists only in explicit test fixtures marked by the test adapter; it is not available from production configuration.
- Field reads, writes, geometry, intelligence, dashboard, Copilot, listing, planning, and activity paths now carry or authorize the authenticated workspace; PostgreSQL field access also requires an explicit auth mapping.
- Refresh rotation is owned by a single PostgreSQL transaction that locks the token, creates the replacement, and revokes the family/session on replay; the in-memory implementation mirrors the contract for tests.
- Default workspace initialization no longer mutates unowned fields. Bootstrap also creates the legacy workspace row needed by the existing `fields.workspace_id` foreign key.
- Tasks 4.1 and 4.2 remain pending: migration/runtime smoke and Playwright cannot be truthfully proved without the required live/disposable services and seeded credentials. The authored draft-preservation E2E now exercises the protected mutation failure in-place and asserts the input remains, but it remains `blocked/not_run` until the live environment is configured.
- The full API package command leaves a Redis client handle open in this environment; focused commands use `--test-force-exit` where needed. This is a test-process lifecycle issue, not a failing assertion.

## Corrective Audit Closure

- **Copilot field authorization:** `GroundedChatUseCase` now constrains every non-comparison Groq-selected field to the already authorized requested field. Comparisons validate the selected comparison field through the trusted `(workspaceId, fieldId)` repository predicate before any snapshot repository access. Cross-workspace comparisons return `field_not_found` and do not read snapshots.
- **Explicit mappings only:** `listFieldActivity` now authorizes only through `agronautas_auth_field_mappings`; the legacy `field.workspace_id = $2` fallback is removed. Unmapped legacy fields remain absent from activity projections even when their legacy workspace column matches.
- **Demo seed compatibility:** `ensureSchema` adds/verifies `fields.workspace_id`, verifies every canonical auth table, and requires the canonical pilot workspace rows before `runSeed` can write demo data. Missing migration/bootstrap fails with `AUTH_SCHEMA_PREREQUISITE_MISSING` and an actionable `prisma migrate deploy`/auth-bootstrap instruction; no seed rows are written. Auth DDL is not duplicated in the seed script.

## Corrective TDD Cycle Evidence

| Corrective scope | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Copilot selected-field authorization | `apps/api/src/application/usecases/grounded-chat-usecase.test.ts` | Unit/integration seam | N/A (new) | ✅ Focused run: 13 tests, 5 failed/8 passed before the authorization and prerequisite changes. | ✅ Same focused run: 13/13 passed. | ✅ GET_RISK_SUMMARY, GET_ALERTS, and cross-workspace COMPARE_FIELDS paths; foreign snapshot reads are prevented. | ✅ Shared `authorizeAction` boundary; no behavior change for authorized requested fields. |
| Explicit activity mapping | `apps/api/src/infrastructure/database/postgres/agronautas-management-repository.test.ts` | Integration seam | ✅ Merged progress recorded adjacent activity/planning baseline 5/5; full current API regression is 368/368. | ✅ New unmapped-legacy regression failed because SQL still contained `field.workspace_id = $2`. | ✅ Focused corrective run 13/13 passed. | ✅ Explicit mapping, selected workspace, and unmapped legacy field cases. | ✅ One CTE authorization predicate reused by all activity projections. |
| Seed schema prerequisite | `apps/api/src/scripts/seed-corrientes-rice-demo.test.ts` | Integration seam | N/A for new prerequisite guard | ✅ New fresh-schema test failed because `ensureSchema` returned without checking canonical auth schema/bootstrap. | ✅ Focused corrective run 13/13 passed. | ✅ Existing-schema-ready and fresh-schema-missing paths; no field INSERT occurs on missing prerequisite. | ✅ Verification-only guard reuses the canonical migration/bootstrap contract instead of duplicating auth DDL. |

## Corrective Work Unit Evidence

### Unit 4 — Audit blocker remediation

- Focused test: `pnpm exec node --import tsx --test --test-concurrency=1 --test-force-exit src/application/auth/agronautas-auth-service.test.ts src/presentation/routes/agronautas-auth.test.ts src/presentation/middleware/agronautas-auth.test.ts src/application/usecases/grounded-chat-usecase.test.ts src/infrastructure/database/postgres/agronautas-management-repository.test.ts src/scripts/seed-corrientes-rice-demo.test.ts` from `apps/api` — exit 0, 27/27 passed.
- Runtime harness: blocked/not_run — no configured live API/PostgreSQL/Redis/browser environment; no live migration, bootstrap-twice, rollback, or seeded operator/member execution was claimed.
- Rollback boundary: `apps/api/src/application/usecases/grounded-chat-usecase.ts`, its new focused test, `apps/api/src/infrastructure/database/postgres/agronautas-management-repository.ts` and test, and `apps/api/src/scripts/seed-corrientes-rice-demo.ts` and test. Reverting only these paths removes the corrective behavior without touching Mercado Pago or test-results content.

## Updated Verification Evidence

- `pnpm --dir packages/zod-schemas build; pnpm --dir apps/api test` — exit 0; API `368/368` passed.
- `pnpm --dir apps/web test` — exit 0; web `244/244` passed. Known React/jsdom `attachEvent`/`detachEvent` diagnostics remained non-failing.
- `pnpm test` — exit 0; Turbo `8/8` tasks successful, API `368/368`, web `244/244`.
- `pnpm --dir apps/api run build` — exit 0; API TypeScript compilation passed.
- `pnpm --dir apps/api exec prisma validate` — exit 0; Prisma schema valid.
- `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-auth-security.spec.ts --list` — exit 0; 10 authored desktop/mobile tests discovered, not executed against a live environment.
- Live migration/bootstrap-twice/rollback, Redis, browser, and seeded operator/member smoke — blocked/not_run; no live evidence is claimed.

## Scope Preservation

- Existing untracked `apps/api/mercado-pago/`, `packages/mercado-pago/`, and `test-results/` content was preserved and not modified or deleted. These remain external dirty scope and must be excluded before any future auth commit/review.
- No marketplace routes/entities, Checkout Pro execution, billing, Money Out/payouts, Alqui/Vialovers product code, sibling-worktree changes, commit, push, deploy, or secret-value inspection was performed.

## Corrective Absolute-Session-Expiry Closure

- **Decision:** Use absolute session expiry as the refresh authority. A refresh request checks the owning session before Redis policy when the token is unconsumed, rejects an expired session with typed `401 UNAUTHORIZED`, and does not consume the token, create a replacement, or extend the session. The authoritative repository transaction repeats the session check while holding the session row lock.
- **Replay preservation:** Consumed-token replay remains `409 REFRESH_REPLAY` and revokes the refresh family/session. Expired unconsumed sessions/tokens return `401 UNAUTHORIZED` and are never classified as replay.
- **Expiry boundary:** In-memory and PostgreSQL rotation cap replacement refresh expiry to `min(requested expiry, session.expiresAt)`. `issueTokenPair` caps both replacement access and refresh expiry to the same absolute session expiry, and status continues to report the session expiry as `refreshExpiresAt`.

### Corrective TDD Cycle Evidence — Absolute Session Expiry

| Scope | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Expired session rejects valid refresh without mutation | `apps/api/src/application/auth/agronautas-auth-service.test.ts` | Unit/integration seam | ✅ Prior focused auth/repository baseline 19/19 passed. | ✅ New run failed: expired session refresh was not rejected. | ✅ Focused run 24/24 passed with typed `401`, unchanged session expiry, unchanged consumed state, and no replacement creation. | ✅ Valid session rotation and expired token/session boundaries remain distinct. | ✅ Service precheck plus repository recheck avoids Redis-dependent accidental replacement. |
| Replacement access/refresh and status expiry are session-bounded | `apps/api/src/application/auth/agronautas-auth-service.test.ts` | Unit/integration seam | ✅ Prior focused auth/repository baseline 19/19 passed. | ✅ New run failed because replacement access/refresh expiry could exceed `session.expiresAt`. | ✅ Focused run 24/24 passed; access and refresh are at/before the session expiry and status reports that boundary. | ✅ Session advanced halfway through its lifetime with access lifetime longer than the session; valid rotation still succeeds once. | ✅ Centralized capping in `issueTokenPair`; refresh token payload now uses the persisted replacement expiry. |
| Replay remains conflict/revokes family | `apps/api/src/application/auth/agronautas-auth-service.test.ts` | Unit/integration seam | ✅ Existing replay safety baseline was green before this correction. | ✅ Test was written before the corrective implementation; replay behavior was already present and remained green in the initial run. | ✅ Focused run 24/24 passed with typed `409 REFRESH_REPLAY` and revoked replacement access. | ✅ Valid first rotation, consumed replay, and later revoked-family denial are all covered. | ✅ No replay semantics were weakened while adding expiry checks. |
| PostgreSQL session expiry mapping and atomic rejection | `apps/api/src/infrastructure/database/postgres/agronautas-auth-repository.test.ts` | Integration seam | ✅ Prior focused auth/repository baseline 19/19 passed. | ✅ New rotation test failed before implementation because the query path did not load/validate the session row. | ✅ Focused run 24/24 passed; row mapping preserves `expires_at`, expired session returns `session_expired`, and no consume/insert occurs. | ✅ Missing/disabled/expired status mapping remains fail-closed alongside the new absolute-expiry path. | ✅ Session row is locked and replacement expiry is bounded inside the PostgreSQL transaction. |

### Corrective Work Unit Evidence — Absolute Session Expiry

- Focused test: `pnpm --dir packages/zod-schemas build; pnpm --dir apps/api exec node --import tsx --test --test-concurrency=1 --test-force-exit src/application/auth/agronautas-auth-service.test.ts src/infrastructure/database/postgres/agronautas-auth-repository.test.ts` — exit 0, 24/24 passed.
- Runtime harness: **blocked/not_run** — no configured live API/PostgreSQL/Redis environment or seeded operator/member credentials; live migration, bootstrap-twice, refresh-expiry, replay, and browser scenarios were not claimed.
- Rollback boundary: `apps/api/src/domain/auth/contracts.ts`, `apps/api/src/application/auth/agronautas-auth-service.ts`, `apps/api/src/application/auth/agronautas-auth-service.test.ts`, `apps/api/src/infrastructure/database/postgres/agronautas-auth-repository.ts`, and `apps/api/src/infrastructure/database/postgres/agronautas-auth-repository.test.ts`. Reverting only these paths removes the absolute-expiry correction without touching Mercado Pago or `test-results/` content.

## Latest Regression and Build Evidence

- `pnpm --dir packages/zod-schemas build; pnpm --dir apps/api exec node --import tsx --test --test-concurrency=1 --test-force-exit src/application/auth/agronautas-auth-service.test.ts src/infrastructure/database/postgres/agronautas-auth-repository.test.ts src/presentation/routes/agronautas-auth.test.ts src/presentation/middleware/agronautas-auth.test.ts` — exit 0; focused auth suite `27/27` passed.
- `pnpm --dir packages/zod-schemas build; pnpm --dir apps/api test` — exit 0; API `373/373` passed.
- `pnpm --dir packages/zod-schemas build; pnpm --dir apps/web test` — exit 0; web `244/244` passed; known non-failing React/jsdom `attachEvent`/`detachEvent` diagnostics remain.
- `pnpm test` — exit 0; Turbo `8/8` tasks successful, API `373/373`, web `244/244`.
- `pnpm --dir apps/api run build` — exit 0; API TypeScript compilation passed.
- `pnpm --dir apps/api exec prisma validate` — exit 0; Prisma schema valid.
- `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-auth-security.spec.ts --list` — exit 0; 10 authored desktop/mobile tests discovered, not executed against a live environment.
- Live migration/bootstrap-twice/rollback, Redis, browser, and seeded operator/member smoke — **blocked/not_run**; no live evidence or secret values are claimed.

## Current Task State After Correction

- Tasks 1.1–3.3 remain complete.
- Tasks 4.1 and 4.2 remain unchecked because local unit/integration evidence does not replace the missing live migration/runtime and Playwright environment evidence.
- No task checkbox changed in this corrective pass; the evidence changed only for the auth refresh expiry behavior and its regression proof.

## Latest UI Isolation Follow-up

- **Scope-transition guard:** `apps/web/src/components/agronautas/page-client.tsx` now treats a changed `(actorId, sessionId, workspaceId)` as a synchronous loading boundary while the effect removes the previous protected QueryClient/Zustand state. Transient chat, planning, simulation, and error state is cleared with that boundary so a newly authenticated principal cannot see the prior principal's presentation during the cleanup render.
- **Stable auth client:** `apps/web/src/components/agronautas/auth-page.tsx` now creates the default auth client once per mounted page. State updates from status, login, refresh, and logout no longer recreate the implicit client or retrigger the status effect.

### Latest Follow-up Evidence

- Focused web command: `pnpm --dir packages/zod-schemas build; pnpm --dir apps/web exec node --import tsx --test --test-concurrency=1 --test-force-exit src/lib/query-client.test.ts src/lib/agronautas/auth-recovery.test.ts src/lib/agronautas/auth-client.test.ts src/components/agronautas/page-client.test.tsx src/components/agronautas/field-detail.test.tsx` — exit 0; 35/35 passed.
- Web regression: `pnpm --dir packages/zod-schemas build; pnpm --dir apps/web test` — exit 0; 250/250 passed. Known non-failing React/jsdom `attachEvent`/`detachEvent` diagnostics remain.
- API regression: `pnpm --dir packages/zod-schemas build; pnpm --dir apps/api test` — exit 0; 373/373 passed.
- Root regression: `pnpm test` — exit 0; Turbo 8/8 tasks successful, API 373/373 and web 250/250.
- Type/build/schema: sequential shared-schema build, API build, and `prisma validate` — exit 0; web `tsc --noEmit` — exit 0.
- E2E discovery: `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-auth-security.spec.ts --list` — exit 0; 10 tests discovered across desktop/mobile, not executed because live services and seeded credentials remain unavailable.
- Runtime harness: blocked/not_run — no configured live API/PostgreSQL/Redis/browser environment; tasks 4.1 and 4.2 remain unchecked.
- Rollback boundary: `apps/web/src/components/agronautas/page-client.tsx` and `apps/web/src/components/agronautas/auth-page.tsx`; reverting only these files removes the synchronous scope-transition guard and stable-client correction without touching API, Mercado Pago, or `test-results/` content.

### Follow-up TDD Note

- The scope-transition and stable-client corrections were made after the previously green UI boundary suite; no separate pre-change RED run was captured for these two follow-up corrections. They are not recorded as completion of tasks 4.1 or 4.2. The focused and full suites above provide GREEN regression evidence only, while live runtime evidence remains blocked.

## Slice 1 — Deterministic Test Environment Provisioning

- **Scope:** Root `.env` only. Missing local test/runtime entries were appended without changing existing assignments or comments. No tracked source, test, package, lockfile, app-local `.env`, database, or Redis state was modified.
- **Secret generation:** The four auth secrets and the BFF assertion secret were generated only when absent, using the platform cryptographic random generator. Existing non-empty secret assignments were preserved.
- **Provisioned categories:** Auth/bootstrap contract names; deterministic operator/member E2E identity names; pilot bootstrap metadata; API/web runtime and Playwright process settings; source-derived runtime field/workspace probes; fail-closed readiness and scheduler flags.
- **Bootstrap safety:** Bootstrap remains a configuration-only prerequisite in this slice. No migration, bootstrap, seed, E2E, API, web, PostgreSQL, or Redis process was launched.
- **Environment loading contract:** API normally loads `apps/api/.env`, web normally loads `apps/web/.env`, and the runtime verifier does not load dotenv. Future launches MUST explicitly load the repository-root `.env` in the parent process and pass the resulting environment to children. Safe Windows pattern (never print the loaded environment): `node -e "const fs=require('node:fs'); const cp=require('node:child_process'); const dotenv=require('./apps/api/node_modules/dotenv'); Object.assign(process.env,dotenv.parse(fs.readFileSync('.env'))); const r=cp.spawnSync('pnpm.cmd',['--dir','apps/api','dev'],{stdio:'inherit',env:process.env}); process.exit(r.status ?? 1)"`; use the same loader prefix with the Playwright command for browser evidence.

### Slice 1 TDD Cycle Evidence

| Scope | Test/validator | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Deterministic root environment provisioning | Secret-safe PowerShell environment contract validator | Configuration/integration seam | N/A — no existing source file modified | N/A — configuration-only slice; no production behavior changed | ✅ Exit 0; required-name presence, duplicate-name, secret-format, JSON bootstrap shape, identity format, URL syntax, port syntax, runtime-flag, and ignore/tracking checks passed | ➖ Skipped: configuration-only validation has no branching production output; optional maintenance path remains intentionally unset because no deterministic maintenance endpoint exists in the current contract | N/A — no production code changed |

### Slice 1 Work Unit Evidence

- **Focused test command and exact result:** Secret-safe PowerShell validator over root `.env` — exit 0; all required presence/format/ignore checks passed. No values, URLs, credentials, hashes, or lengths were emitted.
- **Runtime harness command/scenario and exact result:** N/A — environment-only slice; no runtime process was launched and no PostgreSQL or Redis operation was attempted.
- **Rollback boundary:** Root `.env` appended assignments only; remove the Slice 1 assignments to roll back this provisioning without touching unrelated dirty paths or tracked application behavior.

### Slice 1 Task State (historical)

- Tasks 1.1–3.3 were complete at the end of Slice 1.
- Tasks 4.1 and 4.2 were unchecked at the end of Slice 1. That slice supplied prerequisites only; it did not constitute migration/bootstrap-twice, runtime, rollback, or Playwright evidence.

## Slice 2 — Storage Setup and Deterministic Fixtures

- **Scope:** Used the ignored repository-root `.env` through a process-level dotenv loader for every migration, bootstrap, metadata, test, build, and service probe command. No environment values, credentials, URLs, connection strings, hashes, or raw logs were emitted.
- **Migration:** `pnpm --dir apps/api exec prisma migrate deploy --schema prisma/schema.prisma` exited 0 and reported no pending migrations. Follow-up `prisma migrate status --schema prisma/schema.prisma` exited 0 and reported the schema up to date. No reset, push, drop, truncate, or cleanup command was used.
- **Bootstrap:** The supported internal `runAgronautasAuthBootstrapFromEnv` path ran twice with the configured test inputs. Both invocations completed with `already_initialized`; the second invocation was a structural no-op. The database already contained the idempotency state before this slice, so this evidence does not claim a fresh `created` transition.
- **Fixture metadata:** Safe count assertions found all nine required tables, two active auth workspaces, two active users, two active memberships (one `admin`, one `reader`), one bootstrap state row, zero field mappings, zero fields, zero sessions, and zero refresh records. No active member membership exists for the configured forbidden workspace. The configured runtime field identifier was not present; no forbidden-field fixture was required by the authored browser contract, which names the forbidden workspace boundary instead.
- **Identity checks:** The configured operator and member identities were present and active; process-local bcrypt comparisons matched the configured test-only passwords. No identity values were printed.
- **Redis:** Process-local `PING` returned the expected `PONG` class; no Redis keys were written.

### Slice 2 TDD Cycle Evidence

| Scope | Test/validator | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Storage/bootstrap verification | Existing bootstrap, auth service/repository, route, contract, web, and root suites plus live metadata harness | Integration/runtime | ✅ API 373/373, web 250/250, and root baseline green | ➖ No production source changed in this verification-only slice | ✅ Migration/status, bootstrap-twice, metadata/count, Redis reachability, and all focused/full suites passed | ✅ Repeated `already_initialized`, role aggregates, forbidden-workspace denial boundary, and zero-session/refresh initial state observed | ➖ No source refactor required; prior GREEN/refactor evidence retained |

### Slice 2 Work Unit Evidence

- **Focused test command and exact result:** Sequential shared-schema build, API auth/storage focused tests, Prisma validation/build, contract tests, and web tests all exited 0: API focused `32/32`, Prisma valid, API build passed, contracts `56/56`, web `250/250`.
- **Full regression command and exact result:** `pnpm test` exited 0; Turbo reported `8` successful tasks, with API `373/373` and web `250/250`. Known non-failing React/jsdom `attachEvent`/`detachEvent` diagnostics remained.
- **Runtime harness command/scenario and exact result:** Additive Prisma deploy/status exited 0 and was up to date; supported bootstrap invoked twice and returned `already_initialized` twice; safe metadata/count assertions passed; Redis `PING` returned `PONG`. Auth route rollback test exited 0 with `2/2` passed and the health-only case observed.
- **Rollback boundary:** No application source or runtime configuration was changed in Slice 2. Reverting only the Slice 2 evidence additions in `openspec/changes/agronautas-auth-security-isolation/tasks.md` and `apply-progress.md` removes the recorded verification; additive database state was not destructively reverted.

### Slice 2 Task State

- Tasks 1.1–3.3 and 4.1 are complete and marked `[x]`.
- Task 4.2 remains unchecked. Playwright was not executed against live API/web services; only prior local discovery remains non-execution evidence.

### Slice 2 Scope Preservation

- No tracked application file, lockfile, `.env.example`, Mercado Pago path, or `test-results` path was changed by this slice.
- The ignored root `.env` was preserved and never diffed or displayed.
- No commit, push, deploy, review lifecycle command, iron agent, reset, clean, revert, or destructive database operation was performed.

## Corrective Writer Slice — Desktop Auth Transition

- **Scope:** Fix only the authenticated client transition from `/login` to `/agronautas`; preserve the existing mobile/member/forbidden E2E contract and keep task 4.2 unchecked.
- **Root cause:** `AgronautasAuthPage` completed login state but used `router.push('/agronautas')`. The live desktop evidence remained at `/login` with an active session and `Abrir workspace`; the focused regression reproduced the missing history-replacing transition by providing a router whose `push` path fails the test and whose `replace` path records the expected destination.
- **Fix:** Changed the successful sign-in transition to `router.replace('/agronautas')`. No token, browser storage, auth contract, or recovery behavior changed.
- **Regression:** Added `apps/web/src/components/agronautas/auth-page.test.tsx`. It exercises a successful operator session and a distinct HTTP 403 sign-in path; successful sign-in records exactly `/agronautas`, while forbidden sign-in remains on the recovery form without navigation.

### Corrective TDD Cycle Evidence

| Scope | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Desktop auth transition | `apps/web/src/components/agronautas/auth-page.test.tsx` | Component/integration seam | ✅ Existing auth client/recovery focused baseline `6/6` passed before source edit | ✅ Regression failed `1/1` at the expected `/agronautas` replacement call while login completed | ✅ Focused auth run `7/7` passed | ✅ Successful operator session plus distinct forbidden `403` path; existing E2E member/mobile assertions unchanged | ✅ Replaced the test-only experimental module mock with the real `AppRouterContext` seam; focused test remained `1/1` green |

### Corrective Work Unit Evidence

- **Focused test command and exact result:** `pnpm --dir packages/zod-schemas build; pnpm --dir apps/web exec node --import tsx --test --test-concurrency=1 --test-force-exit src/components/agronautas/auth-page.test.tsx src/lib/agronautas/auth-client.test.ts src/lib/agronautas/auth-recovery.test.ts` — exit 0; `7/7` passed.
- **Web suite command and exact result:** `pnpm --dir apps/web test` — exit 0; `251/251` passed. Known non-failing React/jsdom `attachEvent`/`detachEvent` diagnostics remain.
- **Root suite command and exact result:** `pnpm test` — exit 0; Turbo `8/8` successful, API `373/373`, web `251/251`.
- **Type/build commands and exact result:** `pnpm --dir apps/web exec tsc --noEmit` — exit 0; `pnpm --dir apps/web build` — exit 0; Next.js production build compiled and generated all routes. Existing non-blocking lint warnings remain in unrelated files.
- **E2E discovery command and exact result:** `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-auth-security.spec.ts --list` — exit 0; `10` authored desktop/mobile tests discovered.
- **Runtime harness command/scenario and exact result:** **Deferred/not run** — live API/Web processes were not kept running in this writer slice; the runtime executor must rerun the single desktop and full both-project auth matrix with the root `.env` loaded process-locally. This is not claimed as live GREEN evidence.
- **Rollback boundary:** Revert only `apps/web/src/components/agronautas/auth-page.tsx` and `apps/web/src/components/agronautas/auth-page.test.tsx` to remove this corrective transition and regression proof without touching API, Mercado Pago, lockfile, `.env.example`, or `test-results` paths.

### Corrective Slice Task State

- Tasks 1.1–3.3 remain complete.
- Task 4.1 remains complete from prior verified evidence.
- Task 4.2 remains unchecked until the next live executor reruns both Playwright projects successfully after this fix.

## Corrective Writer Slice — BFF Session Cookie Persistence

- **Scope:** Repair the BFF login/clear-cookie response handling and strengthen the live sign-in boundary without running services or Playwright; task 4.2 remains unchecked.
- **Root cause:** The BFF appended a serialized `Set-Cookie` header directly to `NextResponse`; the response exposed cookie text but did not register a response cookie in Next's cookie API, leaving browser-session persistence unproven and allowing the post-login status request to remain `401 UNAUTHORIZED`.
- **Fix:** Use `NextResponse.cookies.set` for login, logout, and refresh-failure session cookies while preserving `Path=/`, `HttpOnly`, `SameSite=Lax`, request-protocol-aware `Secure`, and bounded `Max-Age`. Access/refresh tokens remain server-managed and are not returned to browser JavaScript.
- **Regression:** The BFF test now verifies framework-managed cookie attributes and the E2E sign-in helper/operator scenario requires the authorized-only `Registrar lote` control instead of treating the shared workspace heading as authentication proof.

### Corrective TDD Cycle Evidence

| Scope | Test File | RED | GREEN | Live Evidence |
|---|---|---|---|---|
| BFF session persistence | `apps/web/src/app/api/agronautas/[...path]/route.test.ts` | ✅ `9/10` passed; new managed-cookie assertion failed | ✅ `10/10` passed after cookie API fix | ➖ Playwright/live services not run; task 4.2 remains unchecked |
| Authorized-only sign-in boundary | `apps/web/tests/e2e/agronautas-auth-security.spec.ts` | ✅ Assertion added before live execution | ➖ Not run by writer instruction | ⏸ Requires the next live desktop/mobile executor |

### Corrective Work Unit Evidence

- **Focused Web result:** `37/37` passed, including `10/10` BFF route tests, auth client/recovery, auth page, and protected page-client tests.
- **Focused API result:** `4/4` auth route/middleware tests passed.
- **Type/build result:** Zod schemas build, Web `tsc --noEmit`, API build, and Web production build passed. Web build retained existing non-blocking lint warnings in unrelated files.
- **Runtime boundary:** No services were started, no Playwright tests were run, and no live task 4.2 completion is claimed.

## Corrective Writer Slice — Protected Field Mutation Parser Boundary

- **Scope:** Repair the PostgreSQL field-intake save statement and preserve truthful `/fields` failure semantics; no seed/bootstrap, migration, browser, or live service changes were made.
- **Root cause:** When polygon input was absent, PostgreSQL could not infer the type of nullable `$11` and returned `42P08`. After that cast was added, the statement still supplied unused `$12` and `$13`, producing `42P18`. The route also needed explicit mappings for expected workspace, coverage, and domain failures.
- **Fix:** Added explicit `$11::text`, geometry-function casts, numeric `$12/$13` metric branches, and explicit casts for the remaining optional parameters. Added route mappings for `401`, `403`, `422`, and retryable `503`; unexpected failures remain observable through safe structured logging and return a truthful `500` without raw details.
- **Regression:** Repository tests assert the nullable/text/numeric parameter casts and route tests cover workspace conflict, maintenance, and unexpected persistence failures.

### Corrective TDD Cycle Evidence

| Scope | Test File | RED | GREEN | Runtime Evidence |
|---|---|---|---|---|
| Nullable field-save SQL typing | `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.test.ts` | ✅ New cast assertion failed before the SQL correction; existing geometry expectation was updated after the first green implementation. | ✅ Focused API run passed `70/70`, including the SQL regression. | ✅ Sanitized database probe reached the deliberate rollback boundary without `42P08` or `42P18`. |
| Protected field-intake failure mapping | `apps/api/src/presentation/routes/agronautas.test.ts` | ✅ Expected status/error assertions were added before the mapper correction. | ✅ Focused API run passed `70/70`, including `403`, `503`, and `500` mapping assertions. | ➖ Route tests use explicit test seams; no live browser execution was claimed. |

### Corrective Work Unit Evidence

- **Focused API result:** `pnpm exec node --import tsx --test --test-concurrency=1 --test-force-exit src/infrastructure/database/postgres/agronautas-field-repository.test.ts src/presentation/routes/agronautas.test.ts src/application/usecases/update-field-geometry-usecase.test.ts src/application/usecases/grounded-chat-usecase.test.ts` — exit 0; `70/70` passed.
- **Focused Web result:** page-client, field-detail, service, and BFF route tests — exit 0; `35/35` passed, plus the separately escaped BFF route invocation — `10/10` passed.
- **Dependency/type/build result:** Zod schemas build, API/Web `tsc --noEmit`, API build, and Web production build passed. Web retained existing non-blocking lint warnings in unrelated files.
- **Diff result:** `git diff --check` reported no whitespace errors; only existing LF/CRLF normalization warnings remain.
- **Runtime harness:** A process-local dotenv probe reached the repository commit boundary and intentionally rolled back with `PROBE_RESULT=error_category_PROBE_SUCCESS_position_none_routine_none`; this proves SQL execution reached the transaction boundary, not durable fixture mutation.
- **Runtime boundary:** No API/Web services were started and no Playwright tests were executed. Task 4.2 remains unchecked until the live desktop/mobile matrix is rerun.

## Corrective Writer Slice — Duplicate External Field Validation

- **Scope:** Classify the concrete protected field-intake duplicate constraint as validation; preserve successful writes, draft preservation, and the existing failure/readiness contract. No migration, seed, cleanup, service, or Playwright execution was performed.
- **Root cause:** The live test database already contained the authored draft's external-field fixture, and the `fields.external_field_id` unique constraint rejected the repeated protected mutation with PostgreSQL `23505` before auth-mapping persistence. The prior generic route mapper returned this known validation failure as `500`.
- **Fix:** `PostgresFieldRepository.save` translates only a `23505` whose normalized constraint identifies `fields.external_field_id` to `FIELD_EXTERNAL_ID_CONFLICT`; `/fields` maps that domain conflict to non-retryable `422 INVALID_CONTRACT`. Other unique constraints and arbitrary persistence errors remain observable through the existing `500` path.
- **Regression:** Repository RED asserted the specific database conflict translation; route RED asserted `422` for the typed conflict while retaining `500` for an unrelated unexpected persistence failure.

### Corrective TDD Cycle Evidence — Duplicate External Field Validation

| Scope | Test File | RED | GREEN | Runtime Evidence |
|---|---|---|---|---|
| Duplicate external field validation | `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.test.ts` | ✅ New test failed because the raw `23505` escaped unchanged. | ✅ Repository and route focused run passed `66/66`. | ✅ Safe metadata showed all `fields` columns and auth tables present; rollback-only write probe reproduced `duplicate_external_field_constraint` with field insert reached and auth mapping not reached; rollback preserved state. |
| Protected route contract | `apps/api/src/presentation/routes/agronautas.test.ts` | ✅ New failure case returned `500` before the mapper correction. | ✅ Same focused run passed `66/66`; known duplicate is `422`, unrelated persistence remains `500`. | ➖ Live browser/API rerun remains deferred. |

### Corrective Work Unit Evidence — Duplicate External Field Validation

- **Database metadata:** Safe test-database checks found `fields`, `field_contexts`, both auth tables, complete field-write columns, coverage tables/columns, active workspace parity, and the existing unique constraint required by the failure. No migration is required for this validation mapping. The known authored draft fixture was present; no values, IDs, credentials, cookies, headers, URLs, connection strings, or raw logs were emitted.
- **Rollback-only reproduction:** The real compiled repository path reached the `fields` insert, reproduced and translated the duplicate external-field constraint to `FIELD_EXTERNAL_ID_CONFLICT`, did not reach auth-mapping insertion, and preserved the database through rollback. No durable row was inserted or changed.
- **Focused API tests:** Repository/use-case/route command exited 0 with `85/85` passing.
- **Focused Web tests:** BFF, intake, page-client, field-detail, service, and route-contract command exited 0 with `61/61` passing; existing non-failing jsdom `attachEvent` diagnostics remain.
- **Type/build/schema:** API TypeScript/build, Web TypeScript/build, and Prisma validation exited 0. Web build retained existing non-blocking lint warnings in unrelated files.
- **Diff:** `migration_changed=false`; no schema or migration file was changed. `git diff --check` remains required after this artifact update.
- **Runtime boundary:** No live API/Web services or Playwright tests were started in this writer slice. Task 4.2 remains unchecked until the runtime executor reruns the desktop/mobile matrix and confirms the controlled failure response, draft preservation, and truthful readiness.

## Corrective Writer Slice — Auth E2E Contract Boundaries

- **Scope:** Fix the three concrete auth-E2E failures in the existing `main` checkout: BFF refresh JSON framing, truthful authenticated workspace readiness, and deterministic protected-mutation assertions. No live services were started by this writer, and unrelated dirty paths were preserved.
- **Pre-fix runtime evidence:** A real compiled API/Web run with test PostgreSQL, Redis, and auth passed API/Web health/readiness. The BFF refresh returned `400` because the synthesized `{ refreshToken }` body had no explicit JSON content type; the first operator sign-in remained observably in `Verificando autenticación Agronautas` long enough for the implicit control wait to fail even though later auth/page requests succeeded; the protected mutation returned the expected controlled `422`, while the page-wide `/listo|live|operativo/` assertion matched unrelated editorial copy.
- **Fix:** `apps/web/src/app/api/agronautas/[...path]/route.ts` now forces `content-type: application/json` only for the synthesized refresh request. `AgronautasPageClient` exposes readiness only after authenticated runtime and workspace context data are present, and `AgronautasWorkspace` renders the semantic `Workspace Agronautas listo` status selector only at that transition.
- **E2E contract:** `apps/web/tests/e2e/agronautas-auth-security.spec.ts` waits up to `15_000ms` for the truthful semantic readiness status after sign-in and page reload, requires exact `422` for the seeded `corrientes-demo-mercedes` external-ID collision, preserves the intake error alert and draft value assertion, and scopes the negative success assertion to `agronautas-dashboard-metrics` instead of page-wide editorial text.

### Corrective TDD Cycle Evidence

| Scope | Test File | RED | GREEN | Runtime Evidence |
|---|---|---|---|---|
| Synthesized refresh JSON content type | `apps/web/src/app/api/agronautas/[...path]/route.test.ts` | ✅ New test failed with forwarded `content-type = null` instead of `application/json`. | ✅ Focused BFF route suite passed `11/11`. | ➖ Live refresh rerun remains deferred. |
| Authenticated workspace-ready transition | `apps/web/src/components/agronautas/page-client.test.tsx` | ✅ New ready-selector assertions failed before the selector/transition implementation. | ✅ Focused BFF/page/auth UI suite passed `39/39`; delayed workspace test proves the selector is absent before workspace context and present after it resolves. | ➖ Live operator/browser rerun remains deferred. |
| Deterministic protected mutation E2E | `apps/web/tests/e2e/agronautas-auth-security.spec.ts` | ✅ Existing runtime evidence reproduced the broad negative assertion failure after the controlled `422`; the revised exact-status/scoped assertions were authored before live rerun. | ➖ Not executed against live services in this writer slice. | ⏸ Requires the next runtime matrix. |

### Corrective Work Unit Evidence

- **Focused API result:** `pnpm --dir apps/api exec node --import tsx --test --test-concurrency=1 --test-force-exit src/infrastructure/database/postgres/agronautas-field-repository.test.ts src/presentation/routes/agronautas.test.ts` — exit 0; `66/66` passed, including the duplicate external-field `422` contract and unrelated failure preservation.
- **Focused Web result:** `pnpm --dir apps/web exec node --import tsx --test --test-concurrency=1 --test-force-exit src/app/api/agronautas/*/route.test.ts src/components/agronautas/auth-page.test.tsx src/components/agronautas/page-client.test.tsx src/lib/agronautas/auth-client.test.ts src/lib/agronautas/auth-recovery.test.ts` — exit 0; `39/39` passed.
- **Strict TypeScript:** `pnpm --dir apps/api exec tsc --noEmit` — exit 0; `pnpm --dir apps/web exec tsc --noEmit` — exit 0 after the Web build generated `.next/types`.
- **Builds:** `pnpm --dir apps/api run build` — exit 0; `pnpm --dir apps/web run build` — exit 0. Web retained only existing non-blocking warnings for an unused test import and type-only state constants.
- **E2E discovery:** `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-auth-security.spec.ts --list` — exit 0; `10` authored tests discovered across desktop and mobile.
- **Diff:** `git diff --check` — no whitespace errors; existing LF/CRLF normalization warnings remain.
- **Runtime boundary:** No API/Web services, PostgreSQL, Redis, or Playwright browser execution was launched in this writer slice. Task 4.2 remains unchecked until a new runtime matrix passes operator/member, forbidden, maintenance, refresh recovery, deterministic `422` draft preservation, and both viewport readiness evidence.

## Current Synchronized Evidence — 2026-09-19

### Task State

- Before synchronization: 12/13 tasks complete; task 4.2 was unchecked.
- After synchronization: tasks 1.1-3.3 and 4.1 remain complete; task 4.2 remains unchecked. No task was marked complete merely because tests passed.

### Local Evidence

- Test-only root environment was provisioned and loaded safely in process memory; no secret values or raw logs are recorded here.
- The additive Prisma migration is up to date. Auth bootstrap was run twice idempotently. Safe runtime assertions confirmed all 9 required tables, two active users/memberships, one authorized field and mapping, preserved forbidden-member isolation, and Redis `PONG`.
- Focused source-fix and build evidence is green: BFF `10/10`, Web auth/UI `39/39` or later focused coverage, API `85/85` or later focused coverage, TypeScript/build checks, and diff checks passed.
- One real compiled local matrix used API `NODE_ENV=test` and Web `NODE_ENV=production` with no mocks, interception, or stubs. Health/readiness passed and teardown was verified: desktop `4 pass / 0 fail / 1 skip`, mobile `4 pass / 0 fail / 1 skip`, total `10` with `8 pass / 0 fail / 2 skip`.
- The only skips were the maintenance scenario at desktop and mobile because no live maintenance endpoint/path is configured. The operator/member, forbidden, refresh-recovery, draft-preservation, and truthful-readiness portions are recorded as local runtime evidence, but aggregate task 4.2 remains pending until maintenance is executable and passes.

### Local Versus Production Boundary

- All current migration, bootstrap, storage, Redis, build, and compiled browser evidence is local only.
- No production or deployment evidence exists and none is claimed.
- The official Corrientes seed initially hit PostgreSQL `42P08`; the canonical application-model fallback seeded the required field/mapping. The official seed defect remains a pending follow-up if required by the release artifact; the fallback is not recorded as an official-seed fix.

### Prior Remaining Evidence Gate — Superseded by the Latest Matrix

- [x] Task 4.2: the later compiled local matrix executed the maintenance scenario and the full aggregate acceptance criteria passed.
- [ ] Official Corrientes seed follow-up: correct and verify the official seed path beyond the canonical application-model fallback if the artifact requires that path.

## Maintenance Runtime Slice — 2026-09-20

### Scope and Contract

- Added the ignored, non-secret E2E path `AGRONAUTAS_E2E_MAINTENANCE_PATH=/agronautas/maintenance`; no secret value was changed or emitted.
- Kept the existing `/agronautas/maintenance` route bound to the runtime by exporting `dynamic = 'force-dynamic'`. The route continues to delegate to the existing maintenance view, which reads only public `/api/agronautas/ready` state and withholds workspace data.
- Preserved normal runtime behavior: no API readiness, auth, BFF, database, Redis, or production configuration contract was changed.

### TDD and Verification Evidence

| Scope | Test | RED | GREEN | Runtime Evidence |
|---|---|---|---|---|
| Maintenance route runtime binding | `apps/web/src/app/agronautas/maintenance/page.test.tsx` | ✅ Failed before the route export because `dynamic` was `undefined`. | ✅ Focused Web maintenance/BFF/recovery run passed `18/18`. | ✅ Route was built as dynamic (`ƒ /agronautas/maintenance`). |
| Maintenance UI truthful state | Existing `apps/web/src/app/agronautas/maintenance-page.test.tsx` | ✅ Existing contract test covers both desktop/mobile viewports and protected-content withholding. | ✅ Passed in the same `18/18` focused Web run. | ✅ No workspace-ready status or `Registrar lote` control was present. |
| Authenticated maintenance E2E selector boundary | `apps/web/tests/e2e/agronautas-auth-security.spec.ts` | ✅ Local browser run exposed strict-mode matching against page title/loading copy and a negated `estado operativo` explanation. | ✅ Selector now waits for a terminal maintenance/unavailable heading and checks positive workspace selectors only. | ✅ Local API/Next harness passed `2/2`: desktop and mobile. |

### Commands and Boundaries

- `pnpm --dir packages/zod-schemas build:ensure; pnpm --dir apps/api exec node --import tsx --test --test-concurrency=1 --test-force-exit src/presentation/routes/health.test.ts` — exit 0; API health/readiness `19/19`.
- Web focused maintenance/BFF/recovery tests — exit 0; `18/18` passed.
- API TypeScript/build and Web TypeScript/build — exit 0. Next build lists `/agronautas/maintenance` as dynamic; existing non-blocking lint warnings remain unrelated.
- Local browser harness command for the authored maintenance test with root `.env` loaded only in process memory — exit 0; desktop `1/1`, mobile `1/1`, total `2/2`.
- `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-auth-security.spec.ts --list` — exit 0; full authored matrix remains discoverable as `10` tests across desktop/mobile.
- No production/deployment evidence is claimed. Task 4.2 remains unchecked because this slice proves only the maintenance scenario; the aggregate operator/member, forbidden, refresh, draft, and Iberá acceptance matrix was not rerun as one completion gate.

## Final Task 4.2 Runtime Evidence — 2026-09-20

### Verified Local Matrix

- The latest compiled local API/Web matrix ran with API `NODE_ENV=test` and Web `NODE_ENV=production` against real test PostgreSQL, Redis, and auth. No mocks, interception, or stubs were used.
- API/Web health and readiness passed, and owned-process teardown passed.
- Playwright passed `10/10`: desktop `5/5` and mobile `5/5`. Maintenance passed `2/2` across the two viewports.
- The matrix covered operator/member sign-in, forbidden access, refresh/replay recovery, protected mutation `422` with draft preservation, and truthful readiness without fabricated positive state.
- Focused tests, builds, and TypeScript checks are green. Canonical fixture setup and task 4.2 acceptance passed.

### Boundary and Follow-ups

- This is compiled local evidence only. No production or deployment evidence exists or is claimed.
- The official Corrientes seed retains a separate PostgreSQL `42P08` follow-up; canonical fixture setup does not close that issue.
- No source or `.env` evidence is changed by this synchronization; only this SDD evidence is updated.
