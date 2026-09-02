# Apply Progress: Agronautas Production-Simple Local Proof

## Status

- **Mode:** Strict TDD
- **Delivery:** Single PR with maintainer-approved `size:exception`
- **Work unit:** Phase 5 — post-fix verification reconciliation
- **Scope:** Reconcile supplied focused schema/API/web/worker/BFF/verifier evidence without running commands or changing source/config; preserve blocked env-backed service/browser/production gates and pending task 5.1
- **Completed:** Core tracked work remains 6/13; tasks 5.3–5.8 are checked, while tasks 5.1–5.2 and 2.1–3.2 remain pending because live topology, browser, and production proof are unavailable

## Completed Tasks

- [x] 1.1 Add the API-local command contract test before implementation.
- [x] 1.2 Add thin `backend` and `frontend` development wrappers plus root local startup aliases.
- [x] 1.3 Normalize environment examples; keep API-owned values out of the web example.
- [ ] 2.1 Full local topology and durable proof RED boundary.
- [ ] 2.2 Durable worker completion guard, timeout classification, terminal idempotency, database readiness, and env-backed local topology proof. Worker contract sub-boundary is implemented; integration evidence is blocked.
- [ ] 2.3 Bounded IDs and read-only DB correlation.
- [ ] 3.1–3.2 No-stub web/BFF proof.
- [x] 4.1 Harden runtime/hydrology receipt correlation and secret-free evidence boundaries.
- [x] 4.2 Production configuration/runbook boundary and evidence classification.
- [x] 4.3 Select direct `scheduler:once` as the authoritative Render Cron contract; live proof remains pending.
- [ ] 5.1–5.2 Full verification and handoff.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `apps/api/src/scripts/verify-local-command-contract.test.ts` | Unit/contract | N/A (new file) | ✅ Written; exact command failed 3/3 because wrappers and local scripts were absent | ✅ Exact command passed 3/3 | ✅ Three contract cases cover both delegates, required local services, cwd/path ownership, secret-free failure propagation, and prerequisite gating | ✅ Test helpers keep manifest/path assertions centralized; exact command passed after cleanup |
| 1.2 | `apps/api/src/scripts/verify-local-command-contract.test.ts` | Unit/contract | N/A (new manifests) | ✅ Written before manifests/root aliases | ✅ Exact command passed 3/3 | ✅ Backend and frontend use distinct targets; local-up/local-dev cover required infrastructure and `&&` fail-stop behavior | ✅ Thin manifests contain only the delegated `dev` script and no dependency/workspace ownership |
| 1.3 | `apps/api/src/infrastructure/config/env-examples.test.ts` | Unit/contract | ✅ Existing `build-config.test.ts` 14/14 and `validator.test.ts` 6/6 passed before edits | ✅ Written first; 2 tests failed before normalization (missing worker ownership and unsafe web BFF token value) | ✅ Final focused run passed 2/2; existing config suites also passed | ✅ Second test exercises credential-bearing BFF value rejection while the first covers API/web ownership and local defaults | ✅ Documentation-only normalization; final focused and existing config tests remained green |
| 2.1 | Assigned API, verifier, schema, and Python worker test files | Integration/contract | ✅ Health recheck 16/16 at 30,000 ms; remaining existing cases passed | ✅ Written; focused runs fail on absent migration/PostGIS, durable completion, idempotency, classification, and redaction contracts | ⏸ Not run — explicit RED-only slice | ✅ Deterministic cases cover required topology, terminal completion, duplicate IDs, timeouts, boundary classifications, and secret-free output | ⏸ Not run — production implementation is out of scope |
| 2.2 worker sub-boundary | `apps/workflow-runtime-python/tests/test_queue_consumer.py`, `apps/workflow-runtime-python/tests/test_agronautas_jobs.py` | Integration/contract | ✅ 60 passed, 4 failed; the four assigned RED assertions failed before source edits | ✅ Existing RED assertions exercised the missing four worker contracts | ✅ 64 passed, 0 failed, exit 0; durable guard, timeout `failureKind`, duplicate terminal idempotency, and database readiness passed | ✅ Source remains limited to the two corrected worker modules; the overall task still requires live env-backed service proof |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=20000 src/infrastructure/config/env-examples.test.ts` — RED: 2 failed, 0 passed, exit 1; GREEN: 2 passed, 0 failed, 0 skipped, exit 0, duration 668.5 ms. Existing relevant suites after edits: `src/build-config.test.ts` 14 passed/0 failed, exit 0, 1,404.3 ms; `src/infrastructure/config/validator.test.ts` 6 passed/0 failed, exit 0, 942.9 ms. |
| Runtime harness command/scenario and exact result | N/A — this slice changes static environment examples only; starting API/web processes or external providers would exceed the task boundary. The focused contract validates ownership, local endpoints, secret placeholders, and production labels without reading runtime environment values. |
| Rollback boundary | Revert only `.env.example`, `apps/api/.env.example`, `apps/web/.env.example`, and `apps/api/src/infrastructure/config/env-examples.test.ts` for this task; leave prior wrapper work and all unrelated dirty files untouched. |

## Implementation Notes

- `cd backend && pnpm run dev` delegates to `../apps/api` and `cd frontend && pnpm run dev` delegates to `../apps/web`.
- The canonical policy supplies Postgres/PostGIS, Redis, and worker services through environment variables or process configuration.
- Runtime services are supplied through environment variables or process configuration; the exact application delegates remain `cd backend && pnpm run dev` and `cd frontend && pnpm run dev`.
- No root `.env` was read, copied, printed, or referenced. No provider/auth/production setting, app source, API/BFF file, marketplace file, or field-management file was changed.
- The web wrapper delegates to the existing web app; the existing BFF remains the API boundary and no database dependency was added to the web wrapper.
- The three examples now label local development explicitly, keep API-owned database/Redis/worker values in the API authority, keep web values to BFF/public configuration, and use blank or documented placeholders for secrets.
- Production-only secret names are documented as secret-manager references/comments; local schedulers and auth remain disabled by default, and no Spanish UI copy was changed.

## Task 2.1 RED Boundary Attempt

- **Status:** Blocked before RED authoring by a pre-existing safety-net failure; task 2.1 remains unchecked.
- **Scope:** No production code, task 2.1 test assertions, worker tests, contract tests, or unrelated files were changed.
- **Strict TDD gate:** The existing health safety net must pass before modifying `apps/api/src/presentation/routes/health.test.ts`. It did not complete.

### Safety-Net Evidence

| Test file / command | Exact result |
|---|---|
| `pnpm --dir apps/api exec node --import tsx --test --test-timeout=20000 src/infrastructure/config/agronautas-runtime.test.ts` | PASS — 7 passed, 0 failed, 0 skipped, exit 0, 1090.669 ms |
| `pnpm --dir apps/api exec node --import tsx --test --test-timeout=20000 src/infrastructure/config/provider-matrix.test.ts` | PASS — 5 passed, 0 failed, 0 skipped, exit 0, 3735.853 ms |
| `pnpm --dir apps/api exec node --import tsx --test --test-timeout=20000 src/infrastructure/config/validator.test.ts` | PASS — 6 passed, 0 failed, 0 skipped, exit 0, 895.106 ms |
| `pnpm --dir apps/api exec node --import tsx --test --test-timeout=20000 src/presentation/routes/health.test.ts` | **BLOCKED — test file timed out after 20000 ms before reporting a passing subtest; 0 passed, 0 failed, 1 cancelled, exit 1.** |
| `pnpm --dir apps/api exec node --import tsx --test --test-timeout=20000 --test-name-pattern="GET /health returns liveness" src/presentation/routes/health.test.ts` | **BLOCKED — same file-level timeout after 20000 ms with the single test-name filter; 0 passed, 0 failed, 1 cancelled, exit 1.** |

The timeout reproduces before any health subtest output, including a single-test name filter, so it is recorded as a pre-existing test-runner/import or setup hang. Per strict TDD, no RED assertions were authored after this gate and no GREEN implementation was attempted. The remaining Node verifier, hydrology, schema, and Python safety nets were not run because the strict safety-net gate required stopping at the first pre-existing failure.

### Work Unit Evidence (Task 2.1)

| Evidence | Result |
|---|---|
| Focused test command and exact result | **Blocked before focused RED command:** the required existing `health.test.ts` safety net timed out twice at 20,000 ms with 0 passing tests. No task 2.1 focused test command was run. |
| Runtime harness command/scenario and exact result | N/A — strict TDD safety-net failure occurred before RED authoring; no service, worker, or real runtime harness was started. |
| Rollback boundary | No task 2.1 test files changed. The only artifact update is this cumulative evidence section in `openspec/changes/agronautas-production-simple-local-proof/apply-progress.md`; reverting that section restores the prior apply-progress artifact. |

## Remaining Tasks

Tasks 2.1–5.2 remain pending. The prior health safety-net timeout is now cleared for the next task 2.1 RED attempt; no production implementation was started.

## Verification-only Health Safety-Net Recheck

- **Status:** PASS — the existing health safety net completed with the requested 30-second per-test timeout and within the 60-second external command timeout.
- **Scope:** Verification only. No production code, test assertions, configuration, or unrelated files were changed.
- **Exact command:** `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/presentation/routes/health.test.ts`
- **Execution directory:** `C:\Users\mmmau\Agronautas\monorepo-js-baseline` (API package selected through `--dir apps/api`).
- **Exact result:** TAP `1..16`; `# tests 16`; `# pass 16`; `# fail 0`; `# cancelled 0`; `# skipped 0`; `# todo 0`; `# duration_ms 7665.725`; process terminated normally before the external 60-second timeout (exit 0).
- **Conclusion:** The prior 20-second timeout was consistent with heavy Node/tsx test-worker module loading before test registration, not a health behavior failure. The health route safety net itself passes 16/16.
- **Next step:** Task 2.1 RED may now proceed. This recheck did not author RED assertions and does not mark task 2.1 complete.

## Task 2.1 RED Coverage Attempt (current batch)

- **Status:** RED authored and verified; task 2.1 remains unchecked by explicit instruction.
- **Scope:** Test assertions only. No production code, env-backed services, local runtime, provider, database, or worker process was started.
- **Safety-net gate:** Cleared by the 30-second health recheck above. All assigned Node and Python files were then run serially; existing cases remained green while the new contract assertions failed as planned.
- **Coverage added:** migration/PostGIS/Redis/readiness/heartbeat; API 202 acknowledgement versus terminal worker/Postgres completion; duplicate DB rows and repeated durable outcomes; timeout classification; provider/auth/tenant/lead/ingest boundary statuses; secret-free blocked/not-run evidence.

### RED Test Evidence

| Test file | Exact command | Exact result |
|---|---|---|
| `apps/api/src/infrastructure/config/agronautas-runtime.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/infrastructure/config/agronautas-runtime.test.ts` | PASS — 7 passed, 0 failed, exit 0, 1,126.135 ms |
| `apps/api/src/infrastructure/config/provider-matrix.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/infrastructure/config/provider-matrix.test.ts` | RED — 5 passed, 1 failed, exit 1; `boundaryStatus` was `undefined` instead of `blocked` |
| `apps/api/src/infrastructure/config/validator.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/infrastructure/config/validator.test.ts` | RED — 6 passed, 1 failed, exit 1; production validation returned `isValid=true` for local API origin and `TRUST_PROXY=false` |
| `apps/api/src/presentation/routes/health.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/presentation/routes/health.test.ts` | RED — 16 passed, 2 failed, exit 1; migration/PostGIS case returned 200 instead of 503, stale-heartbeat case returned 200 instead of 503 |
| `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-agronautas-runtime-real.test.ts` | RED — 11 passed, 3 failed, exit 1; `classifyRuntimeCompletion` and `classifyBoundaryEvidence` are not exported |
| `apps/api/src/scripts/verify-hydrology-local-real.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-hydrology-local-real.test.ts` | RED — 5 passed, 2 failed, exit 1; 202-only completion returned `true`, duplicate DB rows returned `pass` |
| `packages/zod-schemas/src/agronautas.test.ts` | `pnpm --dir packages/zod-schemas exec node --import tsx --test --test-timeout=30000 src/agronautas.test.ts` | RED — 33 passed, 1 failed, exit 1; acknowledgement-only ingest parsed successfully instead of being rejected |
| `apps/workflow-runtime-python/tests/test_queue_consumer.py` | `python -m pytest apps/workflow-runtime-python/tests/test_queue_consumer.py -q` | RED — 29 passed, 2 failed, exit 1; success was accepted without Postgres completion and timeout result lacked `failureKind=timeout` |
| `apps/workflow-runtime-python/tests/test_runtime_boundary.py` | `python -m pytest apps/workflow-runtime-python/tests/test_runtime_boundary.py -q` | RED — 4 passed, 1 failed, exit 1; `worker.contracts.classify_runtime_boundary` is absent |
| `apps/workflow-runtime-python/tests/test_agronautas_jobs.py` | `python -m pytest apps/workflow-runtime-python/tests/test_agronautas_jobs.py -q` | RED — 22 passed, 2 failed, exit 1; repeated terminal outcome called `complete` twice and `check_database_readiness` is absent |

Pytest availability check: `python -m pytest --version` → `pytest 9.1.1`.

### Work Unit Evidence (Task 2.1 current batch)

| Evidence | Result |
|---|---|
| Focused test command and exact result | Seven explicit Node commands and three literal pytest commands above. Existing safety cases passed; new assertions produced 15 intentional RED failures total (Node: 10; Python: 5), with no timeout or infrastructure abort. |
| Runtime harness command/scenario and exact result | N/A — this is the explicitly requested RED-only contract slice. API, Redis, worker, providers, migrations, and real ingest were not started; deterministic unit doubles were used only inside tests. |
| Rollback boundary | Revert only the new assertions/imports in `apps/api/src/infrastructure/config/provider-matrix.test.ts`, `apps/api/src/infrastructure/config/validator.test.ts`, `apps/api/src/presentation/routes/health.test.ts`, `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts`, `apps/api/src/scripts/verify-hydrology-local-real.test.ts`, `apps/workflow-runtime-python/tests/test_queue_consumer.py`, `apps/workflow-runtime-python/tests/test_runtime_boundary.py`, `apps/workflow-runtime-python/tests/test_agronautas_jobs.py`, and `packages/zod-schemas/src/agronautas.test.ts`; leave all prior work and unrelated dirty files untouched. |

### RED Implementation Boundary

- No GREEN, triangulation-after-implementation, or refactor execution was attempted in that RED-only batch.
- No task 2.1 production implementation was included. Task 2.1 remains intentionally `- [ ]` in `tasks.md`.

## API readiness/config bounded GREEN implementation

- **Status:** Partial API subset implemented; tasks 2.1 and 2.2 remain unchecked because worker, queue, database-proof, verifier, schema, and hydrology work is outside this bounded slice.
- **Scope:** Only `apps/api/src/server.ts`, `apps/api/src/presentation/routes/health.ts`, `apps/api/src/infrastructure/config/provider-matrix.ts`, and `apps/api/src/infrastructure/config/validator.ts` were changed. No env-backed service, worker, BFF, Render, script, schema, sibling worktree, or root `.env` changes.
- **Implemented behavior:** `/ready` keeps liveness separate from readiness, requires Postgres/Redis and configured worker health, checks PostGIS/migrations when explicitly supplied or in production, bounds dependency/worker waits, and rejects stale or malformed heartbeat evidence. Provider evidence now exposes a non-enumerable boundary classification, never promotes an unproven provider to `live`, and strips URL credentials/query material from evidence lineage. Production validation rejects local API origins and disabled proxy trust without echoing values. API dotenv loading is package-local (`apps/api/.env`) rather than cwd/root-relative.

### TDD Cycle Evidence — API subset

| Scope | Test file | RED | GREEN | REFACTOR |
|---|---|---|---|---|
| Readiness/Postgres-Redis-worker/PostGIS-migrations/stale heartbeat | `apps/api/src/presentation/routes/health.test.ts` | ✅ 16 passed, 2 failed; migration/PostGIS and stale heartbeat returned 200 | ✅ 18 passed, 0 failed, exit 0 | ✅ Final implementation remains bounded and preserves liveness/optional Mongo contracts |
| Provider boundary classification and secret-free source lineage | `apps/api/src/infrastructure/config/provider-matrix.test.ts` | ✅ 5 passed, 1 failed; `boundaryStatus` absent | ✅ 6 passed, 0 failed, exit 0 | ✅ `live` override cannot bypass durable proof; URL credentials/query are removed |
| Production local-origin/proxy safety gates | `apps/api/src/infrastructure/config/validator.test.ts` | ✅ 6 passed, 1 failed; unsafe production boundary accepted | ✅ 7 passed, 0 failed, exit 0 | ✅ Safe local defaults remain unchanged; validation errors contain keys/status only |
| Existing runtime defaults safety net | `apps/api/src/infrastructure/config/agronautas-runtime.test.ts` | ✅ 7 passed, 0 failed | ✅ 7 passed, 0 failed, exit 0 | ✅ No runtime-default changes |

### Exact API subset test results

| Test file | Exact command | Exact result |
|---|---|---|
| `health.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/presentation/routes/health.test.ts` | PASS — TAP `1..18`; 18 passed, 0 failed, 0 cancelled, exit 0; duration 6420.1979 ms |
| `provider-matrix.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=20000 src/infrastructure/config/provider-matrix.test.ts` | PASS — TAP `1..6`; 6 passed, 0 failed, 0 cancelled, exit 0; duration 814.642 ms |
| `validator.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=20000 src/infrastructure/config/validator.test.ts` | PASS — TAP `1..7`; 7 passed, 0 failed, 0 cancelled, exit 0; duration 748.366 ms |
| `agronautas-runtime.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=20000 src/infrastructure/config/agronautas-runtime.test.ts` | PASS — TAP `1..7`; 7 passed, 0 failed, 0 cancelled, exit 0; duration 685.958 ms |

### Explicit remaining RED results

- `verify-agronautas-runtime-real.test.ts` — 11 passed, 3 failed, exit 1; `classifyRuntimeCompletion` and `classifyBoundaryEvidence` are not exported from the forbidden verifier source; not changed.
- `verify-hydrology-local-real.test.ts` — 5 passed, 2 failed, exit 1; 202-only completion and duplicate-row proof remain RED; not changed.

### Work Unit Evidence — API readiness/config subset

| Evidence | Result |
|---|---|
| Focused test command and exact result | Four explicit direct Node commands above, serially executed with literal paths and required per-test timeouts; 38 passed, 0 failed in the implemented API subset. |
| Runtime harness command/scenario and exact result | N/A — API/worker/providers were explicitly not started in this unit; real runtime and durable queue/DB proof remain pending tasks 2.1–5.2. |
| Rollback boundary | Revert only `apps/api/src/server.ts`, `apps/api/src/presentation/routes/health.ts`, `apps/api/src/infrastructure/config/provider-matrix.ts`, and `apps/api/src/infrastructure/config/validator.ts`; leave all prior RED tests, prior work, and unrelated dirty files untouched. |

## Remaining Tasks

Tasks 2.1–5.2 remain pending. This bounded API subset is ready for the next worker/queue/database-proof implementation slice; no task checkbox was changed.

## Worker Contract Slice — bounded task 2.1/2.2 executor work

- **Status:** Task 2.2 GREEN completed; task 2.1 remains unchecked as the separate RED boundary, and task 2.3 remains pending.
- **Scope:** The preceding worker contract subset changed `apps/workflow-runtime-python/src/worker/core/config.py`, `apps/workflow-runtime-python/src/worker/contracts.py`, and permitted additions to `apps/workflow-runtime-python/tests/test_runtime_boundary.py`. This corrected task 2.2 changed only `apps/workflow-runtime-python/src/worker/queue/consumer.py` and `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`; no API, env-backed service, schema, BFF, Render, sibling worktree, or root `.env` changes.
- **Implemented behavior:** Worker configuration now uses the package-local `.env` path rather than cwd/root-relative loading, exposes fail-closed Postgres/Redis requirements, bounded heartbeat freshness, job timeout, retry backoff, and maximum-attempt defaults, and preserves existing schema/asset configuration. Runtime boundary receipts now normalize `live`/`degraded`/`failed`/`blocked`/`not_run`, derive a conservative aggregate status, allow only safe attribution metadata, and reject credential-bearing, database-connection, raw diagnostic, or stack-trace material.

### TDD Cycle Evidence — worker contract subset

| Scope | Test file | RED | GREEN | REFACTOR |
|---|---|---|---|---|
| Runtime boundary receipt classification | `apps/workflow-runtime-python/tests/test_runtime_boundary.py` | ✅ Missing `classify_runtime_boundary` failed 1 case in the pre-implementation suite | ✅ Boundary receipt case passed; final focused run included it in 60 passing tests | ✅ Unknown fields are ignored, sensitive keys/text fail closed, and aggregate status defaults to `blocked` |
| Worker readiness/retry/timeout configuration | `apps/workflow-runtime-python/tests/test_runtime_boundary.py` | ✅ Missing settings failed 1 case before implementation | ✅ Defaults passed; final focused run included it in 60 passing tests | ✅ Defaults are bounded with Pydantic constraints and explicit environment aliases |
| Secret-free evidence rejection | `apps/workflow-runtime-python/tests/test_runtime_boundary.py` | ✅ Three parametrized cases failed before implementation because the classifier was absent | ✅ All three cases passed after implementation | ✅ Credentials, DSNs, credentialed URLs, secret query parameters, raw sensitive fields, and stack traces are rejected without serialization |

### Work Unit Evidence — worker contract subset

| Evidence | Result |
|---|---|
| Focused test command and exact result | `python -m pytest apps/workflow-runtime-python/tests/test_queue_consumer.py apps/workflow-runtime-python/tests/test_runtime_boundary.py apps/workflow-runtime-python/tests/test_agronautas_jobs.py -q` — first run: **60 passed, 4 failed, exit 1, 16.81s**; after the allowed source fixes, one rerun: **64 passed, 0 failed, exit 0, 13.50s**. |
| Runtime harness command/scenario and exact result | **N/A — no live Redis/Postgres/worker harness was authorized for this worker-only slice; the direct worker contract tests used bounded test doubles and no fake live success was recorded.** |
| Rollback boundary | Revert only `apps/workflow-runtime-python/src/worker/queue/consumer.py` and `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` to remove the durable ACK guard, timeout classification, terminal outcome cache, and database readiness probes; preserve the existing worker RED tests, prior config/contracts work, task 2.1 evidence, and all unrelated dirty files. |

### Worker implementation notes

- `RuntimeSettings` defaults are fail-closed for required Postgres/Redis and bounded for heartbeat age/interval, job timeout, retry backoff, and attempts; explicit aliases support both worker-prefixed and deployment names.
- `classify_runtime_boundary` returns only stable statuses and safe identifiers/metadata. Sensitive keys and values fail closed with a redaction error; they are never copied into receipts.
- The worker contract sub-boundary of task 2.2 is implemented; the overall task 2.2 is `- [ ]` in `tasks.md` pending env-backed service proof. Task 2.1 remains `- [ ]` and task 2.3 remains pending.

## Task 2.2 GREEN — corrected worker sub-boundary (historical)

- **Status:** Worker sub-boundary complete — all four observed RED contracts pass in the exact allowed worker test command. Overall task 2.2 remains open until the live env-backed service topology and durable path are proven.
- **Implementation:** `consumer.py` now rejects Agronautas terminal outcome persistence without the required Postgres store before any ACK-visible result write. `agronautas_jobs.py` classifies timeout failures as `failureKind: timeout`, caches terminal outcomes by job/run for idempotent duplicate handling, and exposes independent fail-closed PostgreSQL, PostGIS, and Prisma migration readiness probes.
- **Contract preservation:** Existing queue routing, retry/exhaustion behavior, redaction, direct Postgres store usage, and explicit unavailable scheduled-window results remain unchanged. No fake live success or unrelated backend/runtime/API redesign was added.

### Exact GREEN Evidence

| Test file / contract | First exact run | Final exact rerun |
|---|---|---|
| `test_queue_consumer.py` durable completion guard | RED — `test_consumer_rejects_success_when_postgres_completion_is_not_available` failed to raise | PASS — included in 64 passed, 0 failed |
| `test_queue_consumer.py` timeout `failureKind` | RED — `KeyError: failureKind` | PASS — `failureKind == "timeout"` |
| `test_agronautas_jobs.py` terminal idempotency | RED — `complete` called twice instead of once | PASS — duplicate terminal call is idempotent |
| `test_agronautas_jobs.py` database readiness | RED — `check_database_readiness` missing | PASS — PostgreSQL, PostGIS, and migrations each report `ready` from separate probes |

### Work Unit Evidence (Task 2.2)

| Evidence | Result |
|---|---|
| Focused test command and exact result | `python -m pytest apps/workflow-runtime-python/tests/test_queue_consumer.py apps/workflow-runtime-python/tests/test_runtime_boundary.py apps/workflow-runtime-python/tests/test_agronautas_jobs.py -q` — final rerun **64 passed, 0 failed, exit 0, 13.50s**. |
| Runtime harness command/scenario and exact result | **N/A — this task is limited to direct worker contracts and no live Redis/Postgres/worker runtime was authorized; the exact focused tests provide the bounded harness evidence.** |
| Rollback boundary | Revert only `apps/workflow-runtime-python/src/worker/queue/consumer.py` and `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`; this removes only task 2.2 worker behavior and leaves prior tasks, tests, artifacts, and unrelated dirty files intact. |

### TDD Cycle Evidence (Task 2.2)

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.2 durable completion guard | `apps/workflow-runtime-python/tests/test_queue_consumer.py` | Integration/contract | ✅ 60 passed, 4 failed baseline | ✅ Existing RED assertion failed before source edit | ✅ Final exact rerun passed | ✅ Both queue-loop missing-DSN and direct persistence paths are covered | ✅ Guard is centralized in `persist_outcome_before_ack` and preserves generic jobs |
| 2.2 timeout classification | `apps/workflow-runtime-python/tests/test_queue_consumer.py` | Unit/contract | ✅ 60 passed, 4 failed baseline | ✅ Existing RED assertion raised `KeyError` | ✅ Final exact rerun passed | ✅ Retryable timeout path retains existing error and adds stable kind | ✅ Minimal typed field; no retry policy change |
| 2.2 terminal idempotency | `apps/workflow-runtime-python/tests/test_agronautas_jobs.py` | Integration/contract | ✅ 60 passed, 4 failed baseline | ✅ Existing RED assertion observed two store calls | ✅ Final exact rerun passed | ✅ Same job/run terminal replay is covered without changing non-terminal retries | ✅ Cached result is recorded only after successful durable transition |
| 2.2 database readiness | `apps/workflow-runtime-python/tests/test_agronautas_jobs.py` | Integration/contract | ✅ 60 passed, 4 failed baseline | ✅ Existing RED assertion found missing method | ✅ Final exact rerun passed | ✅ Separate probes preserve independent Postgres/PostGIS/migration outcomes | ✅ Probe failures fail closed to `blocked` without changing the connection/transition adapter |

## Task 2.2 Local Topology/Durable-Proof Integration (Current Batch)

- **Status:** Blocked — the static command contract is implemented and passes, but required env-backed services are unavailable in this environment. Task 2.2 is intentionally unchecked; no live service, worker heartbeat, queue transition, or durable terminal completion claim is made.
- **Implementation boundary:** The prior static topology artifact declared PostGIS-aware PostgreSQL, Redis, API, and worker health expectations. This documentation update makes env-backed API, Postgres/PostGIS, Redis, and worker endpoints/processes authoritative instead; no topology artifact was changed or executed. The existing API startup still requires additive/idempotent `prisma migrate deploy`; no migration file was changed.
- **Receipt safety:** The authoritative runtime verifier run was launched from the approved temporary directory with queue proof, hydrology writes, and chat proof explicitly disabled. Its generated receipt contains only safe status/ID/boolean metadata; no token, DSN, credential-bearing URL, raw payload, or stack trace was copied into this artifact.

### TDD Cycle Evidence — Current Batch

| Scope | Test file | RED | GREEN | REFACTOR |
|---|---|---|---|---|
| Env-backed required-service contract | `apps/api/src/scripts/verify-local-command-contract.test.ts` | ✅ New assertion failed 1/4 because required PostGIS/API/worker service declarations were absent | ✅ Final exact rerun passed 4/4 | ✅ Service-scoped assertions avoid cross-service matching; no production package behavior changed |
| Worker durable contract regression safety net | `apps/workflow-runtime-python/tests/test_queue_consumer.py`, `test_runtime_boundary.py`, `test_agronautas_jobs.py` | ✅ Prior RED evidence preserved in historical section | ✅ Exact combined rerun passed 64/64 | ✅ Existing worker-only implementation remains unchanged in this batch |

### Exact Local Evidence

| Evidence | Exact command/result |
|---|---|
| Initial API config safety net | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/infrastructure/config/agronautas-runtime.test.ts` — **7 passed, 0 failed, exit 0**; `provider-matrix.test.ts` — **6 passed, 0 failed, exit 0**; `validator.test.ts` — **7 passed, 0 failed, exit 0**. |
| Initial health safety net | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/presentation/routes/health.test.ts` — **blocked, 0 passed, 1 cancelled, exit 1, test timed out at 30,000 ms**. Rerun with `--test-timeout=60000` — **18 passed, 0 failed, exit 0, 3,869.601 ms**. |
| Initial worker safety net | Serial literal commands: `test_queue_consumer.py` — **31 passed, 0 failed, exit 0**; `test_runtime_boundary.py` — **9 passed, 0 failed, exit 0**; `test_agronautas_jobs.py` — **24 passed, 0 failed, exit 0**. |
| Focused service contract RED | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-local-command-contract.test.ts` — **3 passed, 1 failed, exit 1** before the service-contract edit. |
| Focused service contract GREEN | Same literal command after the service-contract edit — **4 passed, 0 failed, exit 0**, duration **1,463.165 ms**. |
| Worker regression rerun | `python -m pytest apps/workflow-runtime-python/tests/test_queue_consumer.py apps/workflow-runtime-python/tests/test_runtime_boundary.py apps/workflow-runtime-python/tests/test_agronautas_jobs.py -q` — **64 passed, 0 failed, exit 0, 9.12s**. |
| Existing verifier contract status | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-agronautas-runtime-real.test.ts` — **11 passed, 3 failed, exit 1**; remaining failures are the task 2.1 RED exports `classifyRuntimeCompletion` and `classifyBoundaryEvidence`. `verify-hydrology-local-real.test.ts` — **5 passed, 2 failed, exit 1**; remaining 202-only and duplicate-row proof cases are task 2.1/2.3 boundaries. |
| Env-backed service availability | **blocked**: Required API, Postgres/PostGIS, Redis, and worker service processes/endpoints were unavailable. |
| Infrastructure startup | **not_run**: No infrastructure launcher was attempted; no service/process success was inferred or substituted. |
| Migration status | With an explicit safe local `DATABASE_URL` process value, `pnpm --dir apps/api exec prisma migrate status` — **blocked**, Prisma `P1001` cannot reach `127.0.0.1:5432`; command then reports pnpm recursive exec failure because the Prisma executable was unavailable through that invocation. No migration was applied. |
| Read-only real runtime verifier | From `C:\Users\mmmau\AppData\Local\Temp\opencode`, with `AGRONAUTAS_RUNTIME_QUEUE_PROOF=false`, `AGRONAUTAS_RUNTIME_HYDROLOGY_WRITE=false`, and `AGRONAUTAS_RUNTIME_CHAT_PROOF=false`, invoked the existing verifier via the absolute API `tsx` path — **exit 0**, manifest `runtime-20260830T222641Z`, status **blocked**, `productionProven=false`. API/web/worker/hydrology/render blocked; queue not_run; worker_tests unavailable because the verifier's relative worker path is outside the repository from the safe CWD; provider metadata was observed without queue or hydrology writes. Receipt path: `C:\Users\mmmau\AppData\Local\Temp\opencode\artifacts\agronautas-runtime\runtime-20260830T222641Z\runtime-evidence.json`. |
| Hydrology real verifier | **Not run** — `verify-hydrology-local-real.ts` always performs owner-token POST writes and no explicit write opt-in was authorized; its read-only contract tests were run and remain 5/7 due preserved RED boundaries. |

### Work Unit Evidence

| Evidence | Required result |
|---|---|
| Focused test command and exact result | Service contract GREEN: **4 passed, 0 failed, exit 0**. Worker regression: **64 passed, 0 failed, exit 0**. Existing verifier contract RED cells remain explicit above and were not silently promoted. |
| Runtime harness command/scenario and exact result | **BLOCKED** — required env-backed API, Postgres/PostGIS, Redis, and worker processes/endpoints were unavailable. Therefore no live readiness, API→Redis→worker transition, or durable Postgres completion evidence exists. The read-only runtime verifier produced a truthful blocked manifest only. |
| Rollback boundary | Revert only the current documentation evidence section and the added command-contract assertion if that prior code slice is separately rolled back; preserve prior worker contract implementation, prior RED tests, all unrelated dirty files, data, and root/sibling environment files. |

### Current Status and Blockers

- Task 2.2 remains `- [ ]` in `tasks.md`; the worker contract sub-boundary is green but the full task is not complete without live env-backed service proof.
- Task 2.1 remains pending with its RED evidence; task 2.3 remains pending. Tasks 3.1–5.2 remain pending.
- Production remains blocked by absent live deployment/revision access, explicit auth/tenant/lead identities, provider approvals, selected Cron model, and a valid production read-only correlation receipt. Local evidence is not production evidence.
- Safety note: the earlier in-repository verifier invocation is not authoritative because its existing `loadLocalEnv()` resolves a repository-relative `.env` from the repository CWD; no value was printed or copied, and the safe-CWD rerun above is the accepted verifier evidence. The existing loader remains outside this slice's allowlist.
- No root `.env`, sibling worktree, Render/BFF/docs/package scripts, migration files, or Spanish UI copy was modified.

## Task 2.3 — bounded verifier correlation refactor (current batch)

- **Status:** Implementation and focused RED/GREEN tests are complete, but task 2.3 remains intentionally unchecked because the local real hydrology/runtime completion row correlation could not be proven end-to-end without an authorized ingest token and queue/worker proof. No live success was inferred from configuration, mocked rows, or a `202` acknowledgement.
- **Scope:** Only `apps/api/src/scripts/verify-agronautas-runtime-real.ts` and `apps/api/src/scripts/verify-hydrology-local-real.ts` were modified. The named verifier tests were not edited. No root `.env`, sibling worktree, unrelated API/BFF/worker/queue code, or Spanish UI copy was read, copied, or changed.
- **Implemented behavior:** Runtime manifests now carry bounded `requestId`, `revisionId`, `proofRunId`, `runId`, and `jobId` fields; runtime completion requires a successful acknowledgement, terminal worker success, and a safe durable-row identifier; boundary evidence keeps provider/auth/tenant/lead/ingest states separate with conservative overall classification. Hydrology requests propagate a bounded request ID, retain proof/run and revision identifiers, require durable completion evidence when the acknowledgement is `202`, and reject duplicate read-only rows for one proof run/source. Direct verifier execution no longer loads a repository/root `.env`; credentials remain process-injected only.

### TDD Cycle Evidence — Task 2.3

| Scope | Test file | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| Runtime completion and boundary classification | `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts` | ✅ Initial exact run: 11 passed, 3 failed, exit 1; required exports were absent | ✅ One permitted rerun: 14 passed, 0 failed, exit 0, 3,054.3177 ms | ✅ `202` without terminal worker/durable row stays blocked; terminal completion preserves all five safe IDs; boundary blockers remain separate and secret-free | ✅ Added bounded identifier normalization and credential-safe URL handling; no unrelated production path changed |
| Hydrology completion and database correlation | `apps/api/src/scripts/verify-hydrology-local-real.test.ts` | ✅ Initial exact run: 5 passed, 2 failed, exit 1; `202`-only completion and duplicate rows were accepted | ✅ One permitted rerun: 7 passed, 0 failed, exit 0, 2,294.1744 ms | ✅ Terminal observation still requires matching proof/source; successful rows require exact one-row proof correlation and matching record count | ✅ Propagated bounded request/revision/run fields and kept production evidence `not_run` until separately authorized |

### Exact Focused Evidence — Task 2.3

| Test file | Exact command | Exact result |
|---|---|---|
| `verify-agronautas-runtime-real.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-agronautas-runtime-real.test.ts` | Initial RED: **11 passed, 3 failed, exit 1**. One permitted rerun after implementation: **14 passed, 0 failed, 0 cancelled, exit 0**, duration **3,054.3177 ms**. |
| `verify-hydrology-local-real.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-hydrology-local-real.test.ts` | Initial RED: **5 passed, 2 failed, exit 1**. One permitted rerun after implementation: **7 passed, 0 failed, 0 cancelled, exit 0**, duration **2,294.1744 ms**. |

### Real Verifier / Runtime Evidence — Task 2.3

| Evidence | Exact result |
|---|---|
| Runtime verifier command/scenario | With all credential-bearing process variables explicitly unset, queue/chat/hydrology writes disabled, and artifacts directed to `C:\Users\mmmau\AppData\Local\Temp\opencode\agronautas-task-2-3-runtime`, `pnpm --dir apps/api exec node --import tsx src/scripts/verify-agronautas-runtime-real.ts` exited **0** and wrote manifest `runtime-20260830T224516Z`. Manifest IDs: `runId=runtime-20260830T224516Z`, `requestId=runtime-20260830T224516Z:request`, `proofRunId=runtime-20260830T224516Z:proof`, `revisionId=null`, `jobId=null`; `productionProven=false`. API/web/worker/hydrology were **blocked**; queue and Render were **not_run**; real read-only Postgres and Redis observations were available, but no queue terminal job correlation was claimed. |
| Hydrology real verifier | **Not run**: the actual verifier performs owner-authorized POST writes for each source and no ingest credential/write authorization was available. The direct contract tests prove read-only correlation logic only; they are not live database evidence. |
| Production evidence | **Not run/blocked**: no deployment revision, production read-only row correlation, tenant/lead identity, provider approval, or selected Cron execution was claimed. |

### Work Unit Evidence — Task 2.3

| Evidence | Required value |
|---|---|
| Focused test command and exact result | Both literal direct commands above: final allowed reruns **14/14** and **7/7** passed, exit 0, serially, within the 120-second external timeout. |
| Runtime harness command/scenario and exact result | Real runtime verifier executed against the configured local endpoints and read-only Postgres/Redis boundaries with writes disabled; exit 0 produced a truthful `blocked` manifest with `productionProven=false`. Hydrology real runtime is explicitly **not_run** because its write authorization was unavailable; no fake live result substituted. |
| Rollback boundary | Revert only `apps/api/src/scripts/verify-agronautas-runtime-real.ts` and `apps/api/src/scripts/verify-hydrology-local-real.ts` for this batch, plus this Task 2.3 evidence section. Preserve all previous task work, tests, artifacts, unrelated dirty files, volumes, and environment files. |

### Task 2.3 Current Blockers

- Task 2.3 remains `- [ ]` in `tasks.md` until a real authorized local hydrology run or queue/worker run produces an exact read-only durable row correlation for the propagated proof/run/job/request identifiers.
- Env-backed worker proof, owner ingest authorization, and any production deployment/identity/credential evidence remain unavailable. Local evidence remains separate from production evidence.
- The verifier sources no longer load `.env` files; runtime secrets must be injected by the invoking process and are never serialized into receipts.

## Tasks 3.1–3.2 — Agronautas BFF timeout and browser boundary (current batch)

- **Status:** BFF implementation and direct tests are green; tasks 3.1 and 3.2 remain intentionally unchecked because the required named no-stub Playwright lane exceeded its 180-second external timeout before producing browser evidence. No browser success was inferred from the timeout.
- **Scope:** Only `apps/web/src/app/api/agronautas/[...path]/route.ts` and its direct test file were changed in this batch. Hydrology BFF behavior was preserved and not modified.
- **Implemented behavior:** The Agronautas BFF now applies the existing bounded timeout policy (`AGRONAUTAS_BFF_TIMEOUT_MS`, default `120000`, cap `150000`), aborts upstream requests, returns sanitized retryable `503` timeout outcomes, keeps `502` for non-timeout fetch failures, forwards only the server-configured bearer token, excludes browser authorization, forwards request/revision IDs, preserves upstream status/body/content-type/retry/request/revision headers, and sets `Cache-Control: no-store`.

### TDD Cycle Evidence — Tasks 3.1–3.2

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `apps/web/src/app/api/agronautas/[...path]/route.test.ts` | Unit/integration boundary | ✅ Agronautas wrapper 3/3; Hydrology wrapper 12/12 before edits | ✅ Added timeout, server-token, request/revision, and timeout-error assertions; 2 new behavior cases failed before implementation (revision header absent, timeout promise unresolved); the provisional helper export test was removed during refactor | ✅ Agronautas wrapper 5/5 after implementation | ✅ Configured timeout abort; server-vs-browser auth plus request/revision forwarding; upstream status/body/retry preservation; 502 and 503 failure paths | ✅ Bounded timeout helper and one abort/cleanup path; helper is not exported from the Next route module; no Hydrology behavior change |
| 3.2 | `apps/web/src/app/api/agronautas/[...path]/route.ts` | Server-only BFF | ✅ Existing route behavior captured by 3/3 direct tests | ✅ Same RED boundary above | ✅ Direct BFF wrapper 5/5; Hydrology preservation wrapper 12/12 | ✅ Timeout, fetch failure, response metadata, and secret boundary cases exercise distinct branches | ✅ No client bundle or UI changes; implementation remains in the server route |

### Exact Focused Evidence — Tasks 3.1–3.2

| Test file | Exact command | Exact result |
|---|---|---|
| Agronautas BFF flat wrapper | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=30000 src/app/api/agronautas/route.test.ts` | Safety net: **3 passed, 0 failed, exit 0**. Initial RED before refactor: **3 passed, 2 failed, 1 cancelled, exit 1**. Post-test-refactor check: **5 passed, 0 failed, exit 0**. Final GREEN after removing the invalid extra Next route export: **5 passed, 0 failed, 0 cancelled, exit 0**, duration **1,002.6746 ms**. |
| Hydrology BFF flat wrapper | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=30000 src/app/api/hydrology/route.test.ts` | Final preservation run: **12 passed, 0 failed, 0 cancelled, exit 0**, duration **944.8281 ms**. |

### Browser Evidence — Tasks 3.1–3.2

| Evidence | Exact result |
|---|---|
| Named no-stub Playwright lane | `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-reality-runtime.spec.ts --workers=1` with a **180-second external timeout** — **BLOCKED/NOT_RUN**: command exceeded the external timeout after only the managed API harness deprecation warnings; no test result, screenshot, snapshot, network, or console evidence was produced. No `page.route` or route stub was used. |
| Browser conclusion | The lane did not produce a passing browser result, so tasks 3.1–3.2 remain `- [ ]` and the previous green local Playwright evidence is not reused as evidence for this changed BFF boundary. |

### Work Unit Evidence — Tasks 3.1–3.2

| Evidence | Required value |
|---|---|
| Focused test command and exact result | Agronautas flat wrapper **5/5 passed**, Hydrology flat wrapper **12/12 passed**, both direct serial commands under the requested 120-second external limit. |
| Runtime harness command/scenario and exact result | **BLOCKED/NOT_RUN** — named no-stub Playwright lane exceeded the requested 180-second external limit before producing a browser result; no fake or stubbed success was substituted. |
| Rollback boundary | Revert only the timeout/ID/header/error changes in `apps/web/src/app/api/agronautas/[...path]/route.ts` and their corresponding assertions in `apps/web/src/app/api/agronautas/[...path]/route.test.ts`; preserve the prior Agronautas BFF tests, Hydrology BFF files, all previous task work, and unrelated dirty files. |

### Current Status and Blockers

- Tasks 3.1 and 3.2 remain `- [ ]` in `tasks.md` because browser evidence is required by the task contract and the named lane timed out externally.
- Hydrology protected ingest token boundaries and behavior remain green in the direct flat-wrapper test.
- Local browser proof is blocked by the managed harness timeout; production remains separately blocked by the previously recorded service, deployment, provider, authorization, identity, Cron, and durable-correlation prerequisites.
- No root `.env` or sibling worktree environment was accessed; no API/auth/provider/worker/service/Render, marketplace, field-management, or Spanish UI files were modified, and no secret value was copied or printed.

## Task 4.1 — receipt-security RED boundary (current batch)

- **Status:** RED authored and verified; task 4.1 remains intentionally unchecked. No GREEN source fix was authorized or attempted because this batch is limited to the receipt-security RED boundary and the minimal receipt schema/source is not in the task allowlist.
- **Scope:** Only the three allowlisted direct test files were changed: `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts`, `apps/api/src/scripts/verify-hydrology-local-real.test.ts`, and `packages/zod-schemas/src/agronautas.test.ts`. No verifier/schema production source, API/BFF, UI, service process, Render, Cron, worker, database, sibling worktree, or environment file was changed.
- **Coverage added:** Runtime manifests are required to reject incomplete request/revision/run/job/proof correlation and must not serialize bearer tokens, credential-bearing URLs, database connection strings, raw payload/chat, or stack traces. Hydrology durable-row evidence must reject unsafe identifiers. The operator receipt schema must reject unsafe values, missing request/revision/run/job/proof identifiers, mixed local/production scopes, and a `202` acknowledgement without terminal completion evidence.

### TDD Cycle Evidence — Task 4.1

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.1 | `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts` | Unit/contract | ✅ 14 passed, 0 failed before edits | ✅ Missing correlation and sensitive runtime receipt cases fail against current builder | ⏸ Not run — explicit RED-only slice; no source fix authorized | ✅ Missing ID boundary plus six independent sensitive-material values are evaluated | ✅ Test-only aggregation evaluates every sensitive case instead of stopping at the first failure |
| 4.1 | `apps/api/src/scripts/verify-hydrology-local-real.test.ts` | Unit/contract | ✅ 7 passed, 0 failed before edits | ✅ Unsafe durable-row identifier receipt case fails against current evidence builder | ⏸ Not run — explicit RED-only slice; no source fix authorized | ✅ Token, credentialed URL, DB string, raw payload/chat, and stack-trace IDs are all evaluated | ✅ Table-driven filtering preserves every failure witness in one deterministic assertion |
| 4.1 | `packages/zod-schemas/src/agronautas.test.ts` | Unit/contract | ⚠️ 33 passed, 1 pre-existing task 2.1 RED failure before edits | ✅ Secret/diagnostic, missing run/job, mixed-scope, and `202`-without-completion receipt cases fail as planned | ⏸ Not run — explicit RED-only slice; the pre-existing acknowledgement RED also remains | ✅ Six sensitive values, five missing-ID cases, mixed scope, and `202` without completion are covered | ✅ Shared receipt fixture keeps valid receipt shape and strict rejection cases centralized |

### Exact Focused Evidence — Task 4.1

| Test file | Exact command | Exact result |
|---|---|---|
| `verify-agronautas-runtime-real.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-agronautas-runtime-real.test.ts` | RED — TAP `1..16`; **14 passed, 2 failed, 0 cancelled, exit 1**. Failures: a manifest with missing request/revision/run/job/proof IDs was marked `complete`; sensitive runtime evidence was serialized unchanged. |
| `verify-hydrology-local-real.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-hydrology-local-real.test.ts` | RED — TAP `1..8`; **7 passed, 1 failed, 0 cancelled, exit 1**. Failure: unsafe durable-row identifiers were accepted and serialized by `evaluateDatabaseProof`. |
| `packages/zod-schemas/src/agronautas.test.ts` | `pnpm --dir packages/zod-schemas exec node --import tsx --test --test-timeout=30000 src/agronautas.test.ts` | RED — TAP `1..38`; **33 passed, 5 failed, 0 cancelled, exit 1**. Four new failures: sensitive receipt material, missing run/job IDs, mixed local/production scope, and `202` without terminal completion; one pre-existing failure remains: acknowledgement-only ingest schema accepted terminal completion. |

All three literal direct Node commands were executed serially with the requested **120-second external timeout** and **30,000 ms Node test timeout**. No GREEN rerun or production source edit was performed; the expected RED failures are preserved rather than faked or silently promoted.

### Work Unit Evidence — Task 4.1

| Evidence | Required value |
|---|---|
| Focused test command and exact result | The three direct Node commands above: runtime **14/16 passed, 2 intentional RED failures**; hydrology **7/8 passed, 1 intentional RED failure**; schema **33/38 passed, 5 RED failures including one pre-existing task 2.1 failure**. Each exited 1 within the 120-second external limit. |
| Runtime harness command/scenario and exact result | **N/A — explicit RED-only contract slice.** No API, worker, provider, database, Cron, Render, browser, or hydrology write harness was started; no fake runtime success was substituted. |
| Rollback boundary | Revert only the new Task 4.1 assertions and fixture in `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts`, `apps/api/src/scripts/verify-hydrology-local-real.test.ts`, and `packages/zod-schemas/src/agronautas.test.ts`, plus this Task 4.1 evidence section. Preserve all prior task work, existing RED tests, production sources, unrelated dirty files, volumes, and environment files. |

### Task 4.1 Current Blockers

- Task 4.1 remains `- [ ]` in `tasks.md` because this is the required RED boundary and its current receipt builders/schema do not yet satisfy the new security assertions.
- GREEN requires a separately authorized minimal receipt source/schema change; this batch made no such production edit and did not rerun after a fix.
- The task 2.1 acknowledgement-only ingest RED failure remains pre-existing and is recorded separately in the cumulative evidence above.
- No root `.env`, sibling worktree, secret value, UI/BFF, service process, Render, Cron, or production resource was accessed or modified.

## Task 4.1 — receipt-security GREEN boundary (completed)

- **Status:** GREEN completed for all newly-added Task 4.1 receipt assertions. The separate Task 2.1 acknowledgement-only RED remains unresolved and is preserved below as an unrelated blocker.
- **Scope:** GREEN changed only `apps/api/src/scripts/verify-agronautas-runtime-real.ts`, `apps/api/src/scripts/verify-hydrology-local-real.ts`, and `packages/zod-schemas/src/agronautas.ts`; the three direct RED test files remain unchanged. No API/BFF, UI, service process, Render, Cron, worker, database, sibling worktree, or environment file was changed.
- **Implemented:** Runtime manifests remain incomplete when request/revision/run/job/proof correlation is missing or invalid and recursively redact bearer tokens, credential-bearing URLs, database connection strings, raw payload/chat, and stack traces. Hydrology durable-row evidence rejects unsafe identifiers and never returns them. The operator receipt schema enforces bounded IDs, local run/job correlation, explicit scope consistency for supplied scoped evidence, terminal completion, and durable status-path evidence. `hydrologyGovernmentIngestResponseSchema` was not changed.

### TDD Cycle Evidence — Task 4.1 GREEN

| Scope | Test file | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|
| Runtime manifest correlation and evidence redaction | `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts` | ✅ Initial exact run: 14 passed, 2 failed; missing correlation was marked complete and sensitive evidence was serialized | ✅ One permitted rerun: 16 passed, 0 failed, 0 cancelled, exit 0 | ✅ Missing IDs remain non-complete; terminal completion retains safe IDs; sensitive evidence is redacted recursively | ✅ Existing blocked/incomplete semantics preserved; no runtime API path changed |
| Hydrology durable-row safety and terminal completion | `apps/api/src/scripts/verify-hydrology-local-real.test.ts` | ✅ Initial exact run: 7 passed, 1 failed; unsafe row IDs were returned | ✅ Exact run: 8 passed, 0 failed, 0 cancelled, exit 0 | ✅ `202` requires durable completion; terminal statuses are explicit; unsafe row IDs are rejected and omitted | ✅ Duplicate-row evidence retains only safe row counts; bounded IDs are checked at DB-row and receipt boundaries |
| Operator receipt schema hardening | `packages/zod-schemas/src/agronautas.test.ts` | ✅ Receipt RED assertions failed while the pre-existing Task 2.1 acknowledgement-only assertion also remained RED | ✅ Receipt assertions pass; exact file result is 37 passed, 1 pre-existing failure, exit 1 | ✅ Bounded IDs, terminal status/path, local run/job pairing, and explicit nested scope checks are enforced without substring scope heuristics | ✅ Only `hydrologyOperatorReceiptSchema` changed; the ingest response schema remains untouched |

### Exact Focused Evidence — Task 4.1 GREEN

| Test file | Exact command | Exact result |
|---|---|---|
| `verify-agronautas-runtime-real.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-agronautas-runtime-real.test.ts` | Initial RED: **14 passed, 2 failed, exit 1**. One permitted rerun: **16 passed, 0 failed, 0 cancelled, exit 0**, duration **1,038.732 ms**. |
| `verify-hydrology-local-real.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/scripts/verify-hydrology-local-real.test.ts` | **8 passed, 0 failed, 0 cancelled, exit 0**, duration **728.425 ms**. |
| `packages/zod-schemas/src/agronautas.test.ts` | `pnpm --dir packages/zod-schemas exec node --import tsx --test --test-timeout=30000 src/agronautas.test.ts` | **37 passed, 1 failed, 0 cancelled, exit 1**, duration **926.096 ms**. The sole failure is the preserved unrelated Task 2.1 acknowledgement-only `hydrologyGovernmentIngestResponseSchema` RED; all newly-added Task 4.1 receipt assertions passed. No rerun was used for this unrelated failure. |

All three literal direct Node commands were executed serially with the requested **120-second external timeout** and **30,000 ms test timeout**. The schema command's non-zero result is retained as a separate Task 2.1 blocker and was not masked.

### Work Unit Evidence — Task 4.1 GREEN

| Evidence | Required value |
|---|---|
| Focused test command and exact result | Runtime verifier: **16/16 passed, exit 0** after one permitted rerun. Hydrology verifier: **8/8 passed, exit 0**. Schema suite: **37 passed, 1 pre-existing Task 2.1 failure, exit 1**; all new receipt assertions passed. |
| Runtime harness command/scenario and exact result | **N/A — this is a contract/security boundary unit.** No API, worker, provider, database, Cron, Render, browser, or ingest-write harness was started; the required focused commands exercised the real TypeScript verifier/schema modules and no fake runtime success was substituted. |
| Rollback boundary | Revert only the receipt-security changes in `apps/api/src/scripts/verify-agronautas-runtime-real.ts`, `apps/api/src/scripts/verify-hydrology-local-real.ts`, and `packages/zod-schemas/src/agronautas.ts`, plus this Task 4.1 GREEN section. Preserve the pre-existing Task 2.1 RED tests, prior implementation slices, unrelated dirty files, volumes, and environment files. |

### Task 4.1 GREEN Implementation Notes

- Runtime manifests normalize all five required correlation IDs and remain `incomplete` rather than complete when any ID is missing or unsafe; sensitive evidence and diagnostic text are recursively redacted before serialization.
- Runtime completion remains blocked until the acknowledgement is successful, the worker is terminally `succeeded`, and a safe durable row ID is present. Boundary classifications remain separate for provider, auth, tenant, lead, and ingest.
- Hydrology completion accepts only explicit terminal statuses (`completed`, `partial`, or `failed`); a `202` acknowledgement requires a safe durable row ID. Database proof rejects unsafe correlated row IDs before duplicate/success evidence and never returns an unsafe ID.
- Operator receipts use bounded safe IDs, retain local run/job correlation where local scope applies, validate explicitly supplied nested scopes against the top-level scope, require terminal status plus a status path, and keep the acknowledgement-only ingest schema unchanged.
- No root `.env`, sibling worktree, API route, BFF, UI, service process, Render, docs, tasks, or Spanish UI copy was modified.

### Task 4.1 Current Blockers

- Task 2.1 remains pending: the acknowledgement-only `hydrologyGovernmentIngestResponseSchema` assertion still fails by design and is outside this task's allowed source boundary.
- Task 4.2–4.3, task 5.1–5.2, live env-backed service proof, production credentials/identities/revision, and the selected Cron model remain pending from prior sections.

## Task 4.2 — production configuration and runbook boundary (completed)

- **Status:** GREEN completed for the static production configuration and documentation contract. Task 4.3 remains pending and blocked because the owner has not selected direct `scheduler:once` or authenticated HTTP POST.
- **Scope:** Modified only `render.yaml`, `README.md`, and `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` for the production/configuration/runbook slice, plus this cumulative artifact and the Task 4.2 checkbox in `tasks.md`. No source code, tests, BFF, worker, UI, service process, root `.env`, or sibling worktree was modified.
- **Implemented:** Render API/web health paths, production auth, worker-required readiness, trusted proxy, exact CORS/origin boundary, bounded readiness/BFF/Groq timeouts, real mode, disabled in-process schedulers, named secret references, and worker/DB readiness expectations are explicit. The exact application commands are documented as `cd backend && pnpm run dev` and `cd frontend && pnpm run dev`; required services are supplied by the environment. README and the hydrology runbook keep local and production evidence in separate matrices with `pass`, `blocked`, and `not_run` statuses.
- **Cron gate:** Both direct `scheduler:once` and authenticated HTTP POST contracts document schedule, auth, idempotency, timeout, execution/request/proof IDs, completion, and read-only DB correlation. The retained Render `startCommand` is explicitly labeled a non-authoritative candidate; current production status is `blocked`, and the unselected path is `not_run`.

### TDD Cycle Evidence — Task 4.2

| Task | Test file/command | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.2 | Inline bounded Python contract validator (`python -c`, no test file permitted by scope) | Static configuration/documentation | N/A — no executable source/test file was in the assigned boundary | ✅ Pre-edit validator failed with the expected missing health/auth/readiness/command/Cron markers | ✅ Post-edit validator passed: YAML parsed; required service settings, named secret references, exact local commands, statuses, Cron contracts, and task checkbox state were verified; exit 0 | ✅ Separate assertions cover Render API/web/worker/Cron boundaries, local/production documentation, redaction markers, and 4.2/4.3 task state; triangulation is structural and has no runtime branching | ➖ No formatting refactor: bounded Prettier check reported existing style differences in the three files; `--write` was intentionally not run because formatting/rewriting unrelated content was prohibited |

### Exact Focused Evidence — Task 4.2

| Evidence | Exact command/result |
|---|---|
| RED validator | `python -c "from pathlib import Path; import yaml; ..."` — exit 1, `AssertionError: RED expected` with missing `healthCheckPath`, production auth/readiness settings, exact local commands, `Current status: blocked`, and both Cron model markers before edits. No files were written. |
| GREEN validator | `python -c "from pathlib import Path; import yaml; ..."` — **PASS**; `render.yaml` parsed and the production/documentation contract plus task state passed, exit 0. |
| Non-mutating formatting check | `pnpm exec prettier --check render.yaml README.md docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` — **non-zero warning result**: Prettier reported style issues in all three files and recommended `--write`; no write was performed by policy. |

### Work Unit Evidence — Task 4.2

| Evidence | Required result |
|---|---|
| Focused test command and exact result | The post-edit bounded Python validator above passed with exit 0. It validated YAML syntax, explicit Render auth/readiness/proxy/origin/timeout/scheduler settings, health paths, secret reference shape, exact local commands, separate statuses, both Cron contracts, and `tasks.md` state. |
| Runtime harness command/scenario and exact result | **N/A — static configuration/documentation boundary only.** Package-wide tests, Playwright, provider calls, Render, Cron, production commands, and application processes were explicitly prohibited; no runtime success was claimed. |
| Rollback boundary | Revert only the Task 4.2 additions/changes in `render.yaml`, the production-simple section in `README.md`, the added decision/configuration/matrix sections in `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md`, the `4.2` checkbox in `tasks.md`, and this Task 4.2 evidence section. Preserve every prior task, source/test change, unrelated dirty file, root `.env`, sibling worktree, and existing runbook content. |

### Task 4.2 Current Blockers

- Task 4.3 remains `- [ ]` in `tasks.md` because no owner decision selected direct `scheduler:once` or authenticated HTTP POST. Both contracts are documented, but neither is treated as selected or live-proven.
- Tasks 2.1–2.3, 3.1–3.2, 5.1–5.2 and their previously recorded runtime/production prerequisites remain pending. Local env-backed worker proof, deployment revision, provider approvals, tenant/lead identities, credentials, and read-only production correlation remain separate blockers.
- The Prettier check is intentionally recorded as a non-mutating warning; no formatting command was allowed to rewrite unrelated existing documentation.
- No root `.env`, sibling worktree, source code, tests, BFF, worker, UI, or Spanish UI copy was modified by this slice.

## Task 4.3 — selected direct Render Cron contract (completed static boundary)

- **Status:** Static contract GREEN; live execution remains `not_run` and production remains `blocked`. The owner-selected model is direct `scheduler:once`; authenticated HTTP POST is retained only as a rejected alternative.
- **Scope:** Updated only the existing Render Cron configuration comments, the production README/runbook contract, the task checkbox, and this cumulative evidence artifact. The exact existing `apps/api` scheduler script and `scheduler:once` package alias were verified and not redesigned. No API/BFF/worker/UI/service-process/test/root `.env`/sibling-worktree file was changed.
- **Authoritative command:** `render.yaml` uses exactly `pnpm --dir apps/api scheduler:once -- --render-cron`; `apps/api/package.json` maps `scheduler:once` to `tsx src/scripts/run-hydrology-scheduler-once.ts`, and that entrypoint exists. The prior non-authoritative placeholder wording was removed.
- **Direct contract:** Documentation now fixes the hourly `0 * * * *` schedule, fixed `HYDROLOGY_CRON_OWNER_ID` plus named runtime-secret permission boundary, no HTTP POST/token/header, `ownerId + scheduledSlot` idempotency with existing `runId`/`proofRunId` propagation, bounded runner/provider timeout semantics, Render `executionId` plus safe request/proof/run/job ID handling, durable terminal completion distinct from HTTP `202`, one read-only DB correlation, failure/rollback behavior, and secret-free `pass`/`blocked`/`not_run` classification.
- **Production truth:** No Render execution, deployment revision, provider authorization, worker/identity access, or read-only production DB correlation was available. No production execution was performed or claimed; the static manifest/config cells are `pass`, unavailable runtime cells are `blocked` or `not_run`.

### TDD Cycle Evidence — Task 4.3

| Task | Test/validator | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| 4.3 | Existing `run-hydrology-scheduler-once.test.ts`, `build-config.test.ts`, and bounded contract validator | Configuration/documentation/command contract | ⚠️ No new test file was authored because the assigned refactor explicitly prohibited test changes; pre-edit inspection identified the non-authoritative Render wording and the existing scheduler/config safety net passed | ✅ Scheduler test 1/1, Render/config test 14/14, and bounded direct-contract validator passed after the change | ✅ Validator cross-checked the exact command, existing package entrypoint, schedule, selected/rejected model markers, IDs, completion/correlation/rollback evidence, task state, and status vocabulary | ✅ Removed only ambiguous model wording and kept the exact existing command/package path unchanged |

### Exact Focused Evidence — Task 4.3

| Evidence | Exact command/result |
|---|---|
| Existing scheduler/config validator | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=30000 src/build-config.test.ts` — **14 passed, 0 failed, 0 cancelled, exit 0**, duration 4,993.8109 ms. |
| Existing scheduler entrypoint test | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=60000 src/scripts/run-hydrology-scheduler-once.test.ts` — **1 passed, 0 failed, 0 cancelled, exit 0**, duration 9,247.273 ms. An earlier combined invocation with a 30,000 ms per-test timeout cancelled this import-heavy file; the bounded 60,000 ms rerun passed without source changes. |
| Bounded config/doc validator | Inline Python validator parsed `render.yaml`, verified exact `scheduler:once` package/entrypoint resolution, selected direct wording, rejected HTTP alternative, required IDs/completion/read-only/rollback/status markers, and `[x] 4.3` — **PASS, exit 0**. No files were written. |
| Formatting/whitespace | Full `git diff --check` — **NON-ZERO** because two unrelated pre-existing dirty files (`apps/web/src/lib/visibility/chat.ts` and `openspec/specs/runtime-evidence-foundation/spec.md`) contain a blank line at EOF; neither was changed. Scoped `git diff --check -- render.yaml README.md docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` — **PASS, exit 0**; no formatter was run. |

### Work Unit Evidence — Task 4.3

| Evidence | Required result |
|---|---|
| Focused test command and exact result | Existing Render/config validator **14/14 passed** and existing scheduler entrypoint contract **1/1 passed**, both exit 0 within bounded timeouts. Inline static contract validator also passed exit 0. |
| Runtime harness command/scenario and exact result | **BLOCKED/NOT_RUN — intentionally not executed.** Render/deployment/provider/identity/worker/read-only production DB access was unavailable; the direct scheduler command was not launched, no Cron execution ID or production receipt exists, and no production execution is claimed. |
| Rollback boundary | Revert only the Task 4.3 changes in `render.yaml`, the production-simple sections of `README.md` and `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md`, the `4.3` checkbox in `tasks.md`, and this Task 4.3 evidence section. Preserve all prior task work, existing scheduler/package source, unrelated dirty files, root `.env`, sibling worktree, and Spanish UI copy. |

### Task 4.3 Current Blockers

- Live direct Cron proof remains pending: Render execution record, deployment revision, provider authorization, worker/identity boundary, terminal durable completion, and read-only `hydrology_ingestion_runs` correlation are unavailable.
- The rejected authenticated HTTP POST path is `not_run` and cannot substitute for direct-run evidence. The selected direct path has no HTTP `202` acknowledgement; process exit alone is insufficient.
- Tasks 2.1–2.3, 3.1–3.2, and 5.1–5.2 remain pending. No production readiness claim is made by this task.

## Verification Batch — direct executor (2026-08-31)

- **Status:** **FAIL / blocked**. Verification was executed only in `C:\Users\mmmau\Agronautas\monorepo-js-baseline` on `main`. No source/config file, root `.env`, sibling worktree, production endpoint, or credential was modified or used.
- **Task state:** 6/13 tracked work units complete; 7 remain incomplete. Task 2.1 RED is still reproduced by the schema suite. Task 5.1 remains pending and was not checked.
- **Strict-TDD gate:** Full verification was not entered because tasks remain incomplete. Focused verification was run and all unavailable capabilities remain explicitly `blocked` or `not_run`.

### Focused Local Commands

| Area | Exact command | Result |
|---|---|---|
| API health | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=120000 src/presentation/routes/health.test.ts` | **pass** — 18/18, exit 0 |
| API Agronautas | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=120000 src/presentation/routes/agronautas.test.ts` | **pass** — 46/46, exit 0 |
| API hydrology | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=120000 src/presentation/routes/hydrology-government.test.ts` | **pass** — 58/58, exit 0 |
| Runtime verifier contracts | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=120000 src/scripts/verify-agronautas-runtime-real.test.ts` | **pass** — 16/16, exit 0; output hash `sha256:36414b116eb764526f336cae19b7ba4892132417a6d7228639a5b88527061221` |
| Hydrology verifier contracts | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=120000 src/scripts/verify-hydrology-local-real.test.ts` | **pass** — 8/8, exit 0 |
| Command contract | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=120000 src/scripts/verify-local-command-contract.test.ts` | **pass** — 4/4, exit 0 |
| Zod/schema contracts | `pnpm --dir packages/zod-schemas exec node --import tsx --test --test-timeout=60000 src/agronautas.test.ts` | **fail** — 37 passed, 1 failed, exit 1; acknowledgement-only hydrology completion remains accepted. Output hash `sha256:7abc6d49e681c46363d51d7c5e9c7cbd17aff1471d8c37202b2acef45969eb48` |
| BFF contracts | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=60000 "src/app/api/agronautas/[...path]/route.test.ts" "src/app/api/hydrology/[...path]/route.test.ts" src/app/api/agronautas/route.test.ts src/app/api/hydrology/route.test.ts` | **pass** — 17/17, exit 0 |
| Worker contracts | `python -m pytest apps/workflow-runtime-python/tests/test_queue_consumer.py apps/workflow-runtime-python/tests/test_runtime_boundary.py apps/workflow-runtime-python/tests/test_agronautas_jobs.py -q` | **pass** — 64/64, exit 0, 78.19 s |
| Hydrology engine | `pnpm --dir packages/hydrology-engine test` | **pass** — 74/74, exit 0 |
| Shared contracts | `pnpm --dir packages/contracts test:agronautas-contracts` | **pass** — 6/6, exit 0 |
| Web unit suite | `pnpm --dir apps/web test` | **fail** — 149/156 passed; 7 Node worker OOM failures |

### Build and Quality Commands

| Exact command | Result |
|---|---|
| `pnpm build` | **fail** — initial Windows child abort `3221226505`; bounded rerun exit 2 at Zod `TS2322` (`packages/zod-schemas/src/agronautas.ts:1100`). Output hash `sha256:a9a27ad567c16c10dbaf9dddf855b57800e212afa80e559086a7694aa4de96b8`. |
| `pnpm lint` | **fail** — Zod lint worker OOM. |
| `pnpm --dir apps/api lint` | **fail** — 48 errors. |
| `pnpm --dir apps/web lint` | **pass** — exit 0. |
| `pnpm --dir packages/zod-schemas lint` | **fail** — 2 errors, 1 warning. |
| `python -m mypy apps/workflow-runtime-python/src` | **blocked** — exceeded 180 seconds without completion. |
| `python -m ruff check apps/workflow-runtime-python/src apps/workflow-runtime-python/tests` | **fail** — 35 findings. |

### Local/Production Boundary Results

- **Env-backed service/process access:** Required API, Postgres/PostGIS, Redis, and worker processes/endpoints were unavailable. No infrastructure startup was attempted. Local readiness, worker heartbeat, migrations, and durable API→queue→worker→DB proof are therefore **blocked**, not mocked.
- **Runtime verifier:** a no-credential, writes-disabled local invocation exceeded the 120-second bound while services were unavailable. No live result was promoted.
- **Hydrology write:** **not_run**; no approved owner token/write authorization.
- **Playwright:** exact named lane `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-reality-runtime.spec.ts --workers=1` exceeded 200 seconds after harness warnings. No browser evidence was produced; no success inferred.
- **Production:** deployment/revision, Render execution, provider approvals, auth/tenant/lead identities, authorized ingest, worker completion, and read-only DB correlation are all **blocked** or **not_run**. No production endpoint was contacted and no `productionProven` claim exists.

### Verification Artifacts

- `openspec/changes/agronautas-production-simple-local-proof/verify-report.md` — full strict verification report, compliance matrix, exact command results, hashes, and blockers.
- This `apply-progress.md` section — cumulative verification evidence only; no task checkbox was changed.

## Corrected Task 2.1/2.2 Narrow Schema Slice — 2026-08-31

- **Status:** Schema GREEN completed; worker files were verified unchanged and green. Tasks 2.1 and 2.2 remain unchecked because this narrow slice does not prove the required env-backed service topology, queue transition, or durable Postgres completion path.
- **Scope:** Modified only `packages/zod-schemas/src/agronautas.ts`. `apps/workflow-runtime-python/src/worker/queue/consumer.py` and `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` were not rewritten because their existing bounded worker contracts already pass. No tests, API/web/source/config/docs/Render/service files, root `.env`, or sibling worktree were modified.
- **Implementation:** `hydrologyGovernmentIngestResponseSchema` now rejects `status: 'completed'` responses without a durable `runId`, while preserving queued/started acknowledgement responses and the existing valid completed response that carries a run ID. The directly-caused TypeScript error in the receipt scope issue path was fixed by materializing the readonly tuple as a mutable issue path; no unrelated type or lint cleanup was performed.

### TDD Cycle Evidence — Corrected Schema Slice

| Task scope | Test file | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| 2.1 acknowledgement-only hydrology completion guard | `packages/zod-schemas/src/agronautas.test.ts` | ✅ Initial required run: 37 passed, 1 failed | ✅ Existing literal RED assertion failed because acknowledgement-only `completed` parsed successfully | ✅ One permitted rerun: 38 passed, 0 failed, exit 0 | ✅ Existing valid completed response with `runId` remains accepted while the acknowledgement-only response without it is rejected | ✅ Guard is a single schema refinement; no test fixture or unrelated schema was changed |
| 2.2 worker sub-boundary regression | `apps/workflow-runtime-python/tests/test_queue_consumer.py`, `test_runtime_boundary.py`, `test_agronautas_jobs.py` | ✅ Required combined run: 64 passed, 0 failed | ➖ No worker RED was needed in this slice; existing implementation already satisfies the assigned worker assertions | ✅ Required combined run: 64 passed, 0 failed, exit 0 | ✅ Existing tests cover durable guard, timeout classification, terminal idempotency, and database readiness | ➖ Worker production files intentionally unchanged |
| 2.1/2.2 direct type correction | `packages/zod-schemas` build | ✅ Initial required build exposed `TS2322` at `agronautas.ts:1100` | ✅ Failure identified before the correction | ✅ One permitted rerun passed with `tsc` exit 0 | ✅ Schema tests and type-check exercise both the new refinement and receipt refinement path | ✅ Readonly issue-path tuple is copied without widening unrelated types |

### Exact Focused Evidence — Corrected Schema Slice

| Test/build | Exact result |
|---|---|
| `pnpm --dir packages/zod-schemas exec node --import tsx --test --test-timeout=60000 src/agronautas.test.ts` | Initial RED: **37 passed, 1 failed, exit 1**; one permitted rerun after the schema fix: **38 passed, 0 failed, 0 cancelled, exit 0**, duration **8,384.2204 ms**. |
| `python -m pytest apps/workflow-runtime-python/tests/test_queue_consumer.py apps/workflow-runtime-python/tests/test_runtime_boundary.py apps/workflow-runtime-python/tests/test_agronautas_jobs.py -q` | **64 passed, 0 failed, exit 0**, duration **22.85 s**. |
| `pnpm --dir packages/zod-schemas build` | Initial required run: **failed** with `TS2322` at `src/agronautas.ts:1100`. One permitted rerun after the direct type correction: **passed**, `tsc` exit 0. |

### Work Unit Evidence — Corrected Schema Slice

| Evidence | Required result |
|---|---|
| Focused test command and exact result | Schema **38/38** passed after one permitted RED rerun; worker regression **64/64** passed; package build passed after one permitted type-error rerun. All commands were serial and completed within the 120-second external timeout; the schema test used the requested 60-second test timeout. |
| Runtime harness command/scenario and exact result | **N/A — no runtime boundary exists in this schema-only correction and env-backed services were not started.** The full local topology, API→queue→worker transition, and durable Postgres completion remain blocked as already recorded; no live success was substituted. |
| Rollback boundary | Revert only the two bounded edits in `packages/zod-schemas/src/agronautas.ts`: the completed-response `runId` refinement and the mutable copy of the receipt issue path. Worker files and all unrelated dirty files remain untouched. |

### Corrected Slice Current Blockers

- Tasks 2.1 and 2.2 remain `- [ ]` in `tasks.md`; only the requested schema/type sub-boundary is green.
- Env-backed PostGIS/Redis/API/worker readiness and API→queue→worker→Postgres durable completion are still unavailable in this environment, so no full Task 2.1/2.2 completion claim is made.
- Existing broader Task 2.1 verifier/API RED boundaries and the production/browser blockers recorded above remain unchanged.

## Phase 5.3 — targeted API compile-hygiene remediation (current batch)

- **Status:** API build GREEN after the authorized test-only compile-hygiene fixes; web build was started as the second required bounded command and timed out at the external 180-second limit after Next.js compilation, before producing a final exit result. Task 5.1 remains intentionally unchecked.
- **Scope:** Only the five authorized API test files were changed: `apps/api/src/infrastructure/config/env-examples.test.ts`, `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/api/src/presentation/routes/health.test.ts`, `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts`, and `apps/api/src/scripts/verify-local-command-contract.test.ts`. No runtime behavior, schemas, routes, web source, worker, service process, Render, docs, root `.env`, or sibling worktree was changed.
- **Implementation:** Regex capture values are narrowed before insertion without changing assertions; the provider evidence test fixture now supplies the complete `ProviderEvidence` contract with the same mock semantics; index-signature reads use bracket notation; the local command contract test resolves its path from CommonJS `__dirname` instead of `import.meta.url`.

### TDD Cycle Evidence — Phase 5.3

| Task scope | Test/build boundary | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| 5.3 targeted API compile hygiene | `pnpm --dir apps/api build` | Existing prior API focused evidence remained recorded above; no runtime assertions changed | ✅ Initial build failed on the listed strict TypeScript diagnostics; the first remediation build exposed two remaining `scripts?.dev` index-signature accesses | ✅ Final API build exited 0 after the second bounded correction | ➖ Structural type-only fixes; no behavior branch or assertion changed | ✅ Kept changes to narrow captures, complete fixture data, bracket access, and CommonJS path resolution only |
| 5.3 web build handoff | `pnpm --dir apps/web build` | N/A — no web file was in the authorized scope | ✅ API dependency/build boundary was green before handoff | ⏸ External 180-second timeout after Next.js reported `Compiled successfully`; no final web exit result | N/A — command was not a test and no web behavior was changed | N/A — no web edit authorized |

### Exact Evidence — Phase 5.3

| Evidence | Exact command/result |
|---|---|
| API build RED | `pnpm --dir apps/api build` — exit 2; strict TypeScript diagnostics covered regex captures, incomplete `ProviderEvidence`, dot access on index signatures, and CommonJS-incompatible `import.meta.url`. A first post-edit rerun still reported two `scripts?.dev` index-signature diagnostics. |
| API build GREEN | `pnpm --dir apps/api build` — **pass**, exit 0; `tsc` completed with no output/errors after the final bracket-notation correction. |
| Web build | `pnpm --dir apps/web build` — **blocked by external timeout at 180,000 ms** after `Compiled successfully in 33.3s` and while Next.js was linting/type-checking; no final process exit code was produced by the bounded command. |

### Work Unit Evidence — Phase 5.3

| Evidence | Required value |
|---|---|
| Focused test command and exact result | Compile-focused API command: `pnpm --dir apps/api build` — final **exit 0**. The required web build handoff was bounded but **timed out externally at 180 seconds**; no package-wide tests were run. |
| Runtime harness command/scenario and exact result | **N/A — compile-hygiene-only remediation has no runtime boundary; user explicitly prohibited runtime, Playwright, and package-wide test commands.** |
| Rollback boundary | Revert only the compile-hygiene edits in the five authorized API test files listed above; this removes no runtime behavior and preserves all unrelated dirty files and prior task work. |

### Phase 5.3 Current Blockers

- Task 5.1 remains `- [ ]` and was not completed.
- The bounded web build did not finish within 180 seconds; full verification remains pending and no web success is claimed from the partial output.
- Env-backed worker/database durable proof, browser evidence, and production evidence remain the pre-existing blocked/not-run prerequisites recorded above.

## Recovery Verification Pass — 2026-08-31

- **Status:** Recovery verification stopped after the bounded web build timed out. No source/config, root `.env`, sibling worktree, production resource, or task checkbox was modified.
- **Scope:** Only the independent short checks requested for recovery were considered. The full web unit suite and Playwright were not rerun because their prior OOM/timeout evidence remains authoritative.

### Exact recovery evidence

| Check | Exact result |
|---|---|
| Schema suite | `pnpm --dir packages/zod-schemas exec node --import tsx --test --test-timeout=60000 src/agronautas.test.ts` — **38 passed, 0 failed, 0 cancelled, exit 0**, duration `3615.8094 ms`. |
| API build | `pnpm --dir apps/api build` — **exit 0**; `tsc` completed with no diagnostic output. |
| Web build | `pnpm --dir apps/web build` — **blocked by the 120-second external timeout** after `Compiled successfully in 21.2s`, during lint/type-check; no final exit was accepted. |
| Worker focused tests | **Not started** after the web-build timeout. Prior authoritative result remains **64 passed, 0 failed, exit 0**. |
| Env-backed service availability | **Not started** after the web-build timeout. Prior authoritative result remains that required service/process access was unavailable; infrastructure startup was not attempted. |

### Recovery gate

- Task **5.1 remains pending**. Passing the schema and API focused checks does not satisfy the missing env-backed service topology and browser proof.
- Local evidence and production evidence remain separate. No production endpoint, credential, Render execution, or production database was contacted.
- New recovery stdout was not persisted by the command runner; no output hash was invented or substituted in the verification artifact.
- This is a bounded recovery pass, not a repeat of the interrupted monolithic verification batch.

## Phase 5.4–5.6 — web TypeScript test-remediation slice A (2026-08-31)

- **Status:** Slice A implementation complete for its authorized eight web test files; no production behavior changed. The final web type-check removed every mapped diagnostic in this slice, while unrelated diagnostics remain in files outside the slice and are reported below. No task checkbox was changed because tasks 5.4–5.8 cover additional files not authorized in this batch.
- **Delivery:** Single PR with the approved `size:exception`; this is a focused test-only compile-hygiene work unit.
- **Scope:** Only `apps/web/src/app/api/hydrology/[...path]/route.test.ts`, `apps/web/src/components/agronautas/field-detail.test.tsx`, `apps/web/src/components/agronautas/page-client.test.tsx`, `apps/web/src/components/landing/demo-contact-form.test.tsx`, `apps/web/src/components/landing/homepage.test.tsx`, `apps/web/src/components/visibility/primitives.test.tsx`, `apps/web/src/lib/visibility/chat.test.ts`, and `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts` were edited. No production source, route behavior, assertions, stubs, mocks, root `.env`, sibling worktree, or Spanish UI copy was changed.
- **Changes:** JSDOM collection annotations now use `Array<InstanceType<typeof JSDOM>>`; DOM query results are narrowed only where `.value` or `.disabled` is read; index-signature values use bracket notation; the no-stub browser evidence test uses bracket notation for event/env records. Existing test intent and runtime behavior are unchanged.

### TDD Cycle Evidence — web remediation slice A

| Scope | Test/type boundary | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| JSDOM annotations | `field-detail`, `page-client`, `demo-contact-form`, `homepage`, `primitives` tests | Existing direct tests were attempted; the combined run had an import-heavy `field-detail` timeout before isolated rerun | ✅ Initial `tsc` reported `TS2709` in the five authorized files | ✅ Final `tsc` reported no `TS2709` in the authorized files | ✅ Five independent DOM-owning test files retain their existing runtime coverage | ✅ Type-only `InstanceType<typeof JSDOM>` change; no behavior/assertion change |
| DOM value/disabled narrowing | `demo-contact-form.test.tsx` | Existing direct behavior covered by the file's 16 tests | ✅ Initial `tsc` reported `TS2339` for every un-narrowed `.value`/`.disabled` access | ✅ Final `tsc` reported no mapped DOM-property diagnostics | ✅ Input and button paths remain covered by validation, retry, pending, and failure tests | ✅ Narrowed only the queried controls at read sites |
| Index-signature access | hydrology route and visibility chat tests | Existing direct behavior covered by route/chat tests | ✅ Initial `tsc` reported `TS4111` at the mapped dot accesses | ✅ Final `tsc` reported no mapped `TS4111` in the authorized files | ✅ Hydrology error metadata, chat metadata, and draft paths remain asserted | ✅ Bracket notation only; no casts or contract changes |
| No-stub E2E evidence records | `agronautas-reality-runtime.spec.ts` | Playwright execution prohibited by user scope | ✅ Initial `tsc` reported `TS4111` for event/env record properties | ✅ Final `tsc` reported no mapped E2E record-access diagnostics | ➖ No browser execution by explicit instruction; no stubs or response behavior changed | ✅ Bracket notation only |

### Exact Evidence — web remediation slice A

| Evidence | Exact command/result |
|---|---|
| Initial type-check | `pnpm --dir apps/web exec tsc --noEmit --pretty false` — **exit 2**, reported the mapped diagnostics in the eight authorized files plus unrelated diagnostics in files outside this slice. |
| Final type-check | `pnpm --dir apps/web exec tsc --noEmit --pretty false` — **exit 2**; every mapped diagnostic in the eight authorized files was removed. Remaining diagnostics are outside the allowlist and are listed below. |
| Direct unit tests | `pnpm --dir apps/web exec node --import tsx --test --test-concurrency=1 --test-timeout=60000 "src/components/agronautas/page-client.test.tsx" "src/components/landing/demo-contact-form.test.tsx" "src/components/landing/homepage.test.tsx" "src/components/visibility/primitives.test.tsx" src/lib/visibility/chat.test.ts` — **66 passed, 0 failed, 0 cancelled, exit 0**, duration 35,511.2386 ms; `field-detail.test.tsx` isolated — **7/7 passed, 0 failed, exit 0**, duration 7,972.7919 ms; bracket-escaped `src/app/api/hydrology/[[]...path]/route.test.ts` — **12/12 passed, 0 failed, exit 0**, duration 894.313 ms. The bracket-escaped glob is required for the literal `[...path]` directory. |
| No-stub E2E | Not run — user explicitly prohibited Playwright execution. No route stub or response fulfilment was added. |

### Work Unit Evidence — web remediation slice A

| Evidence | Required result |
|---|---|
| Focused test command and exact result | All authorized direct unit files: **85/85 passed, 0 failed, exit 0** across the 66-test combined non-bracket group, isolated field-detail **7/7**, and isolated hydrology catch-all **12/12** runs. Final type-check is **blocked by unrelated remaining diagnostics outside the slice**. |
| Runtime harness command/scenario and exact result | **N/A — this is test-only TypeScript compile hygiene; user explicitly prohibited Playwright, production, and runtime harness execution.** The no-stub E2E file was type-corrected without changing its runtime path. |
| Rollback boundary | Revert only the eight listed test-file type-only edits in this section; this removes no production behavior and preserves all prior work and unrelated dirty files. |

### Remaining type-check diagnostics outside slice A

- `apps/web/src/components/agronautas/field-geometry-editor.test.tsx`: `TS2709` JSDOM annotation; `TS2322`/`TS2345` fixture and optional polygon type mismatches (4 diagnostics).
- `apps/web/src/components/government/detail.test.tsx`: `TS2709`, `TS2322`, `TS2353`, and `TS2345` fixture/contract mismatches (17 diagnostics).
- `apps/web/src/components/government/overview.test.tsx`: `TS2709` and `TS2322`/`TS2345` fixture/contract mismatches (4 diagnostics).
- `apps/web/src/lib/agronautas/ingestion-status.test.ts`: seven missing `acquisitionTimes`/fixture contract diagnostics.
- `apps/web/src/lib/agronautas/service.test.ts`: seven optional-method invocation diagnostics (`TS2722`/`TS18048`).
- `apps/web/src/lib/route-contracts.test.ts`: one `Twitter.card` union-property diagnostic (`TS2339`).
- `apps/web/src/lib/visibility/chat.test.ts`: one pre-existing missing `retryable` property diagnostic (`TS2345`); mapped index-signature diagnostics are fixed.
- `apps/web/src/lib/visibility/polling.test.ts`: one `SafeIngestResult.errorMessage` diagnostic (`TS2339`).
- `apps/web/tests/e2e/municipalities-alerts.spec.ts`: one possibly-undefined diagnostic (`TS2532`).

**Total remaining diagnostics:** 43, all outside the authorized slice except the single pre-existing non-mapped `retryable` diagnostic in the otherwise authorized chat test. Per instruction, no outside-slice edits were made and work stops here.

## Phase 5.4–5.7 — web TypeScript test-remediation slice B (2026-08-31)

- **Status:** **GREEN** for the authorized slice. The web TypeScript check is clean and all authorized direct Node tests pass. No production behavior changed. The E2E file was type-corrected but Playwright was not run because this executor was explicitly prohibited from running Playwright.
- **Delivery:** Single PR with the maintainer-approved `size:exception`; focused test-only compile-hygiene work unit.
- **Scope:** Only `apps/web/src/components/agronautas/field-geometry-editor.test.tsx`, `apps/web/src/components/government/detail.test.tsx`, `apps/web/src/components/government/overview.test.tsx`, `apps/web/src/lib/agronautas/ingestion-status.test.ts`, `apps/web/src/lib/agronautas/service.test.ts`, `apps/web/src/lib/route-contracts.test.ts`, `apps/web/src/lib/visibility/chat.test.ts`, `apps/web/src/lib/visibility/polling.test.ts`, and `apps/web/tests/e2e/municipalities-alerts.spec.ts` were changed for this slice. No production source, route behavior, assertion intent, stubs, `page.route`, root `.env`, sibling worktree, or Spanish UI copy was changed.
- **Changes:** JSDOM annotations use `Array<InstanceType<typeof JSDOM>>`; government fixtures use component-derived payload types and valid contract fields; geometry fixtures narrow optional polygon values; ingestion fixtures include required `acquisitionTimes`; optional service methods are guarded before invocation; Twitter metadata uses a safe union guard; chat fixtures include `retryable`; polling checks the serialized safe result instead of an absent `SafeIngestResult.errorMessage`; and the E2E fixture narrows the known Goya municipality before reading it.

### TDD Cycle Evidence — web remediation slice B

| Scope | Test/type boundary | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| Compatible JSDOM annotations and government fixture contracts | `field-geometry-editor.test.tsx`, `detail.test.tsx`, `overview.test.tsx` | ✅ Combined direct baseline 57/57 passed | ✅ Initial `tsc` reported the mapped `TS2709`, fixture, and required-contract diagnostics | ✅ Final `tsc` exited 0; component tests remained green | ✅ Existing geometry, dashboard, and overview paths retain their distinct fixture branches | ✅ Type-only annotations and fixture narrowing; no production behavior or assertion intent changed |
| Ingestion fixture contract | `ingestion-status.test.ts` | ✅ Included in combined 57/57 baseline | ✅ Initial `tsc` reported missing `acquisitionTimes` diagnostics | ✅ Final `tsc` exited 0 | ✅ Fresh, stale, and missing signal fixtures retain separate acquisition-time cases | ✅ Added only contract-required fixture data |
| Optional service methods | `service.test.ts` | ✅ Included in combined 57/57 baseline | ✅ Initial `tsc` reported seven `TS2722`/`TS18048` optional-method diagnostics | ✅ Final `tsc` exited 0 | ✅ API and mock service geometry paths both guard and exercise present methods | ✅ Local presence guards; no fallback behavior added |
| Metadata, chat, polling, and E2E narrowing | `route-contracts.test.ts`, `chat.test.ts`, `polling.test.ts`, `municipalities-alerts.spec.ts` | ✅ Combined direct baseline 57/57 passed for Node tests | ✅ Initial `tsc` reported the Twitter union, missing `retryable`, invalid `SafeIngestResult.errorMessage`, and possibly-undefined E2E diagnostics | ✅ Final `tsc` exited 0 | ✅ Existing metadata union, retry state, safe-result redaction, and municipality fixture paths remain covered | ✅ Bracket/union guards, required fixture field, safe serialized-result assertion, and local E2E fixture narrowing only |

### Exact Evidence — web remediation slice B

| Evidence | Exact command/result |
|---|---|
| Initial type-check | `pnpm --dir apps/web exec tsc --noEmit --pretty false` — **exit 2**, exactly 43 diagnostics, all in the nine authorized files listed in the scope above; no outside-slice diagnostics were exposed. |
| Safety-net direct tests | `pnpm --dir apps/web exec node --import tsx --test --test-concurrency=1 --test-timeout=60000 "src/components/agronautas/field-geometry-editor.test.tsx" "src/components/government/detail.test.tsx" "src/components/government/overview.test.tsx" "src/lib/agronautas/ingestion-status.test.ts" "src/lib/agronautas/service.test.ts" "src/lib/route-contracts.test.ts" "src/lib/visibility/chat.test.ts" "src/lib/visibility/polling.test.ts"` — **57 passed, 0 failed, 0 cancelled, exit 0**, duration 25,305.024 ms. |
| Final type-check | `pnpm --dir apps/web exec tsc --noEmit --pretty false` — **exit 0**, no diagnostic output, within the requested 120-second external timeout. |
| Final direct tests | Same serial command above — **57 passed, 0 failed, 0 cancelled, exit 0**, duration 15,825.4253 ms; test timeout 60,000 ms. |
| E2E | `municipalities-alerts.spec.ts` was **not run**; Playwright execution was explicitly prohibited. No `page.route` or route stub was added or changed. |

### Work Unit Evidence — web remediation slice B

| Evidence | Required result |
|---|---|
| Focused test command and exact result | Final web type-check **exit 0** plus eight authorized direct Node test files **57/57 passed**, serial concurrency 1, no failures or cancellations. |
| Runtime harness command/scenario and exact result | **N/A — this is test-only TypeScript compile hygiene.** Playwright, production, and application runtime harnesses were explicitly prohibited; the E2E file was type-corrected without executing it. |
| Rollback boundary | Revert only the type-only and fixture-contract edits in the nine authorized web test files listed above; this removes no production behavior and preserves all unrelated dirty files, previous apply slices, root `.env`, sibling worktree, and Spanish UI copy. |

### Slice B Current Status

- All 43 diagnostics observed at the slice-B baseline are resolved; no remaining web TypeScript diagnostics were reported by the final command.
- Tasks 5.1–5.2 remain pending; tasks 5.3–5.8 are now checked. This slice does not claim full lint-enabled Next build, Playwright, env-backed service topology, or production verification.
- Engram persistence was not available through the current tool surface; this OpenSpec progress artifact is the authoritative persisted record for this batch.

## Post-Fix Verification Reconciliation — 2026-08-31

- **Status:** **Blocked / FAIL preserved.** This is artifact reconciliation only; no command was run, no source/config file was modified, and no root `.env`, sibling worktree, production endpoint, or production resource was accessed.
- **Task state:** Tasks **5.3–5.8 are checked**. Tasks **5.1 and 5.2 remain pending**. Tasks **2.1–2.3 and 3.1–3.2 remain pending** because live topology and browser proof are unavailable. Do not close task 5.1.
- **Evidence policy:** The supplied post-fix results supersede stale focused-check failures where applicable. No output hash was supplied, so no new test/build hash is recorded or inferred.

### Supplied Post-Fix Evidence

| Area | Exact result | Reconciliation |
|---|---|---|
| Schema suite | `pnpm --dir packages/zod-schemas exec node --import tsx --test --test-timeout=60000 src/agronautas.test.ts` — **38/38 pass, exit 0** | Schema contract is green. |
| API build | `pnpm --dir apps/api build` — **pass, exit 0** | API build is green. |
| Web type-check | `pnpm --dir apps/web exec tsc --noEmit --pretty false` — **pass, exit 0, zero diagnostics** | Web TypeScript remediation is green. |
| Web diagnostic build | `pnpm --dir apps/web exec next build --no-lint` — **pass, exit 0**, compiled in approximately 13s; `.next` generated | Diagnostic only; full lint-enabled Next build is not proven. |
| Web lint | `pnpm --dir apps/web exec eslint .` — **exit 0**, 0 errors, 3 warnings | Direct lint check passes with warnings. |
| Web serial unit suite | `pnpm --dir apps/web exec node --import tsx --test --test-concurrency=1 --test-timeout=60000 "src/**/*.test.ts" "src/**/*.test.tsx"` — **231 pass, 0 fail, 0 cancelled** | Non-failing jsdom `attachEvent`/`detachEvent` output noted. |
| Worker focused pytest | **64 pass, 0 fail, 0 skipped, 28.05s** | Focused worker contracts pass; no live topology claim. |
| Direct BFF tests | **17/17 pass** | Direct contract evidence passes. |
| Runtime verifier | **16/16 pass** | Direct contract evidence passes. |
| Hydrology verifier | **8/8 pass** | Direct contract evidence passes. |

### Blocked and Not-Run Gates

- The no-stub Playwright lane previously timed out and produced no browser proof.
- Required env-backed service processes/endpoints are unavailable; durable topology, worker heartbeat, migrations, queue transition, and database completion remain **blocked/not_run**.
- All production evidence remains **blocked/not_run**, including deployment/revision, providers, auth/tenant/lead identities, Cron execution, authorized ingest, and read-only DB correlation.
- Passing schema/API/web typecheck/build-no-lint/unit/lint checks does not satisfy the live topology, browser, or production gates.

### Reconciled Verification Contract

```yaml
status: blocked
  executive_summary: Focused schema/API/web typecheck/build-no-lint/unit/lint checks pass; full lint-enabled Next build, env-backed service topology, browser, and production gates remain unproven or blocked.
artifacts:
  - openspec/changes/agronautas-production-simple-local-proof/tasks.md
  - openspec/changes/agronautas-production-simple-local-proof/apply-progress.md
  - openspec/changes/agronautas-production-simple-local-proof/verify-report.md
  next_recommended: Supply healthy env-backed API, Postgres/PostGIS, Redis, and worker service evidence, no-stub browser evidence, and authorized production evidence before attempting task 5.1; keep 5.1 and 5.2 pending now.
risks:
  - Tasks 2.1–2.3 and 3.1–3.2 remain pending.
  - Full lint-enabled Next build is not proven by the diagnostic --no-lint build.
  - Production readiness is not established.
skill_resolution:
  - C:\Users\mmmau\.config\opencode\skills\sdd-verify\SKILL.md
  - C:\Users\mmmau\.config\opencode\skills\_shared\global-mindset.md
```

Engram verify persistence was unavailable through the current tool surface; these OpenSpec artifacts are the authoritative persisted reconciliation. No task checkbox was changed in this reconciliation.

## Env-only Runtime Policy Reconciliation — 2026-09-01

- **Status:** Documentation-only policy correction completed. No source, configuration, runtime test, task checkbox, environment value, sibling worktree, or infrastructure process was touched.
- **Decision:** Readiness and real service calls against env-backed API, Postgres/PostGIS, Redis, and worker services determine `pass`, `blocked`, or `not_run`. Missing or unreachable env-backed services remain `blocked` or `not_run`; they never become inferred success.
- **Command boundary:** The canonical application commands remain exactly `cd backend && pnpm run dev` and `cd frontend && pnpm run dev`. Service ownership stays outside those thin delegates and is supplied through environment/process configuration.
- **Evidence boundary:** Local and production receipts remain separate, secret-free, fail-closed, and attributable. No fake, fixture, stub, or process-exit-only success is accepted for a live boundary.
- **Cron boundary:** Direct `scheduler:once` remains the selected Render Cron contract. Its live proof still requires the Render execution record, safe IDs, terminal durable completion, and one read-only database correlation; the rejected HTTP alternative cannot substitute.

### Exact Policy-Change Evidence

| Evidence | Exact result |
|---|---|
| Forbidden-tool vocabulary scan over the eleven allowlisted documentation files | Case-insensitive scan: **NO_MATCHES**; exit 0. |
| Secret-safe scan over the same eleven files | **PASS** — no credential-bearing URL, PEM block, or literal secret assignment detected; only names/placeholders/redacted identifiers were retained. Root and sibling environment files were not read. |
| Whitespace validation | `git diff --check` over the allowlisted documentation files: **PASS**, exit 0. |

### Work Unit Evidence

| Evidence | Required result |
|---|---|
| Focused validation command and exact result | Bounded case-insensitive vocabulary scan, secret-safe scan, and `git diff --check` over the eleven listed files; all passed as recorded above. |
| Runtime harness command/scenario and exact result | **N/A — documentation-only policy correction; runtime services, API calls, database calls, worker processes, browser, production, and infrastructure commands were explicitly prohibited.** |
| Rollback boundary | Revert only the documentation policy edits in `README.md`, the two runbooks, the five change artifacts, and the three listed specification files; do not revert unrelated dirty files or task checkboxes. |
