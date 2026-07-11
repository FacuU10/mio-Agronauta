## Verification Report

**Change**: ibera-alerta-hydrology-ingest-scheduler  
**Version**: N/A  
**Mode**: Standard  
**Date**: 2026-07-11

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 10 |
| Tasks complete | 10 claimed in tasks/apply-progress |
| Tasks incomplete | 0 claimed; 2 verification blockers found against spec behavior |

### Build & Tests Execution
**Build**: ❌ Failed
```text
pnpm --dir packages/hydrology-engine build
> tsc
PASS

pnpm --dir apps/api build
> tsc
src/application/usecases/create-field-intake-usecase.ts(35,7): error TS2322: Type 'string' is not assignable to type '"rice"'.
src/presentation/routes/agronautas-demo.ts(21,26): error TS2345: Argument ... is missing cropCategory, provinceCode, countryCode.
ELIFECYCLE Command failed with exit code 2.
```

**Tests**: ✅ 105 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
pnpm --dir apps/api test
1..91
# tests 91
# pass 91
# fail 0

pnpm --dir packages/hydrology-engine test
1..14
# tests 14
# pass 14
# fail 0
```

**Coverage**: ➖ Not available.

### Local Bounded All-Source Verification Evidence

Bounded local evidence was collected from the API test suite without live network, polling, retries, browser automation, or DB writes:

```text
Subtest: default government ingestion runner saves all source fixtures when live clients fail or return empty
ok 80
assert.deepEqual(result.sources, ['PNA', 'INA', 'INMET', 'SMN'])
assert.deepEqual(saved.map((item) => item.source), ['PNA', 'INA', 'INMET', 'SMN'])
```

This proves the local all-source runner path can attempt PNA, INA, INMET, and SMN once each under the bounded stub harness. It does not prove production degraded all-source independence because the production-mode test currently proves fail-fast behavior.

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Hydrology ingest scheduling configuration | Render Free uses external cron | `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` + scheduler tests | ✅ COMPLIANT |
| Hydrology ingest scheduling configuration | Optional scheduler starts safely | `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.test.ts` > disabled by default; enabled start without immediate ingestion | ✅ COMPLIANT |
| Hydrology ingest scheduling configuration | Provider overrides are explicit | `packages/hydrology-engine/src/hydrology-engine.test.ts` > HYDROLOGY_*_URL overrides | ✅ COMPLIANT |
| Production-safe hydrology ingest | Manual all-source operator run | `hydrology-government.test.ts` > local all-source runner; static inspection of runner loop | ⚠️ PARTIAL |
| Production-safe hydrology ingest | Source-scoped run remains available | `POST /api/hydrology/ingest dispara ingesta manual...` | ✅ COMPLIANT |
| Production-safe hydrology ingest | Production token enforcement | `rejects missing or invalid hydrology bearer before runner execution`; `accepts hydrology bearer token`; `isHydrologyIngestAuthorized...fallback` | ✅ COMPLIANT |
| Production-safe hydrology ingest | Unrecoverable ingest startup error returns contract error, not unhandled Express 500 | No covering passing test; route has no local try/catch around `resolved.ingestionRunner(parsed.data)` | ❌ UNTESTED / LIKELY FAILING |
| Bounded deployed smoke verification | Local bounded all-source verification | API test subtest 80, stubbed all-source path | ✅ COMPLIANT |
| Bounded deployed smoke verification | Production bounded smoke after deploy | Not applicable before commit/deploy; runbook documents exactly one POST after deploy | ⚠️ PARTIAL |

**Compliance summary**: 6/9 scenarios compliant; 2 partial; 1 critical untested/likely failing.

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Manual ingest auth with `HYDROLOGY_INGEST_TOKEN` | ✅ Implemented | `hydrology-government.ts:118-124` rejects before parsing/running; helper accepts configured bearer. Tests prove missing/invalid rejected with zero runner calls. |
| Operator/admin token fallback | ✅ Implemented | `isHydrologyIngestAuthorized` includes operator/admin only when `AGRONAUTAS_AUTH_ENABLED === 'true'`. Tests cover operator/admin fallback. |
| Scheduler env flag default false | ✅ Implemented | `server.ts:65-69` returns null unless value is exactly `true`; test proves factory not called by default. |
| Scheduler true startup | ✅ Implemented | `server.ts:71-83` creates scheduler and calls `start()` only when enabled; test proves one `start()` call. |
| No immediate boot ingest | ✅ Implemented | `HydrologyIngestionScheduler.start()` only registers intervals/timeouts; startup test captures zero ingestion runner calls. |
| Safe cadence / no retry storms | ✅ Mostly implemented | PNA/INMET/SMN alerts hourly, SMN rainfall 3h, INA daily. Startup wiring does not pass `enqueueDelayedRetry`; manual runner performs one `fetchWithDeadline` per source. Scheduler class still contains one delayed PNA/INA retry path when explicitly provided, but startup does not enable it. |
| Provider URL env overrides | ✅ Implemented | HTTP clients read `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`; tests assert requested URLs. |
| Independent per-source degraded all-source production response | ❌ Failing by inspection/test | In production mode, `createGovernmentIngestionRunner` throws on the first source failure (`hydrology-government.ts:278-290`), aborting remaining sources and likely returning global 500 instead of 202 independent statuses. Existing test `default government ingestion runner fails fast outside tests without writing fixtures` confirms this behavior. |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Keep manual endpoint canonical | ✅ Yes | Scheduler adapter reuses `createGovernmentIngestionRunner`. |
| Env-gated scheduler startup | ✅ Yes | `HYDROLOGY_SCHEDULER_ENABLED` must equal `true`. |
| Auth before provider calls | ✅ Yes | Missing/invalid bearer returns 401 and runner call count remains zero. |
| Render Free external cron | ✅ Yes | Runbook keeps in-process scheduler disabled and documents hourly external cron. |
| Provider overrides documented and tested | ✅ Yes | Runbook and hydrology-engine tests cover all four env vars. |
| Independent statuses / no abort on one source failure | ❌ No | Runner fail-fast contradicts spec and the design's all-source resilient behavior. |

### Issues Found
**CRITICAL**:
- Production/degraded all-source ingest can abort on first failed source: `hydrology-government.ts:278-290` throws outside tests, so one failed provider can prevent remaining sources and prevent a structured HTTP 202 response with independent source statuses. This violates “one source failure MUST NOT abort others.”
- Unrecoverable ingest startup/config/database failure has no passing covering test and no route-level contract error handling around `resolved.ingestionRunner(...)`; likely falls through global Express 500 rather than the specified contract error response.
- `pnpm --dir apps/api build` fails with unrelated TypeScript errors in `create-field-intake-usecase.ts` and `agronautas-demo.ts`.

**WARNING**:
- Production smoke verification is correctly deferred until after deployment, but the current change is not ready for main because local verification found blockers first.
- Local bounded all-source evidence is stubbed/offline. That is acceptable for pre-commit bounded verification, but it does not validate live provider availability.

**SUGGESTION**:
- Add a route/runner test where PNA fails and INA/INMET/SMN still run, returning HTTP 202 with independent failed/success statuses.
- Add a test where the runner throws before provider calls and the endpoint returns the agreed contract error shape rather than the global 500 envelope.

### Verdict
FAIL

The auth gate, scheduler flag/startup behavior, boot safety, cadence, and provider URL overrides are verified. The change is not spec-compliant yet because production all-source failure handling is fail-fast and the API build currently fails.
