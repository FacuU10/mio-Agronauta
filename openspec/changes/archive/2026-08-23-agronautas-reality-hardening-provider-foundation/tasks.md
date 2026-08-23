# Tasks: Agronautas Reality-Hardening Provider Foundation

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,400–2,200 |
| 400-line budget risk | Low (99,999 budget) |
| Chained PRs recommended | No |
| Suggested split | A → B → C → D |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| A | Auth/UI/startup | API+web tests | Bearer/no-bearer API; no Docker | Routes, landing, config |
| B | Disabled queue-worker topology | API tests + pytest | Redis/Postgres; Render inspection | Scheduler/queue/worker/render |
| C | Envelope and providers | Contracts/API + pytest | Georef/POWER/Open-Meteo; labeled fixtures | Schema/adapters/UI state |
| D | Runtime acceptance | `pnpm test && pnpm build` | Playwright/API/DB/Redis/worker/cron/Render | Harness/report |

## Phase 1: Auth, Truthful UI, and Startup Contract

- [x] 1.1 RED — `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/api/src/presentation/routes/health.test.ts`, `apps/api/src/server.test.ts`, `apps/web/src/components/landing/homepage.test.tsx`, `apps/api/src/infrastructure/config/agronautas-runtime.test.ts`: assert 401/no use-case, 404, truthful labels, disabled readiness, and the supporting runtime-config contract; run tests (fail), logs; rollback tests.
- [x] 1.2 GREEN — `apps/api/src/presentation/routes/agronautas.ts`, `apps/api/src/presentation/middleware/agronautas-auth.ts`, `apps/web/src/components/landing/homepage.tsx`, `apps/web/src/lib/agronautas/schemas.ts`, `apps/web/src/lib/agronautas/service.ts`, `apps/api/src/infrastructure/config/agronautas-runtime.ts`, `apps/api/src/server.ts`: add guards, truthful copy, typed runtime response, mock runtime contract, and preflight; run API/web tests; evidence requests/markup/startup; rollback files.
- [x] 1.3 REFACTOR — `apps/api/src/presentation/routes/agronautas.ts`, `apps/api/src/presentation/middleware/agronautas-auth.ts`, `apps/web/src/components/landing/homepage.tsx`: isolate helpers without ownership claims; run tests + `pnpm build`; logs; revert refactor.

### Gatekeeper remediation before Phase 2

- [x] R1 — Refuse Agronautas scheduler startup when `AGRONAUTAS_SCHEDULER_ENABLED=true` lacks a proven queue/worker dispatch capability; expose an unavailable reason and preserve the explicitly injectable proven-capability seam for the future queue implementation.
- [x] R2 — Make `/ready` and `/agronautas/runtime` report worker and scheduler availability truthfully: optional workers are unavailable but not required, while required workers fail readiness without a current heartbeat.
- [x] R3 — Align the shared and web runtime validators with the API's `scheduler.status: unavailable` response; require its reason and reject enabled/live status claims.

## Phase 2: Scheduler → Redis → Python Worker → Result/DLQ

- [x] 2.1 RED — `apps/api/src/infrastructure/jobs/agronautas-scheduler.test.ts`, `apps/api/src/server.test.ts`, `apps/workflow-runtime-python/tests/test_queue_consumer.py`, `apps/workflow-runtime-python/tests/test_agronautas_jobs.py`, `apps/api/src/build-config.test.ts`: fail on malformed/duplicate jobs, timeout/schema drift, retry exhaustion, absent worker, disabled startup; RED captured before implementation; rollback tests.
- [x] 2.2 GREEN — `apps/api/src/infrastructure/jobs/agronautas-scheduler.ts`, `apps/api/src/server.ts`, `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts`, `packages/zod-schemas/src/agronautas.ts`, `packages/contracts/schemas/agronautas-scheduled-window-job.schema.json`, `apps/workflow-runtime-python/src/worker/schema/agronautas-scheduled-window-job.schema.json`, `apps/workflow-runtime-python/src/worker/queue/consumer.py`, `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py`, `apps/api/src/infrastructure/observability/agronautas-telemetry.ts`, `apps/workflow-runtime-python/pyproject.toml`, `render.yaml`: implement typed envelope, states, lease/heartbeat/retry/result/DLQ, worker install/Render configuration, and disabled default; run tests/build; record unavailable live-service evidence.
- [x] 2.3 REFACTOR — `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts`, `apps/workflow-runtime-python/src/worker/queue/consumer.py`, `apps/api/src/infrastructure/observability/agronautas-telemetry.ts`: expose idempotency, heartbeat/result/DLQ telemetry, and failures; API focused tests and pytest pass; retain queue evidence; revert refactor boundary.

## Phase 3: Evidence Envelope and Credential-Free Providers

- [x] 3.1 RED — `packages/zod-schemas/src/agronautas.test.ts`, `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.test.ts`, `apps/api/src/infrastructure/config/provider-matrix.test.ts`, `apps/workflow-runtime-python/tests/test_agronautas_providers.py`: fail on invented timestamps, wrong WGS84/C/mm-day units, timeout/schema drift, stale lineage, licensing unavailable; run contracts/API/pytest, RED output; rollback tests.
- [x] 3.2 GREEN — `packages/zod-schemas/src/agronautas.ts`, `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts`, `apps/api/src/infrastructure/config/provider-matrix.ts`, `apps/api/src/infrastructure/observability/agronautas-telemetry.ts`, `apps/workflow-runtime-python/src/worker/providers/agronautas_evidence.py`: implement envelope, Georef 2.1, POWER time-standard, Open-Meteo horizon/model/retrieval, unavailable modes, and the default provider-matrix telemetry wiring; run tests/build; evidence real HTTP/status/latency/hash/run IDs separate from fixtures; rollback schema/adapters.
- [x] 3.3 REFACTOR — `apps/web/src/lib/agronautas/schemas.ts`, `apps/web/src/lib/visibility/evidence-state.ts`, `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts`: block live rendering for seam/mock/unavailable; run contracts/web tests, snapshots; revert refactor.

## Phase 4: Real Runtime Verification (No Docker)

- [x] 4.1 RED — created `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts` and `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts`; the focused Node suite initially failed before the harness implementation, then passed after GREEN. The Playwright suite requires real snapshots/screenshots/network/console, API/BFF traffic, and explicit blocked states.
- [x] 4.2 GREEN — created `apps/api/src/scripts/verify-agronautas-runtime-real.ts` and updated `apps/web/tests/e2e/README.md`; real API/BFF/provider/DB/Redis checks run without Docker, worker/queue/cron/Render/hydrology remain truthful when unavailable or unauthorized, and hydrology writes require owner/token authorization with no fake dry-run.
- [x] 4.3 REFACTOR — separated run-linked runtime and browser manifests, retained fixture-versus-real evidence labels, preserved blocked/not-run states, and documented rollback/evidence behavior. Initial focused tests/build/worker/Playwright evidence was later corrected by the targeted validator remediation below; no production claim was made.

### Targeted Phase 4 validator remediation

- [x] V4.1 RED/GREEN/REFACTOR — classify auth evidence as `unavailable` without a bearer token or real field, `blocked` for invalid-field/status/chat 404 probes, and pass only after explicit real-field 401/200 observations; keep public unauthenticated checks explicit.
- [x] V4.2 RED/GREEN/REFACTOR — add reproducible `pnpm worker:test` / package-local pytest commands and record worker pytest as pass, unavailable, or blocked from the actual command rather than historical evidence.
- [x] V4.3 RED/GREEN/REFACTOR — label managed Playwright API/web harness evidence separately from full DB/Redis/worker/cron/Render topology, preserve real BFF/provider states, and record console warnings without claiming a clean console.

Out of scope: identity/tenant ownership, official Iberá geometry, Google Maps, soil, economics, marketplace/credit/insurance. Scheduler/hydrology writes require runtime authorization.
