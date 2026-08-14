```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: current-run-no-hash-per-user-instruction
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 6/6
scenarios: 11/11
test_command: pnpm --dir packages/zod-schemas test; pnpm --dir packages/hydrology-engine test; pnpm --dir apps/api test; pnpm --dir apps/web test; python -m pytest apps/workflow-runtime-python
test_exit_code: 0
test_output_hash: not-recorded-per-user-instruction
build_command: pnpm build
build_exit_code: 0
build_output_hash: not-recorded-per-user-instruction
```

# Verification Report: Iberá-Alerta Institutional Evidence Expansion

**Change**: `ibera-alerta-institutional-expansion`  
**Version**: `institutional-expansion`  
**Mode**: Strict TDD  
**Artifact mode**: Hybrid (OpenSpec + Engram)

## Completeness

| Metric | Value |
|---|---:|
| Tasks total | 11 |
| Tasks complete | 11 |
| Tasks incomplete | 0 |
| Proposal | Available and read |
| Exploration | Available and read |
| Design | Available and read |
| Specification | `openspec/specs/institutional-expansion/spec.md`, available and read |
| Apply progress | Available and read |

## Build & Tests Execution

**Build**: ✅ Passed

```text
Command: pnpm build
Exit: 0
Turbo: 4/4 build tasks successful
Next.js: compiled, type-checked, and generated 8 routes
Existing warning: unused React import in apps/web/src/app/municipalities/ingest/page.test.tsx
```

**Tests**: ✅ Passed

| Suite | Command | Result |
|---|---|---|
| Zod/contracts | `pnpm --dir packages/zod-schemas test` | 39 passed, 0 failed |
| Hydrology engine | `pnpm --dir packages/hydrology-engine test` | 74 passed, 0 failed |
| API | `pnpm --dir apps/api test` | 248 passed, 0 failed |
| Web/component | `pnpm --dir apps/web test` | 108 passed, 0 failed |
| Python worker | `python -m pytest apps/workflow-runtime-python` | 35 passed, 0 failed |
| Focused API evidence corrections | `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts --test-name-pattern "source registry envelope|grounded threshold|insufficient explanation|empty and degraded"` | 57 passed, 0 failed |
| Focused web evidence corrections | `pnpm --dir apps/web exec node --import tsx --test src/components/government/detail.test.tsx --test-name-pattern "source registry|grounded explanation|empty telemetry"` | 7 passed, 0 failed |
| Institutional Playwright | `pnpm --dir apps/web test:e2e -- tests/e2e/government-ui.spec.js` | 2 passed, 0 failed |
| Alert-isolation Playwright | `pnpm --dir apps/web test:e2e -- tests/e2e/municipalities-alerts.spec.ts` | 2 passed, 0 failed |
| Operator Playwright | `pnpm --dir apps/web test:e2e -- tests/e2e/hydrology-ingest.spec.js` | 1 passed, 0 failed |
| Real-source Playwright | `pnpm --dir apps/web test:e2e -- tests/e2e/hydrology-government.spec.js` | Not executed: explicit prerequisite unavailable |

**Coverage**: ➖ Not available; `openspec/config.yaml` declares no coverage command.

## Spec Compliance Matrix

| Requirement | Scenario | Covering runtime evidence | Result |
|---|---|---|---|
| Reviewed source registry/provenance | Approved association is published | `hydrology-government.test.ts` > complete reviewed source registry envelope; `detail.test.tsx` > governed registry metadata | ✅ COMPLIANT |
| Reviewed source registry/provenance | Incomplete association is rejected | `hydrology-engine.test.ts` > reviewed provenance activation boundary | ✅ COMPLIANT |
| Bounded evidence timeline | Timeline returns evidence | `hydrology-engine.test.ts` > read-only bounded/cursorable timeline; API route test > bounded timeline projection | ✅ COMPLIANT |
| Bounded evidence timeline | Empty or degraded timeline | API route test > explicit empty `unavailable` and degraded `partial`; detail component > empty timeline | ✅ COMPLIANT |
| Coverage gap/status model | Partial coverage is visible | `detail.test.tsx` > partial coverage and last-known evidence; government Playwright degraded-source flow | ✅ COMPLIANT |
| Coverage gap/status model | Geometry is not verified | Zod/hydrology tests and `detail.test.tsx` > unverified geometry without polygon | ✅ COMPLIANT |
| Server-owned explanations | Explanation is grounded | API route test > threshold/comparison/source/time/freshness/tendency/forecast metadata; component test > rendered provenance | ✅ COMPLIANT |
| Server-owned explanations | Evidence is insufficient | API route test > missing/null/unknown explanation envelope; component test > explicit unavailable copy | ✅ COMPLIANT |
| Authenticated operator workflow | Operator observes durable run | API durable-ledger reconstruction tests; operator Playwright verifies authenticated ingest flow and safe outcomes | ✅ COMPLIANT |
| Authenticated operator workflow | Safe degraded rendering | Web component tests and government/operator Playwright verify explicit degraded, unavailable, empty, retry, and no-action states | ✅ COMPLIANT |
| Deferred institutional boundaries | Deferred request is presented | API exclusion tests and UI assertions verify no hydraulic/impact/provider/case action; product separation tests remain green | ✅ COMPLIANT |

**Compliance summary**: 11/11 scenarios compliant; 6/6 requirements complete.

## Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Source registry/provenance | ✅ Implemented and runtime-proven | Reviewed registry returns official identifier-linked source metadata, station/coverage key, HTTPS URL, freshness policy, version, review status, and reviewed-at metadata. |
| Bounded timeline | ✅ Implemented and runtime-proven | Read-only repository/API path enforces bounded time, cursor, and result limits; empty/degraded states preserve last-known evidence separately. |
| Coverage statuses | ✅ Implemented and runtime-proven | Supported/partial/unavailable/stale/failed/blocked/unverified vocabulary is contract-backed and rendered without inferred coverage. |
| Explanations | ✅ Implemented and runtime-proven | Server-owned output distinguishes grounded and insufficient evidence, source mapping/threshold comparison, bounded tendency, provider forecast horizon/confidence, source URL, time, and freshness. |
| Operator workflow | ✅ Implemented and runtime-proven | Authenticated ingest/status history remains durable and safe; browser mutation remains limited to the existing authenticated ingest path. |
| Product boundaries | ✅ Implemented and runtime-proven | No hydraulic simulation, official geometry, geometry-derived impact, unsupported provider, generated/long-range forecast, or case-management action was introduced; Agronautas remains separate. |

## Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Additive reviewed registry | ✅ Yes | Registry persistence and projections are additive and source-governed. |
| Evidence timeline, not incidents | ✅ Yes | Timeline is bounded/read-only; no acknowledgement, assignment, escalation, resolution, or case entities/actions were added. |
| Provider-owned forecasts ≤30 days | ✅ Yes | Forecast evidence remains provider-supplied and retains confidence/horizon labels. |
| No official geometry | ✅ Yes | Generated/PostGIS placeholder geometry remains unverified and is not returned as official territory. |
| Server-owned explanations | ✅ Yes | Explanation construction remains in the API route; UI only renders contract state. |
| Separate Iberá/Agronautas ownership | ✅ Yes | Separate routes, vocabulary, tests, and ownership boundaries remain intact. |

## TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD Cycle Evidence reported | ✅ | `apply-progress.md` contains the required table with registry, grounded/insufficient explanation, empty/degraded timeline, and coverage/operator evidence slices. |
| All tasks have tests | ✅ | 11/11 tasks map to existing contract, repository/API, component, or Playwright evidence. |
| RED confirmed | ✅ | Apply evidence records captured RED gaps/failures truthfully; no synthetic failing run was claimed where behavior already existed. |
| GREEN confirmed | ✅ | Current focused and full suites pass: 39 + 74 + 248 + 108 tests, plus 35 Python tests. |
| Triangulation adequate | ✅ | Registry, explanation, timeline, coverage, operator, and deferred-boundary behaviors are covered across API, component, repository, and browser layers. |
| Safety net for modified files | ⚠️ | Apply progress records cumulative focused/full reruns, but does not provide a separate pre-edit safety count for every modified file. |

**TDD Compliance**: 5/6 checks fully evidenced; 1 warning.

## Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit/contract | 113 | Zod and hydrology-engine tests | Node test runner |
| Integration/API | 248 | API route/repository tests | Node test runner, Express fakes |
| Web integration | 108 | React component/route tests | Node test runner, Testing Library |
| E2E | 5 | Government UI, alert isolation, operator specs | Playwright |
| Python | 35 | Worker test files | pytest |

## Changed File Coverage

Coverage analysis skipped — no coverage tool is configured. Runtime tests and build evidence were executed independently.

## Assertion Quality

✅ No tautologies, ghost loops, assertions without production calls, or smoke-only assertions were found in the reviewed change-focused tests. The corrected tests assert actual registry metadata, explanation values and null states, timeline status/evidence, UI copy, and forbidden actions.

## Quality Metrics

**Linter**: ➖ Not run; not requested as a verification gate.  
**Type Checker**: ✅ Passed through `pnpm build`; one existing unused-import warning remains non-blocking.

## Issues Found

**CRITICAL**: None.

**WARNING**:

1. Real-source institutional Playwright was not executed because its explicit `HYDROLOGY_REAL_E2E=true` prerequisite and authorized PostgreSQL/provider runtime were unavailable. This is recorded separately and is not inferred from mocked Playwright.
2. Strict-TDD apply evidence does not include a separate pre-edit safety count for every modified file.
3. Local Next.js Playwright harness emitted non-blocking cache/deprecation warnings during some runs; the final institutional, alert-isolation, and operator runs passed.
4. The production build retains one existing unused `React` import warning in `apps/web/src/app/municipalities/ingest/page.test.tsx`.

**SUGGESTION**:

1. Re-run the explicitly gated real-source Playwright suite when the authorized provider/database prerequisite exists.

## Verdict

**PASS WITH WARNINGS** — all 6 requirements and 11 scenarios are runtime-covered; focused/full tests, build, institutional Playwright, coverage/unsupported states, source metadata, grounded/insufficient explanations, empty/degraded timelines, no-invention boundaries, and Agronautas separation pass. Real-source E2E remains separately unproven because its prerequisite is unavailable.
