# Tasks: Agronautas Canonical Risk/Job Runtime Contract

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–750 authored lines; generated fixtures excluded |
| 400-line budget risk | High |
| Chained PRs recommended | Yes (size exception preserves one main line) |
| Suggested split | Sequential work-unit commits on `main`; one `size:exception` PR |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Contract, fixtures, validators, guards | PR 1 | `pnpm --dir packages/contracts test:agronautas-contracts; pnpm --dir packages/zod-schemas test` | N/A: pure seam | Revert contract files |
| 2 | Admission, durable transitions, coordinator, adapters | PR 1 | `pnpm --dir apps/api test; pytest apps/workflow-runtime-python/tests/test_queue_consumer.py` | N/A: fake Redis/Postgres | Disable v2; revert runtime changes |
| 3 | Readiness, telemetry, acceptance | PR 1 | `pnpm --dir apps/api test; pnpm build; pytest apps/workflow-runtime-python` | Authorized no-Docker API→Redis→worker→Postgres run | Revert readiness/telemetry/harness; retain legacy reads |

## Phase 1: RED Contract and Boundary Tests

- [x] 1.1 Add failing AJV/Zod/Python fixture tests in `packages/contracts/tests/agronautas-runtime.test.ts`, `packages/zod-schemas/src/agronautas.test.ts`, and `apps/workflow-runtime-python/tests/test_agronautas_contracts.py` for identity, transitions, duplicates, reclaim, lineage, engine descriptors, and unavailable-without-risk.
- [x] 1.2 Add failing tests in `packages/zod-schemas/src/agronautas-runtime.test.ts` and `apps/workflow-runtime-python/tests/test_runtime_boundary.py` for confidence bounds, forecast timestamps, freshness, typed reasons, and `selectionStatus=undecided`.
- [x] 1.3 Add failing boundary tests in `apps/api/src/infrastructure/database/postgres/agronautas-job-run-repository.test.ts`, `apps/workflow-runtime-python/tests/test_queue_consumer.py`, `apps/workflow-runtime-python/tests/test_agronautas_jobs.py`, `apps/api/src/presentation/routes/health.test.ts`, and `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts` for ACK ordering, retry ownership, restart/DLQ, legacy reads, readiness, and telemetry. RED-only by design; GREEN is deferred to Unit 2 runtime work.

## Phase 2: GREEN Contract and Runtime

- [x] 2.1 Create `packages/contracts/schemas/agronautas-runtime.v2.schema.json`, `packages/contracts/fixtures/agronautas/runtime-contract.v2.json`, and `packages/zod-schemas/src/agronautas-runtime.ts` with const-backed enums, types, validators, guards, and unavailable invariants; load the same JSON in Python.
- [x] 2.2 Modify `packages/workflows/src/index.ts`, `apps/api/src/application/usecases/request-risk-recompute-usecase.ts`, and `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts` for flag-gated v2 admission and one source of IDs, trace, lease, and queue defaults.
- [x] 2.3 Modify `apps/api/src/infrastructure/database/postgres/agronautas-job-run-repository.ts`, `apps/api/prisma/schema.prisma`, and migration SQL only when required; make claim/reclaim, heartbeat, transitions, and result persistence atomic and ownership-checked.
- [x] 2.4 Modify `apps/workflow-runtime-python/src/worker/queue/consumer.py` and `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` so one coordinator owns outcomes, retries only transient errors once, persists before ACK, and records scheduled-window unavailable durably.
- [x] 2.5 Add legacy read adapters in `apps/api/src/infrastructure/database/postgres/agronautas-risk-snapshot-repository.ts` and `packages/zod-schemas/src/agronautas-runtime.ts`; preserve BFF shapes/history and label both engines undecided.

## Phase 3: Integration, Refactor, and Acceptance

- [ ] 3.1 Modify `apps/api/src/infrastructure/database/postgres/agronautas-runtime-readiness-repository.ts`, `apps/api/src/presentation/routes/health.ts`, and `apps/api/src/infrastructure/observability/agronautas-telemetry.ts`; expose durable worker capability, disabled/unavailable states, bounded transition metrics, and no secrets/raw payloads.
- [ ] 3.2 Refactor after GREEN: align formula-envelope fixtures for `risk-v0` and `open-meteo-basic-v1` without parity claims; run `pnpm --dir packages/contracts validate:schemas; pnpm test; pnpm build; pytest apps/workflow-runtime-python`.
- [ ] 3.3 Extend `apps/api/src/scripts/verify-agronautas-runtime-real.ts` with an authorized API→Redis→worker→Postgres restart harness; run `pnpm --dir apps/api verify:agronautas:runtime` and record local/live/seam/mock/unavailable evidence. Keep production worker/queue/cron proof separate; never infer locally.
- [ ] 3.4 Rollback: disable the capability flag and scheduler, confirm legacy reads/historical rows remain intact, and document no management/identity, marketplace, provider/economics, Iberá, engine-selection, or model-accuracy changes.

Threat-matrix rows in design are all `N/A`; no additional threat RED tasks apply.
