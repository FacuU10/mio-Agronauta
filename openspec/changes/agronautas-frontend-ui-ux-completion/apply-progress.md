# Apply Progress: Agronautas Frontend UI/UX Completion

## Scope

This cumulative apply artifact preserves completed frontend tasks 1.1–8.3 and records targeted remediation of the independent verification blockers. Backend code, auth isolation, Gate G, the pivot worktree, and unrelated dirty files remain untouched. No API/database seed was used.

## Mode and Delivery

- Mode: Strict TDD
- Delivery: single approved `size-exception` boundary, executed as sequential writer-sized slices
- Evidence mode: demo/local structural only; no production claims

## Completed Tasks

- [x] 1.1 RED route, sitemap, shell, and focus contract tests
- [x] 1.2 GREEN marketplace route contract, protected metadata, shell navigation, robots boundary, and single-main marketplace composition
- [x] 1.3 VERIFY route-foundations Playwright coverage verified for desktop/mobile route identity, active navigation, main landmark, and skip target; `pnpm --dir apps/web test:e2e -- tests/e2e/route-foundations.spec.ts` passed desktop 2/2 and mobile 2/2; Playwright-managed processes shut down normally; no production claim
- [x] 2.1 RED typed status, evidence, and recovery primitive tests
- [x] 2.2 GREEN typed status/evidence/recovery primitives and semantic design tokens
- [x] 2.3 VERIFY primitive accessibility, provenance/freshness, retry, maintenance, degraded, and live-region coverage
- [x] 3.1 RED workspace anchor/deep-link tests and field route identity/recovery tests
- [x] 3.2 GREEN operational workspace navigation, service-backed initial selection, protected field route, and contextual return path
- [x] 3.3 VERIFY managed Playwright desktop/mobile coverage for field context, operational links, unknown-field recovery, and protected access recovery
- [x] 7.1 RED added the requested demo-fixture and accessibility-responsive E2E tests before production edits. RED reproduced the missing explicit local/no-persistence boundary, skip-link focus failure, and 27px shell brand target. The demo mutation test also established that selecting the fixture is required before creating an in-memory operation.
- [x] 7.2 GREEN reused the existing fixed-ID/timestamp `createAgronautasMockService` fixture; added `DEMO LOCAL · SIN PERSISTENCIA`, explicit skip-link focus to the unique `<main>`, 44px header and workspace controls, and `pnpm demo:local` (web server only). Existing reduced-motion CSS was retained. API seed scripts/database were not changed or run.
- [x] 7.3 VERIFY final managed Playwright desktop/mobile E2E passed 6/6; screenshots are attached in `C:\Users\mmmau\AppData\Local\Temp\opencode\agronautas-frontend-7-confirmed`. The browser fixture made zero `/api/` requests, and a created demo operation disappeared on reload.

## Exact Files Changed

### Route and shell foundation

- `apps/web/src/lib/route-contracts.ts`
- `apps/web/src/lib/route-contracts.test.ts`
- `apps/web/src/app/agronautas/marketplace/page.tsx`
- `apps/web/src/components/marketplace/route-client.tsx`
- `apps/web/src/components/shell/product-shell.tsx`
- `apps/web/src/components/shell/product-shell.test.tsx`
- `apps/web/src/app/robots.ts`
- `apps/web/src/app/sitemap.test.ts`
- `apps/web/tests/e2e/route-foundations.spec.ts`

`apps/web/src/app/sitemap.ts` was verified against the public route registry and required no code change.

### Shared UI primitives and tokens

- `apps/web/src/components/ui/status.tsx`
- `apps/web/src/components/ui/status.test.tsx`
- `apps/web/src/components/ui/evidence.tsx`
- `apps/web/src/components/ui/evidence.test.tsx`
- `apps/web/src/components/ui/recovery.tsx`
- `apps/web/src/components/ui/recovery.test.tsx`
- `apps/web/src/app/globals.css`

### Operational workspace and field deep-link slice

- `apps/web/src/components/agronautas/workspace-navigation.ts`
- `apps/web/src/components/agronautas/workspace.test.tsx`
- `apps/web/src/components/agronautas/page-client.tsx`
- `apps/web/src/components/agronautas/workspace.tsx`
- `apps/web/src/components/agronautas/field-detail.tsx`
- `apps/web/src/lib/agronautas/service.ts`
- `apps/web/src/lib/route-contracts.ts`
- `apps/web/src/lib/route-contracts.test.ts`
- `apps/web/src/app/agronautas/page.tsx`
- `apps/web/src/app/demo/page.tsx`
- `apps/web/src/app/agronautas/fields/[fieldId]/page.tsx`
- `apps/web/src/app/agronautas/fields/[fieldId]/page.test.tsx`
- `apps/web/tests/e2e/agronautas-operational.spec.ts`

### SDD artifacts

- `openspec/changes/agronautas-frontend-ui-ux-completion/tasks.md`
- `openspec/changes/agronautas-frontend-ui-ux-completion/apply-progress.md`

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `src/lib/route-contracts.test.ts`, `src/app/sitemap.test.ts`, `src/components/shell/product-shell.test.tsx` | Unit/component | ✅ 279/279 baseline | ✅ Written; route/robots/active-link assertions failed before implementation | ✅ 17/17 focused tests | ✅ marketplace protected + public SEO exclusion; active/inactive navigation | ✅ Added bounded default marketplace shell link and semantic active state |
| 1.2 | Route implementation files | Unit/component | ✅ Existing route/shell tests passing | ✅ Covered by 1.1 RED | ✅ 17/17 focused tests | ✅ protected metadata and no sitemap advertisement | ✅ Removed nested marketplace `<main>` to preserve one landmark |
| 1.3 | `tests/e2e/route-foundations.spec.ts` | E2E | N/A — new test | ✅ Written | ✅ Managed Playwright run passed: desktop 2/2 and mobile 2/2; processes shut down normally | ✅ URL, heading, active navigation, one main landmark, and skip target verified at both viewports | ➖ No runtime refactor |
| 2.1 | `src/components/ui/{status,evidence,recovery}.test.tsx` | Component | N/A — new files | ✅ Written; modules initially absent | ✅ 17/17 focused tests after implementation | ✅ loading vs degraded; mock/missing vs live/fresh; maintenance vs retryable error | ✅ Exported typed props/constants and localized state labels |
| 2.2 | `src/components/ui/{status,evidence,recovery}.tsx`, `src/app/globals.css` | Component/CSS | N/A — new primitives/tokens | ✅ Covered by 2.1 RED | ✅ 17/17 focused tests | ✅ No provider/business inference; explicit source/mode/freshness | ✅ Consolidated semantic tones and focus/live-region behavior |
| 2.3 | `src/components/ui/*.test.tsx` | Component | ✅ 17/17 focused tests | ✅ Written | ✅ 17/17 focused tests | ✅ 2 cases per primitive behavior | ✅ No CSS-class assertions; semantic roles/text/actions only |
| 3.1 | `src/components/agronautas/workspace.test.tsx`, `src/app/agronautas/fields/[fieldId]/page.test.tsx` | Component/route unit | ✅ 43/43 prior workspace/detail tests | ✅ Written; initial run failed on missing workspace navigation exports and route implementation | ✅ 3/3 workspace tests and 2/2 field route tests | ✅ known selection + unknown field recovery; protected route identity | ✅ extracted shared navigation contract and kept route/client boundaries explicit |
| 3.2 | `src/components/agronautas/{workspace,page-client,field-detail}.tsx`, route/service files | Component/integration | ✅ 50/50 focused slice tests after implementation | ✅ Covered by 3.1 RED | ✅ 50/50 focused tests | ✅ demo field selection, unknown selection, 401/403/404 field boundaries, context-bearing links | ✅ mock demo service is deterministic; protected route keeps return query context |
| 3.3 | `tests/e2e/agronautas-operational.spec.ts` | E2E | N/A — new test | ✅ Written before browser run | ✅ 4/4 desktop/mobile cases | ✅ demo field context and protected recovery on both viewports | ✅ selectors scoped to semantic roles and managed harness only |
| 4.1 | `src/components/agronautas/{management,planning}-panel.test.tsx` | Component | N/A — no baseline count recorded | ✅ Historical RED in prose: initial run failed on absent planning panel and missing management behaviors; not rerun pre-implementation | ✅ Shared focused management/planning slice 44/44 | ✅ pagination, empty/loading/error/degraded/recovery, lifecycle/revisions, forbidden, conflict, audit, draft preservation | ➖ No separate refactor evidence recorded |
| 4.2 | Management/planning panels and service tests | Component/integration | ✅ 44/44 focused slice after implementation | ✅ Covered by historical 4.1 RED; not independently reconstructed | ✅ Shared focused management/planning slice 44/44 | ✅ typed history, confirmed mutations, duplicate prevention, planning context/simulation | ✅ Demo service state created once per page-client instance to avoid stale revision conflicts |
| 4.3 | `tests/e2e/agronautas-management.spec.ts`, `tests/e2e/agronautas-planning.spec.ts` | Managed Playwright E2E | N/A — managed E2E evidence | ✅ Historical test development and selector correction recorded in prose; no pre-implementation browser failure claim | ✅ Management 2/2, planning 2/2 desktop/mobile; operational context 4/4 also recorded | ✅ lifecycle/revision/audit/duplicate prevention, planning recovery, context preservation | ✅ Planning provenance selector narrowed to the first truthful entry |
| 5.1 | `src/components/marketplace/{catalog,rfq-form,rfq-history,catalog-rfq}.test.tsx` | Component | N/A — no baseline count recorded | ✅ Historical RED in prose: new catalog, form, and history tests failed because target components did not exist; not rerun pre-implementation | ✅ Shared focused marketplace suite 9/9 | ✅ filters/empty/scope/validation/idempotency/forbidden/cancel/conflict | ➖ No separate refactor evidence recorded |
| 5.2 | Marketplace components and service tests | Component/integration | ✅ 9/9 focused marketplace suite | ✅ Covered by historical 5.1 RED; not independently reconstructed | ✅ Shared focused marketplace suite 9/9 | ✅ provenance/freshness, typed lifecycle, request identity, review/cancel boundaries | ✅ Typed mutation responses propagated to form/history for confirmed status and request IDs |
| 5.3 | `tests/e2e/marketplace-rfq.spec.ts` | Managed Playwright E2E | N/A — managed E2E evidence | ✅ Historical E2E coverage; no separate pre-implementation browser failure recorded | ✅ Desktop 1/1 + mobile 1/1 = 2/2 | ✅ stable links/request IDs, idempotency, human review, cancel, no commercial claims | ✅ Existing managed harness and route stubs retained |
| 6.1 | Agronautas intelligence/evidence/Copilot panel tests | Component | N/A — no baseline count recorded | ✅ Historical RED in prose: missing evidence mode/references and Copilot evidence metadata; not rerun pre-implementation | ✅ Shared focused panel suite 10/10 | ✅ source/freshness/lineage, stale/missing, maintenance, citation absence, non-grounded output, retry | ➖ No separate refactor evidence recorded |
| 6.2 | Agronautas intelligence/evidence/Copilot panels and tests | Component | ✅ 10/10 focused panel suite | ✅ Covered by historical 6.1 RED; not independently reconstructed | ✅ Shared focused panel suite 10/10 | ✅ normalized states and non-prescriptive degraded/unverified outcomes | ✅ Provider mode is not inferred when absent from the intelligence contract |
| 6.3 | Government detail/ingest and visibility tests | Component/unit | N/A — no baseline count recorded | ✅ Historical RED in prose: maintenance exposed retry and invalid HTTP-200 left loading/success-sounding presentation; not rerun pre-implementation | ✅ Shared focused government/visibility suite 60/60 | ✅ invalid/empty payload, maintenance terminality, outage retry, access denial, citation-none | ➖ No separate refactor evidence recorded |
| 6.4 | Government detail/ingest and visibility implementation/tests | Component/unit | ✅ 60/60 focused government/visibility suite | ✅ Covered by historical 6.3 RED; not independently reconstructed | ✅ Shared focused government/visibility suite 60/60 | ✅ missing-data, preserved context, bounded retry, no inferred source data | ✅ Existing visibility normalization reused; no provider data inferred |
| 6.5 | `tests/e2e/{agronautas-intelligence,ibera-government}.spec.ts` | Managed Playwright E2E | N/A — managed E2E evidence | ✅ Historical test development; no separate pre-implementation browser failure recorded | ✅ Desktop 6/6 + mobile 6/6 = 12/12 | ✅ stale/non-grounded, registration vs telemetry, invalid/empty, maintenance/403 no-retry, 503 recovery | ✅ Managed harness and intercepted responses; local-real/provider claims excluded |
| 7.1 | `tests/e2e/{demo-fixture,accessibility-responsive}.spec.ts` | E2E | N/A — new files | ✅ Written first; managed RED confirmed missing demo boundary, skip focus, and undersized brand link | ✅ Passed after 7.2 | ✅ Reload stability + in-memory mutation reset; desktop/mobile keyboard, focus, touch, motion, and overflow cases | ➖ No runtime refactor |
| 7.2 | `src/app/{layout.tsx,globals.css}`, shell/workspace/page-client, root `package.json` | Browser/functional | See 7.1 RED | ✅ Covered by 7.1 | ✅ Managed E2E 6/6; focused workspace 3/3; focused demo-label component test 1/1 | ✅ Existing browser mock is deterministic and self-resetting; API seed avoided | ✅ Removed duplicate `main-content` ID; skip link focuses the real main landmark |
| 7.3 | `tests/e2e/{demo-fixture,accessibility-responsive}.spec.ts` | Managed Playwright E2E | ✅ 7.2 green | ✅ Re-ran after final touch-target assertion | ✅ Desktop 3/3 + mobile 3/3 = 6/6 | ✅ Screenshots attached; zero `/api/` requests, no page errors, stable reload, no page overflow | ➖ No runtime refactor |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/lib/route-contracts.test.ts src/app/sitemap.test.ts src/components/shell/product-shell.test.tsx src/components/ui/status.test.tsx src/components/ui/evidence.test.tsx src/components/ui/recovery.test.tsx` → exit 0, 17/17 passing |
| Existing marketplace/visibility safety net | `pnpm --dir apps/web exec node --import tsx --test src/components/marketplace/catalog-rfq.test.tsx src/components/visibility/primitives.test.tsx` → exit 0, 13/13 passing |
| Historical prior runtime attempt (superseded) | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 pnpm --dir apps/web exec playwright test tests/e2e/route-foundations.spec.ts --project=desktop --project=mobile --workers=1 --timeout=5000 --output C:\Users\mmmau\AppData\Local\Temp\opencode\route-foundations-results` → exit 1; 2/2 browser cases failed at `page.goto` with `net::ERR_CONNECTION_REFUSED` because no web server was listening on `127.0.0.1:3000`; managed bootstrap was not used |
| Current route-foundations runtime harness command/scenario and exact result | `pnpm --dir apps/web test:e2e -- tests/e2e/route-foundations.spec.ts` → exit 0; desktop 2/2 and mobile 2/2 passed; Playwright-managed processes shut down normally; no production claim |
| Type-check result | `pnpm --dir apps/web exec tsc --noEmit` is blocked by pre-existing dirty-worktree errors in `src/components/marketplace/catalog-rfq.test.tsx` and `src/lib/visibility/chat.test.ts`; the new sitemap test's TS4111 errors were fixed |
| Rollback boundary | Revert only route/shell/marketplace foundation files, new UI primitive/token files, their focused tests, and this task/progress artifact; leave all pre-existing dirty backend/frontend/auth files intact |

### Current work unit evidence: operational workspace and field deep-link slice

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/workspace.test.tsx src/components/agronautas/page-client.test.tsx src/components/agronautas/workspace-intake.test.tsx src/components/agronautas/field-detail.test.tsx src/lib/route-contracts.test.ts` → exit 0, 50/50 passing; `pnpm --dir apps/web exec tsx -e "import('./src/app/agronautas/fields/[fieldId]/page.test.tsx')"` → exit 0, 2/2 passing |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/web exec playwright test tests/e2e/agronautas-operational.spec.ts --project=desktop --project=mobile --workers=1` with automatic managed webServer → exit 0, 4/4 passing (desktop 2/2, mobile 2/2); demo evidence and protected recovery evidence are recorded separately; no production claim |
| Demo evidence | `/demo?view=fields&fieldId=field-corrientes-lote-001` preserved selection through all eight operational links and returned to the activity view with the same field context |
| Local-real evidence | N/A for this slice: the passing workspace journey intentionally uses the deterministic demo adapter; protected field navigation was exercised only for access/recovery boundary behavior, not as local-real data proof |
| Blocked evidence | None in the current managed run; the earlier route-foundations external-target refusal is retained above as historical evidence and is superseded by the successful managed run |
| Type-check result | `pnpm --dir apps/web exec tsc --noEmit` remains blocked only by pre-existing dirty-worktree errors in `src/components/marketplace/catalog-rfq.test.tsx` and `src/lib/visibility/chat.test.ts`; no new 3.x error was reported |
| Rollback boundary | Revert only the operational navigation module, workspace/page-client/field-detail changes, service demo fixture, route contract/page files, focused route/component tests, E2E spec, and this task/progress artifact; leave all prior route-foundation, backend, auth, pivot, and unrelated dirty files intact |

## Remaining Slices

- [x] 3.1–3.3 Operational workspace and field deep-link foundation
- [x] 4.1–4.3 Management and planning foundation
- [x] 5.1–5.3 Marketplace catalog/RFQ behavior
- [x] 6.1–6.2 Intelligence, evidence, and Copilot panel RED/GREEN
- [x] 6.3–6.5 Government, recovery hardening, and intelligence browser verification
- [x] 7.1–7.3 Deterministic browser fixtures, accessibility, and responsive evidence
- [x] 8.1–8.3 Browser evidence and runbook

## Current Work Unit: Browser Evidence and Runbook (8.1–8.3)

### Completed Tasks

- [x] 8.1 RED added helper-schema tests and the requested UI/UX evidence E2E first. Both initially failed on the absent `helpers/evidence` module before implementation.
- [x] 8.2 GREEN added a strict Zod envelope with route-only identity, viewport, demo/local-real/blocked modes, provenance/freshness visibility, categorized blockers, screenshot/error/request counts, and explicit `commitIdentity: not-supplied`, `worktreeIdentity: current-working-tree`, and `productionEvidence: N/A`. Query/fragment data and raw diagnostics are excluded. Added the local demo runbook and separated already-documented local-real prerequisites.
- [x] 8.3 VERIFY passed the focused Playwright proof with managed API/web servers at desktop and mobile. This is deterministic browser-demo evidence only; local-real and production evidence were not exercised or claimed.

### Exact Files Changed In This Slice

- `apps/web/tests/e2e/helpers/evidence.ts`
- `apps/web/src/lib/uiux-evidence.test.ts`
- `apps/web/tests/e2e/agronautas-uiux-evidence.spec.ts`
- `docs/agronautas-frontend-uiux-evidence.md`
- `openspec/changes/agronautas-frontend-ui-ux-completion/tasks.md`
- `openspec/changes/agronautas-frontend-ui-ux-completion/apply-progress.md`

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 8.1 | `src/lib/uiux-evidence.test.ts`, `tests/e2e/agronautas-uiux-evidence.spec.ts` | Unit + managed E2E | N/A — new evidence files | ✅ Unit/E2E imports failed before helper existed; follow-up ID-sanitization test failed on secret-like test ID | ✅ Unit 3/3; E2E desktop/mobile 2/2 | ✅ Demo, local-real schema, blocked-category schema, invalid/raw claim rejection | ✅ Strict schema, fixed non-production fields, query/fragment removal, stable-ID allowlist |
| 8.2 | `tests/e2e/helpers/evidence.ts`, docs runbook | Contract + documentation | N/A — new files | ✅ Covered by 8.1 | ✅ Evidence contract tests 3/3 and web build passed | ✅ Three modes and categorized blockers; runbook distinguishes demo from local-real | ➖ No additional refactor needed |
| 8.3 | `tests/e2e/agronautas-uiux-evidence.spec.ts` | Managed Playwright E2E | ✅ 8.2 green | ✅ Covered by 8.1 | ✅ Desktop 1/1 + mobile 1/1 | ✅ Both viewport reports assert route, mode, provenance/freshness visibility, no blockers, zero demo API requests, no console errors, and production N/A | ➖ No runtime refactor |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/lib/uiux-evidence.test.ts` → exit 0, 3/3 passing |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/web test:e2e --grep uiux-evidence` → exit 0, 2/2 passing (desktop 1/1, mobile 1/1); Playwright managed its configured API/web servers |
| Targeted frontend build | `pnpm --dir apps/web build` → exit 0; Next.js 15.5.19 production compilation, type validation, and static generation passed. Existing non-fatal lint warnings remain in dirty files outside this slice. |
| Evidence boundary | Demo fixture only; zero `/api/` requests observed. Local-real: N/A, not exercised. Blockers: none in the local demo run. Production: N/A, not independently supplied. No commit hash or raw console/network diagnostics are emitted. |
| Rollback boundary | Revert only the new UI/UX evidence helper/spec/test, `docs/agronautas-frontend-uiux-evidence.md`, and the 8.x task/progress entries; preserve all other existing dirty files. |

## Notes

- No production claim is made.
- Historical route-foundations blocker: an earlier externally targeted attempt required a reachable local web server at `http://127.0.0.1:3000` and did not use repository-managed bootstrap; it is superseded by the successful managed run recorded above.
- Focused regression safety net re-run: route/shell/UI primitive tests exit 0 with 17/17 passing; marketplace/visibility safety net exits 0 with 13/13 passing.
- No commit, push, deploy, review, receipt, freeze, hash, reset, clean, migration, seed, or production data operation was performed.
- Tasks 7.1–7.3 use browser-side fixtures from `createAgronautasMockService`; local API seed scripts and database were not changed or run. `pnpm run demo:local` starts only the web app and demo mutations remain memory-only.
- Remediation: `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/page-client.test.tsx` → exit 0, 23/23 passing. The `weather:open-meteo` assertion checks only `agronautas-evidence-list`, the evidence source list containing that reference; state assertions remain scoped to the separate named state region.
- Remediation: `pnpm --dir apps/web exec node --import tsx --test src/lib/visibility/chat.test.ts` → exit 0, 11/11 passing. Contract-valid fixtures explicitly supply `sourceRunIds`, `actionable`, `providerModes`, `modelMode`, and `citationLineage`; empty/unverified scenarios have no actionable claim or citation lineage, the degraded case retains fresh live weather lineage while marking the model unavailable/non-actionable, and the rate-limited case has no source lineage/provider mode.
- Remediation: after both focused tests completed, `pnpm --dir apps/web exec tsc --noEmit` → exit 0. No build ran concurrently.
- Remediation: `frontend-demo-evidence` spec, design, tasks, and runbook now require deterministic browser fixtures and `pnpm run demo:local` for safe visual preview; they state DEMO labeling, reset-on-reload, zero API writes, and no automatic DB connection/migration/seed. Local-real setup remains optional, separate, explicitly invoked, and retains its own real-data verification requirements.
- Remediation: explicit cycle rows for 4.1–6.5 use only TDD details already present in this artifact. RED is labeled historical; no pre-implementation failure was recreated or newly claimed. Exact existing test counts and E2E results are retained in the table.
- Still outstanding: the full 28-file focused change lane and 32-case browser matrix were not rerun in this remediation; their prior counts remain historical evidence. `verify-report.md` was intentionally left unchanged and must be regenerated by the later verification step.

## Current Work Unit: Management and Planning Foundation (4.1–4.3)

### Completed Tasks

- [x] 4.1 RED management/planning panel coverage for typed cursor pagination, empty/loading/error/degraded/recovery states, lifecycle/revisions, forbidden access, conflict/409 handling, audit visibility, and draft preservation.
- [x] 4.2 GREEN management/planning UI over the existing service and BFF contracts; confirmed mutations, idempotent create behavior, stable demo service state, typed planning context/simulation, and source-backed history are rendered without ownership or audit invention.
- [x] 4.3 VERIFY managed Playwright coverage for demo lifecycle, revision changes, audit entries, and duplicate prevention at desktop/mobile viewports; local-real and production evidence remain distinct and are not claimed by this demo run.

### Exact Files Changed In This Slice

- `apps/web/src/components/agronautas/management-panel.tsx`
- `apps/web/src/components/agronautas/management-panel.test.tsx`
- `apps/web/src/components/agronautas/planning-panel.tsx`
- `apps/web/src/components/agronautas/planning-panel.test.tsx`
- `apps/web/src/components/agronautas/page-client.tsx`
- `apps/web/src/components/agronautas/workspace.tsx`
- `apps/web/tests/e2e/agronautas-management.spec.ts`
- `apps/web/tests/e2e/agronautas-planning.spec.ts`
- `openspec/changes/agronautas-frontend-ui-ux-completion/tasks.md`
- `openspec/changes/agronautas-frontend-ui-ux-completion/apply-progress.md`

### TDD and Verification Evidence

| Evidence | Result |
|---|---|
| RED | Added failing management/planning tests before implementation for lifecycle/audit, forbidden, conflict draft preservation, planning state recovery, and cursor pagination. Initial run failed on the absent planning panel and missing management behaviors. |
| GREEN focused tests | `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/management-panel.test.tsx src/components/agronautas/planning-panel.test.tsx src/components/agronautas/planning.test.tsx src/components/agronautas/workspace.test.tsx src/components/agronautas/page-client.test.tsx src/lib/agronautas/service.test.ts` → exit 0, 44/44 passing. |
| VERIFY management E2E | `pnpm --dir apps/web test:e2e -- tests/e2e/agronautas-management.spec.ts` → exit 0, desktop 1/1 and mobile 1/1 passing with Playwright automatic webServer; evidence is deterministic demo only, not local-real or production. |
| VERIFY planning/operational E2E | `pnpm --dir apps/web test:e2e -- tests/e2e/agronautas-planning.spec.ts tests/e2e/agronautas-operational.spec.ts` → operational desktop/mobile 4/4 passed; planning initially exposed a strict duplicate selector and was corrected to select the first truthful provenance entry. Follow-up `pnpm --dir apps/web test:e2e -- tests/e2e/agronautas-planning.spec.ts` → desktop/mobile 2/2 passed. |
| Type-check | `pnpm --dir apps/web exec tsc --noEmit` has no new errors in this slice; it remains blocked by pre-existing dirty-worktree contract fixture errors in `apps/web/src/components/marketplace/catalog-rfq.test.tsx` and `apps/web/src/lib/visibility/chat.test.ts`. |
| Root-cause fix | Demo service state is now created once per page-client instance; recreating it on every render caused valid lifecycle transitions to observe a missing/stale revision and surface false 409 conflicts. |
| Evidence boundaries | Demo evidence is recorded above. No local-real backend mutation evidence, blocked provider evidence, or production/Gate G claim was made. |

### Rollback Boundary

- Revert only the management/planning panel components and tests, page-client/workspace wiring, management/planning E2E updates, and the 4.1–4.3 task/progress entries; preserve all backend, auth, pivot, Gate G, and unrelated dirty worktree changes.

## Current Work Unit: Marketplace Catalog, Discovery, and RFQ (5.1–5.3)

### Completed Tasks

- [x] 5.1 RED marketplace catalog/form/history coverage for filters, empty/no-listings, workspace scope, validation, idempotency, forbidden access, cancellation, and conflict/recovery states.
- [x] 5.2 GREEN typed catalog/discovery/RFQ components, provenance/freshness boundaries, lifecycle/revision/audit/request-ID rendering, protected workspace scope, and BFF-backed cancellation.
- [x] 5.3 VERIFY automatic Playwright desktop/mobile coverage for stable marketplace navigation, RFQ request IDs, idempotency identity, human-review lifecycle, cancellation, and prohibited commercial claims.

### Exact Files Changed In This Slice

- `apps/web/src/components/marketplace/catalog.tsx`
- `apps/web/src/components/marketplace/catalog.test.tsx`
- `apps/web/src/components/marketplace/rfq-form.tsx`
- `apps/web/src/components/marketplace/rfq-form.test.tsx`
- `apps/web/src/components/marketplace/rfq-history.tsx`
- `apps/web/src/components/marketplace/rfq-history.test.tsx`
- `apps/web/src/components/marketplace/catalog-rfq.tsx`
- `apps/web/src/components/marketplace/catalog-rfq.test.tsx`
- `apps/web/src/components/marketplace/route-client.tsx`
- `apps/web/src/lib/agronautas/service.ts`
- `apps/web/tests/e2e/marketplace-rfq.spec.ts`
- `openspec/changes/agronautas-frontend-ui-ux-completion/tasks.md`
- `openspec/changes/agronautas-frontend-ui-ux-completion/apply-progress.md`

### TDD and Verification Evidence

| Evidence | Result |
|---|---|
| RED | New catalog, RFQ form, and RFQ history tests initially failed because the target components did not exist. |
| GREEN focused tests | `pnpm --dir apps/web exec node --import tsx --test src/components/marketplace/catalog.test.tsx src/components/marketplace/rfq-form.test.tsx src/components/marketplace/rfq-history.test.tsx src/components/marketplace/catalog-rfq.test.tsx` → exit 0, 9/9 passing. |
| VERIFY automatic Playwright | `pnpm --dir apps/web test:e2e -- tests/e2e/marketplace-rfq.spec.ts` → exit 0, desktop 1/1 and mobile 1/1 passing; Playwright automatic webServer managed the run. |
| Demo/stubbed evidence | The passing browser flow used deterministic route stubs and is labeled stubbed/demo: catalog discovery, workspace filtering, RFQ creation, request ID `request-create-1`, cancellation request ID `request-cancel-1`, and lifecycle review states. |
| Local-real evidence | N/A for this slice; no real API/database/auth credentials were used or claimed. |
| Blocked evidence | No blocked case occurred in the managed stubbed/demo run; production evidence remains N/A. |
| Type-check | `pnpm --dir apps/web exec tsc --noEmit` has no marketplace or E2E errors; it remains blocked by the pre-existing `apps/web/src/lib/visibility/chat.test.ts` contract fixture errors. |
| Root-cause fix | Propagated typed mutation responses through the route client and catalog wrapper so the form/history can render confirmed status and request IDs instead of only refetched rows. |
| Rollback boundary | Revert only the marketplace component/service additions, marketplace tests, marketplace E2E, and the 5.1–5.3 task/progress entries; preserve backend, auth, Gate G, pivot, and unrelated dirty worktree changes. |

### Evidence Boundaries

- Demo/stubbed: component fixtures and managed Playwright route stubs only.
- Local-real: not run and not claimed.
- Blocked: no managed-run blocker; any external production prerequisites remain unverified.
- Production: no claim made.

## Current Work Unit: Intelligence, Evidence, and Copilot Panels (6.1–6.2)

### Completed Tasks

- [x] 6.1 RED focused tests for evidence source/freshness/lineage, stale and missing evidence, maintenance, citation absence, non-grounded output, and retry boundaries. The initial failing run exposed omitted evidence mode/references in intelligence and omitted evidence mode/freshness/source runs in Copilot.
- [x] 6.2 GREEN panels render the contract fields they receive, preserve unavailable/missing/degraded/maintenance states, bound retries around auth/forbidden/missing-contract outcomes, and keep stale or non-grounded output non-prescriptive.

### Exact Files Changed In This Slice

- `apps/web/src/components/agronautas/intelligence-panel.tsx`
- `apps/web/src/components/agronautas/intelligence-panel.test.tsx`
- `apps/web/src/components/agronautas/evidence-panel.tsx`
- `apps/web/src/components/agronautas/evidence-panel.test.tsx`
- `apps/web/src/components/agronautas/copilot-panel.tsx`
- `apps/web/src/components/agronautas/copilot-panel.test.tsx`
- `openspec/changes/agronautas-frontend-ui-ux-completion/tasks.md`
- `openspec/changes/agronautas-frontend-ui-ux-completion/apply-progress.md`

### TDD and Verification Evidence

| Evidence | Result |
|---|---|
| RED | Added focused expectations first; tests failed because intelligence omitted explicit evidence mode/references and Copilot omitted response evidence mode, freshness, and source-run lineage. |
| GREEN focused tests | `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/intelligence-panel.test.tsx src/components/agronautas/evidence-panel.test.tsx src/components/agronautas/copilot-panel.test.tsx` → exit 0, 10/10 passing. |
| Covered states | Fresh/stale, missing/empty, degraded, maintenance, source and citation/lineage metadata, non-grounded output, access denial, missing contract, and retryable transient failures. |
| Type-check | `pnpm --dir apps/web exec tsc --noEmit` reports no errors in these three panels or their focused tests after correction; it remains blocked by pre-existing contract-fixture errors in `apps/web/src/lib/visibility/chat.test.ts` (missing required grounded-chat response fields). |
| Runtime evidence mode | Focused UI tests use deterministic mock/demo service data. No local-real runtime, production, or provider claim is made; tasks 6.3–6.5 remain open. |
| Rollback boundary | Revert only the three panel components, their three focused tests, and the 6.1–6.2 task/progress entries; preserve all other dirty worktree files. |

### Contract Limitation

- The intelligence contract's observation metadata has source, timestamps, and lineage but no `providerMode`; the panel states that the evidence mode is absent from the contract rather than inferring it. Evidence dashboard and Copilot show mode when their contracts provide it.

## Current Work Unit: Government, Recovery, and Browser Verification (6.3–6.5)

### Completed Tasks

- [x] 6.3 RED expanded government and visibility coverage for invalid HTTP-200 dashboard payloads, empty-source ingestion results, maintenance terminal behavior, retryable outages, access-denied no-retry, and citation-none output. RED confirmed that invalid HTTP-200 data left a loading municipality heading and that maintenance exposed retry.
- [x] 6.4 GREEN keeps invalid dashboard responses in a missing-data presentation, distinguishes loading from unavailable municipality state, avoids implying all sources are available without a payload, and removes retry/credential retention for maintenance. Existing visibility helpers already normalize source/status/freshness and citation outcomes; no provider or source data is inferred by these panels.
- [x] 6.5 VERIFY added the requested Agronautas intelligence and Iberá government Playwright specs and passed the automatic desktop/mobile matrix.

### Exact Files Changed In This Slice

- `apps/web/src/components/government/detail.tsx`
- `apps/web/src/components/government/detail.test.tsx`
- `apps/web/src/components/government/ingest-panel.tsx`
- `apps/web/src/components/government/ingest-panel.test.tsx`
- `apps/web/tests/e2e/agronautas-intelligence.spec.ts`
- `apps/web/tests/e2e/ibera-government.spec.ts`
- `openspec/changes/agronautas-frontend-ui-ux-completion/tasks.md`
- `openspec/changes/agronautas-frontend-ui-ux-completion/apply-progress.md`

### TDD and Verification Evidence

| Evidence | Result |
|---|---|
| RED | Changing maintenance to a terminal, non-retryable requirement failed against the existing retry button; invalid HTTP-200 dashboard coverage also exposed the persistent loading heading and success-sounding availability copy. |
| GREEN focused tests | `pnpm --dir apps/web exec node --import tsx --test src/components/government/detail.test.tsx src/components/government/ingest-panel.test.tsx src/lib/visibility/polling.test.ts src/lib/visibility/chat.test.ts src/lib/visibility/view-models.test.ts` → exit 0, 60/60 passing. |
| VERIFY managed Playwright | `pnpm --dir apps/web test:e2e -- tests/e2e/agronautas-intelligence.spec.ts tests/e2e/ibera-government.spec.ts` → exit 0, 12/12 passing (desktop 6/6, mobile 6/6); the configured API and web servers were Playwright-managed and shut down by the harness. |
| Browser coverage | Stale demo evidence and degraded non-actionable chat; municipality ID retained in route/request; source registration kept separate from telemetry; citation-none disclosed; invalid HTTP-200 dashboard rejected as missing; empty HTTP-200 ingestion not promoted to verifiable data; maintenance and 403 have no retry; 503 recovers once without losing municipality context. |
| Type-check | `pnpm --dir apps/web exec tsc --noEmit` remains blocked only by existing missing grounded-chat response fields in `apps/web/src/lib/visibility/chat.test.ts`; no task 6.3–6.5 file is reported as an error. |
| Demo/local-real boundary | Playwright used the repository-managed local harness, deterministic Agronautas demo data, and explicit browser API stubs. This is demo/stubbed evidence only; no local-real hydrology/provider/database evidence or production data was exercised or claimed. |
| Rollback boundary | Revert only the government detail/ingest changes and focused tests, the two requested E2E specs, and the 6.3–6.5 task/progress entries; preserve all other dirty files. |

### Evidence Boundaries

- Demo/stubbed: all new browser cases used the Playwright-managed local harness with deterministic demo data or intercepted government API responses.
- Local-real: not run and not claimed; provider/database evidence remains an external prerequisite.
- Production: no claim made; no production data, deployment, commit, or push operation was performed.

## Current Work Unit: Deterministic Browser Fixtures and Responsive Accessibility (7.1–7.3)

### Exact Files Changed In This Slice

- `package.json`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/components/shell/skip-link.tsx`
- `apps/web/src/components/agronautas/page-client.tsx`
- `apps/web/src/components/agronautas/workspace.tsx`
- `apps/web/src/components/agronautas/page-client.test.tsx`
- `apps/web/tests/e2e/demo-fixture.spec.ts`
- `apps/web/tests/e2e/accessibility-responsive.spec.ts`
- `openspec/changes/agronautas-frontend-ui-ux-completion/tasks.md`
- `openspec/changes/agronautas-frontend-ui-ux-completion/apply-progress.md`

### Work Unit Evidence

| Evidence | Result |
|---|---|
| RED | Added E2E cases before implementation. Managed RED confirmed missing explicit local/no-persistence text, skip activation did not focus the main landmark due to duplicate `main-content` IDs, and the header brand target was 27px. |
| Focused functional tests | `pnpm --dir apps/web exec node --import tsx --test --test-name-pattern="modo demo" src/components/agronautas/page-client.test.tsx` → exit 0, 1/1 passing; `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/workspace.test.tsx` → exit 0, 3/3 passing. |
| Managed browser harness | `pnpm --dir apps/web test:e2e -- tests/e2e/demo-fixture.spec.ts tests/e2e/accessibility-responsive.spec.ts --output C:\Users\mmmau\AppData\Local\Temp\opencode\agronautas-frontend-7-confirmed` → exit 0, 6/6 (desktop 3/3, mobile 3/3). Playwright-managed API/web servers were used by the existing config; browser demo made zero `/api/` requests. |
| Screenshot evidence | Desktop/mobile viewport screenshots were attached by the accessibility-responsive test in the Playwright output under `C:\Users\mmmau\AppData\Local\Temp\opencode\agronautas-frontend-7-confirmed`. |
| Local command | `pnpm run demo:local -- --help` → exit 0; resolves to `pnpm --dir apps/web dev` only. Open `/demo`; no API, container, database, migration, or seed startup is part of this command. |
| Type-check | `pnpm --dir apps/web exec tsc --noEmit` remains blocked only by existing `src/lib/visibility/chat.test.ts` contract fixtures missing `sourceRunIds`, `actionable`, `providerModes`, `modelMode`, and `citationLineage`; no 7.x file errors were reported. |
| Broader component suite | The dirty `page-client.test.tsx` suite reported a duplicate text matcher at line 86 for `weather:open-meteo`; the demo-label test was updated and independently passes 1/1. Workspace tests pass 3/3. |
| Data/evidence boundary | Fixture is browser-side `createAgronautasMockService`, stable IDs/timestamps, and per-page in-memory state; not an API seed. No local-real API/database, production, Gate G, or unrelated-data mutation is claimed. |
| Rollback boundary | Revert only the `demo:local` root script, skip-link/layout/page-client main-target adjustments, workspace DEMO label, scoped responsive CSS, two new E2E files, related demo label test assertion, and 7.1–7.3 task/progress evidence. Preserve all other pre-existing dirty files. |

### Remaining Tasks

- [x] 7.1–7.3 Deterministic browser fixtures, accessibility, and responsive evidence
- [x] 8.1–8.3 Browser evidence and runbook
