# Market-readiness browser evidence

## Scope

The `market-readiness.spec.ts` lane uses the Playwright-managed local API/web harness and real browser traffic. It registers no request interception, fixture route, provider stub, or fabricated response. Each desktop (`1440x900`) and mobile (`390x844`) test attaches a full-page PNG plus console, page-error, and API/document network JSON.

## Acceptance matrix

| Route | Real interaction | Boundary evidence |
|---|---|---|
| `/` | Risk Engine same-page link and keyboard activation | Landing is public; no BFF request is expected. |
| `/probar-demo` | Empty form submitted with the keyboard; first invalid control and live error | Valid lead delivery is intentionally not claimed; the validation path must not issue a POST. |
| `/demo` | Workspace state inspected without bypassing auth | `runtime` BFF response is recorded; demo mode must carry its isolation disclaimer. |
| `/demo/fields/field-demo-1` | Canonical field detail inspected | Field BFF response/status and explicit evidence/capability limits are recorded. |
| `/municipalities` | Search filter reaches a truthful no-results state | Municipalities BFF response/status is recorded. |
| `/municipalities/ituzaingo` | Section index navigates by keyboard/focus without sticky occlusion | Municipality dashboard BFF response/status is recorded; empty forecast remains explicit. |
| `/municipalities/ingest` | Invalid verification token submitted by keyboard; retry focus exercised | Verify BFF response/status is recorded. Authorized ingest completion is not inferred from verification. |

## State policy

`live`, `seam`, `mock`, `unavailable`, demo, unauthorized, forbidden, retryable, stale, degraded, empty, and missing states are accepted only when the page renders the corresponding truthful label or explanation. A local demo, seam/mock response, unavailable service, or HTTP success is not production/provider/auth/tenant/lead/ingest proof. Unknown or unavailable external capabilities remain blocked in this document with the exact response and attached network evidence.

## Results — 2026-08-29

The required command was run once, with the managed harness from `apps/web/playwright.config.mjs`, and no request interception:

```text
pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=desktop --project=mobile
Running 14 tests using 1 worker
2 failed: landing exposes an observable Risk Engine path and keyboard navigation (desktop, mobile)
12 did not run because the suite is serial after the first real contract failure
Failure: each audited route must expose exactly one main landmark; / rendered 0, expected 1
Exact location: market-readiness-page.ts:45, locator('main'), expected 1, received 0
Playwright generated error-context.md for both landing viewport failures.
```

The failure is an application defect in the existing landing route: `/` renders no `<main>` landmark. The browser snapshot confirms the landing content, skip link, heading, and `Ver Risk Engine` link are present, but the document contains zero `main` elements. The G attempt stopped without changing application source or rerunning after this real defect.

The required build was then run once:

```text
pnpm --dir apps/web build
Failed to compile.
./src/components/agronautas/workspace.tsx:317:96
Type error: Property 'fieldId' comes from an index signature, so it must be accessed with ['fieldId'].
```

Build status: failed in the pre-existing edited application source at `apps/web/src/components/agronautas/workspace.tsx:317:96`. No G source edit was made. The G checkbox remains unchecked. The test helper is wired to attach screenshots, console, page-error, and filtered document/API network JSON for every route that reaches its route assertions; this stopped after the landing landmark defect, and the run materialized only Playwright's two `error-context.md` snapshots under `apps/web/test-results/`.

External evidence remains separate and blocked/unknown: no valid lead submission, production/provider citation, authenticated tenant access, or authorized ingest completion was claimed. The ingest test only submits the explicit invalid-token verification path when it runs; it never treats verification as ingest proof.
