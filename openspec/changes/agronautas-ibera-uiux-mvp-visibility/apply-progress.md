# Apply Progress: Agronautas + Iberá UI/UX MVP Visibility

## Mode

Strict TDD. Hybrid persistence: this OpenSpec artifact is the filesystem counterpart of the cumulative Engram topic `sdd/agronautas-ibera-uiux-mvp-visibility/apply-progress`.

## Scope and cumulative status

This artifact records the cumulative authorized apply slices. Tasks 3.1, 3.2, 3.3, 4.1, and 4.2 are now complete. Auth/security and new chat/domain prompts remain outside this change.

### Completed tasks

- [x] 1.1 Shared `ProductShell`, design tokens, visibility primitives, accessibility states, and focused tests.
- [x] 1.2 Provider-neutral map adapter, visibility state matrix, typed SSE event contract/parser, and focused tests.
- [x] 2.1 Agronautas `/demo` workspace/intake/dashboard with locality search, point coverage preview/fallback, allowed crops, and decision-first navigation.
- [x] 2.2 Agronautas field detail, recompute, and report.
- [x] 2.3 Existing Agronautas chat/SSE enrichment.
- [x] 3.1 Iberá-Alerta overview/detail visibility.
- [x] 3.2 Iberá-Alerta ingest tracking and safe retry.
- [x] 3.3 Existing Iberá Copilot Advisor enrichment.
- [x] 4.1 Honest future placeholders.
- [x] 4.2 Playwright/E2E and full verification journeys.

**Status:** 10/10 tasks complete. The completed tasks are exactly 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, and 4.2.

## Files and areas changed by the first apply slice

| Area | Files / scope | Result |
|---|---|---|
| Shared shell | `apps/web/src/components/shell/product-shell.tsx`, `apps/web/src/app/globals.css` | Product identity separation, responsive shell, navigation, skip link, and shared visual tokens. |
| Visibility primitives | `apps/web/src/components/visibility/primitives.tsx` | Status, loading/error/missing/retry, freshness, evidence/source, metrics, table/timeline, map fallback, chat harness, and report primitives. |
| Visibility contracts | `apps/web/src/lib/visibility/map.ts`, `state.ts`, `sse.ts` | Provider-neutral map adapter, state matrix, and typed SSE parsing. |
| Agronautas intake | `apps/web/src/lib/agronautas/intake-map.ts`, `apps/web/src/components/agronautas/workspace.tsx` | Locality selection, coordinate/coverage preview, fallback copy, crop selection, and dashboard composition. |
| Tests | Tests beside shell/visibility modules plus `apps/web/src/components/agronautas/workspace-intake.test.tsx` and existing `page-client.test.tsx` | RED→GREEN coverage for the completed slice. |

No auth/security, backend, Iberá, or chat-domain/prompt files were changed by the cumulative slices.

## Current slice implementation

| Task | Files / scope | Result |
|---|---|---|
| 2.2 | `apps/web/src/app/demo/fields/[fieldId]/page.tsx`, `apps/web/src/components/agronautas/field-detail.tsx`, `apps/web/src/lib/agronautas/service.ts`, `apps/web/src/lib/agronautas/schemas.ts` | Added the contract-backed field detail route, risk decision, next action, drivers, evidence, alerts and alert timeline, risk/weather timelines, freshness/degradation, confidence, point-only coverage boundary, recompute states, and PDF disclaimer/report action. |
| 2.3 | `apps/web/src/lib/visibility/chat.ts`, `apps/web/src/components/visibility/chat-evidence.tsx`, `apps/web/src/components/agronautas/page-client.tsx`, `apps/web/src/components/agronautas/workspace.tsx`, existing Agronautas SSE adapter | Existing Agronautas chat/SSE harness enriched with typed metadata/facts/citations/sources/trace/timestamps/limits/degraded states/partial tokens/done/error/retry, without new chat or prompt/domain changes. |

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.2 | `apps/web/src/components/agronautas/field-detail.test.tsx` | Integration/component | `pnpm --dir apps/web test`: 69/69 baseline | Tests written first and initially failed on missing detail module | Passed | Decision/evidence/timelines; recompute request; point-only coverage; PDF disclaimer | Detail client narrows React Query union data after explicit loading/error gate; report remains existing endpoint |
| 2.3 | `apps/web/src/lib/visibility/chat.test.ts`; existing `page-client.test.tsx` | Unit + integration/component | `pnpm --dir apps/web test`: 69/69 baseline | Tests written first and initially failed on missing chat harness | Passed | SSE metadata/token/done parsing; partial error preserves tokens; facts/citations/trace/degraded view model | Existing Copilot callback now receives typed `SseEvent`; no endpoint/prompt/domain change |
| 1.1 | `apps/web/src/components/shell/product-shell.test.tsx`; `apps/web/src/components/visibility/primitives.test.tsx` | Integration/component | N/A (new) | Tests written and initially failed on missing modules | Passed | Agronautas/Iberá separation; degraded/stale/missing states; provenance/map fallback | Runtime React import and semantic status assertions cleaned up |
| 1.2 | `apps/web/src/lib/visibility/map.test.ts`; `state.test.ts`; `sse.test.ts` | Unit | N/A (new) | Tests written and initially failed on missing modules | Passed | Inside/outside/empty locality search, state branches, valid/invalid SSE | Indexed-access typing corrected during build |
| 2.1 | `apps/web/src/components/agronautas/workspace-intake.test.tsx`; existing `page-client.test.tsx` | Integration/component | `pnpm --dir apps/web test`: 56/56 baseline | Tests written before workspace changes and initially failed | Passed | Locality selection, outside coverage, crop selection, decision states | Form submission reads live controls so edited coordinates are preserved |

## Tests and build evidence

- `pnpm --dir apps/web test` — exit 0, **74/74 passing**.
- `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/field-detail.test.tsx src/lib/visibility/chat.test.ts` — exit 0, **5/5 passing**.
- `pnpm --dir apps/web build` — exit 0, **passing**; only the pre-existing unused React warning in `src/app/municipalities/ingest/page.test.tsx` was reported.

## Runtime smoke report

- Command/scenario: `pnpm --dir apps/web dev` with Playwright against `http://localhost:3000/demo` at `390x844`.
- Result: route, shared shell, and Agronautas intake rendered successfully.
- Limitation: the local API could not stay bound to port `3001` because workers repeatedly encountered `EADDRINUSE`; API-backed runtime data was therefore exercised through the existing mock service/component tests. No production runtime claim is made for the unavailable API process.
- Current slice runtime harness: no browser/server smoke was started; route and SSE behavior are covered by the existing clearly named `createAgronautasMockService` fixtures and component/unit harnesses. No process, CMD, dev server, Playwright server, or port was opened, so cleanup was not required.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/field-detail.test.tsx src/lib/visibility/chat.test.ts` — exit 0; 5/5 passing. Full `pnpm --dir apps/web test` — exit 0; 74/74 passing. |
| Runtime harness command/scenario and exact result | No browser smoke started for this slice; route/detail and SSE behavior exercised through explicit component/unit fixtures (`createAgronautasMockService`, 5/5) and production build. No process remained open; no cleanup process was needed. |
| Rollback boundary | Revert `apps/web/src/app/demo/fields/[fieldId]/page.tsx`, `components/agronautas/field-detail.tsx` and its test, `components/agronautas/page-client.tsx`, `components/agronautas/workspace.tsx`, `components/visibility/chat-evidence.tsx`, `lib/visibility/chat.ts` and its test, plus Agronautas service/schema changes and only the 2.2/2.3 checkboxes. Shared foundation, auth/security, backend, and Iberá files remain outside the boundary. |

## Risks and follow-up

- API port contention remains a limitation from the prior slice; this slice did not start a server and makes no production runtime claim.
- At the time of the preceding Agronautas slice, tasks 3.1–3.3, 4.1, and 4.2 were intentionally pending; the current cumulative status below completes 3.1–3.3.
- The working tree contains the first slice as uncommitted changes; no commits or pushes were performed.

## Current slice implementation

| Task | Files / scope | Result |
|---|---|---|
| 3.1 | `apps/web/src/components/government/overview.tsx`, `overview-summary.ts`, `overview.test.tsx`, `detail.tsx`, `detail.test.tsx` | Added an Iberá-only provincial overview with four official source cards, filters, accessible list/map fallback, freshness and province summary; detail now renders gauge mappings, telemetry modes (`observed|forecast|missing|degraded`), official alerts, INA 0–30 day horizon and speculative 15–30 day copy. |
| 3.2 | `apps/web/src/lib/visibility/polling.ts`, `polling.test.ts`, `apps/web/src/components/government/ingest-panel.tsx`, `ingest-panel.test.tsx` | Added bounded polling of the existing `statusPath` after POST `202`, preserved queued/started as non-terminal, rendered per-source ranges/HTTP summaries/sanitized diagnostics, and added a retry path that clears the in-memory credential before re-verification. |
| 3.3 | `apps/web/src/components/government/detail.tsx`, `detail.test.tsx` | Enriched the existing Copilot Advisor transport/rendering with metadata, sources, timestamps, limits, partial tokens, done/error/degraded states and safe retry. Existing endpoint, prompt and hydrology domain were preserved. |

## TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `overview.test.tsx`, `detail.test.tsx` | Integration/component | ✅ Existing government tests passed before edits | ✅ New filter/source/mapping/status assertions written first | ✅ Focused tests passed | ✅ Empty list, source fallback, telemetry status branches, official mappings and forecast horizon covered | ✅ Extracted municipality filter/status and telemetry mode helpers |
| 3.2 | `polling.test.ts`, `ingest-panel.test.tsx` | Unit + integration/component | ✅ Existing ingest tests passed before edits | ✅ Polling and 202 assertions written first | ✅ Focused tests passed | ✅ queued→started→completed, partial source results, bounded diagnostics and secret suppression covered | ✅ Polling/sanitization moved to pure adapter; panel remains presentational |
| 3.3 | `detail.test.tsx` | Integration/component | ✅ Existing detail tests passed before edits | ✅ Partial SSE metadata/token/error assertions written first | ✅ Focused tests passed | ✅ Partial response preserves token, sources, limits, timestamp and retry; existing endpoint payload preserved | ✅ Reused existing `lib/visibility/chat.ts` SSE view-model functions |

## Tests and build evidence

- `pnpm --dir apps/web exec node --import tsx --test src/components/government/overview.test.tsx src/components/government/detail.test.tsx src/components/government/ingest-panel.test.tsx src/lib/visibility/polling.test.ts` — exit 0, **17/17 passing**.
- `pnpm --dir apps/web test` — exit 0, **80/80 passing**.
- `pnpm --dir apps/web build` — exit 0, production build passed; only the pre-existing unused React warning in `src/app/municipalities/ingest/page.test.tsx` was reported.
- `pnpm test` — exit 1 in the pre-existing `@repo/hydrology-engine` suite: `PnaHttpClient enforces a finite total timeout budget across retry attempts` expected 2 calls and observed 1 at `packages/hydrology-engine/src/clients/http-clients.test.ts:128`; no unrelated backend fix was made.

## Runtime smoke report

- Runtime harness: no server, browser, Playwright process, or occupied port was started for this slice. API behavior was exercised through clearly marked fetch fixtures in `overview.test.tsx`, `detail.test.tsx`, and `ingest-panel.test.tsx`; the production build completed successfully.
- Cleanup evidence: N/A because no process, CMD, dev server, Playwright session, or temporary runtime resource was opened; therefore no process remained to stop.
- Limitation: no claim is made here about live provider connectivity; 3.1–3.3 validate the existing contracts and browser view-model behavior only.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/components/government/overview.test.tsx src/components/government/detail.test.tsx src/components/government/ingest-panel.test.tsx src/lib/visibility/polling.test.ts` — exit 0; 17/17 passing. Full web suite — exit 0; 80/80 passing. |
| Runtime harness command/scenario and exact result | No live runtime harness started; component/unit fixtures cover overview filters/fallback, dashboard metadata/status, POST 202→statusPath polling, partial sources and Copilot partial/error stream. Build exit 0. Cleanup confirmed N/A. |
| Rollback boundary | Revert only `apps/web/src/components/government/overview.tsx`, `overview-summary.ts`, `overview.test.tsx`, `detail.tsx`, `detail.test.tsx`, `ingest-panel.tsx`, `ingest-panel.test.tsx`, `apps/web/src/lib/visibility/polling.ts`, `polling.test.ts`, and the 3.1–3.3 task/progress artifact changes. Shared foundation, Agronautas, auth/security, API routes, prompts and provider implementations remain outside this boundary. |

## Risks and follow-up

- Live API/provider connectivity remains unverified in this slice because no server was started; the UI deliberately reports contract-provided unavailable/degraded/missing states rather than fabricating data.
- The ingest retry intentionally returns to the existing memory-only verification step; it never retains or renders the credential.
- Tasks 4.1 honest future placeholders and 4.2 Playwright/E2E plus real route smoke remain pending.
- The root-suite timing failure above is outside the assigned UI scope and does not affect the focused/full web evidence.
- No commits or pushes were performed; pre-existing cumulative worktree changes remain untouched.

## Documentation correction

The cumulative Engram apply-progress content remains preserved and is mirrored here, including all prior task status, TDD evidence, tests, smoke limitation, risks, cleanup evidence, and rollback boundary.

## Current slice implementation

| Task | Files / scope | Result |
|---|---|---|
| 4.1 | `apps/web/src/components/visibility/future-capabilities.tsx`, `future-capabilities.test.tsx`, Agronautas workspace, Iberá-Alerta overview and focused integration assertions | Added product-specific visual roadmap cards for Agronautas and Iberá-Alerta. Every card is labeled `Próximamente` and `Contrato pendiente`; cards contain explanatory copy only, with no values, prices, metrics, endpoints, links, buttons, forms, or operational controls. Agronautas shows prices/trends, crop decisions, export marketplace, sector connections, workspace management, and advanced satellite/simulation capabilities. Iberá-Alerta shows institution-specific integrations, shared operations, and territorial coverage expansion without importing Agronautas commercial concepts. |

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.1 | `apps/web/src/components/visibility/future-capabilities.test.tsx`, `components/agronautas/workspace-intake.test.tsx`, `components/government/overview.test.tsx` | Unit + integration/component | `workspace-intake.test.tsx` 3/3 and `overview.test.tsx` 6/6 before route edits | ✅ New component import failed before implementation; route assertions failed before wiring | ✅ Focused suite 8/8; full web suite 82/82 | ✅ Agronautas and Iberá variants; product separation; status labels; no fabricated values/actions | ✅ Added shared presentational component and route-level assertions; no data or interaction state introduced |

## Tests and build evidence

- `pnpm --dir apps/web exec node --import tsx --test src/components/visibility/future-capabilities.test.tsx src/components/agronautas/workspace-intake.test.tsx src/components/government/overview.test.tsx` — exit 0, **8/8 passing**.
- `pnpm --dir apps/web test` — exit 0, **82/82 passing**.
- `pnpm --dir apps/web build` — exit 0, production build passed; only the pre-existing unused React warning in `src/app/municipalities/ingest/page.test.tsx` was reported.
- `pnpm test` — exit 1 in the pre-existing `@repo/hydrology-engine` suite: `PnaHttpClient enforces a finite total timeout budget across retry attempts` expected 2 calls and observed 1 at `packages/hydrology-engine/src/clients/http-clients.test.ts:128`; no unrelated backend fix was made.

## Runtime smoke report

- Runtime harness: N/A for this UI-only placeholder slice; no browser, server, API, Playwright process, or occupied port was started. The component and route integration tests render the actual cards with static props and assert the absence of controls and fabricated values.
- Cleanup evidence: no process, CMD, dev server, Playwright session, temporary runtime resource, or port was opened; cleanup was therefore N/A and nothing remained open.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/components/visibility/future-capabilities.test.tsx src/components/agronautas/workspace-intake.test.tsx src/components/government/overview.test.tsx` — exit 0; 8/8 passing. Full web suite: 82/82 passing. Build: exit 0. |
| Runtime harness command/scenario and exact result | N/A — no runtime boundary exists for static presentational placeholders; route-level component fixtures prove Agronautas and Iberá rendering and no fake actions/data. No process remained open. |
| Rollback boundary | Revert `apps/web/src/components/visibility/future-capabilities.tsx`, its test, the `FutureCapabilities` imports/usages in `components/agronautas/workspace.tsx` and `components/government/overview.tsx`, the added assertions in `workspace-intake.test.tsx` and `overview.test.tsx`, plus only the 4.1 checkbox/progress section. Keep tasks 1.1–3.3, auth/security, backend, existing contracts, and 4.2 untouched. |

## Risks and follow-up

- Task 4.2 was pending before the current apply slice and is completed below.
- Root `pnpm test` remains red only on the previously recorded hydrology-engine timing test; the focused web suite and production build pass.
- No commits or pushes were performed; cumulative uncommitted worktree changes remain untouched.

## Current slice implementation

| Task | Files / scope | Result |
|---|---|---|
| 4.2 | `apps/web/tests/e2e/uiux-journeys.spec.js`, `apps/web/playwright.config.mjs` | Completed Playwright coverage for the Agronautas workspace → intake/locality and outside-coverage fallback → decision dashboard → field detail → risk/evidence/freshness → existing grounded chat and partial Copilot SSE → report/recompute journey, plus the Iberá overview → accessible map/list fallback → locality telemetry/alerts/INA/provenance/freshness → partial ingest/retry → existing Copilot Advisor journey. Desktop/mobile viewports, keyboard skip/focus, semantic non-color statuses, loading/error/empty/stale/degraded/missing/retry and partial-stream states, and non-operational future placeholders are asserted. Local Playwright workers are serialized to keep the Next/API harness deterministic on constrained workstations; the first Agronautas journey gets a 90-second local compile/runtime budget. |

## TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.2 | `apps/web/tests/e2e/uiux-journeys.spec.js` | E2E / Playwright | Existing interrupted slice was inspected; prior full run was red from parallel harness contention and was not treated as success | ✅ Journey assertions and the outside-coverage fallback assertion were present/written before any implementation change; no production code was required | ✅ Focused UIUX suite: 5/5 passing with one worker | ✅ Agronautas desktop + mobile and Iberá mobile journeys cover success, fallback, detail, evidence, freshness, chat/SSE, report, loading/error/empty, ingest partial/retry, and non-operational placeholders | ✅ Removed temporary diagnostics and stabilized the local Playwright harness with serialized workers and an explicit first-journey timeout |

## Tests and build evidence

- `pnpm --dir apps/web exec playwright test tests/e2e/uiux-journeys.spec.js --workers=1 --retries=0` — exit 0, **5/5 passing**.
- `pnpm --dir apps/web test` — exit 0, **83/83 passing**.
- `pnpm --dir apps/web test:e2e` — exit 1, **12 passed, 1 skipped, 1 failed**. All five 4.2 journeys passed. The only failure is the pre-existing `tests/e2e/government-ui.spec.js:78` strict locator ambiguity for duplicated `Último dato obtenido: no disponible`; no 4.2 assertion failed. The earlier parallel run also exposed worker contention; `workers: 1` now makes the suite deterministic locally.
- `pnpm build` — exit 0, root Turborepo production build passed. It retained the pre-existing unused `React` warning in `apps/web/src/app/municipalities/ingest/page.test.tsx`.

## Runtime smoke report

- Managed local smoke: `pnpm --dir apps/web dev --hostname 127.0.0.1 --port 3010`; browser visits to `/demo` and `/municipalities` rendered the real route shells, accessible intake/list fallbacks, and explicit API loading/error states. The local API was not available, so no live-provider claim is made; Playwright journey fixtures supplied the contractual route data.
- Playwright managed smoke also exercised the real web runtime and route transitions through the five passing journeys.
- Cleanup: the manually started server process tree (`11968, 10768, 17056, 7016, 21076, 12436`) was stopped; final checks showed no listeners on ports `3010`, `3000`, or `3001`, and no browser pages beyond the retained blank tab. Playwright-managed web/API workers exited with each test command.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec playwright test tests/e2e/uiux-journeys.spec.js --workers=1 --retries=0` — exit 0; 5/5 passing. Supporting web unit suite: `pnpm --dir apps/web test` — exit 0; 83/83. Root build: `pnpm build` — exit 0. |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/web test:e2e` with Playwright-managed API/web workers and route fixtures — exit 1 because of the unrelated existing government-ui strict locator failure; all 5/5 task 4.2 journeys passed. Manual managed smoke reached `/demo` and `/municipalities` on port 3010 with explicit fallback/error states. Cleanup was verified with ports/processes clear. |
| Rollback boundary | Revert `apps/web/tests/e2e/uiux-journeys.spec.js` and the `workers: 1` plus local timeout harness changes in `apps/web/playwright.config.mjs`; revert only the 4.2 checkbox and this current-slice progress section. Keep all application UI, contracts, auth/security, backend, and prior task artifacts unchanged. |

## Risks and follow-up

- The full E2E command remains non-zero only because the pre-existing government detail test uses an unscoped locator that resolves to two visible `Último dato obtenido: no disponible` nodes. This was deliberately not modified because it is outside task 4.2.
- E2E data is route-scoped fixture data; provider connectivity and production API readiness remain outside this UI coverage task.
- The known prior root `pnpm test` hydrology-engine timing failure remains outside this UI scope: `PnaHttpClient enforces a finite total timeout budget across retry attempts` expected 2 calls and observed 1 at `packages/hydrology-engine/src/clients/http-clients.test.ts:128`.
- No commits or pushes were performed; cumulative uncommitted worktree changes remain untouched.
