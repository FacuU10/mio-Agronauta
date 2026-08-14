# Apply Progress: Iberá-Alerta Institutional Evidence Expansion

## Status

- Change: `ibera-alerta-institutional-expansion`
- Mode: Strict TDD
- Artifact mode: hybrid (OpenSpec + Engram)
- Delivery: auto-chain, stacked-to-main
- Work unit: verified-gap remediation for institutional evidence publication and state assertions
- Scope boundary: Iberá-Alerta only; no Agronautas application changes, providers, geometry, impact model, or production data
- Tasks: 11/11 complete; prior task completion and evidence merged below
- Coverage: unavailable; `openspec/config.yaml` declares no configured coverage command

## Remediation of Verify Gaps

The previous `verify-report.md` recorded these gaps: no separate apply-progress artifact or Strict-TDD Cycle Evidence table; no runtime assertion for the complete reviewed source registry envelope; no grounded/insufficient explanation scenario assertions; and only partial empty/degraded timeline evidence.

This apply slice adds only evidence and presentation assertions for those verified gaps:

- API registry publication asserts source, station/coverage key, HTTPS URL, freshness policy, registry version, review status, and reviewed-at timestamp.
- API grounded explanation asserts threshold, comparison, source, observation time, freshness, bounded tendency window, provider forecast horizon/confidence/label/source/URL/time, and last-successful timestamp.
- API insufficient explanation asserts `missing`, null observed evidence, `unknown` comparison, null tendency value, no forecast, and null last-known timestamp.
- API timeline asserts explicit empty `unavailable` and degraded `partial` responses with source, timestamp, evidence state, and last-known evidence; no fabricated event is accepted.
- Web component assertions render the registry metadata and URL, unverified geometry, grounded explanation metadata, explicit unavailable explanation, empty timeline, and absence of incident/impact actions.
- Existing coverage/operator assertions remain in the triangulation set: governed partial coverage and unverified geometry component tests, authenticated operator ingest component tests, and institutional Playwright flows.

## Strict TDD Cycle Evidence

| Evidence slice | RED | GREEN | Triangulation |
|---|---|---|---|
| Reviewed source registry publication | **Gap RED, truthful**: `verify-report.md` identified the publication scenario as `UNTESTED`; no failing assertion was previously captured, and no registry production change was needed because the existing route already projected the reviewed read model. | `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts --test-name-pattern "source registry envelope"`; exit 0, targeted assertion passed. Full API suite: 248 passed, 0 failed. | API route contract parsing plus repository-backed registry projection; web component renders source/station, coverage key, freshness policy, version, review state, reviewed-at, and source URL. |
| Grounded municipal explanation | **RED captured in component layer**: after adding the assertion-first component test, the focused web run failed with 2 failures because registry/explanation metadata was not rendered by the component. | Added server-owned metadata rendering and reran focused web tests: exit 0, 7 passed, 0 failed. Full web suite: 108 passed, 0 failed. API grounded explanation: exit 0, assertion passed. | API response schema + route fixture asserts threshold/comparison/tendency/forecast provenance; component asserts visible labels/URL/time and excludes unsupported impact vocabulary; institutional Playwright verifies the rendered detail flow. |
| Insufficient explanation evidence | **Gap RED, truthful**: `verify-report.md` identified the scenario as `UNTESTED`; the new API assertion was written before remediation and the existing server fallback already returned the explicit missing envelope, so no artificial failing run is claimed. | `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts --test-name-pattern "insufficient explanation"`; exit 0, missing state and null evidence assertions passed. Component empty-state assertion passed in the focused web run. | API schema validates `missing`/null fields; UI renders `Explicación no disponible sin evidencia oficial suficiente.`; no inferred value, forecast, or impact action is rendered. |
| Empty/degraded evidence timeline | **Gap RED, truthful**: prior verification marked this scenario `PARTIAL`; the new route assertions were written against the missing evidence cases before rerunning the focused API suite. No fabricated provider/runtime failure is reported. | Focused API timeline run exit 0; empty `unavailable` and degraded `partial` assertions passed. Full API suite: 248 passed, 0 failed. | Repository test proves read-only bounded/cursorable SQL; route tests prove explicit status/last-known evidence; component test proves empty timeline copy; Playwright proves safe degraded detail rendering. |
| Coverage and operator states | **Existing RED gap**: prior verification had incomplete scenario triangulation, not a missing production state. The remediation retained the existing state-first tests rather than inventing new state values. | Full web suite exit 0: 108 passed. Institutional Playwright exit 0: 2 passed. Existing API authenticated operator tests remain green in the full 248-test suite. | Coverage: partial/unverified geometry and source mapping component assertions. Operator: authenticated ingest verification, safe failure/partial outcomes, and browser operator Playwright. |

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused API command | `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts --test-name-pattern "source registry envelope|grounded threshold|insufficient explanation|empty and degraded"`; exit 0; 57 tests executed by Node's name-pattern behavior, 57 passed, 0 failed. The four new target scenarios passed. |
| Focused web command | `pnpm --dir apps/web exec node --import tsx --test src/components/government/detail.test.tsx --test-name-pattern "source registry|grounded explanation|empty telemetry"`; exit 0; 7 passed, 0 failed. |
| Full test suites | Zod 39 passed; hydrology engine 74 passed; API 248 passed; web 108 passed; Python worker 35 passed; all exit 0. |
| Build | `pnpm build`; exit 0; Turbo 4/4 build tasks successful. Existing warning: unused `React` import in `apps/web/src/app/municipalities/ingest/page.test.tsx`. |
| Runtime/component harness | `pnpm --dir apps/web test:e2e -- tests/e2e/government-ui.spec.js`; exit 0; 2 passed. Government overview-to-detail navigation and degraded partial-source rendering were exercised through the institutional browser harness. |
| Real-source boundary | Real-source institutional Playwright was not used because its explicit `HYDROLOGY_REAL_E2E` prerequisite remains unavailable; no Docker, production database, provider, or production runtime was started. |
| Rollback boundary | Revert `apps/api/src/presentation/routes/hydrology-government.test.ts`, `apps/web/src/components/government/detail.tsx`, `apps/web/src/components/government/detail.test.tsx`, and this apply-progress artifact. This removes only the verified-gap assertions and additive registry/explanation metadata presentation; existing telemetry, ingestion, source registry storage, timeline contracts, and Agronautas files remain untouched. |

## Cumulative Task State

All 11 previously completed tasks remain complete; no task was reopened or silently replaced:

- [x] 1.1 RED schema/type boundaries
- [x] 1.2 RED repository/route boundaries
- [x] 2.1 Iberá contracts and read-model types
- [x] 2.2 Additive registry persistence
- [x] 2.3 Reviewed registry and bounded evidence repository reads
- [x] 2.4 Validated API projections and reviewed seed activation
- [x] 3.1 RED government UI safety states
- [x] 3.2 Server-owned government rendering
- [x] 3.3 Government/operator Playwright checks
- [x] 4.1 Rollout compatibility and focused validation
- [x] 4.2 Rollback boundary verification

## Files Changed in This Remediation

| File | Action | Purpose |
|---|---|---|
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modified | Runtime API assertions for registry publication, grounded/insufficient explanations, and empty/degraded timelines. |
| `apps/web/src/components/government/detail.tsx` | Modified | Render complete reviewed registry metadata and grounded explanation provenance/forecast metadata; preserve explicit unavailable states. |
| `apps/web/src/components/government/detail.test.tsx` | Modified | Component assertions for registry, explanation, empty timeline, unverified geometry, and no unsupported actions. |
| `openspec/changes/ibera-alerta-institutional-expansion/apply-progress.md` | Created | Cumulative apply progress and truthful Strict-TDD/Work Unit evidence. |

## Deviations

None from the approved architecture. The implementation uses existing source-backed fields and existing provider contracts; no new provider, geometry, impact, or production data was introduced.

## Next Step

Ready for a fresh `sdd-verify` run against the updated OpenSpec and Engram apply-progress evidence.
