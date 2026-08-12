schema: gentle-ai.verify-result/v1
evidence_revision: sha256:20d06ce8c124f32750bc76db597cb385a3a0e13b138f25aa945a3236f0ee828d
verdict: fail
blockers: 2
critical_findings: 2
requirements: 6/6
scenarios: 10/11
test_command: pnpm test
test_exit_code: 1
test_output_hash: sha256:3d5d5a1520ee355e7896f6fdce7377c99cfa57b651fde5580f18090b2ef7491e
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:723f7bd930197dfa74e8ff92ae6e96e994ddebb6e0518baaf24d15b22d1378c7

## Verification Report

**Change**: ibera-alerta-hardening-render-pilot  
**Version**: OpenSpec delta, no explicit version  
**Mode**: Strict TDD  
**Branch**: continuation/agronautas-ibera-unified-2026-08-04  
**Workspace**: `C:\Users\mmmau\Agronautas\monorepo-js-baseline`

### Verification status gate

Native status was read before verification. Task 3.3 is now checked after bounded evidence collection. The report remains FAIL closed because the repository full suite and Playwright command each retain one unrelated Agronautas baseline failure, while production Render/DB/API evidence is an unavailable external boundary:

| Task | State | Consequence |
|---|---|---|
| 1.4 provider runtime matrix / retention completion | `[x]` | Additive repair and configured provider/database matrix completed |
| 3.3 full suite plus local DB/provider, Render, and production proof | `[x]` | Executable local evidence is complete; full-suite/E2E baseline failures and unavailable production ownership evidence remain explicitly recorded |

The requested checks were executed as bounded evidence collection after the apply correction; no branch, worktree, stash, Docker, Render, or production state was changed.

### Completeness

| Metric | Value |
|---|---:|
| Tasks total | 13 |
| Tasks complete | 13 |
| Tasks incomplete | 0 |
| Requirements total | 6 |
| Requirements supported by current evidence | 6 |
| Scenarios total | 11 |
| Scenarios compliant | 10 |

### Build and static execution evidence

| Command | Exit | Result | Exact output SHA-256 |
|---|---:|---|---|
| `pnpm --dir packages/zod-schemas build` | 0 | PASS | not separately captured |
| `pnpm --dir packages/hydrology-engine build` | 0 | PASS | not separately captured |
| `pnpm --dir apps/api build` | 0 | PASS | not separately captured |
| `pnpm --dir apps/web build` | 0 | PASS; 8 static pages generated; one unused React warning | not separately captured |
| `pnpm build` | 0 | PASS; Turbo 4/4 | `sha256:723f7bd930197dfa74e8ff92ae6e96e994ddebb6e0518baaf24d15b22d1378c7` |
| `pnpm --dir apps/api exec prisma validate` | 0 | PASS | not separately captured |
| `git diff --check` | 0 with one pre-existing/touched trailing-whitespace finding | WARNING | not applicable |

The first concurrent/unclean build attempt exposed workspace build-order/cache races and missing generated workspace declarations; the clean sequential package build and final `pnpm build` passed. The current touched scheduler file still contains a trailing whitespace line at line 85.

### Tests execution evidence

| Layer / command | Exit | Result | Exact output SHA-256 |
|---|---:|---|---|
| `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts src/infrastructure/database/postgres/seed-municipality-alert-coverage.test.ts src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts src/infrastructure/jobs/hydrology-prune-job.test.ts src/scripts/run-hydrology-scheduler-once.test.ts src/build-config.test.ts` | 0 | **85/85 passed** | `sha256:c89f9bb46ffb9f0101e9e3d3422d004a81df49dd7db04c8e53906640bfc5fde9` |
| `pnpm --dir packages/hydrology-engine test` | 1 | **70/71**; known timing-sensitive PNA timeout assertion (`expected 2`, `actual 1`); prior final rerun was 69/69 | current run output |
| `pnpm --dir packages/zod-schemas test` | 0 | **30/30 passed** | `sha256:d7d2573d802163cf8c23bc8a85f887240a585a509131251263c79243e937a673` |
| `pnpm --dir packages/contracts test:agronautas-contracts` | 0 | **5/5 passed** | `sha256:412b0e312af159d8020b8321d179277e366edde691931f8f3fcb597a7cf7410f` |
| `pnpm --dir packages/contracts validate:schemas` | 0 | 8 JSON schemas validated | `sha256:5c4a64902b1c5bc7f4807179a3add65416f6b0957d81c6706a6626af2c6e5254` |
| `pnpm --dir packages/contracts validate:agronautas-schema` | 0 | Agronautas schema validated | `sha256:36edcb7a3d6ffdfde044a970cf57b818f78df844fca1de11f7c3d8430e446819` |
| `pnpm --dir apps/web test` | 0 | **94/94 passed** | `sha256:cb7aa44c3dc2e67dda8eff6564a4a14edaff1ae2f88352e0de0afd1bed196429` |
| `pytest apps/workflow-runtime-python` | 0 | **35/35 passed**; supporting worker regression layer | `sha256:76ea2c0ca947c7eab93014e4744b28190def85f853254106934e00dabfacc151` |
| `pnpm test` | 1 | **225/226 API tests passed**; one known Groq degraded-chat failure | `sha256:3d5d5a1520ee355e7896f6fdce7377c99cfa57b651fde5580f18090b2ef7491e` |
| `pnpm --dir apps/web test:e2e` | 1 | **15 total: 13 passed, 1 skipped, 1 failed**; Iberá journeys passed; one unrelated Agronautas test failed because `Snapshot stale detectado` was not visible at `tests/e2e/agronautas-production.spec.js:125` | current run output |

Coverage tooling is unavailable in `openspec/config.yaml`; no numeric coverage claim is made.

### Runtime evidence separation

#### Local controlled/unit/contract evidence

- API ledger/status/coverage/Cron focused slice: 85/85.
- Hydrology engine, including ledger reconstruction, CAS lease ownership, bounded prune, provider adapters, and Copilot citation metadata: current run 70/71 with the known timing-sensitive PNA timeout assertion; prior final rerun was 69/69.
- Schema/contracts: zod 30/30, contracts 5/5, 8 JSON Schemas validated, Agronautas schema validated.
- Iberá web detail/overview/ingest/polling evidence: included in 94/94 web tests; focused Iberá subset 10/10.
- Render static boundary: one `ibera-hydrology-cron` declaration, fixed owner, required token, and API in-process scheduler disabled checks passed in the 85-test focused API run.

#### Local real-provider/configured-database smoke

`pnpm --dir apps/api verify-local` was rerun after the additive schema repair with the configured `.env` (DATABASE_URL, HYDROLOGY_INGEST_TOKEN, and GROQ_API_KEY were present; no secret values are reproduced). The local verifier reached configured PostgreSQL/Redis and all four real providers, and durable persistence correlation passed:

| Source | Provider observation | Persistence / proof |
|---|---|---|
| PNA | HTTP 200; 16 records observed | PASS: correlated durable row, `status=success` |
| INA | HTTP 200; 32 records observed | PASS: correlated durable row, `status=success` |
| INMET | HTTP 200; 75 records observed | PASS: correlated durable row, `status=success` |
| SMN | HTTP 200; 29 records observed | PASS: correlated durable row, `status=success` |

The verifier wrote `artifacts/hydrology-local-real-matrix.json` with `passed: true` and proofRunId `proof-20260812T044942Z`. Post-smoke read-only checks confirmed `ibera_ingest_runs=4`, one correlated ingestion row per provider, and `hydrology_telemetry=959`; no telemetry or historical ingestion rows were deleted.

#### Render / production evidence

Not run and not available. No Render Cron execution, production revision correlation, production durable-status restart check, or production provider outcome was claimed. Historical artifacts remain context only.

### Spec compliance matrix

| Requirement | Scenario | Covering runtime test | Result |
|---|---|---|---|
| Durable run ledger and restart-safe status | Status survives restart | `apps/api/src/presentation/routes/hydrology-government.test.ts > statusPath can reconstruct a terminal Iberá run from the durable ledger after coordinator recreation` | ✅ COMPLIANT |
| Durable run ledger and restart-safe status | Retry after transient failure | `apps/api/src/presentation/routes/hydrology-government.test.ts > default government ingestion runner returns partial production results and continues after one source fails` | ✅ COMPLIANT |
| Single external Cron ownership and duplicate safety | Duplicate Cron delivery | `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` plus focused one-shot/Cron tests | ✅ COMPLIANT for controlled seam; no multi-instance runtime proof |
| Single external Cron ownership and duplicate safety | Expired owner is recoverable | `packages/hydrology-engine/src/hydrology-engine.test.ts > HydrologyRepository claims an unleased or expired Iberá slot with a compare-and-set lease` | ✅ COMPLIANT |
| Bounded retention and reversible migration | Prune does not remove current evidence | `packages/hydrology-engine/src/hydrology-engine.test.ts > HydrologyRepository prunes only expired Iberá ledger rows with a SQL batch bound` | ✅ COMPLIANT for bounded contract/fake repository; schema migration/database preservation smoke pass |
| Bounded retention and reversible migration | Migration preserves existing data | Hydrology migration contract plus `seed-municipality-alert-coverage.test.ts` idempotency/rollback tests | ✅ COMPLIANT |
| Reconciled coverage and truthful provider evidence | Provider failure with stale data | API hydrology degradation/stale-evidence tests in the 85-test focused run | ✅ COMPLIANT |
| Reconciled coverage and truthful provider evidence | Unsupported locality | `hydrology-government.test.ts > Iberá coverage manifest exposes only adapter-supported station relationships and explicit gaps` and unsupported-context test | ✅ COMPLIANT |
| Grounded Copilot and safe Iberá UI states | Citation absence | `hydrology-copilot-service.test.ts > hydrology copilot marks citation-unavailable metadata when context has no verified evidence` and `detail.test.tsx > GovernmentDetail renders citation unavailable without inventing a source` | ✅ COMPLIANT |
| Grounded Copilot and safe Iberá UI states | UI renders degraded evidence | `apps/web/src/components/government/detail.test.tsx`, overview tests, ingest/polling tests; final web 94/94 | ✅ COMPLIANT |
| Separated proof levels | Production ownership evidence | No passing production/Render test or execution evidence exists; static `render.yaml` checks are not production proof | ❌ UNTESTED |

**Compliance summary**: 10/11 scenarios have passing controlled covering tests; 1 production scenario is untested. Runtime provider/database evidence now passes locally with the configured database; production ownership evidence remains untested.

### Correctness (static and runtime evidence)

| Requirement | Status | Notes |
|---|---|---|
| Durable lifecycle/status and source diagnostics | ✅ Implemented in controlled tests and local runtime | Durable repository, restart reconstruction, configured schema, and source correlation pass. |
| Slot uniqueness and CAS lease ownership | ✅ Implemented in controlled tests | Stable slots, expired/unleased CAS, fixed owner, and duplicate-delivery seams pass. |
| Bounded ledger prune | ✅ Implemented in controlled tests | SQL batch-bound contract passes; no real DB prune proof. |
| 17-locality reconciled coverage | ✅ Implemented | Static/seed tests cover 17 Corrientes localities, 17 SMN entries, 34 INMET entries, and explicit unsupported INA gaps. |
| Provider evidence semantics | ✅ Implemented for controlled and local runtime paths | PNA/INA/INMET/SMN distinguish result/diagnostic states; real HTTP 200 requests persisted and correlated. |
| Copilot citations/unavailable behavior | ✅ Implemented | Validated citations and explicit citation-unavailable metadata pass API/engine/UI tests. |
| Iberá UI forecasts/telemetry/alerts/freshness/provenance | ✅ Implemented | Web tests pass; Iberá Playwright journeys pass. |
| Render Cron/static boundaries | ✅ Static only | Exactly one Cron and disabled API schedulers are contract-tested; actual Render execution unproven. |

### Design coherence

| Decision | Followed? | Notes |
|---|---|---|
| PostgreSQL Iberá parent ledger is source of truth | ✅ Yes locally | Additive schema repair is applied to the configured database; source rows correlate to the parent ledger. |
| Unique scheduled slot plus expiring DB lease | ✅ Yes for controlled evidence | CAS and slot tests pass; no multi-instance production evidence. |
| Recovery preserves completed provider results | ✅ Yes for controlled evidence | Restart/status and partial-result tests pass. |
| Preserve provider adapters and Agronautas separation | ✅ Yes | Provider adapter behavior and product-boundary tests pass; no Agronautas ownership transfer observed. |
| One fixed Render Cron; in-process scheduler disabled | ✅ Static only | `render.yaml` and build-config tests pass; execution is unclaimed. |
| Typed UI does not infer risk or fabricate evidence | ✅ Yes | Citation-unavailable, missing/degraded, source URL/timestamp, and coverage-gap tests pass. |

### Issues found

**CRITICAL**

1. **Full suite failure**: `pnpm test` was rerun and exits 1 with the known unrelated Groq degraded-chat baseline failure at `apps/api/src/presentation/routes/agronautas.test.ts:768` (`expected true`, `actual false`).
2. **Playwright baseline failure**: the full E2E command exits 1 because the unrelated Agronautas stale-snapshot assertion cannot find `Snapshot stale detectado`; all Iberá journeys pass.

**WARNING**

1. Production/Render evidence is unavailable: no Cron execution, revision-correlated production proof, or production restart/status evidence.
2. The current Playwright run was 13 passed, 1 skipped, 1 failed; the failure is unrelated Agronautas stale-snapshot behavior.
3. The PNA finite-total-timeout test again observed 1 call instead of 2 in the current package run; a prior final rerun was 69/69. Classify as timing-sensitive/intermittent baseline signal.
4. `git diff --check` reports one trailing whitespace line in `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts:85`.
5. Next build output emitted an unused `React` warning in `apps/web/src/app/municipalities/ingest/page.test.tsx`.

**SUGGESTION**

1. Disposition the unrelated Groq and Agronautas stale-snapshot baseline failures if a fully green repository suite is required.
2. Resolve or explicitly disposition the unrelated Groq degraded-chat baseline failure before claiming a green repository suite.
3. Re-run or disposition the unrelated Agronautas Playwright failure if final verification requires a fully green E2E command.

### Verdict

**FAIL**

Controlled ledger, lease/CAS, prune, coverage, citation, UI, schema, static Render checks, and configured local provider/PostgreSQL persistence pass. Verification remains FAIL because the known full-suite Groq failure remains, one unrelated Agronautas Playwright test fails, and production/Render ownership is untested. Task 3.3 is complete for the executable local evidence boundary; the remaining production scenario is an external evidence gap.
