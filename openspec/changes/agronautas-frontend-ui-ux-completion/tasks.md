# Tasks: Agronautas Frontend UI/UX Completion

## Review Workload Forecast
Estimated authored change: 1,600–2,400 lines; 400-line budget risk: High.
Approved review budget: 99,999 changed lines for this session.
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High
Delivery strategy: exception-ok/size-exception. One single delivery boundary; implementation remains sequential writer-sized TDD slices with no chained PR requirement. Suggested slice order: routes → primitives → workspace/management → marketplace → intelligence/government → fixtures/evidence/docs.

Each numbered slice is one writer-sized batch. Strict TDD order is RED → GREEN → VERIFY. `E`: demo, local-real, or production.

| Unit | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|
| 1 routes | `pnpm --dir apps/web test -- route-contracts` | demo marketplace | route/shell files |
| 2 primitives | `pnpm --dir apps/web test -- components/ui` | demo gallery | tokens/primitives |
| 3 workspace | focused Agronautas tests | local-real API | workspace/deep-link files |
| 4 management | focused management tests | local-real API | management files |
| 5 marketplace | focused marketplace tests | local-real or demo | catalog/RFQ files |
| 6 intelligence/government | focused component tests | local-real; blocked if provider absent | panel files |
| 7 fixtures/accessibility/docs | `pnpm --dir apps/web test:e2e` | required browser demo; optional local-real is separate | browser fixtures/docs/evidence helpers; no automatic DB setup |
| 8 browser proof | `pnpm --dir apps/web test:e2e` | demo/local-real; production N/A | E2E evidence only |

## Phase 1: Route, shell, tokens, and primitives
- [x] 1.1 RED `apps/web/src/lib/route-contracts.test.ts`, `apps/web/src/app/sitemap.test.ts`, `apps/web/src/components/shell/product-shell.test.tsx`; AT marketplace/deep-link/SEO/focus; dep none; RB tests; E demo.
- [x] 1.2 GREEN `apps/web/src/lib/route-contracts.ts`, `apps/web/src/app/agronautas/marketplace/page.tsx`, `product-shell.tsx`, `sitemap.ts`, `robots.ts`; AT bounded navigation/metadata; dep 1.1; RB route files; E demo.
- [x] 1.3 VERIFY `apps/web/tests/e2e/route-foundations.spec.ts`; AT URL, heading, active link, one main, skip target at both viewports; dep 1.2; RB evidence; E demo. Managed Playwright run `pnpm --dir apps/web test:e2e -- tests/e2e/route-foundations.spec.ts` passed desktop 2/2 and mobile 2/2; Playwright-managed processes shut down normally; no production claim.
- [x] 2.1 RED `apps/web/src/components/ui/{status,evidence,recovery}.test.tsx`; AT typed provenance/freshness/focus/live-region states; dep 1.1; RB tests; E demo.
- [x] 2.2 GREEN `apps/web/src/components/ui/{status,evidence,recovery}.tsx`, `apps/web/src/app/globals.css`; AT semantic tokens and state primitives; dep 2.1; RB UI files; E demo.
- [x] 2.3 VERIFY `apps/web/src/components/ui/*.test.tsx`; AT accessibility matrix and no provider/business inference; dep 2.2; RB test evidence; E demo.

## Phase 2: Operational workspace and management
- [x] 3.1 RED `apps/web/src/components/agronautas/workspace.test.tsx`, `apps/web/src/app/agronautas/fields/[fieldId]/page.test.tsx`; AT context/anchors/unknown field/return; dep 1.2; RB tests; E demo.
- [x] 3.2 GREEN `apps/web/src/app/agronautas/fields/[fieldId]/page.tsx`, `apps/web/src/components/agronautas/{workspace,page-client}.tsx`; AT URL view and selection through service/query; dep 3.1; RB route slice; E local-real.
- [x] 3.3 VERIFY `apps/web/tests/e2e/agronautas-operational.spec.ts`; AT fields/activity/geometry/planning/evidence/Copilot preserve context; dep 3.2; RB route slice; E local-real.
- [x] 4.1 RED `apps/web/src/components/agronautas/{management,planning}-panel.test.tsx`; AT pagination/empty/lifecycle/conflict; dep 3.2; RB tests; E demo.
- [x] 4.2 GREEN `apps/web/src/components/agronautas/{management,planning}-panel.tsx`, `apps/web/src/lib/agronautas/service.ts`; AT typed history and confirmed mutations; dep 4.1; RB management files; E local-real.
- [x] 4.3 VERIFY `apps/web/tests/e2e/agronautas-management.spec.ts`; AT no ownership/audit invention, duplicate prevention, draft preservation; dep 4.2; RB management evidence; E local-real.

## Phase 3: Marketplace catalog/discovery/RFQ
- [x] 5.1 RED `apps/web/src/components/marketplace/{catalog,rfq-form}.test.tsx`; AT filters/empty/scope/validation/idempotency/cancel/forbidden; dep 1.2; RB tests; E demo.
- [x] 5.2 GREEN `apps/web/src/components/marketplace/{catalog,rfq-form,rfq-history}.tsx`, `apps/web/src/app/agronautas/marketplace/page.tsx`; AT evidence boundaries and typed lifecycle; dep 5.1; RB marketplace files; E local-real.
- [x] 5.3 VERIFY `apps/web/tests/e2e/marketplace-rfq.spec.ts`; AT stable links/request ID and no payment/order/availability claim; dep 5.2; RB marketplace evidence; E local-real.

## Phase 4: Field evidence, Copilot, government, and recovery
- [x] 6.1 RED `apps/web/src/components/agronautas/{intelligence,evidence,copilot}-panel.test.tsx`; AT source/freshness/missing/citations/degraded; dep 2.2; RB tests; E demo. RED confirmed missing source-mode/lineage output in intelligence and missing contract evidence metadata in Copilot.
- [x] 6.2 GREEN `apps/web/src/components/agronautas/{intelligence,evidence,copilot}-panel.tsx`; AT normalized non-prescriptive output; dep 6.1; RB panels; E local-real. Focused component verification is demo/mock only; local-real runtime and production were not exercised or claimed.
- [x] 6.3 RED `apps/web/src/components/government/{detail,ingest-panel}.test.tsx`, `apps/web/src/lib/visibility/*.test.ts`; AT telemetry/provider/retry/citation-none and HTTP-200-without-data; dep 2.2; RB tests; E demo. RED exposed retry on maintenance and a stale loading/available heading after an HTTP-200 invalid dashboard response.
- [x] 6.4 GREEN `apps/web/src/components/government/{detail,ingest-panel}.tsx`, `apps/web/src/app/municipalities/**`, `apps/web/src/lib/visibility/*.ts`; AT preserved context and bounded retry/recovery; dep 6.3; RB government/visibility files; E local-real. Focused UI behavior passes; local-real provider data was not exercised or claimed.
- [x] 6.5 VERIFY `apps/web/tests/e2e/{agronautas-intelligence,ibera-government}.spec.ts`; AT stale/non-grounded, registration-not-telemetry, non-retryable states; dep 6.2/6.4; RB evidence; E local-real. Managed Playwright stubbed/demo evidence passed desktop/mobile; local-real and production remain unverified.

## Phase 5: Deterministic demo, accessibility, browser evidence, docs
- [x] 7.1 RED `apps/web/tests/e2e/{demo-fixture,accessibility-responsive}.spec.ts`; AT deterministic reloads, in-memory mutation reset, zero API writes, keyboard/focus, 44px controls, reduced motion, overflow; historical RED confirmed absent local/no-persistence label, skip-focus failure, and 27px brand target; browser-side fixtures are the required preview, not a DB-seed contract; dep 3.2/5.2/6.4; RB tests; E demo.
- [x] 7.2 GREEN root `package.json`, `apps/web/src/{app/layout.tsx,app/globals.css,components/shell/skip-link.tsx,components/agronautas/page-client.tsx,components/agronautas/workspace.tsx}`; AT `pnpm run demo:local` starts only web and exposes every frontend flow from deterministic browser fixtures; explicit DEMO LOCAL label, reset-on-reload in-memory mutations, zero API writes, unique main target with keyboard focus, 44px controls/header links, existing reduced-motion behavior; no automatic API/database/migration/seed; optional local-real setup remains separately documented; dep 7.1; RB scoped shell/demo files; E demo.
- [x] 7.3 VERIFY `apps/web/tests/e2e/{demo-fixture,accessibility-responsive}.spec.ts`; managed Playwright desktop/mobile 6/6 passed, screenshots attached, zero `/api/` requests from demo, page errors none, in-memory operation lost on reload; local-real/production N/A and not claimed; dep 7.2; RB fixture evidence; E demo.
- [x] 8.1 RED `apps/web/tests/e2e/agronautas-uiux-evidence.spec.ts`, `apps/web/tests/e2e/helpers/evidence.ts`; AT route/viewport/mode/provenance/commit/blocker schema; dep 7.3; RB tests; E demo. RED confirmed the missing helper import in unit and Playwright tests.
- [x] 8.2 GREEN same E2E/helper paths plus `docs/agronautas-frontend-uiux-evidence.md`; AT separated demo/local-real/blocked reports and one-command runbook; dep 8.1; RB evidence/docs; E local-real. Demo evidence schema strips route query/fragment, stores no raw diagnostics or commit hash, and fixes production evidence at N/A.
- [x] 8.3 VERIFY `pnpm --dir apps/web test:e2e --grep uiux-evidence`; AT production evidence remains N/A unless independently supplied; dep 8.2; RB reports; E production. Managed desktop/mobile demo evidence passed; local-real and production were not exercised or claimed.
