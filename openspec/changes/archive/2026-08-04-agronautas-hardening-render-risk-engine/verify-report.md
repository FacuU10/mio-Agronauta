schema: gentle-ai.verify-result/v1
evidence_revision: sha256:pending-local-report-preimage
verdict: fail
blockers: 3
critical_findings: 3
requirements: 2/7
scenarios: 7/14
test_command: pnpm test
test_exit_code: 1
test_output_hash: sha256:f447099fddcec21f1625facf1ec7a167470456856b1650365f03853ff1888ff1
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:b92edad079e8633c7fc088e04e60792f7f632ad0bc49806ecd579105eb5d86d6

# Verification Report

**Change**: `agronautas-hardening-render-risk-engine`  
**Project**: `monorepo-js-baseline`  
**Branch**: `continuation/agronautas-ibera-unified-2026-08-04`  
**Observed HEAD**: `0be9ba8049dbc6aba01b1900f2c52794f087574d`  
**Mode**: Strict TDD  
**Persistence**: Hybrid (OpenSpec + Engram)  
**Status**: all 16 implementation tasks complete; final verification fails closed on non-zero full suites and unavailable fresh integrated lineage evidence.

## Executive Summary

The lineage correction is verified by source inspection and focused tests: worker persistence now names both quoted Prisma/API camelCase columns and legacy snake_case columns, while deterministic threshold tests prove alert-to-snapshot/source/run lineage. Queue contracts, durable transition seams, crop/coverage seams, Render boundary, and the undecided risk-engine gate also pass focused/static checks.

The final verdict is **FAIL**. Full API and root suites remain non-zero, and no safe non-receipt recompute harness was available for a fresh worker/API camelCase read-back, alert transaction, retry/DLQ transition, or worker readiness heartbeat. No canonical risk engine, Python Render deployment, Iberá change, Docker, review, iron, receipt, hash/freeze, or Judgment Day flow was invoked.

## Completeness

| Metric | Value |
|---|---:|
| Spec requirements | 7 |
| Spec scenarios | 14 |
| Tasks total | 16 |
| Tasks complete | 16 |
| Tasks incomplete | 0 |
| Requirements fully scenario-compliant | 2/7 |
| Scenarios fully compliant | 7/14 |
| Scenarios partial | 6/14 |
| Scenarios untested | 1/14 |
| Coverage | Not available; no configured coverage command detected |

## Build and Test Evidence

| Layer | Exact command | Result | Exit | Output hash |
|---|---|---:|---:|---|
| API Agronautas focused | `pnpm --dir apps/api exec node --import tsx --test src/application/usecases/generate-alerts-usecase.test.ts src/application/usecases/request-risk-recompute-usecase.test.ts src/infrastructure/jobs/agronautas-signal-ingestion-job.test.ts src/infrastructure/database/postgres/agronautas-signal-ingestion-repository.test.ts src/infrastructure/database/postgres/agronautas-field-repository.test.ts src/infrastructure/database/postgres/agronautas-alert-snapshot-repository.test.ts src/infrastructure/database/postgres/agronautas-risk-snapshot-repository.test.ts src/infrastructure/database/postgres/agronautas-job-run-repository.test.ts src/infrastructure/database/postgres/agronautas-job-identifier-contract.test.ts src/scripts/seed-corrientes-rice-demo.test.ts src/build-config.test.ts src/presentation/routes/health.test.ts` | 61 passed, 0 failed | 0 | `sha256:bad14f387cae8a4ee1c8293711d5347be8972651a1ed716b94c2eadb7e616411` |
| Python worker | `python -m pytest -q` in `apps/workflow-runtime-python` | 35 passed, 0 failed | 0 | `sha256:345074a0bcaafc3c281287626cb376e19d86d48481cdca41ee4ca68d1a9ec5c2` |
| Python runtime focused | `python -m pytest -q tests/test_runtime_boundary.py tests/test_queue_consumer.py tests/test_agronautas_jobs.py` | 29 passed, 0 failed | 0 | `sha256:0b28f252a915383e82257966c045ef084e714bb580643952a037bad5593d15c3` |
| Contracts and schemas | `pnpm --dir packages/contracts test:agronautas-contracts; pnpm --dir packages/contracts validate:schemas; pnpm --dir packages/contracts validate:agronautas-schema` | 5 passed; 8 JSON Schemas validated | 0 | `sha256:b10f4409be8c5e687f03757625374b7da23063dacee5f49d820182fba6869309` |
| Web | `pnpm --dir apps/web test` | 92 passed, 0 failed | 0 | `sha256:79d80ed88513f8f027f1dde24f96678acd2538946d3d8452111229d32eccc9f2` |
| Existing Playwright | `pnpm --dir apps/web exec playwright test tests/e2e/municipalities-alerts.spec.ts` | 2 passed; mocked Iberá municipality flow only | 0 | `sha256:d257865bd47c26ea031db63e54936ef45504adf720a87ee9488973ee1b14cb9b` |
| Full API | `pnpm --dir apps/api test` | 218 passed, 1 failed | 1 | `sha256:ad7b3c0ec9ef755687d9a6dd6c2cbbea0f9c7ad1964d46dc38fad0080f9aceb4` |
| Root full test | `pnpm test` | Turbo failed in hydrology-engine, 63/64 there; API also has 218/219 with the Groq failure | 1 | `sha256:f447099fddcec21f1625facf1ec7a167470456856b1650365f03853ff1888ff1` |
| Build | `pnpm build` sequential rerun after an initial parallel workspace race | 4/4 Turbo build tasks successful; web compiled successfully | 0 | `sha256:b92edad079e8633c7fc088e04e60792f7f632ad0bc49806ecd579105eb5d86d6` |
| Prisma validation/status | `pnpm --dir apps/api exec prisma validate; pnpm --dir apps/api exec prisma migrate status` | Schema valid; 6 migrations; database schema up to date | 0 | `sha256:04eaaee37eeace5672a663213b4e9db5a0869baea68b533ace7f8fd3dfa3d700` |
| Isolated hydrology | `pnpm --dir packages/hydrology-engine test` | 63 passed, 1 failed at `http-clients.test.ts:128`, expected 2 attempts and observed 1 | 1 | `sha256:23ec0b3daa65d37af564420a881016bbb69516a6dd3b866ab0892a976048c2cc` |

### Known failures

- **Groq**: `apps/api/src/presentation/routes/agronautas.test.ts`, `POST /fields/:id/chat cae a modo degradado cuando Groq no está disponible`, `false !== true`; unrelated to this Agronautas hardening change, but it makes the full API command fail.
- **Hydrology**: `packages/hydrology-engine/src/clients/http-clients.test.ts:128`, finite retry timeout test observes one attempt instead of two (`63/64`). It reproduces in the isolated package run and is not honestly classifiable as only Turbo concurrency noise; it remains outside this Agronautas change.
- **Initial parallel race**: an earlier parallel build/test batch encountered missing workspace `dist` exports and a web NFT file race. The sequential build passed 4/4; this is not classified as an implementation failure.

## Configured Service Evidence

Read-only configured-service probe, using `.env` values without printing secrets:

- PostgreSQL connection: passed.
- Latest migrations: `20260805090000_agronautas_job_identifier_contract`, `20260804190000_agronautas_runtime_hardening`, `20260718120000_municipality_alert_coverage`.
- Public table count: `21`.
- Redis `PING`: passed.
- Agronautas queue lengths: wait `0`, processing `0`, dead-letter `0`.
- Open-Meteo: HTTP `200`.
- Prisma migration status: database schema up to date.

No recompute/lineage transaction was executed in this verification. The available legacy runtime scripts produce receipt artifacts and were not used under the explicit no-receipt constraint. Therefore current API admission, worker consumption, durable `queued → leased → running → completed` evidence, readiness heartbeat, live camelCase read-back, cleanup inventory, and live alert IDs are **unavailable as fresh evidence**.

## Source and Contract Findings

- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` now dual-writes worker signal and risk snapshot persistence to quoted camelCase Prisma/API columns and legacy snake_case columns, including conflict updates.
- Focused Python persistence tests pass and verify quoted `"jobId"`, `"runId"`, and field coordinate identifiers.
- The shared factory emits queue `bull:agronautas-runtime:wait`, stable IDs, trace/correlation/causation IDs, and lease attempt/max-attempt metadata; `worker.main` starts `WorkflowQueueConsumer.consume_forever()`.
- The worker result intentionally has `alertSnapshotIds: []`; alert generation is an API use-case boundary. The deterministic API threshold test proves below `70` emits no flood alert and at `70` emits a deterministic alert linked to risk snapshot, source run, job run, and acquisition time.
- `risk-v0` and `open-meteo-basic-v1` remain separate, divergent algorithm identities. The canonical gate remains `{ status: "undecided", engineId: null }`; vectors retain `parityClaim: false`.
- Intake preserves submitted `maize` in focused tests; PostGIS `resolveCoverage` remains authoritative; demo coordinates and Iberá municipality seed data are not parcel-coverage evidence.
- `render.yaml` remains exactly two Native Node services; no Python Render service or Docker runtime was added.

## Spec Compliance Matrix

| Requirement | Scenario | Evidence | Result |
|---|---|---|---|
| Versioned Risk-Engine Contract | Divergence is honest | Contract tests and golden vectors; `parityClaim: false` | ✅ COMPLIANT |
| Versioned Risk-Engine Contract | Legacy migration preserves meaning | Additive migration/current status; no runtime historical-row preservation test | ❌ UNTESTED |
| Aligned Recompute Runtime | Valid dispatch | Shared factory, queue/entrypoint contract tests, schema validation; no fresh worker transaction | ⚠️ PARTIAL |
| Aligned Recompute Runtime | Boundary failure | Dispatch-failure and unsupported-boundary tests | ✅ COMPLIANT |
| Durable Jobs, Heartbeats, Retry, and DLQ | Retryable provider failure | Focused fake/repository tests; no live retry transition | ⚠️ PARTIAL |
| Durable Jobs, Heartbeats, Retry, and DLQ | Restart or exhausted retry | Focused claim/reclaim/DLQ tests; no live restart/exhaustion run | ⚠️ PARTIAL |
| Freshness and Alert Lineage | Successful lineage | Corrected camelCase SQL, focused persistence tests, deterministic threshold lineage test; no fresh worker read-back or live alert transaction | ⚠️ PARTIAL |
| Freshness and Alert Lineage | Stale or missing provider | Stale/degraded/no-alert tests | ✅ COMPLIANT |
| Correlated Recompute Path | Complete success | Shared queue/state tests only; no fresh recompute transaction | ⚠️ PARTIAL |
| Correlated Recompute Path | Terminal provider failure | Fake retry/DLQ outcomes; no live terminal failure query | ⚠️ PARTIAL |
| Generic Crop and Validated Corrientes Coverage | Covered non-rice field | Intake/domain/field repository tests preserve `maize`; no SQL probe used as intake evidence | ✅ COMPLIANT for bounded intake behavior |
| Generic Crop and Validated Corrientes Coverage | Unsupported locality or migration | Unsupported-locality tests and migration inspection; no runtime legacy-row proof | ⚠️ PARTIAL |
| Explicit Render, Evidence, and Product Boundaries | No unsupported runtime claim | Static Render tests and explicit Python-hosting prerequisite; configured connectivity not promoted to deployment evidence | ✅ COMPLIANT |
| Explicit Render, Evidence, and Product Boundaries | Iberá evidence is excluded | Iberá browser test kept separate; no tracked Iberá application source diff | ✅ COMPLIANT |

**Compliance summary**: 7/14 scenarios fully compliant; 6 partial; 1 untested. The non-zero full suites and missing fresh recompute/alert/read-back evidence prevent a passing final gate.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Versioned engines and canonical gate | ✅ Implemented | Divergence vectors pass; canonical selection remains explicitly undecided. |
| Queue and worker entrypoint | ✅ Implemented | Shared queue/factory and Python consumer entrypoint tests pass. |
| Durable job transitions | ⚠️ Focused only | Guarded PostgreSQL transition tests pass; no fresh worker transaction. |
| CamelCase worker lineage persistence | ✅ Implemented statically | SQL names both canonical quoted columns and legacy columns; focused regressions pass. |
| Alert lineage | ⚠️ Partial | Deterministic API threshold lineage passes; worker does not generate alert snapshots. |
| Crop and coverage boundary | ✅ Implemented for bounded behavior | Submitted crop is preserved; PostGIS remains the coverage authority. |
| Render and Iberá boundaries | ✅ Preserved | Two Node services only; no Iberá application source change used as Agronautas evidence. |

## Design Coherence

| Decision | Followed? | Notes |
|---|---|---|
| Contract-first additive changes | ✅ Yes | JSON contracts, shared factory, additive migrations, and tolerant legacy columns preserved. |
| Python is intended consumer; Render remains Node-only | ✅ Yes | Entrypoint is consumer-backed; Render has no fabricated Python service. |
| PostgreSQL is durable state authority | ✅ Yes statically | Worker store targets PostgreSQL; Redis is transport/result state. Live transition proof unavailable in this run. |
| Risk engines remain non-canonical | ✅ Yes | No engine selection, parity claim, or historical rewrite. |
| Iberá-Alerta remains separate | ✅ Yes | Iberá artifacts/source remain outside Agronautas correctness evidence. |

## Strict TDD

- TDD evidence table exists in `apply-progress.md` for all 16 checked tasks.
- Test files cited by the corrective tasks exist and execute successfully: worker `35/35`, focused API `61/61`, contracts `5/5`, and web `92/92`.
- RED/GREEN/triangulation/refactor evidence is present for all task rows. Safety-net claims are accepted from the apply artifact; no historical pre-change execution can be independently reconstructed from the current worktree.
- Test layer distribution: unit/contract and repository tests dominate; Python worker integration seams are present; Playwright coverage is E2E but only for mocked Iberá municipality behavior. No Agronautas recompute Playwright spec exists.
- Changed-file coverage: skipped; no coverage tool or configured threshold command is available.
- Quality metrics: build/type-check passed. Linter was not run because the user requested focused/full verification and excluded unrelated review flows.

### Assertion Quality

**Assertion quality**: ✅ No new tautology or ghost-loop issue was found in the corrective worker persistence and deterministic alert tests. The prior ghost demo-alert assertion was corrected and the companion non-empty threshold case passes.

## Repository Preservation

- Branch remained `continuation/agronautas-ibera-unified-2026-08-04`.
- HEAD remained `0be9ba8049dbc6aba01b1900f2c52794f087574d`.
- Worktrees preserved: canonical, `integration/merge-total-ibera-agronautas-20260727`, and `merge-total`.
- Stashes preserved: `preserve-stability-smoke-report-before-ibera-final-review` and `pre-cambios snapshot transfer`.
- No branch/worktree/stash was created, switched, deleted, or modified.
- `git diff --check` exited `0`; only expected Windows LF→CRLF normalization warnings were emitted.
- Existing dirty Agronautas/continuation work and unrelated untracked Iberá OpenSpec artifacts were preserved.

## Issues Found

### CRITICAL

1. **Full API suite fails**: Groq degraded-chat assertion (`218/219`); unrelated to this change but required full command is non-zero.
2. **Root and isolated hydrology suites fail**: finite retry timeout test at `http-clients.test.ts:128` (`63/64`); unrelated to this change but required full command is non-zero.
3. **Fresh integrated lineage evidence is unavailable**: corrected camelCase persistence and deterministic alert lineage pass focused/static checks, but no safe non-receipt worker recompute/read-back transaction was executed and the worker result does not generate alert snapshots.

### WARNING

1. Live retry, restart recovery, exhausted DLQ, and readiness-heartbeat transitions were not exercised; focused tests are not a substitute for runtime evidence.
2. Historical snapshot meaning preservation has additive migration support but no runtime legacy-row preservation test.
3. No Agronautas-specific Playwright recompute/status/lineage flow exists; the 2/2 browser run is mocked Iberá municipality behavior and is excluded from Agronautas proof.
4. The configured read-only probe proves connectivity/provider reachability only; it does not prove validated Corrientes intake coverage or non-rice API intake persistence.
5. No live production/Render worker availability evidence exists; Render evidence is static Node-boundary evidence only.

### SUGGESTION

1. Add a safe non-receipt recompute harness with canonical camelCase read-back and live alert-generation assertion.
2. Add live retry/DLQ and readiness-heartbeat probes.
3. Resolve the Groq environment assertion and hydrology timeout retry behavior before archive.

## Verdict

**FAIL / BLOCKED**. Lineage corrections, deterministic alert lineage, queue contracts, crop/coverage seams, Render boundaries, and risk-engine undecided status pass focused/static verification. The final gate remains blocked by the non-zero full API/hydrology suites and unavailable fresh non-receipt recompute/read-back/alert evidence.
