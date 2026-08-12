# Apply Progress: Agronautas Render and Risk-Engine Hardening

## Work Unit

- **Change:** `agronautas-hardening-render-risk-engine`
- **Mode:** Strict TDD
- **Slice:** Narrow corrective slice — canonical worker persistence bridge and deterministic alert threshold lineage coverage, cumulative with Phases 1–5
- **Branch:** `continuation/agronautas-ibera-unified-2026-08-04` (single unified branch; no branch or worktree changes)
- **Scope boundary:** additionally corrected worker successful/failed signal and risk persistence to dual-write the actual Prisma/API quoted camelCase columns alongside legacy snake_case columns, and added deterministic threshold-crossing alert lineage coverage. No risk-engine canonicalization, Iberá-Alerta code, Render service addition, Docker, or fabricated production evidence.
- **Workload boundary:** autonomous Phase 4 correction/evidence slice on the user-selected single unified branch; no branch or worktree changes. Prior contracts/runtime/lineage work remains cumulative and untouched.

## Completed Tasks

- [x] **1.1** Risk-engine contract schema, divergence vectors, and TypeScript/Python contract tests.
- [x] **1.2** Queue, stable ID, lease/attempt, and worker-entrypoint RED tests.
- [x] **1.3** Guarded repository transition, lease-expiry, heartbeat, retry, DLQ, and readiness RED tests.
- [x] **1.4** Lineage, alert boundary, crop persistence, coverage seam, and Render-boundary tests.
- [x] **2.1** Shared workflow factory, queue key, lease envelope, schema alignment, and undecided canonical-engine gate.
- [x] **2.2** Additive runtime migration plus guarded PostgreSQL claim, lease, heartbeat, retry, completion, failure, and DLQ transitions.
- [x] **2.3** Agronautas queue consumer/entrypoint wiring, durable worker transitions, acknowledgement ordering, provider retry, and DLQ behavior.
- [x] **3.1** Provider/source run IDs, acquisition times, freshness/degradation reasons, engine identity, risk snapshot IDs, alert snapshot IDs, response/evidence lineage, and safe no-alert behavior for stale/degraded snapshots.
- [x] **3.2** Submitted crop persistence, PostGIS-authoritative coverage, unsupported-locality labeling, and explicit demo-only Corrientes seed/locality helpers with no real-coverage claim.
- [x] **3.3** Preserved exactly two Native Node Render services and documented separately approved Python worker hosting prerequisites.
- [x] **4.1** Corrected the ghost demo assertion and retained focused/static evidence with unit/contract/runtime separation.
- [x] **4.2** Corrected the PostgreSQL job-run admission contract, persisted a real queued recompute against configured PostgreSQL/Redis/Open-Meteo surroundings, attempted the Python worker, and cleaned all probe data. Worker E2E remains unclaimed because Windows psycopg cannot run on the Proactor event loop.
- [x] **4.3** Ran controlled Playwright/API and static Render checks; no Agronautas recompute E2E or Python/production claim made.
- [x] **5.1** Packaged the runtime JSON Schemas for installed worker execution and registered filename/URI/`$id` resources so relative `$ref` validation works outside the monorepo checkout.
- [x] **5.2** Added an explicit Windows selector `asyncio.Runner` boundary for Python 3.12 psycopg connections across both worker entrypoints; database errors remain raised.
- [x] **5.3** Re-ran worker/API/contracts/build evidence and a bounded real configured-service recompute; durable worker completion and risk lineage were observed, while full alert E2E and production/Render worker availability remain unclaimed.
- [x] **6.1** Corrected worker source/run/snapshot persistence to dual-write Prisma/API camelCase and legacy snake_case columns, including job/run/source/snapshot lineage payloads.
- [x] **6.2** Added deterministic below-threshold/at-threshold alert coverage proving alert ID → risk snapshot ID and source/run lineage.

## TDD Cycle Evidence

| Task | Test files / command | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| 1.1 | Contract TS/Python tests and risk-engine vectors | Contract/unit | Missing schema/vector files failed first | TS/Python contract tests passed | Hot/wet and cool/dry divergence vectors | Schema IDs/fixture metadata made validators consistent |
| 1.2 | Request use case and Python queue tests | Unit/contract | Queue/lease/entrypoint assertions failed first | Phase 2 implementation passed | Stable IDs, queue ownership, lease metadata | Shared factory removed API duplication |
| 1.3 | Job repository/readiness tests | Repository/readiness | Guarded transitions/readiness failed first | Focused repository/readiness tests passed | Claim/reclaim, heartbeat, retry, DLQ paths | Additive fields only |
| 1.4 | Lineage/alert/crop/Render tests | Unit/contract | Lineage/crop assertions failed first | Implemented in later slices | Success/stale/no-Python-boundary cases | No canonical engine selected |
| 2.1 | Workflow/request/contract/consumer tests | Unit/contract | Lease/default queue failures | Factory/version tests passed | Factory and rejection paths | Canonical gate remains undecided |
| 2.2 | Repository/readiness tests and migration | Repository | Durable state failures | Focused API/build passed | Queued/reclaim/heartbeat/retry/DLQ paths | Additive migration/schema fields only |
| 2.3 | Queue/jobs/request tests | Unit/integration seam | Envelope/retry failures | Python 22/22 and API focused passed | Success/retry/DLQ/duplicate paths | Redis ack follows durable classification |
| 3.1 | Lineage, signal, worker, contract tests | Unit/contract | Freshness/lineage assertions failed first | Focused lineage tests passed | Fresh/stale/degraded/fallback paths | Additive legacy fallbacks |
| 3.2 | Route/field/seed tests | Unit/API seam | Crop/locality/demo assertions failed first | Crop/locality/seed tests passed | Supported/outside/unsupported/degraded paths | PostGIS remains authority |
| 3.3 | Build-config and worker README tests | Static contract | Worker-hosting assertion failed first | Render/docs tests passed | Structural only | `render.yaml` remains two Node services |
| 4.1 | Seed assertion plus focused suites/build | Unit/contract/build | Assertion-quality remediation | Seed and focused suites passed | Degraded empty vs fresh non-empty paths | Removed ghost `every()` assertion |
| 4.2 | `agronautas-job-identifier-contract.test.ts`; `agronautas-job-run-repository.test.ts`; API + worker runtime harness | Repository/runtime integration | Updated repository test failed because raw insert omitted required `id` | Identifier/repository tests **10/10**; API admission **202** persisted `queued` row; worker attempt failed before claim on Windows psycopg event-loop incompatibility | Prisma schema/current DB columns, migration deployment, API response, PostgreSQL row, Redis envelope, and cleanup counts | Generated row `id` plus additive identifier bridge only; scores/crops and engine gate unchanged |
| 4.3 | Existing Playwright, health, and Render tests | Controlled browser/API/static | Evidence-only task | Playwright **2/2**, API health/static **27/27** | Mocked UI paths and static two-Node boundary | No source change |
| 5.1 | `test_runtime_boundary.py`; installed wheel smoke | Package/runtime contract | Installed package could not load the external `$ref` root before the fix | Worker wheel loaded packaged schemas and validated workflow→asset `$ref` payload **pass** | Source checkout and installed non-repository cwd | Four runtime schemas bundled under `worker/schema`; source contracts remain authoritative for checkout execution |
| 5.2 | `test_queue_consumer.py` | Worker process boundary | Proactor/psycopg failure was reproduced in the prior real attempt | **34 pytest passed**; explicit selector factory and error-propagation regression passed | `worker.main` and direct `worker.queue.consumer` entrypoints share `run_worker` | Revert `core/platform.py`, entrypoint wiring, and focused tests only |
| 5.3 | Worker/API/contracts/build plus configured-service harness | Runtime integration | Prior worker attempt failed before durable claim; coordinate query then failed on legacy Prisma identifier shape | Worker-backed bounded recompute completed durably after additive query correction | API `202`, Redis envelope, worker claim/heartbeat, PostgreSQL completed result, Open-Meteo response, lineage, cleanup | Revert remediation runtime/test files; preserve additive migration and historical data |
| 6.1 | `tests/test_agronautas_jobs.py`; worker persistence SQL | Worker repository/integration seam | New regression failed because worker SQL only named snake_case columns | **35 pytest passed**; SQL now names quoted Prisma camelCase fields and legacy fields for successful/failed runs and risk snapshots | Job/run/source/snapshot IDs and payload lineage remain unchanged | Revert `agronautas_jobs.py` persistence SQL and its focused regression only |
| 6.2 | `generate-alerts-usecase.test.ts` | Unit/use-case | New threshold/lineage assertions were written first; existing implementation already satisfied the specified behavior | **16 focused API tests passed**, including below 69.99 and at 70 cases | Deterministic alert IDs, risk snapshot ID, source run ID, run ID, acquisition time | Revert the added test only; no production alert logic changed |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `python -m pytest -q` in `apps/workflow-runtime-python` → **35 passed, 0 failed**. Focused API repository/use-case command → **16 passed, 0 failed**. `pnpm build` → **4/4 Turbo tasks successful**; existing unused-React warning only. |
| Runtime harness command/scenario and exact result | No safe configured runtime probe was run in this slice: the current process environment did not expose `DATABASE_URL`/`WORKER_POSTGRES_DSN`, so live persistence/read-back evidence for the corrected SQL is **unproven** here. No temporary probe data was created; no cleanup was required; no Docker. |
| Rollback boundary | Revert only the dual-write persistence changes in `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`, the new worker regression in `apps/workflow-runtime-python/tests/test_agronautas_jobs.py`, and the deterministic threshold test in `apps/api/src/application/usecases/generate-alerts-usecase.test.ts`. Keep prior migrations/history, risk-engine undecided state, Iberá code, and two-Node Render boundary. |

## Findings and Guard Interpretation

- `risk-v0` and `open-meteo-basic-v1` remain separate algorithm identities with shared envelope version `1.0.0`; vectors explicitly mark divergence and `parityClaim: false`.
- The canonical-engine gate remains `{ "status": "undecided", "engineId": null }`; this slice makes no engine selection or parity claim.
- The initial stale runtime error was an identifier-shape mismatch: the actual PostgreSQL table uses quoted Prisma `"jobId"`, while the earlier repository path expected `job_id`. The additive migration bridges a legacy `job_id` deployment without dropping data.
- After that bridge, the real raw insert exposed a second required-column mismatch: `agronautas_job_runs.id` is `NOT NULL` without a database default in the configured database. The repository now supplies a generated UUID per insert; `ON CONFLICT ("jobId")` preserves idempotency.
- The API and Python share the factory's `1.0.0` envelope, Agronautas queue key, and default attempt `1`/max attempts `3`. Python durable transitions remain PostgreSQL-backed.
- The prior worker prerequisite gap was the Windows Proactor event loop; the installed worker now uses an explicit selector Runner and the bounded real worker run completed durably. Full production worker hosting remains a separate prerequisite.
- A second runtime schema gap was the worker's `centroid_lat`/`centroid_lng` query against Prisma-managed quoted `"centroidLat"`/`"centroidLng"`; the additive query correction is covered by a focused test and the real run.
- Render remains exactly two Native Node services; Iberá-Alerta remains separate; historical scores/crops and the undecided risk-engine status are preserved.

## Controlled Playwright/API Evidence

- `pnpm --dir apps/web exec playwright test tests/e2e/municipalities-alerts.spec.ts` → **2 passed** using mocked browser responses; not Agronautas recompute proof.
- `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/health.test.ts src/build-config.test.ts` → **27 passed**.
- No Agronautas-specific Playwright recompute spec exists; no new E2E spec was invented.

## Remaining Gaps

- Full field → source → job → snapshot → alert lineage remains unclaimed because the worker result intentionally carries an empty `alertSnapshotIds` list; retry/DLQ and readiness-heartbeat runtime transitions were not exercised in this successful probe. Production worker hosting remains separately unapproved.
- This corrective slice proves the SQL contract statically/focused only; configured live read-back of worker-written camelCase rows remains unproven because no safe runtime credentials were present in the current process environment.
- Full API/root test failures from the prior report (known Groq degraded-chat environment assertion and concurrency-sensitive hydrology timeout test) remain outside this correction.

## Status

Phase 1 **4/4**, Phase 2 **3/3**, Phase 3 **3/3**, Phase 4 **3/3**, remediation **3/3**, corrective **2/2** complete. Apply is **complete for the assigned corrective slice**: worker SQL now targets the canonical Prisma/API camelCase read model while retaining legacy columns, deterministic alert threshold/lineage coverage passes, and live configured persistence read-back remains explicitly unproven. Full alert E2E and production/Render worker success remain unclaimed.
