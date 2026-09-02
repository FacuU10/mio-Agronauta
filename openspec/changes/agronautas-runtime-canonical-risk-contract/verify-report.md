# Verification Report: Agronautas Canonical Risk/Job Runtime Contract

## Result Contract

```yaml
status: blocked
executive_summary: >-
  Contract, fake Redis/PostgreSQL seam, readiness, telemetry, build, and worker
  checks passed, but the core authorized live-runtime task 3.3 remains unchecked.
  The full API suite timed out and the browser lane could not start its web server.
artifacts:
  - openspec/changes/agronautas-runtime-canonical-risk-contract/verify-report.md
  - Engram sdd/agronautas-runtime-canonical-risk-contract/verify-report
next_recommended: remediate task 3.3 prerequisites, then re-run verify before archive
risks:
  - no authorized API-to-Redis-to-worker-to-PostgreSQL restart/read-back evidence
  - scheduled-window admission does not create the durable job row required by the worker claim path
  - full API and Playwright runtime commands did not complete successfully
skill_resolution: paths-injected; playwright fallback-path used because the requested root path did not exist
```

## Change and Mode

- **Change:** `agronautas-runtime-canonical-risk-contract`
- **Repository:** `C:\Users\mmmau\Agronautas\monorepo-js-baseline`
- **Branch:** `main`
- **Mode:** Hybrid OpenSpec + Engram, Strict TDD
- **Scope check:** Changed paths are limited to the Agronautas runtime/contracts, workflows, API, Python worker, and OpenSpec artifacts. No management/identity/ownership, marketplace, provider/economics qualification, Iberá-Alerta, or engine-selection implementation scope was introduced.
- **Explicit exclusions preserved:** both engines remain callable with `selectionStatus: undecided`; no accuracy, calibration, autonomy, or production-readiness claim was made.
- **Integrity policy:** no receipts, freezes, review lifecycle, or output hashes were created or required.

## Completeness

| Dimension | Result | Evidence |
|---|---|---|
| Proposal | Complete | `proposal.md` read in full |
| Specs | Complete | 4 requirements and 8 scenarios read in full |
| Design | Complete | `design.md` read in full |
| Tasks | Incomplete | 11/12 tasks complete; 3.3 is unchecked |
| Apply progress | Complete | Full cumulative `apply-progress.md` read |
| Full final verification | Blocked | Core live-acceptance task remains pending |

### Task Progress

| Task group | Completed | Pending | Result |
|---|---:|---:|---|
| 1.1–1.3 | 3 | 0 | Complete |
| 2.1–2.5 | 5 | 0 | Complete by task record; one scheduled-window integration gap remains |
| 3.1–3.4 | 3 | 1 | 3.3 pending; 3.1, 3.2, 3.4 complete by task record |
| **Total** | **11** | **1** | **Not all complete** |

## Build and Test Evidence

Hashes are intentionally omitted under the requested no-hash policy.

| Command | Exit/result | Runtime evidence |
|---|---|---|
| `pnpm --dir apps/api exec tsx --test ...` focused runtime files | 0 | 64/64 passed: repository, use case, scheduler, telemetry, readiness, verifier |
| `python -m pytest apps/workflow-runtime-python/tests -q` | 0 | 65 passed |
| `pnpm --dir packages/contracts test:agronautas-contracts` | 0 | 6/6 passed |
| `pnpm --dir packages/contracts validate:schemas` | 0 | 10 JSON schemas validated |
| `pnpm --dir packages/contracts validate:agronautas-schema` | 0 | Agronautas v1 schema validated |
| `pnpm --dir packages/zod-schemas test` | 0 | 51/51 passed |
| `pnpm --dir apps/api test` | Timeout | 156 tests reported passed before the 480-second command timeout; no clean completion |
| `pnpm --dir apps/api build` | 0 | TypeScript build passed |
| `pnpm build` | 0 | 5/5 build tasks successful across 11 packages |
| `pnpm --dir apps/web test` | 0 | 116/116 passed; supplementary web unit/integration suite |
| `pnpm exec prisma migrate status` from `apps/api` | P1001 | Read-only migration status could not reach the Neon server; no migration was applied |

### Runtime Verifier and Read-Only Topology

Command: `pnpm --dir apps/api verify:agronautas:runtime` with queue proof and hydrology writes disabled. The verifier exited 0 and wrote its manifest outside the repository at `C:\Users\mmmau\AppData\Local\Temp\opencode\agronautas-runtime-verify\runtime-20260828T020041Z\runtime-evidence.json`.

| Real observation | Result |
|---|---|
| API health | HTTP 200, but the observed process reported non-durable fallback rather than a proven Agronautas durable runtime |
| API auth/field | Blocked: no bearer token and no verified real field; unauthenticated runtime returned 401 |
| Web `/demo` and BFF runtime | HTTP 404 on the configured local port; the observed web process was not the canonical Agronautas target |
| PostgreSQL | Connected through the verifier and completed read-only table/count inspection; `fields=0`, `agronautas_job_runs=0` |
| Prisma | Read-only `SELECT 1` passed in the verifier |
| Redis | PING returned `PONG`; wait/processing/DLQ/completed lists and result/status hashes were read without writes and were empty |
| Queue proof | Not run because `AGRONAUTAS_RUNTIME_QUEUE_PROOF` was false; no enqueue/worker transition was invented |
| Worker readiness | Blocked/unavailable; no worker completion claimed |
| Providers | Georef live/valid; NASA POWER unavailable due missing value; Open-Meteo unavailable because commercial-use approval was not configured |
| Render | Static API/worker/cron wiring present and scheduler disabled; live service/deploy/log inspection not run |

The separate real-traffic Playwright command `pnpm --dir apps/web test:e2e:agronautas-runtime` exited 1 after the configured web server wait timed out at 120 seconds. No browser navigation, BFF request, console, or network assertion executed in that lane.

## Evidence Separation

### Fake/injected contract and seam evidence — passed

- TypeScript/Zod/AJV/Python shared fixture validation passed.
- Legal transition, retry ownership, ACK ordering, duplicate, lease reclaim, unavailable-result, lineage, readiness, telemetry, and legacy-adapter tests passed with fake/injected Redis/PostgreSQL seams.
- Formula vectors retain divergence and `selectionStatus: undecided`.
- This evidence proves deterministic contract behavior only; it is not a deployed worker transition.

### Real API → Redis → Python worker → PostgreSQL transition — not observed

The required live boundary was not run. Missing bearer token, verified field, canonical web target, worker readiness, queue proof authorization, and durable job rows prevent claiming admission, transport consumption, worker execution, PostgreSQL terminal persistence, restart recovery, or read-back. Task 3.3 therefore remains truthfully pending rather than failed by fabricated data.

## Specification Compliance Matrix

| Requirement / scenarios | Status | Runtime coverage and evidence |
|---|---|---|
| 1. Canonical Risk/Job Envelope — shared identity; invalid admission rejected | PASS (seam) | Zod runtime tests, contract tests, Python shared-fixture tests, and v1/v2 consumer routing passed |
| 2. Legal States, One Retry Owner, Durable ACK — retry once; ACK after persistence | PASS (seam), LIVE BLOCKED | API repository tests and Python queue/job tests passed for legal ownership, retries, DLQ, persistence failure, and ACK ordering; no real queue transition was observed |
| 3. Result Truth and Provider Lineage — latest-good fallback; safe unavailable result | PASS (seam) | Python job tests, Zod guards, provider-lineage tests, and full API output through test 105 passed; unavailable results omit risk values and preserve typed reasons |
| 4. Cross-Runtime Fixtures and Legacy Compatibility — truthful legacy reads; negative drift blocked | PASS | 6 contract tests, 51 Zod tests, 65 Python tests, legacy adapter tests, and 10 schema validations passed |
| 5. Readiness, Telemetry, Real Acceptance — incomplete topology disabled; live evidence labeled | PARTIAL / BLOCKED | Readiness, bounded telemetry, blocked verifier manifest, and scheduler-disabled checks passed; authorized live scenario has no covering passing runtime test |

**Scenario count:** 8 total; 7 have passing seam coverage. The authorized full-topology scenario is not proven.

## Correctness Review

| Area | Result | Finding |
|---|---|---|
| Contract schema and validators | PASS | Shared v2 schema, Zod guards, AJV, Python `jsonschema`, negative fixtures, lineage, and unavailable invariants agree in executed tests |
| Durable claim/transition guards | PASS (seam) | Due retry windows, lease ownership, legal source states, terminal protection, prior-state telemetry, and bounded metadata are covered and passed |
| Single outcome coordinator and ACK boundary | PASS (seam) | Persistence failure leaves processing payload recoverable; coordinator owns durable retry/DLQ/result transitions in fake-store tests |
| Legacy compatibility | PASS | Historical v1 jobs/snapshots remain readable without rewriting stored status or asserting canonical engine status |
| Scheduled-window durable admission | **CRITICAL** | `RedisAgronautasRuntimeDispatcher.enqueue` publishes the scheduled envelope and idempotency marker but does not create an `agronautas_job_runs` queued row. When the worker has `WORKER_POSTGRES_DSN`, `handle_scheduled_window_job` claims by `jobId`; absent that row it returns `skipped_duplicate`, so the real scheduler-to-worker unavailable outcome is not durably established. Existing tests inject a store whose claim succeeds and do not cover this admission path. |
| Full test command | **CRITICAL** | API test command timed out after 156 passing tests without a clean exit |

## Design Coherence

| Design decision | Result | Evidence |
|---|---|---|
| Versioned v2 envelope beside legacy v1 | PASS | v1 and v2 validators/adapters are exercised and v2 is flag-gated |
| PostgreSQL durable authority; Redis transport | PARTIAL | Source and seam tests implement the boundary, but the scheduled-window admission gap and absent live topology prevent runtime proof |
| One worker transition coordinator | PASS (seam) | Python consumer delegates outcome persistence/classification to `RuntimeOutcomeCoordinator`; tests prevent direct consumer retry/DLQ mutation |
| Preserve both formulas without selecting an engine | PASS | Vector and contract tests retain divergence, undecided selection, and non-calibrated status |
| Scheduler remains disabled absent full gates | PASS | Readiness/config tests and verifier static checks preserve disabled/unverified behavior |

## Strict TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | PASS WITH LIMITATION | Cumulative apply progress contains a TDD Cycle Evidence table, but it uses prose instead of the strict `✅ Written`/`✅ Passed` markers |
| Test files exist for completed implementation tasks | PASS | Relevant API, contract, Zod, Python, and verifier test files exist and executed |
| RED confirmed | PASS WITH LIMITATION | Apply progress records RED-first regressions and current test files exist; historical RED output was not re-created during verification |
| GREEN confirmed | PASS | Current focused API 64/64, worker 65/65, contracts 6/6, schemas, Zod 51/51, and builds passed |
| Triangulation | PASS WITH LIMITATION | Multiple values/states and failure paths are asserted; task 3.3 has no live test case |
| Safety net for modified files | NOT VERIFIABLE | The apply-progress TDD table has no safety-net column or per-file safety-net evidence |

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit / contract | 44 API seam tests + 6 contract + 6 runtime Zod + 8 Python contract/boundary tests | 10 | Node test runner, tsx, AJV, Zod, pytest/jsonschema |
| Integration / seam | 20 API scheduler/readiness tests + 50 Python queue/job tests | 4 | Express/fetch, fake Redis/PostgreSQL, pytest-asyncio |
| E2E | 0 executed | 1 configured file | Playwright lane blocked before test execution |
| **Executed related total** | **134** | **15** | Excludes overlapping full-package supplementary suites |

The layer counts above classify the explicitly related files; the command totals remain authoritative for pass counts. The 116-test web suite and full API suite include broader repository coverage and are reported separately.

### Changed File Coverage

Coverage analysis skipped — no coverage tool or configured coverage command was detected. This is informational and not a gate.

### Assertion Quality

| File | Lines | Issue | Severity |
|---|---:|---|---|
| `apps/api/src/infrastructure/database/postgres/agronautas-job-run-repository.test.ts` | 175–176 | `typeof repository.transition/persistOutcome` checks implementation presence without executing the behavior | WARNING |
| `apps/workflow-runtime-python/tests/test_queue_consumer.py` | 475–476 | `hasattr(WorkflowQueueConsumer, ...)` is a type/presence assertion without behavior | WARNING |
| `apps/workflow-runtime-python/tests/test_agronautas_jobs.py` | 565–568 | `hasattr(agronautas_jobs, ...)` is a type/presence assertion without behavior | WARNING |
| `apps/workflow-runtime-python/tests/test_queue_consumer.py` | 301–305 | Selector event-loop test asserts only the returned implementation type; useful boundary check but narrow | WARNING |

**Assertion quality:** 0 CRITICAL, 4 WARNING. No tautologies, empty-collection-only tests without companion positive behavior, or ghost loops were found.

### Quality Metrics

- **TypeScript targeted ESLint:** 36 `no-useless-escape` errors in `agronautas-job-run-repository.ts`; quality warning only, not a runtime gate.
- **Python Ruff:** unavailable on the verification host; skipped without converting absence into failure.

## Issues

### CRITICAL

1. **Task 3.3 is incomplete.** No authorized API→Redis→Python worker→PostgreSQL transition, restart/reclaim, or read-back evidence exists. This blocks final verification and archive.
2. **Scheduled-window durable admission is not proven and is structurally incomplete.** The scheduler publishes a queue envelope without first persisting the durable job row that the DSN-enabled worker claim path requires. The injected-store tests do not cover this real path.
3. **The full API test command timed out.** It reported 156 passing tests before the 480-second timeout but did not exit cleanly.
4. **The Playwright real-traffic lane could not start.** Its configured web server timed out after 120 seconds; no E2E scenario ran.

### WARNING

1. Prisma migration status could not reach the Neon server (`P1001`), although the runtime verifier completed a PostgreSQL read-only inspection and a Prisma `SELECT 1` successfully.
2. Targeted ESLint reports 36 existing style errors in the changed repository file.
3. Strict TDD safety-net evidence is not independently verifiable from the apply-progress artifact.
4. Provider evidence is bounded: only Georef produced live/valid evidence; NASA POWER was unavailable and Open-Meteo lacked explicit commercial-use approval.

### SUGGESTION

1. Add/verify durable scheduled-window admission before claiming the worker unavailable result is persisted.
2. Provide an authorized field, bearer token, canonical API/web services, worker process with `WORKER_POSTGRES_DSN`, queue-proof authorization, and restart/read-back procedure; then execute task 3.3 without Docker or production writes.
3. Diagnose the API test open-handle/timeout condition and rerun the full API suite; rerun Playwright only against the canonical Agronautas web target.

## Final Verdict

**FAIL — verification blocked.** The completed contract/seam slice is strongly evidenced, but task 3.3 is a required unchecked core task, the authorized live scenario is untested, scheduled-window durable admission has a correctness gap, and the full API/browser verification commands did not complete. Do not archive. The next action is a focused corrective/runtime-enablement pass, followed by a fresh verification run.
