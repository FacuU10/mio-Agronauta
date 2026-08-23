# Apply Progress: Agronautas Reality-Hardening Provider Foundation

## Phase 1 / Work Unit A: Auth, Truthful UI, and Startup Contract

**Status:** complete  
**Mode:** Strict TDD  
**Correction:** Autonomous corrective rerun, exactly once after gatekeeper feedback  
**Scope:** Phase 1 only; Phase 2–4 untouched

### Completed Tasks

- [x] 1.1 RED — Added route, readiness, server, and landing contract tests for unauthorized access, field existence, truthful labels, and disabled readiness.
- [x] 1.2 GREEN — Protected status/chat, preserved the shared-token/no-ownership boundary, made unsupported landing claims unavailable or illustrative, and exposed typed scheduler/worker runtime state.
- [x] 1.3 REFACTOR — Kept route/UI helpers and contracts aligned; corrected roadmap and insurance copy after gatekeeper feedback.

### Gatekeeper Corrections

1. Declared the supporting Phase 1 files in `tasks.md`: `apps/api/src/presentation/routes/health.test.ts`, `apps/api/src/server.test.ts`, `apps/web/src/lib/agronautas/schemas.ts`, and `apps/web/src/lib/agronautas/service.ts`. These are required by the Phase 1 readiness/runtime contract and were not unrelated edits.
2. Replaced factual roadmap dates/phases with `Plan ilustrativo N` and `Fecha no confirmada`, added `fechas y fases no confirmadas`, and changed the insurance banner to `Capacidad futura no disponible`. Added regression assertions for all of these claims.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/api/src/infrastructure/config/agronautas-runtime.test.ts`, `apps/api/src/presentation/routes/health.test.ts`, `apps/api/src/server.test.ts`, `apps/web/src/components/landing/homepage.test.tsx` | API integration + web SSR | ✅ Prior Phase 1 baseline was green | ✅ Prior RED captured missing auth/readiness/truthful UI behavior | ✅ API route/runtime/readiness/server tests passed 66/66; web passed 6/6 | ✅ Unauthorized, missing field, disabled runtime, unavailable UI, and illustrative roadmap paths covered | ✅ Existing route/config/UI boundaries retained |
| 1.2 | `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/api/src/infrastructure/config/agronautas-runtime.test.ts`, `apps/web/src/components/landing/homepage.test.tsx` | API integration + web SSR | ✅ API 53/53 and web 4/4 before correction | ✅ Prior RED captured runtime contract and unsupported factual claims | ✅ API focused suite passed 66/66; web focused suite passed 6/6 | ✅ Real and demo runtime responses plus unavailable/illustrative UI variants exercised | ✅ No ownership claims added; scheduler remains disabled by default |
| 1.3 | `apps/web/src/components/landing/homepage.test.tsx` | Web SSR contract | ✅ Web safety net passed 4/4 before correction | ✅ New roadmap/insurance assertions failed 1/5 before production edit | ✅ Focused web suite passed 6/6 | ✅ Separate tests verify semantic labels and all five roadmap entries | ✅ Copy-only correction, no new UI abstraction |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm exec node --import tsx --test --test-concurrency=1 src/presentation/routes/agronautas.test.ts src/infrastructure/config/agronautas-runtime.test.ts src/presentation/routes/health.test.ts src/server.test.ts` from `apps/api` — **66/66 passed**; `pnpm exec node --import tsx --test src/components/landing/homepage.test.tsx` from `apps/web` — **6/6 passed**. |
| Runtime harness command/scenario and exact result | API Supertest-style route harness covered bearer/no-bearer, missing-field 404, versioned runtime, demo behavior, readiness, and disabled scheduler; **66/66 passed**. No Docker, provider, worker, cron, or production write was used. |
| Build command and exact result | `pnpm run build` from `apps/api` — **passed**; `pnpm run build` from `apps/web` — **passed**. Existing warning only: unused `React` in `src/app/municipalities/ingest/page.test.tsx`. |
| Git diff check | `git diff --check` — **passed**. Changed source remains limited to the existing Phase 1 set plus the Phase 1 task/apply artifacts; no Phase 2–4 implementation files changed. |
| Rollback boundary | Revert `apps/web/src/components/landing/homepage.tsx`, its test, the Phase 1 task-scope lines, and `apply-progress.md`; the existing Phase 1 API/runtime changes remain independently revertible. |

### Files Changed in This Corrective Rerun

- `apps/web/src/components/landing/homepage.tsx` — roadmap and Insurtech claims explicitly illustrative/unavailable.
- `apps/web/src/components/landing/homepage.test.tsx` — regression coverage for dates, phases, and insurance wording.
- `openspec/changes/agronautas-reality-hardening-provider-foundation/tasks.md` — declared required Phase 1 supporting files.
- `openspec/changes/agronautas-reality-hardening-provider-foundation/apply-progress.md` — cumulative hybrid progress artifact.

## Targeted Gatekeeper Remediation Before Phase 2

**Status:** complete  
**Scope:** Readiness/startup boundary only; no provider or Phase 2 queue/worker implementation was added.

### Completed Corrections

- [x] R1 — `AGRONAUTAS_SCHEDULER_ENABLED=true` now returns a stopped runtime with `status: unavailable` and `reason: scheduler_dispatch_capability_not_configured` unless an injected dispatcher and proven worker capability are present. The old planning-only dispatcher cannot start the scheduler; startup logs the explicit unavailable reason.
- [x] R2 — `/ready` reports `worker: { status: unavailable }` when no capability/heartbeat exists, does not include an optional worker in `requiredChecks`, and returns `503` with `failedRequiredChecks: ["worker"]` when `AGRONAUTAS_RUNTIME_REQUIRED=true`. `/agronautas/runtime` reports scheduler unavailable instead of enabled/unverified when the flag is set without the dispatch capability.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| R1 | `apps/api/src/server.test.ts`, `apps/api/src/presentation/routes/agronautas.test.ts` | API integration | ✅ 25/25 focused baseline | ✅ Flag-only startup and runtime route initially reported started/enabled | ✅ 68/68 focused API tests | ✅ Proven injected capability still starts the seam and reads cadence state; flag-only path remains unavailable | ✅ Explicit runtime status/reason and warning log; no queue wiring added |
| R2 | `apps/api/src/presentation/routes/health.test.ts`, `apps/api/src/server.test.ts` | API integration | ✅ 25/25 focused baseline | ✅ Optional worker initially appeared healthy/required; mandatory response lacked unavailable status | ✅ 68/68 focused API tests | ✅ Optional worker, mandatory worker, dependency failure, and no-acquisition paths covered | ✅ Shared worker detail/status mapping preserves existing health shape |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm exec node --import tsx --test --test-concurrency=1 src/presentation/routes/agronautas.test.ts src/infrastructure/config/agronautas-runtime.test.ts src/presentation/routes/health.test.ts src/server.test.ts` from `apps/api` — **68/68 passed**. |
| Build command and exact result | `pnpm run build` from repository root (`turbo run build`) — **4 successful tasks**, API TypeScript build and Next.js production build passed; existing unused `React` warning remains in `apps/web/src/app/municipalities/ingest/page.test.tsx`. |
| Runtime harness command/scenario and exact result | Real API via `apps/api/node_modules/.bin/tsx.cmd src/index.ts`, no Docker: `GET /health` → **200**; with `AGRONAUTAS_SCHEDULER_ENABLED=true`, `GET /agronautas/runtime` → **200** with scheduler `enabled:false/status:unavailable/reason:scheduler_dispatch_capability_not_configured`; optional-worker `GET /agronautas/ready` → **200** with worker unavailable; with `AGRONAUTAS_RUNTIME_REQUIRED=true`, `GET /agronautas/ready` → **503**, `failedRequiredChecks:["worker"]`, worker status unavailable. |
| Rollback boundary | Revert the readiness/startup changes in `apps/api/src/server.ts`, `apps/api/src/presentation/routes/health.ts`, `apps/api/src/presentation/routes/agronautas.ts`, and `apps/api/src/infrastructure/config/agronautas-runtime.ts` plus their targeted tests; provider and Phase 2 queue/worker implementation files remain untouched. `server.ts` changed only at the minimal startup gate boundary. |

## Targeted Validator Follow-up / Work Unit R3

**Status:** complete  
**Mode:** Strict TDD  
**Scope:** Exact validator blocker only; no API behavior, provider, or Phase 2 queue/worker implementation changes.

### Completed Correction

- [x] R3 — Moved the runtime contract to the shared Zod package and re-exported it through the web schema. `scheduler.status: unavailable` now requires a bounded non-empty `reason`; `enabled` remains `false`, and unsupported `enabled`/`live` status claims remain rejected. The existing `disabled`, `unverified`, worker-unavailable, auth/404, landing-truthfulness, scheduler-refusal, and readiness-worker-unavailable paths remain preserved.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| R3 | `packages/zod-schemas/src/agronautas.test.ts`, `apps/web/src/lib/agronautas/service.test.ts` | Shared contract + web service integration | ✅ Shared 29/29 and web 4/4 before change | ✅ Shared import failed because the new contract was absent; web parser rejected `unavailable` with `invalid_enum_value` | ✅ Shared 30/30; web focused 5/5 after rebuilding the shared package | ✅ Missing reason rejected; `enabled`/`live` status claims rejected; API-shaped response parses through `getRuntime()` | ✅ One shared runtime schema is re-exported by web; no duplicate contract logic remains |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm exec node --import tsx --test --test-concurrency=1 src/agronautas.test.ts` from `packages/zod-schemas` — **30/30 passed**; `pnpm exec node --import tsx --test --test-concurrency=1 src/lib/agronautas/service.test.ts src/components/landing/homepage.test.tsx` from `apps/web` — **11/11 passed**; API regression suite — **68/68 passed**. |
| Runtime harness command/scenario and exact result | Web `getRuntime()` test fed the API-shaped real-mode response (`enabled:false`, `status:unavailable`, scheduler reason, worker-unavailable reason) through `runtimeInfoSchema` — **passed**; no external provider/queue/worker runtime was started because this correction is contract-only. |
| Build command and exact result | `pnpm run build` from repository root — **4 successful tasks**, including API TypeScript and web Next.js production builds; existing unused `React` warning only. |
| Rollback boundary | Revert `packages/zod-schemas/src/agronautas.ts`, `packages/zod-schemas/src/agronautas.test.ts`, `apps/web/src/lib/agronautas/schemas.ts`, `apps/web/src/lib/agronautas/service.test.ts`, and these R3 artifact lines; API routes/startup/readiness and Phase 2–4 files remain unchanged. |

### Files Changed in This Follow-up

- `packages/zod-schemas/src/agronautas.ts` — shared runtime schema with discriminated scheduler states and required unavailable reason.
- `packages/zod-schemas/src/agronautas.test.ts` — shared contract regression coverage for unavailable, missing reason, and unsupported enabled/live claims.
- `apps/web/src/lib/agronautas/schemas.ts` — re-export shared runtime schema/type instead of maintaining a divergent local validator.
- `apps/web/src/lib/agronautas/service.test.ts` — API-shaped web service parsing coverage.
- `openspec/changes/agronautas-reality-hardening-provider-foundation/tasks.md` — recorded R3 completion.
- `openspec/changes/agronautas-reality-hardening-provider-foundation/apply-progress.md` — cumulative follow-up evidence.

### Previously Completed Phase 1 Files Preserved

`apps/api/src/presentation/routes/agronautas.ts`, `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/api/src/infrastructure/config/agronautas-runtime.ts`, `apps/api/src/infrastructure/config/agronautas-runtime.test.ts`, `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, `apps/api/src/presentation/routes/health.test.ts`, `apps/web/src/lib/agronautas/schemas.ts`, and `apps/web/src/lib/agronautas/service.ts` remain part of the declared Phase 1 boundary. No ownership, tenant, or collaboration claims were introduced.

## Phase 2 / Work Unit B: Scheduler → Redis → Python Worker → Result/DLQ

**Status:** complete
**Mode:** Strict TDD
**Delivery:** single-pr / size-exception recorded by the task artifact
**Scope:** Phase 2 tasks 2.1–2.3 only; Phase 3 providers and Phase 4 runtime harness remain untouched.

### Completed Tasks

- [x] 2.1 RED — Added contract, duplicate, timeout/schema-drift, retry/DLQ, unavailable-worker, disabled-startup, and Render/configuration regression tests before production changes.
- [x] 2.2 GREEN — Added the typed scheduled-window envelope and shared/Python schemas, Redis Bull-compatible dispatcher with idempotency/DLQ, truthful capability-gated scheduler startup, Python worker validation/result/unavailable handling, queue state transitions, and explicit Render Python worker configuration.
- [x] 2.3 REFACTOR — Added structured heartbeat/result/DLQ telemetry while preserving the existing dispatcher, worker, and API boundaries.

### TDD Cycle Evidence

| Task | Test File | Layer | RED | GREEN | REFACTOR |
|---|---|---|---|---|---|
| 2.1 | `apps/api/src/infrastructure/jobs/agronautas-scheduler.test.ts`, `apps/api/src/server.test.ts`, `apps/api/src/build-config.test.ts`, `apps/workflow-runtime-python/tests/test_queue_consumer.py`, `apps/workflow-runtime-python/tests/test_agronautas_jobs.py` | API integration + Python worker contract | ✅ Tests were written and run before the Phase 2 implementation; initial failures covered missing scheduled-window behavior and capability wiring | ✅ API focused suite passed 34/34; Python suite passed 39/39 | ✅ Contract and failure-path assertions retained without relaxing disabled/unavailable semantics |
| 2.2 | Same Phase 2 test set plus shared schema tests | Shared contracts + API + worker | ✅ Schema and dispatcher expectations failed before implementation | ✅ `pnpm build` passed with 4 successful Turbo build tasks; API focused suite 34/34; Python suite 39/39 | ✅ Shared scheduled-window schema is reused by the workflow factory and Python JSON schema remains aligned |
| 2.3 | Dispatcher, consumer, telemetry, and worker tests | Queue observability + failure handling | ✅ Idempotency and failure-path expectations preceded implementation | ✅ API focused suite 34/34; Python suite 39/39 | ✅ Heartbeat, result, and DLQ events are emitted at durable Redis transition boundaries |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm -C apps/api exec node --import tsx --test src/infrastructure/jobs/agronautas-scheduler.test.ts src/server.test.ts src/build-config.test.ts src/application/usecases/request-risk-recompute-usecase.test.ts` — **34/34 passed**; from `apps/workflow-runtime-python`, `python -m pytest tests/test_queue_consumer.py tests/test_agronautas_jobs.py -q` — **30 passed**, followed by `python -m pytest -q` — **39 passed**. |
| Worker installation command and exact result | `pnpm worker:install` — **successfully built and installed** `workflow-runtime-python==0.2.0` in editable mode; only the expected user-level Scripts PATH warning was emitted. |
| Build command and exact result | `pnpm build` from repository root — **4 successful Turbo build tasks**; API TypeScript and Next.js production builds passed. Existing warning only: unused `React` in `apps/web/src/app/municipalities/ingest/page.test.tsx`. |
| Runtime harness command/scenario and exact result | API and Python fake-Redis integration harnesses passed via the focused tests. Real Redis/Postgres smoke is **N/A**: `redis-cli` and `pg_isready` are unavailable, localhost Redis connection was refused, and `python -m worker.main` exited with `redis.exceptions.ConnectionError`; no external writes were attempted. |
| Rollback boundary | Revert the Phase 2 changes in `apps/api/src/infrastructure/jobs/agronautas-scheduler.ts`, `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts`, `apps/api/src/infrastructure/observability/agronautas-telemetry.ts`, the scheduled-window schema/workflow files, Python consumer/runtime/schema/config files, `render.yaml`, and their Phase 2 tests. Phase 1/R1–R3 files remain independently identifiable. |

### Deviations and Constraints

- The task draft named `agronautas-runtime-recompute-job.schema.json`; the implementation correctly added the new `agronautas-scheduled-window-job.schema.json` because scheduled-window is the new Phase 2 envelope while the existing runtime-recompute contract remains unchanged.
- Render was inspected and configured only; no deployment or production worker capability is claimed.
- Scheduler startup remains disabled unless both a compatible dispatcher and proven worker capability are injected.
- The full `pnpm -C apps/api test` command did not exit within 900 seconds after reaching 129 passing tests; the Phase 2-focused API suite completed 34/34 and is the recorded gate for this work unit.

### Remaining Tasks

- [x] 2.1–2.3 Phase 2 scheduler → Redis → Python worker → result/DLQ
- [x] 3.1–3.3 Phase 3 evidence envelope and credential-free providers
- [ ] 4.1–4.3 Phase 4 real runtime verification

### Status

Phase 1 tasks **1.1–1.3 plus validator/startup/readiness corrections R1–R3**, Phase 2 tasks **2.1–2.3**, and Phase 3 tasks **3.1–3.3** are complete; Phase 4 remains pending. Ready for the next apply batch; this executor did not launch review, receipt, freeze, hash, Judgment Day, or lifecycle gates.

## Phase 3 / Work Unit C: Evidence Envelope and Credential-Free Providers

**Status:** complete  
**Mode:** Strict TDD  
**Delivery:** single-pr / size-exception recorded by the task artifact  
**Scope:** Phase 3 tasks 3.1–3.3 only; Phase 4 runtime harness remains untouched.

### Completed Tasks

- [x] 3.1 RED — Added failing contract, adapter, provider-matrix, Python parser, and web visibility tests for invented timestamps, provider-specific units, timeout/schema drift, stale lineage, licensing-unavailable state, and live-looking unavailable evidence. RED execution was captured before provider implementation.
- [x] 3.2 GREEN — Added versioned typed `agronautas-evidence-v1` envelopes with explicit retrieval/observation/forecast/time-standard/freshness/units/mode/HTTP/schema/run/lineage/degradation/latency fields; implemented real Georef 2.1, NASA POWER Daily, and commercial-use-gated Open-Meteo HTTP adapters; added Python parsers, provider matrix semantics, and provider telemetry.
- [x] 3.3 REFACTOR — Re-exported the shared envelope to web, made unavailable provider mode normalize to missing instead of observed, kept seam/mock states non-live, and made adapter compatibility aliases non-enumerable so strict envelope parsing remains valid.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `packages/zod-schemas/src/agronautas.test.ts`, `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.test.ts`, `apps/api/src/infrastructure/config/provider-matrix.test.ts`, `apps/workflow-runtime-python/tests/test_agronautas_providers.py`, `apps/web/src/lib/visibility/evidence-state.test.ts` | Shared contract + API adapter/matrix + Python parser + web unit | ✅ Prior Phase 2 focused suites green | ✅ 32 contract test run failed at absent envelope; API provider run failed on absent adapters/new semantics; Python collection failed because provider module was absent; web tests failed on unavailable mode rendering as observed | ✅ 32/32 shared contract tests, 12/12 API provider/matrix tests, 4/4 Python provider tests, and 6/6 web visibility tests passed | ✅ Georef retrieval-only, NASA UTC/local-solar, Open-Meteo forecast horizon/model, HTTP timeout/schema drift, stale lineage, and commercial licensing paths exercised | ✅ Strict envelope compatibility preserved; sentinel missing values cannot be claimed live |
| 3.2 | Same focused contract/API/Python suites | Shared contract + API integration + Python unit | ✅ 32/32 contracts and Phase 2 provider boundaries green before final adapter refactor | ✅ New adapter factories and envelope fields were absent; real HTTP path had no Georef/POWER implementation | ✅ 12/12 API provider/matrix tests, 4/4 Python provider tests, `pnpm build` 4/4 tasks, and contract schema validation passed | ✅ Custom fetch seams remain `seam`; explicit mock remains `mock`; unavailable mode carries reason, null observation, status/schema outcome, lineage, and no fabricated value | ✅ Provider matrix no longer invents `observedAt`; telemetry receives provider evidence metadata |
| 3.3 | `apps/web/src/lib/visibility/evidence-state.test.ts`, shared/API provider suites | Web unit + contract compatibility | ✅ 6/6 web visibility baseline after Phase 2 | ✅ Unavailable mode with source/timestamp resolved to `observed` | ✅ 6/6 web visibility tests and root build passed | ✅ Seam, mock, unavailable, invalid timestamp, observed, forecast, stale, and degraded states remain distinct | ✅ Web schema reuses shared envelope; adapter compatibility fields are non-enumerable and strict parsing accepts the envelope |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm exec node --import tsx --test --test-concurrency=1 src/agronautas.test.ts` from `packages/zod-schemas` — **32/32 passed**; API provider/matrix command — **12/12 passed**; `python -m pytest tests/test_agronautas_providers.py -q` — **4 passed**; web visibility command — **6/6 passed**. |
| Contract/API/Python/web validation | `packages/contracts` Agronautas contract suite — **6/6 passed**; `validate-schemas` — **9 schemas validated**; `validate-agronautas-schema` — **passed**; worker full `python -m pytest -q` — **43 passed**. |
| Runtime harness command/scenario and exact result | Real provider HTTP smoke without writes: Georef 2.1 — HTTP **200**, schema **valid**, mode **live**, retrieval-only/WGS84/degrees, latency **246 ms** in first capture; NASA POWER Daily — HTTP **200** but provider sentinel `-999` values correctly degraded to **mode unavailable**, reason `provider_missing_value`, with no observed timestamp; Open-Meteo with explicit `commercialUseApproved:true` — HTTP **200**, schema **valid**, mode **live**, forecast horizon/model/UTC/retrieval captured, latency **1114 ms** in first capture. Subsequent smoke reconfirmed Georef/Open-Meteo live and NASA unavailable; no secrets or writes. |
| Build command and exact result | Root `pnpm build` — **4 successful Turbo tasks**; API and Next.js builds passed; existing unused React warning only. |
| Rollback boundary | Revert `packages/zod-schemas/src/agronautas.ts` and tests, API provider adapter/matrix/telemetry/route compatibility files and tests, Python `worker/providers/*` and test, web envelope/visibility files and tests, plus these Phase 3 task/progress sections. Phase 1 auth/truthful UI and Phase 2 scheduler/queue/worker contracts remain independently revertible. |

### Deviations and Constraints

- Georef’s real Corrientes response returns official province code `18`; the adapter preserves that provider code and does not invent the app’s `AR-W` normalization.
- NASA POWER returned its documented missing sentinel `-999` for the smoke date; the adapter records the real HTTP success but exposes provider mode `unavailable` rather than claiming a live climate value.
- Open-Meteo remains `unavailable` unless `commercialUseApproved:true` is explicitly supplied for real use; injected fixtures are always `seam` or explicit `mock`, never `live`.
- Google Maps, INTA/soil, market/FX/economics, official Iberá geometry, and regulated domains remain unavailable/out of scope. Phase 4 runtime harness was not implemented.

### Remaining Tasks

- [x] Phase 3 tasks 3.1–3.3 evidence envelope and credential-free providers
- [ ] Phase 4 tasks 4.1–4.3 real runtime verification

### Status

Phase 1 tasks **1.1–1.3 plus R1–R3**, Phase 2 tasks **2.1–2.3**, and Phase 3 tasks **3.1–3.3** are complete; Phase 4 remains pending. Ready for next batch / Phase 4 apply, not final verify. No review, receipt, freeze, hash, Judgment Day, or blocking lifecycle gates launched.

## Phase 3 / Telemetry Wiring Follow-up

**Status:** complete  
**Mode:** Strict TDD  
**Scope:** Small corrective follow-up to Phase 3 task 3.2; Phase 4 remains untouched.

### Completed Correction

- [x] Added `createRealProviderEvidencePort()` and changed the default Agronautas router provider port to construct with `createAgronautasTelemetry()`, so dashboard provenance evidence emits `agronautas.provider.evidence` telemetry instead of silently dropping the callback.

### TDD Cycle Evidence

| Task | Test File | Layer | RED | GREEN | REFACTOR |
|---|---|---|---|---|---|
| 3.2 telemetry wiring | `apps/api/src/infrastructure/config/provider-matrix.test.ts` | API provider-matrix unit | ✅ New test failed because the factory export was absent (`createRealProviderEvidencePort is not a function`) | ✅ Provider-matrix focused test passed **5/5**; Agronautas route integration suite passed **42/42** | ✅ Factory keeps pool injection explicit and the router's default path owns one telemetry instance |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec node --import tsx --test src/infrastructure/config/provider-matrix.test.ts src/infrastructure/adapters/agronautas-provider-adapters.test.ts` — **13/13 passed**; `pnpm --filter api exec node --import tsx --test src/presentation/routes/agronautas.test.ts` — **42/42 passed**. |
| Runtime harness command/scenario and exact result | Agronautas route harness exercised dashboard provenance with the default provider port; telemetry logger emitted `agronautas.provider.evidence` for degraded Open-Meteo evidence. **42/42 route tests passed**; no external writes. |
| Build command and exact result | Root `pnpm build` — **4 successful Turbo tasks**; existing unused `React` warning only. |
| Rollback boundary | Revert `apps/api/src/infrastructure/config/provider-matrix.ts`, `apps/api/src/infrastructure/config/provider-matrix.test.ts`, and the default provider construction import/call in `apps/api/src/presentation/routes/agronautas.ts`; Phase 1/2 and the remaining Phase 3 provider behavior remain independently revertible. |

### Status

The Phase 3 provider-matrix default path now emits telemetry for API-served evidence. Phase 4 tasks **4.1–4.3** are complete; no review or final verify was launched.

## Phase 4 / Work Unit D: Real Runtime Verification (No Docker)

**Status:** complete  
**Mode:** Strict TDD  
**Delivery:** single-pr / size-exception recorded by the task artifact  
**Scope:** Phase 4 tasks 4.1–4.3 only; no production deployment or production evidence claimed.

### Completed Tasks

- [x] 4.1 RED — Added the Node harness contract tests and the separately named real-traffic Playwright suite. The harness test was executed RED before implementation; the final focused suite passed **6/6**.
- [x] 4.2 GREEN — Added the real runtime harness and documented local execution. API health/readiness, PostgreSQL, Redis, provider HTTP, and BFF evidence are run against actual services when available; worker, queue proof, cron, Render, and hydrology writes remain explicit `blocked`/`not_run` states when prerequisites are absent.
- [x] 4.3 REFACTOR — Added run-linked JSON evidence, browser screenshot/HTML/network/console artifacts, fixture/real separation, blocked-state preservation, and artifact ignore rules.

### TDD Cycle Evidence

| Task | Test File | Layer | RED | GREEN | REFACTOR |
|---|---|---|---|---|---|
| 4.1 | `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts` | Node harness contract | ✅ Missing harness module initially failed as expected | ✅ **6/6 passed** | ✅ Assertions cover evidence shape, blocked states, provider evidence, and worker readiness extraction |
| 4.2 | API harness plus `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts` | Real API/BFF/runtime | ✅ Missing implementation and real-traffic lane preceded production code | ✅ API harness completed with API/Postgres/Redis checks; Playwright real-traffic suite passed | ✅ Run-linked manifests and no route stubs |
| 4.3 | Harness/browser evidence and documentation | Evidence/reporting | ✅ Initial evidence contract required implementation | ✅ Focused API/web tests, build, and browser suite passed | ✅ Fixture, seam, mock, unavailable, blocked, and not-run states remain distinct |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | API harness contract tests — **6/6 passed**; worker `python -m pytest -q` — **43 passed**; focused API/web suites and contract validation passed; root `pnpm build` — **4 successful Turbo tasks**. |
| Runtime harness command/scenario and exact result | `pnpm verify:agronautas:runtime` against the active local API on port `3401`: API health/readiness, Postgres, Redis, and real provider evidence were recorded; worker was unavailable, queue proof was `not_run`, hydrology was blocked without owner authorization, and Render was `not_run`. Real Playwright suite passed with BFF runtime HTTP **200**, `mode: real`, no route stubs, and worker unavailable. |
| Evidence artifacts | API: `apps/api/artifacts/agronautas-runtime/runtime-20260823T162611Z/runtime-evidence.json`; browser: `apps/web/test-results/agronautas-reality-runtime-965eb-vidence-without-route-stubs/agronautas-reality-runtime-browser-20260823T162917Z/`. |
| Known test limitation | Full API test command timed out after **134 passing** tests because of open handles; full web run reported **115/116**, with the remaining failure in the existing `page-client` fixture contract. Focused Phase 4/API/web gates passed. |
| Rollback boundary | Revert `apps/api/src/scripts/verify-agronautas-runtime-real.ts`, its test, `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts`, the Phase 4 README/command/ignore changes, and this Phase 4 artifact section; Phases 1–3 remain independently identifiable. |

### Deviations and Constraints

- No Docker, production deployment, worker completion, queue transition, Render API inspection, or hydrology write was claimed without the required live prerequisite.
- Open-Meteo commercial-use evidence requires explicit `AGRONAUTAS_OPEN_METEO_COMMERCIAL_APPROVED=true`.
- Runtime evidence always records `productionProven: false`.

### Remaining Tasks

- [x] Phase 4 tasks 4.1–4.3 real runtime verification

### Status

Phase 1 tasks **1.1–1.3 plus R1–R3**, Phase 2 tasks **2.1–2.3**, Phase 3 tasks **3.1–3.3**, and Phase 4 tasks **4.1–4.3** are complete. Ready for final verify; this executor did not launch review, receipts, freezes, hashes, Judgment Day, or lifecycle gates.

## Phase 4 / Targeted validator remediation

**Status:** complete for the assigned evidence corrections; final Phase 4/production acceptance remains unproven
**Mode:** Strict TDD
**Scope:** Exact fresh validator findings only; no providers, product domains, production deployment, or lifecycle gates

### Completed Corrections

- [x] V4.1 — `checkApi()` now establishes a real field through an authenticated field lookup before status/chat probes. It records `auth: unavailable` without a configured bearer token or real field, records `auth: blocked` for invalid-field or status/chat HTTP 404 results, and only claims unauthenticated 401 plus authenticated 200 behavior after the token/field prerequisites are proven. Public unauthenticated runtime/status/chat observations remain explicit and are not converted into auth proof.
- [x] V4.2 — Added the root `pnpm worker:test` command and documented the equivalent package-local install/test commands. The runtime harness runs `python -m pytest tests -q` from `apps/workflow-runtime-python`; missing Python/pytest is recorded as `worker_tests: unavailable`, command failure is blocked, and only an actual zero-exit run is pass.
- [x] V4.3 — Added topology labels to API/browser evidence. The managed Playwright harness is explicitly separate from full DB/Redis/worker/cron/Render topology; real BFF/provider evidence and blocked/not-run/unavailable states remain independently represented. Browser evidence records runtime warnings, including hydration mismatch warnings, without a clean-console claim.

### TDD Cycle Evidence

| Task | Test File / Command | RED | GREEN | REFACTOR |
|---|---|---|---|---|
| V4.1 | `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts` | ✅ 3 new auth-classification tests failed because the classifier was absent | ✅ Focused suite passed **10/10**; no-token and 404 probes cannot claim 401/200 | ✅ Auth claims are centralized and public unauthenticated checks remain explicit |
| V4.2 | `pnpm worker:test`; runtime harness `worker_tests` check | ✅ Historical-only worker pass was not reproducible in the fresh validation context | ✅ `pnpm worker:install` succeeded; `pnpm worker:test` passed **43/43**; harness recorded the exact package-local command and output | ✅ Missing-tool/failing-command branches preserve unavailable/blocked truth |
| V4.3 | `pnpm --filter web exec playwright test --list tests/e2e/agronautas-reality-runtime.spec.ts` and managed run | ✅ Manifest had no topology or console-warning classification | ✅ Test list found **1** test; managed real-traffic Playwright run passed **1/1** | ✅ Manifest labels `managed-playwright-harness`, keeps full topology `unproven`, and stores warnings |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | API harness contract suite: `pnpm exec node --import tsx --test --test-concurrency=1 src/scripts/verify-agronautas-runtime-real.test.ts` from `apps/api` — **10/10 passed**. Worker: `pnpm worker:test` — **43 passed in 28.67s**. |
| Runtime harness command/scenario and exact result | `pnpm verify:agronautas:runtime` produced `runtime-20260823T170431Z`: API **blocked** because the default port returned 404; evidence contains `auth: unavailable`, `bearer token is unavailable`, and status/chat `not_proven_without_real_field`; Postgres/Prisma/Redis/provider checks remained separately recorded, worker readiness **blocked**, queue **not_run**, hydrology **blocked**, Render **not_run**, `productionProven:false`. `worker_tests` recorded **43 passed** from the actual package-local command. |
| Playwright harness | `pnpm verify:agronautas:browser` managed API/web harness — **1/1 passed**; BFF/browser evidence remains local only, topology is labeled managed and full DB/Redis/worker/cron/Render topology remains unproven. |
| Build command and exact result | `pnpm build` — **4 successful Turbo tasks**; existing unused `React` warning only. |
| Console evidence | Hydration mismatch is retained as a captured runtime warning when present; no clean-console claim is made. |
| Rollback boundary | Revert `apps/api/src/scripts/verify-agronautas-runtime-real.ts` and test, root `package.json`, worker/browser/runtime READMEs and E2E manifest fields, plus this remediation section. Existing Phase 1–3 and original Phase 4 provider/BFF evidence remain independently identifiable. |

### Constraints / Honest boundary

- No bearer token and no real field ID were available in this run; authenticated status/chat acceptance is **not proven**.
- Real provider evidence remains preserved: Georef is live with valid schema; NASA POWER missing sentinels remain unavailable; Open-Meteo remains unavailable without explicit commercial approval.
- The managed Playwright lane is not a substitute for full Postgres/Redis/worker/cron/Render topology, and no production claim is made.
- The captured hydration mismatch could not be safely attributed to a specific application defect in this remediation; it is documented as a runtime warning only.

### Remaining

- [x] V4.1–V4.3 targeted Phase 4 validator remediation
- [ ] Authenticated API/BFF status/chat proof with a configured token and verified real field ID
- [ ] Full DB/Redis/worker/queue/cron/Render topology and production acceptance

Status: targeted evidence remediation complete; Phase 4 and production acceptance remain unproven. No review, receipts, freezes, hashes, Judgment Day, or blocking lifecycle gates launched.
