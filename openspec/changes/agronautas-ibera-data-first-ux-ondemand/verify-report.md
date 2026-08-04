schema: gentle-ai.verify-result/v1
evidence_revision: sha256:54a10244c4357769c4ca493377b80607dfe91e5de67c24ef24bdb1f43a36339d
verdict: fail
blockers: 2
critical_findings: 2
requirements: 11/11
scenarios: 13/13
test_command: pnpm test
test_exit_code: 1
test_output_hash: sha256:6a4ee232d326ff3886ccf034a58ace156005843f3dbb43cd6fca96d0e3adfc6b
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:5373be83a857e8da14441a258df3d07378fe98970b8eea5ed7731b7246bdaaa6

# Verification Report

**Change**: `agronautas-ibera-data-first-ux-ondemand`
**Version**: `1.0.0` package metadata; no application version bump
**Mode**: Strict TDD / hybrid artifacts
**Verification scope**: corrective readiness-boundary, on-demand follow-on, and explicit non-goal assertions, plus regression/build/browser reruns. Docker, review/iron/general-agent flows, provider/production evidence, receipts, and fixes were not used.

## Completeness

| Metric | Value |
|---|---:|
| Tasks total | 11 |
| Tasks complete | 11 |
| Tasks incomplete | 0 |

All checked tasks in `tasks.md` are complete. The native status command reports the same 11/11 state. It also emits `nextRecommended: resolve-review` because no review transaction exists; no review flow was executed, and verification proceeded from the hybrid artifacts and runtime evidence as requested.

## Exact changed-scope evidence

The corrective apply added only executable assertions and their acceptance-artifact links:

| Scope | Evidence |
|---|---|
| Dependency readiness boundary | `apps/api/src/presentation/routes/health.test.ts:208-232` adds a real local HTTP request to `/agronautas/ready`, asserts healthy dependency readiness, and rejects `requestId`, `runId`, `source`, `centroid`, and `persistence` acquisition fields. The health route implementation itself is unchanged. |
| On-demand follow-on boundary | `packages/contracts/tests/agronautas-contracts.test.ts:65-85` asserts the one-centroid/one-source proof sequence, request/run IDs, timeout/rate behavior, cache/latest-good, persistence/history, freshness, Copilot trace, external Postgres/Redis prerequisites, and the Corrientes-wide feasibility non-inference. |
| Explicit non-goals | `packages/contracts/tests/agronautas-contracts.test.ts:87-126` checks the SDD scope documents, unconfigured point-only map seam, absence of a Google Maps dependency, non-durable field persistence, and non-hydraulic UI disclaimers. |
| Acceptance artifacts | `contract-to-screen-matrix.md:22-28`, `tasks.md:47-48`, and `apply-progress.md:65-72` link the executable assertions and record the rollback/scope boundary. |
| Production behavior | No API route, shared schema, provider, map, polygon, scheduler, Risk Engine, or hydrology implementation was changed by the corrective pass. Existing broader UI/test changes and unrelated roadmap files remain in the working tree and were preserved. |

## Build & Tests Execution

### Build

**Build**: PASS

```text
Command: pnpm build
Exit: 0
Output hash: sha256:5373be83a857e8da14441a258df3d07378fe98970b8eea5ed7731b7246bdaaa6
Result: zod-schemas, hydrology-engine, API, and Next.js web builds completed.
Note: existing unused React warning in apps/web/src/app/municipalities/ingest/page.test.tsx.
```

### Focused and regression tests

| Command | Exit | Result | Output hash |
|---|---:|---|---|
| `pnpm --dir packages/contracts test:agronautas-contracts` | 0 | 4 passed, including follow-on and explicit non-goal assertions | `sha256:681e252bb783ff29870a4671d8d218c59e485a67df53d704c89fe1f6cc920fef` |
| `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/health.test.ts` | 0 | 12 passed, including the `/agronautas/ready` boundary assertion and real local HTTP request | `sha256:3876cc5326b2c80c1dbccb792adabac7e706eac37497c05f7d7a7abb45bbee7f` |
| Focused web command for the five component files plus `evidence-state.test.ts` | 0 | 33 passed | `sha256:57ccbb2c5595495ae417b809000cf08a1828b2f6056624e2bb31d307cab22390` |
| `pnpm --dir apps/web test` | 0 | 92 passed, 0 failed | `sha256:0e9f8dd7a0d29b8d0a9d1781fef6f795eb77b38d3ea1b65807c0d1d89caee7f4` |
| `pnpm --dir apps/api test` | 1 | 194 passed, 1 failed at `agronautas.test.ts:752`; Groq degraded-mode expectation was false in this environment | `sha256:fc801cbb76c17188fa4d288fe2297824ddbf5bea5cce46dee0a9454efb91c3cb` |
| `pnpm --dir packages/hydrology-engine test` | 0 | 64 passed, 0 failed in this rerun | `sha256:48bb8ec41b2897ac61bed613872aef9d8fae333a66a3248e522c2483defdcb84` |
| `pytest apps/workflow-runtime-python` | 0 | 19 passed | `sha256:4b182b360ff551f79af031c1a6d46e518bb24fdc85f2f5fcfe696ef36782c18a` |
| `pnpm test` | 1 | Root Turbo suite failed only through the API Groq test above; hydrology passed 64/64 in this run | `sha256:6a4ee232d326ff3886ccf034a58ace156005843f3dbb43cd6fca96d0e3adfc6b` |

The known hydrology timeout is execution-mode/load sensitive: earlier cumulative evidence recorded 63/64 at `packages/hydrology-engine/src/clients/http-clients.test.ts:128` (`calls` 1 vs 2), while this standalone and root rerun produced 64/64. It remains a separate baseline maintenance follow-up, not a UX-delta failure.

**Coverage**: not available; no configured coverage command/tool was detected.

## Browser/runtime evidence without Docker

| Command/path | Exit | Result | Output hash |
|---|---:|---|---|
| `agronautas-production.spec.js -g "agronautas detalle de lote"` | 0 | 1 passed; field-detail observed/stale/missing states and polygon disclaimer rendered | `sha256:9990259783c0d854836da45130b5744ee53c5e4e5df97b76b22c2708cf126686` |
| `government-ui.spec.js` | 0 | 2 passed; overview/detail flows rendered | `sha256:9ae838b9b4888148a9e46a76d30e6ea4fa4e2cf6c9b1cdde487ac7dc98f1a667` |
| `hydrology-ingest.spec.js` | 0 | 1 passed; verify-before-submit and safe ingest flow rendered | `sha256:f12dc80863e1de951317ed107643f89fee3cba9078ebdb7f8cdf1a0c8d5db310` |
| `agronautas-smoke.spec.js` | 1 | 1 failed at pre-existing `Snapshot stale detectado` assertion, line 176 | `sha256:80c958cbbb47362c6372c7f0b06011e1ee8409af0d3b0b44600f51d325ad79f2` |
| `agronautas-production.spec.js -g "agronautas smoke documenta"` | 1 | 1 failed at the same pre-existing `Snapshot stale detectado` assertion, line 125 | `sha256:d7b665b51c023952da67d0483e5538ba30ac1ff472d3b718e3d72a83e95c1f59` |
| `hydrology-government.spec.js` | 0 | 1 skipped; authorized provider/database runtime unavailable | `sha256:3cee94abe4c838604e4185ae84c2bac26b341a1cf8eab4a0a61ca3d943d53355` |

No Docker, production smoke, live provider result, or production PostgreSQL/Redis result was used or claimed.

## Spec Compliance Matrix

| Requirement | Scenario | Runtime covering test | Result |
|---|---|---|---|
| Contract-to-screen evidence inventory | Matrix gates an unproven value | `field-detail.test.tsx` point-coverage/disclaimer assertions; `agronautas-contracts.test.ts` scope checks | ✅ COMPLIANT |
| Agronautas evidence visibility | Complete evidence renders with source state | `page-client.test.tsx` `alta válida muestra dashboard con alertas y evidencia` | ✅ COMPLIANT |
| Agronautas evidence visibility | Partial evidence remains honest | `field-detail.test.tsx` decision evidence and missing polygon disclaimer | ✅ COMPLIANT |
| Evidence states are explicit | Stale or mock data is displayed | `evidence-state.test.ts` seven-state, mode, and stale latest-good assertions | ✅ COMPLIANT |
| Accessible deterministic states | No evidence is available | `overview.test.tsx` and `detail.test.tsx` empty/degraded fixtures | ✅ COMPLIANT |
| On-demand work is a gated evidence plan | Follow-on readiness is evaluated | `health.test.ts` `/ready` boundary plus `agronautas-contracts.test.ts` proof-plan assertions | ✅ COMPLIANT |
| Explicit non-goals constrain acceptance | A non-goal is proposed during review | `agronautas-contracts.test.ts` scope/map/persistence assertions | ✅ COMPLIANT |
| Municipal evidence states | Canonical municipal data is fresh | `government-ui.spec.js` hierarchy flow plus overview/detail component tests | ✅ COMPLIANT |
| Municipal evidence states | Mapped or stale evidence is incomplete | `government-ui.spec.js` degraded detail plus `detail.test.tsx` | ✅ COMPLIANT |
| Ingestion diagnostics and status | Partial ingest is reported | `ingest-panel.test.tsx` plus `hydrology-ingest.spec.js` | ✅ COMPLIANT |
| Local context and geometry claims | User requests territorial impact | overview list fallback/detail mapping assertions plus `government-ui.spec.js` | ✅ COMPLIANT |
| Municipal Copilot trace | Copilot responds with bounded context | `detail.test.tsx` partial SSE metadata/error test plus hierarchy browser flow | ✅ COMPLIANT |
| Accessible degraded and empty presentation | Municipality has no current telemetry | overview/detail empty fixtures | ✅ COMPLIANT |

**Compliance summary**: 13/13 scenarios have passing runtime coverage after the corrective apply. This does not make the root/API regression or stale Agronautas smoke baseline green.

## Correctness (Static Evidence)

| Requirement area | Status | Evidence |
|---|---|---|
| `/agronautas/ready` contract boundary | ✅ Implemented | Test asserts dependency readiness and absence of on-demand acquisition fields; no route behavior changed. |
| One-centroid/one-source follow-on boundary | ✅ Implemented | Contract test checks every required proof item and external Postgres/Redis prerequisite wording. |
| Explicit non-goals | ✅ Implemented | Contract test checks SDD documents, provider-neutral point-only map seam, package dependency, field persistence SQL, and non-hydraulic disclaimers. |
| Data-first evidence visibility | ✅ Implemented | Focused web suite 33/33 and full web suite 92/92. |
| Baseline preservation | ⚠️ Follow-up remains | Known Groq degraded-mode and two stale-banner smoke failures remain; no correction was made here. |

## Design Coherence

| Decision | Followed? | Notes |
|---|---|---|
| Preserve existing readiness route topology | ✅ Yes | Only a route test was added; dependency readiness remains distinct from acquisition. |
| Keep on-demand as a separate one-PR evidence plan | ✅ Yes | The contract test verifies the proof sequence and explicitly rejects Corrientes-wide inference. |
| Keep explicit non-goals executable | ✅ Yes | Assertions inspect actual map, dependency, persistence, and UI boundaries. |
| No provider/map/polygon/scheduler/hydrology implementation in this correction | ✅ Yes | Corrective diff contains tests and acceptance-artifact evidence only. |

## TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | ✅ | `apply-progress.md` contains the cumulative TDD Cycle Evidence table, including corrective rows 4.2 and 4.3. |
| All tasks have tests | ✅ | 11/11 tasks are checked and map to component, unit, API, contract, or browser paths. |
| RED confirmed | ✅ | Apply artifact records RED before matrix wording and persistence-boundary assertions; referenced files exist. |
| GREEN confirmed | ⚠️ Partial | Corrective tests and focused web pass; API/root and two baseline browser paths remain non-zero. |
| Triangulation adequate | ✅ | Complete, empty, stale, degraded, mock/seam, error, readiness, scope, and non-goal paths are represented. |
| Safety net evidence | ⚠️ Partial | Cumulative artifact records prior safety-net limitations and uses an aggregated 1.1–4.1 row; it does not provide pre-edit counts for every task. |

**TDD Compliance**: 4/6 fully passed; 2 partial/warning checks.

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit | 5 | 1 | Node test runner / TypeScript |
| Component/integration | 28 | 5 | Node test runner, Testing Library, JSDOM |
| Contract/API | 16 | 2 | Node test runner, tsx, real local HTTP request |
| E2E | 6 deterministic tests | 4 | Playwright |
| **Focused change tests** | **55** | **12** | |

The live hydrology E2E is skipped, not counted as a pass. The full web regression is 92/92.

## Changed File Coverage

Coverage analysis skipped — no coverage tool was detected. This is informational.

## Assertion Quality

The newly added readiness and scope assertions call the real route or inspect concrete current source/contracts; no tautology, ghost loop, empty-only assertion, or assertion without production/source exercise was found in the corrective tests. One existing assertion in `apps/api/src/presentation/routes/health.test.ts:135-136` compares a locally assigned `observedTimeout` to the same constant and is a non-blocking quality warning because it does not prove the configured timeout was observed.

## Quality Metrics

- **API changed-file ESLint**: PASS, exit 0.
- **Web changed-file ESLint**: PASS, exit 0.
- **Contracts lint**: not available; `packages/contracts` has no ESLint configuration. A combined workspace lint attempt exited 2 for that configuration absence, not a source lint violation.
- **Type checker/build**: PASS through `pnpm build`, exit 0.
- **Build warning**: existing unused `React` warning noted above.

## Issues Found

### CRITICAL

1. **Required root/API test commands remain non-zero for a baseline Groq environment mismatch.** `pnpm test` exited 1 and `pnpm --dir apps/api test` exited 1 because `POST /fields/:id/chat cae a modo degradado cuando Groq no está disponible` observed `false !== true` at `apps/api/src/presentation/routes/agronautas.test.ts:752`. No API implementation was changed by this UX correction. Follow up in separate API/provider-environment maintenance work.
2. **Two Agronautas smoke paths retain the known stale-banner baseline failure.** `agronautas-smoke.spec.js:176` and `agronautas-production.spec.js:125` cannot find `Snapshot stale detectado`. The assertion and stale-banner source predate this evidence-state correction; the passing field-detail, government, and ingest flows demonstrate the corrected scope assertions independently. Follow up in separate demo fixture/banner reconciliation work.

### WARNING

- The hydrology timeout at `http-clients.test.ts:128` remains a known timing/concurrency-sensitive baseline follow-up from cumulative evidence, although the standalone and root hydrology reruns passed 64/64 this time. No hydrology fix was made.
- `hydrology-government.spec.js` was skipped because authorized live provider/database prerequisites were unavailable; no live or production result is inferred.
- Strict-TDD pre-edit safety-net counts remain incomplete in the cumulative apply evidence.
- Existing Next.js cross-origin development and unused-import warnings remain non-blocking.
- The native status output names missing review transaction state; no review command or artificial review gate was run.

### SUGGESTION

- Keep Groq, stale demo smoke, and hydrology timing maintenance in separate work units.
- Replace the existing local-assignment timeout assertion with an observable timeout assertion during unrelated test cleanup.

## Verdict

**FAIL** — the corrective readiness/on-demand/non-goal contract assertions now pass and all 11 requirements/13 scenarios have runtime coverage; build, focused web, health, contracts, worker, and current hydrology reruns pass. The mandatory root/API suites and two known Agronautas smoke paths remain non-zero baseline follow-ups, so this is not a clean full verification.
