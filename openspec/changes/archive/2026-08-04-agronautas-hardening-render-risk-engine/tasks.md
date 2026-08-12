# Tasks: Agronautas Render and Risk-Engine Hardening

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 650–900 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 contracts → PR 2 runtime → PR 3 lineage |
| Delivery strategy | single unified working branch (user-directed bounded slice) |
| Chain strategy | not applicable; do not create or switch branches |

Decision needed before apply: No — user explicitly selected the single unified working branch and bounded Phase 4 evidence remediation
Chained PRs recommended: Yes
Chain strategy: not applicable for this unified continuation branch
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Contracts, vectors, and RED guards | PR 1 | `pnpm --dir packages/contracts test:agronautas-contracts` | N/A: contract-only | Revert contract fixtures/tests |
| 2 | Queue, worker, Postgres lease/state | PR 2 | `pnpm --dir apps/api test; pytest apps/workflow-runtime-python` | Real PostgreSQL/Redis/provider | Disable flag; retain additive migration; revert adapters |
| 3 | Lineage, crops, coverage, evidence | PR 3 | `pnpm --dir apps/web test:e2e -- --grep agronautas-recompute` | Local API/web Playwright + static Render checks; no worker claim | Revert feature files; retain historical rows |

## Phase 1: RED Contracts and Guards

- [x] 1.1 Add RED tests in `packages/contracts/tests/agronautas-contracts.test.ts` and `apps/workflow-runtime-python/tests/test_agronautas_contracts.py`; create `risk-engine-contract.v1.schema.json` and `packages/contracts/risk-engine/golden-vectors.json` for divergence and an undecided canonical-engine gate.
- [x] 1.2 Add RED tests in `apps/api/src/application/usecases/request-risk-recompute-usecase.test.ts` and `apps/workflow-runtime-python/tests/test_queue_consumer.py` for `bull:agronautas-runtime`, IDs, lease/attempt metadata, and `worker.main:main` calling `WorkflowQueueConsumer.consume_forever()`.
- [x] 1.3 Add RED repository/readiness tests for transitions, lease expiry, heartbeat, retry, and DLQ; target `agronautas-job-run-repository.test.ts` and `apps/api/src/presentation/routes/health.test.ts`.
- [x] 1.4 Add RED lineage/alert, crop/coverage, and Render tests in `test_agronautas_jobs.py`, `generate-alerts-usecase.test.ts`, `agronautas-field-repository.test.ts`, and `apps/api/src/build-config.test.ts`.

## Phase 2: Shared Runtime and Durable Persistence

- [x] 2.1 Implement `packages/workflows/src/index.ts`, the three schemas, and `agronautas-runtime-dispatcher.ts` from one factory; reject canonical claims until later approval.
- [x] 2.2 Create additive `apps/api/prisma/migrations/<timestamp>_agronautas_runtime_hardening/migration.sql`; extend `AgronautasJobRunRepository`/`PostgresAgronautasJobRunRepository` with guarded claim, lease, heartbeat, retry, completion, failure, and DLQ. Backfill defaults only; never rewrite scores/crops.
- [x] 2.3 Update `request-risk-recompute-usecase.ts`, `consumer.py`, `main.py`, `pyproject.toml`, and `agronautas_jobs.py` so the actual envelope is consumed, acknowledged only after durable outcome, and provider errors deterministically retry or DLQ.

## Phase 3: Lineage, Coverage, and Boundaries

- [x] 3.1 Carry provider/source run IDs, acquisition time, freshness/reasons, engine, snapshot, and alert IDs through `agronautas-signal-*`, repositories, `GenerateAlertsUseCase`, and worker results; stale/missing data cannot alert.
- [x] 3.2 Change `CreateFieldIntakeUseCase` to persist `input.crop`; keep PostGIS `resolveCoverage` authoritative, label unsupported localities, and ensure `seed-corrientes-rice-demo.ts`/`corrientes-demo-localities.ts` remain demo-only and never establish real coverage.
- [x] 3.3 Verify `render.yaml` stays Native Node API/web; document `pyproject.toml` worker hosting as a separate approved boundary; preserve Iberá-Alerta and branches/worktrees/stashes.

## Phase 4: Verification and Evidence

- [x] 4.1 GREEN/REFACTOR: run contract validation, `pnpm --dir apps/api test`, focused `pytest`, then `pnpm build`; separate unit/contract from runtime evidence. Focused suites and build passed; the full API command retains the known Groq degraded-chat failure.
- [x] 4.2 Run bounded recompute with real PostgreSQL, Redis, and provider; query field→source→job→snapshot→alert IDs plus readiness heartbeat for retry/DLQ. Corrected the additive `jobId` contract and raw-row `id` insertion; API admission persisted and queued a real job. The Python worker attempt is separately blocked on Windows `ProactorEventLoop`/psycopg compatibility, so no worker E2E success is claimed.
- [x] 4.3 Run Playwright local API/web status/lineage and static Render health/readiness checks; report Node evidence only. Controlled Playwright and static Render checks passed; no Agronautas recompute E2E or Python/production claim is made.

## Remediation Slice: Verified Worker Boundary Gaps

- [x] 5.1 Resolve the worker's installed/source package contract root, package the runtime schemas, and register local JSON Schema `$ref` documents before validating a durable job envelope.
- [x] 5.2 Configure and test the explicit Windows Python 3.12 selector event-loop boundary required by psycopg before either worker entrypoint starts; preserve database errors.
- [x] 5.3 Re-run worker/API/contracts/build evidence and the bounded configured-service probe; report the durable worker outcome/lineage only where the real worker prerequisite is available, without claiming full alert E2E.

## Remediation Evidence

- The installed worker wheel now includes the four runtime schemas required by `worker.main` and the queue consumer; `build_contract_validator` registers each local filename, `$id`, URI, and relative sibling target. An installed-package smoke from a non-repository working directory validated a `workflow-job` payload containing `asset-metadata` through its `$ref` chain.
- `worker.main` and the direct `worker.queue.consumer` module entrypoint now use an explicit Windows selector `asyncio.Runner` loop factory. The runner does not catch or downgrade psycopg/database exceptions; a focused regression preserves the raised error.
- The first post-remediation real worker run reached durable claim but exposed an unrelated Prisma identifier mismatch in `fetch_field_coordinates` (`centroid_lat`/`centroid_lng` versus quoted `"centroidLat"`/`"centroidLng"`). The worker query and regression test were corrected additively.
- Final bounded real run: configured PostgreSQL migration state was current; Redis responded `True` to `PING`; Open-Meteo responded HTTP `200`; API admission returned `202`; the installed worker consumed the matching envelope; PostgreSQL reached `completed`, attempt `1`, with a succeeded result and lineage for `open-meteo-basic-v1`; the probe result contained a risk snapshot ID and empty alert IDs. The probe field/job/snapshot/signal rows, lock, queue entries, and Redis result/status/heartbeat keys were removed afterward.
