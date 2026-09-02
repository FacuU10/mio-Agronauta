# Tasks: Agronautas / Iberá-Alerta UI/UX Market Readiness

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 650–950 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes; A→B→C→D→E→F→G units in size-exception main line |
| Delivery strategy / chain | exception-ok / size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|
| A status | `pnpm --dir apps/web exec node --import tsx --test src/lib/visibility/view-models.test.ts` | N/A: pure normalizers; unit fixtures only | Revert adapters; retain raw fields |
| B access | `pnpm --dir apps/web test -- src/components/agronautas` | Local API auth on/off; no Docker | Revert boundary UI; retain defaults |
| C landing | `pnpm --dir apps/web test -- src/components/landing` | Controlled local contact responses; no lead proof | Revert CTA/form only |
| D operator | `pnpm --dir apps/web test -- src/components/government` | Local demo/seam/unavailable API; ingest token external | Revert summary/retry UI |
| E accessibility | `pnpm --dir apps/web test` | Local browser smoke; no provider proof | Revert landmarks/forms/focus |
| F responsive | `pnpm --dir apps/web exec playwright test --project=desktop --project=mobile` | Screenshots at 1440x900 and 390x844 | Revert IA/status styling |
| G acceptance | `pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=desktop --project=mobile` | Existing API/web harness; zero `page.route` stubs | Revert E2E/config only |

## Phases A–G: Sequential Strict-TDD Work Units

RED/GREEN = table command; REFACTOR = task command.

- [x] **A — status/evidence/Copilot:** RED tests in `apps/web/src/lib/visibility/view-models.test.ts`, `api-client.test.ts`, `agronautas/service.test.ts`, `visibility/chat.test.ts` for 401/403/404/429/5xx, abort, stale/missing, empty stream, citations, and `unverifiedClaims`; GREEN `view-models.ts`, `api-client.ts`, `agronautas/service.ts`, `visibility/{chat,polling}.ts`, `primitives.tsx`, `apps/web/src/app/api/{agronautas,hydrology}/[...path]/route.ts`, `apps/api/src/presentation/routes/{agronautas,hydrology-government}.ts`; REFACTOR `pnpm --dir apps/web test`.
- [x] **B — auth/demo/unavailable/404:** RED `page-client.test.tsx`, `field-detail.test.tsx`, API/auth tests for labeled demo, 401 sign-in, backend unavailable, and capability 404; GREEN `agronautas/{page-client,workspace,field-detail}.tsx`, `apps/api/src/presentation/middleware/agronautas-auth.ts`, `apps/web/src/app/api/{agronautas,hydrology}/[...path]/route.ts`; REFACTOR `pnpm --dir apps/api test`.
- [x] **C — landing/demo CTA/form:** RED `landing/{homepage,demo-contact-form}.test.tsx` for observable CTA, validation, confirmed success, abort/server failure, draft preservation, retry; GREEN `landing/{homepage,demo-contact-form}.tsx`; REFACTOR `pnpm --dir apps/web test`.
- [x] **D — operator summary/ingest/429:** RED `government/{overview,detail,ingest-panel}.test.tsx` and `apps/web/src/lib/visibility/chat.test.ts` for above-fold status/freshness/threshold/action, empty forecast, telemetry conflict, ingest 401/progress/retry, token non-persistence, and 429 backoff/draft; GREEN `government/{overview,detail,ingest-panel}.tsx`, `visibility/chat.ts`; REFACTOR `pnpm --dir apps/web test`.
- [x] **E — landmarks/forms/keyboard:** RED tests for one `<main>`, skip link, labels/name/autocomplete, `aria-describedby`, live errors, focus-visible, and keyboard submit; GREEN `apps/web/src/app/layout.tsx` plus audited landing/Agronautas/government components; REFACTOR `pnpm --dir apps/web test`.
- [x] **F — responsive IA/visual consistency:** RED viewport tests/snapshots for section index/sticky summary, focus occlusion/overflow, and shared status/source/empty copy; GREEN audited Agronautas/government/visibility components; REFACTOR Playwright at `1440x900` and `390x844`.
- [x] **G — real no-stub Playwright:** RED create `apps/web/tests/e2e/market-readiness-page.ts`, `market-readiness.spec.ts`, `market-readiness.md`; GREEN configure `apps/web/playwright.config.mjs` and test `/`, `/probar-demo`, `/demo`, field, municipalities, detail, and ingest with screenshots, console/network, landmark, overflow, keyboard/error evidence; REFACTOR `pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=desktop --project=mobile` and `pnpm build`.

Record local demo, seam/mock fixtures, unavailable services, and real provider/auth/tenant/lead/ingest/production proof separately; never infer missing proof. Threat rows are N/A; marketplace and new field-management features are excluded.
