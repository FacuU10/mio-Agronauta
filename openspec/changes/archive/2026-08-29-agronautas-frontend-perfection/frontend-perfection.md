# Agronautas frontend-perfection browser evidence

## Test Case: `FRONTEND-PERFECTION-H` — Seven-route browser acceptance

**Priority:** critical  
**Layer:** Playwright E2E  
**Data policy:** real managed local harness only; no `page.route`, interception, fixture response, provider stub, or fabricated success  
**Viewports:** desktop `1440x900`; mobile `390x844`

The existing `MarketReadinessPage` helper is reused; its `Page` visibility is widened only for the new route assertions. No existing market-readiness scenario was changed.

### Acceptance coverage

| Test ID | Route | Keyboard/state contract | Expected boundary |
|---|---|---|---|
| `H-001` | `/` | Skip link and Risk Engine navigation | Public landing; no BFF request on load |
| `H-002` | `/probar-demo` | Empty form validation, first-invalid focus, no mutation | Public contact boundary; no POST before valid submit |
| `H-003` | `/demo` | One-main/skip contract and truthful demo/auth/unavailable label | Agronautas runtime BFF |
| `H-004` | `/demo/fields/field-demo-1` | Evidence/capability boundary | Agronautas field BFF |
| `H-005` | `/municipalities` | Accessible overview/filter boundary | Hydrology municipalities BFF |
| `H-006` | `/municipalities/virasoro` | Section-index focus below sticky summary | Hydrology municipality dashboard BFF |
| `H-007` | `/municipalities/ingest` | Invalid verification, retry focus, token redaction | Hydrology ingest verification BFF |

Every attempted route records route, viewport, local environment, managed base URL, Git root/branch/commit/dirty status, data mode, expected boundary/status, test ID, screenshot status, console/page errors, hydration warnings, and document/API network events. The acceptance uses role/label locators for user-facing controls and semantic landmarks.

## Local evidence — 2026-08-29 corrective reconciliation

The stale earlier records in this document that reported `4/14`, `6/14`, or `12/14` are superseded by the completion run below. The current result is aligned with `openspec/changes/agronautas-frontend-perfection/apply-progress.md` section **3.3 Completion — Full Local Matrix and Build Green**.

Before launch, process-local `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_PORT`, `PLAYWRIGHT_WEB_PORT`, and `AGRONAUTAS_API_INTERNAL_URL` were cleared. The Playwright-managed API/web harness used real browser traffic only; there was no interception, stub, fixture response, or fabricated success.

```text
pnpm --dir apps/web exec playwright test tests/e2e/frontend-perfection.spec.ts --workers=1 --project=desktop --project=mobile --output=test-results/frontend-perfection-local
```

Result: **exit 0; 14 planned, 14 passed, 0 failed, 0 skipped/not-run; one worker; 1.8 minutes**, within the bounded 360-second timeout. Desktop `1440x900`: `7/7`; mobile `390x844`: `7/7`.

| Project / viewport | H-001 | H-002 | H-003 | H-004 | H-005 | H-006 | H-007 | Total |
|---|---|---|---|---|---|---|---|---:|
| Desktop `1440x900` | pass; document `200` | pass; document `200` | pass; document `200` | pass; document `200` | pass; document `200` | pass; document `200` | pass; document `200` | `7/7` |
| Mobile `390x844` | pass; document `200` | pass; document `200` | pass; document `200` | pass; document `200` | pass; document `200` | pass; document `200` | pass; document `200` | `7/7` |

### Route and boundary evidence

- `H-001` `/`: one main landmark, no horizontal overflow, Spanish language and metadata, keyboard skip-link navigation, Risk Engine link contract, no API mutation, and clean page-error/hydration guards.
- `H-002` `/probar-demo`: one main landmark, metadata, keyboard validation and first-invalid focus, and no contact `POST` before valid submission.
- `H-003` `/demo`: the Agronautas runtime BFF response was observed within the declared status set; the route rendered the truthful demo/auth/unavailable state. Its numeric status was not emitted by the configured reporter and remains unknown rather than inferred.
- `H-004` `/demo/fields/field-demo-1`: the document returned `200`; `GET /api/agronautas/v1/fields/field-demo-1/geometry?mode=demo` returned exactly `404` once per viewport; `Geometría no disponible` rendered; only the declared generic 404 resource console message was allowed; no additional 404, page error, or hydration warning occurred.
- `H-005` `/municipalities`: the document returned `200`; the municipalities BFF response was observed within the declared status set; filters, list fallback, bounded layout, and state copy passed. Its numeric status remains unknown rather than inferred.
- `H-006` `/municipalities/virasoro`: the document returned `200`; the dashboard BFF response was observed within the declared status set; section-index focus remained below the sticky summary and no horizontal overflow occurred. Its numeric status remains unknown rather than inferred.
- `H-007` `/municipalities/ingest`: the document returned `200`; exactly one `POST /api/hydrology/ingest/verify` returned `401` per viewport; auth/retry recovery rendered, retry focus returned to the token field, and `invalid-token` was not exposed. Only the declared generic 401 resource console message was allowed; no page error or hydration warning occurred.

All fourteen tests reached screenshot capture and requested full-page PNG plus per-test local JSON evidence attachments. The configured reporter did not materialize those custom payloads as standalone files under the output directory, so no filesystem attachment path is claimed. The evidence payloads include route, viewport, managed local base URL, Git identity, data mode, expected boundary/API, console results, page errors, hydration warnings, and network events.

### Local/production separation

Local managed-harness, demo, seam/mock, unavailable, geometry `404`, and invalid-token `401` results are local evidence only. **Production evidence remains `blocked/unknown`:** no approved public origin, production `PLAYWRIGHT_BASE_URL`, provider capability, credentials, tenant, lead-delivery, or authorized-ingest proof was available; no production command ran; no production readiness claim is made.

### Unclosed evidence, not functional failures

The current local run closes the seven-route browser matrix but does not close every specification scenario:

- The slow-route loading-boundary scenario and the unknown/failed-route boundary scenario were not forced and observed by this literal browser matrix. They remain **unobserved/unknown**, not failed code behavior.
- Absolute public canonical/sitemap behavior requires an approved public origin. No origin is configured, and the implementation intentionally does not invent one. Those origin-dependent checks remain **external evidence blockers/unknown**, not functional failures.

These four evidence gaps are tracked as warnings by final verification. They do not change the passing local route matrix or authorize a production claim.

### TDD and work-unit evidence

| Check | Result |
|---|---|
| Test file | `apps/web/tests/e2e/frontend-perfection.spec.ts` |
| RED/GREEN | Prior H-007 run failed on the exact expected generic 401 console message; the scoped assertion correction passed the targeted desktop/mobile run, then the full matrix passed `14/14`. |
| Triangulation | All seven routes at both required viewports, route/status, landmark, metadata/language, keyboard/focus, overflow, console/page/hydration, screenshot, and real-network guards. |
| Build | `pnpm --dir apps/web build` → exit 0; Next.js `15.5.19`, `10/10` static pages. |
| Rollback | Remove only this evidence record and the task-3.3 evidence appendices; retain H-004/H-007 boundary assertions, application behavior, and unrelated dirty work. |
