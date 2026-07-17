# Apply Progress: Iberá Alerta Production Browser Ingest

**Change**: `ibera-alerta-public-ingest-production-browser-ingest`
**Artifact store**: hybrid (OpenSpec + Engram)
**Mode**: Strict TDD
**Delivery**: automatic, force-chained, `stacked-to-main`
**PR boundary**: Final remediation slice — authenticated local verifier header, deterministic browser-ingest E2E coverage, and no page-source auth rewrite; PR 1 BFF and PR 2 UI work are retained.
**Review budget**: 1,200 lines

## Semantic scope

Add the planned `/municipalities/ingest` page and its small client panel. Keep the operator token only in React component state, send it once as `x-hydrology-ingest-token` to same-origin `POST /api/hydrology/ingest`, clear it in `finally` and unmount cleanup, and never use browser storage, cookies, logs, URLs, hardcoded operational values, or anonymous access. Parse and render only the bounded safe ingest view model: status, run/proof IDs, requested sources, source status, and non-negative record counts. Fixed Spanish messages cover authorization, rate limiting, upstream failure, malformed responses, and network failure.

## Completed tasks

- [x] 1.1 RED — Added BFF integration assertions for canonical token forwarding, non-forwarding on GET/noncanonical paths, missing-token rejection, and log redaction.
- [x] 1.2 GREEN — Implemented canonical method/path gating, exact token forwarding, safe missing-header response, and sensitive-header log exclusion.
- [x] 1.3 REFACTOR — Extracted the canonical ingest predicate and kept BFF header construction/error handling explicit.
- [x] 2.1 RED — Added focused component tests for password masking, labelled/keyboard-compatible form submission, pending state, lifecycle clearing, completed/partial/failed safe results, authorization rejection, and diagnostic/token non-disclosure.
- [x] 2.2 GREEN — Added the memory-only `IngestPanel` client component with same-origin POST, fixed body, aria-live status, safe errors, allowlisted result parsing, `finally` cleanup, and unmount cleanup.
- [x] 2.3 GREEN — Added the server page at `/municipalities/ingest` and a focused page render test.
- [x] 2.4 REFACTOR — Kept the UI small and aligned with existing government Tailwind conventions; bounded display fields and removed all storage/logging/persistence paths.
- [x] 3.1 — Added one deterministic Playwright flow for the token-gated operator action: password input, exactly one same-origin POST, token clearing/non-persistence, and sanitized result rendering.
- [x] 3.2 — Mocked the same-origin BFF response in Playwright with a non-operational test token; no production/provider request is made.
- [x] 3.3 — Used existing accessible labels/roles and stable request/result assertions; no page-level auth source change was introduced.
- [ ] 4.1-4.2 — Operator-gated historical-secret audit, external rotation/revocation, live production browser proof, screenshot, and signed verification remain pending.

## Exact files changed

| File | Action | Scope |
|---|---|---|
| `apps/web/src/components/government/ingest-panel.tsx` | Created | Accessible password form, memory-only token lifecycle, same-origin request, safe error/result rendering, bounded allowlist parser. |
| `apps/web/src/components/government/ingest-panel.test.tsx` | Created | Six focused tests covering request contract, password masking, completed/partial/failed outcomes, rejection, cleanup, and non-disclosure. |
| `apps/web/src/app/municipalities/ingest/page.tsx` | Created | Server route wrapper rendering `IngestPanel`. |
| `apps/web/src/app/municipalities/ingest/page.test.tsx` | Created | Focused page-route render assertion for heading and labelled token control. |
| `apps/api/src/scripts/verify-hydrology-local-real.ts` | Modified | Require `HYDROLOGY_INGEST_TOKEN` from the environment and attach it to every local ingest POST without logging it. |
| `apps/api/src/scripts/verify-hydrology-local-real.test.ts` | Modified | Cover trimmed environment-header construction and fail-closed missing-token behavior. |
| `apps/web/tests/e2e/hydrology-ingest.spec.js` | Created | Deterministic mocked browser flow proving password input, one same-origin POST, token non-persistence, and sanitized output. |
| `openspec/changes/ibera-alerta-public-ingest-production-browser-ingest/tasks.md` | Modified | Marked tasks 2.1-3.3 complete; operator-gated Phase 4 remains pending. |
| `openspec/changes/ibera-alerta-public-ingest-production-browser-ingest/apply-progress.md` | Modified | Merged prior PR 1/PR 2 progress with this remediation evidence and remaining operator gates. |

PR 1 dependency files remain unchanged in this slice: `apps/web/src/app/api/hydrology/[...path]/route.ts` and `route.test.ts`.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `apps/web/src/components/government/ingest-panel.test.tsx` | Integration/component | N/A (new) | ✅ Test-first run failed because `ingest-panel` did not exist | ✅ 6/6 focused tests pass | ✅ Completed, partial, failed, 401 rejection, lifecycle, and request/header cases | ✅ Dynamic test fixtures and explicit DOM cleanup; no token literals |
| 2.2 | `apps/web/src/components/government/ingest-panel.test.tsx` | Integration/component | N/A (new) | ✅ Tests written before panel implementation | ✅ 6/6 focused tests pass | ✅ Different response statuses and failure paths force real state/result logic | ✅ Extracted bounded pure sanitization/status helpers; state remains local |
| 2.3 | `apps/web/src/app/municipalities/ingest/page.test.tsx` | Component/page | N/A (new) | ✅ Test-first run failed because the page wrapper did not exist | ✅ 1/1 page test passes after restoring the thin wrapper | ➖ Structural wrapper has one approved output; panel behavior is covered separately | ✅ Kept page as a thin server wrapper |
| 2.4 | Focused component/page tests | Integration/component | ✅ Existing web suite baseline was green before this PR2 slice | ✅ Security and accessibility assertions preceded refactor | ✅ Focused tests 7/7 pass after cleanup | ✅ Completed/partial/failed and upstream rejection remain covered | ✅ Final focused and full test runs remain green |
| 3.1-3.3 | `apps/web/tests/e2e/hydrology-ingest.spec.js` | E2E | N/A (new) | ✅ Test written before execution; initial run was green because the existing UI already implemented the requested operator behavior | ✅ Playwright 1/1 passed with mocked BFF | ✅ Non-empty partial result plus hidden diagnostic/token and storage checks | ✅ Stable role/label selectors; no source rewrite |
| Remediation | `apps/api/src/scripts/verify-hydrology-local-real.test.ts` | Unit/integration | ✅ Existing verifier tests 3/3 passed before edit | ✅ Added environment-header contract tests before helper implementation; initial run failed as expected | ✅ Focused verifier tests 5/5 passed | ✅ Present and missing environment token paths | ✅ Single fail-closed helper reused by every ingest POST |

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `pnpm --dir apps/web exec tsx "src/components/government/ingest-panel.test.tsx"; pnpm --dir apps/web exec tsx "src/app/municipalities/ingest/page.test.tsx"` — exit 0; component 6/6 passed and page 1/1 passed. |
| Remediation focused tests | `pnpm --dir apps/api exec tsx "src/scripts/verify-hydrology-local-real.test.ts"` — exit 0; 5/5 passed, including environment header and fail-closed cases. |
| Browser focused test | `pnpm --dir apps/web exec playwright test tests/e2e/hydrology-ingest.spec.js --reporter=line` — exit 0; Playwright 1/1 passed on the initial run (57.6s) and after the URL non-persistence assertion refactor (34.4s), with mocked same-origin BFF. |
| Full test runner | `pnpm test` — exit 0; API 160/160 passed and web 40/40 passed; 0 failures. |
| Full build | `pnpm build` — exit 0; 4 workspace build tasks passed. Next.js emitted only the pre-existing unused `React` warning in `apps/web/src/app/municipalities/ingest/page.test.tsx`. |
| Type check | `pnpm --dir apps/web exec tsc --noEmit` reports only the pre-existing PR1 `NODE_ENV` mutation errors in `route.test.ts`; no `ingest-panel` or page errors remain. |
| Runtime harness | Attempted `pnpm --dir apps/web dev -- --hostname 127.0.0.1 --port 3105`; Next.js printed `Starting...` but did not become HTTP-ready within the 90-second background attempt and the 120-second tool window. The page JSDOM harness passed 1/1; no production/provider request or operational token was used. |
| Diff hygiene | `git diff --check` completed without whitespace errors; Git emitted only existing LF→CRLF normalization warnings for unrelated/previously edited files. |
| Security check | Targeted source review found no `localStorage`, `sessionStorage`, cookies, console logging, authorization logging, provider configuration, historical secret, or hardcoded operational token in the new UI/tests. |
| Rollback boundary | Revert only `apps/api/src/scripts/verify-hydrology-local-real.ts`, its test additions, and delete `apps/web/tests/e2e/hydrology-ingest.spec.js` plus this slice's task/progress edits; the existing BFF, UI, public reads, and canonical backend endpoint remain intact. |

## Page-level access decision

The browser spec requests anonymous page rejection, but this repository has no existing web middleware, identity/session, or operator-auth primitive. Adding a new gate would introduce an auth system or require a hardcoded token, both explicitly out of scope. The deliberate MVP boundary is therefore the existing token-gated action: the page may render the password form, while the same-origin BFF and backend reject missing/invalid ingest authorization. The page source remains unchanged, and no anonymous ingest action is possible without the operator token.

## Remaining operator-gated production work

1. Audit historical Git/provider secret exposure without recovering or reproducing values; externally revoke/rotate any suspected active credential.
2. After deployment, perform exactly one authorized browser-origin ingest through the same-origin BFF, capture only safe status/run/source evidence and a screenshot, and sign the verify report.
3. Keep Phase 4 evidence/rollback verification pending: production proof, screenshot, and signed verification remain operator-gated and were not fabricated here.

## Workspace safety

No reset, stash, checkout, commit, push, deploy, provider configuration change, or secret recovery was performed. Existing unrelated staged, unstaged, and untracked work was preserved.
