# Apply Progress: Agronautas / Iberá-Alerta UI/UX Market Readiness

## Slice

- **Work unit:** A — status/evidence/Copilot, bounded view-models plus client/service transport slice
- **Scope:** Prior view-models slice plus this batch's `apps/web/src/lib/api-client.ts`, `apps/web/src/lib/api-client.test.ts`, `apps/web/src/lib/agronautas/service.ts`, and `apps/web/src/lib/agronautas/service.test.ts`
- **Status:** Partial Unit A complete; Unit A remains open for its chat, polling, primitives, BFF, and route work.
- **Task checkbox:** Intentionally left unchecked because the parent Unit A task includes additional files outside these bounded slices.

## Completed in this slice

- Typed request outcomes now cover loading, empty, ready, unavailable, unauthorized, forbidden, and retryable states.
- Request status reasons, retry timing, raw payloads, and abort/network classification are retained.
- Evidence normalizers preserve live/seam/mock/unavailable mode, freshness, source, timestamps, reason, raw payload, and conservative actionability.
- Copilot normalizers distinguish transport success/streaming/error/unavailable, require non-empty tokens and validated citations, reject context-only/unverified claims as actionable evidence, and preserve raw fields.

## Completed in this bounded client/service slice

- HTTP error payload parsing is safe for `null` and non-object bodies while preserving the raw `ApiError` status/data contract.
- `401`, `403`, `404`, `429`, and `5xx` outcomes retain status and map to unauthorized, forbidden, unavailable, or retryable outcomes without fabricating success.
- Retry-after delta-seconds and date headers remain available to typed retryable outcomes.
- Abort signals are forwarded to the timed fetch and `AbortError`/`ERR_ABORTED` remains a retryable outcome for existing service consumers; ordinary fetch failures remain retryable unavailable transport.
- Existing service return types and consumers remain backward-compatible; `service.ts` required no additional production change in this bounded batch.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A-view-models | `apps/web/src/lib/visibility/view-models.test.ts` | Unit | ✅ 5/5 existing slice tests | ✅ 5 failing assertions after new cases | ✅ 9/9 passing | ✅ request/evidence/Copilot alternate paths | ✅ shared normalizers and const-backed types |
| A-client-service | `apps/web/src/lib/api-client.test.ts`, `apps/web/src/lib/agronautas/service.test.ts` | Unit/integration boundary | ✅ 9/9 baseline | ✅ 3 failing assertions after abort/null-body cases | ✅ 13/13 passing | ✅ 14/14 with ordinary network failure and all HTTP boundaries | ✅ single transport wrapper preserves legacy thrown-error shape |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/lib/api-client.test.ts src/lib/agronautas/service.test.ts` — exit 0; 14 tests, 14 pass, 0 fail, 0 skipped, 0 cancelled; final TAP duration 1331.1025 ms |
| Runtime harness command/scenario and exact result | N/A — this bounded client/service slice uses mocked `fetch` only; server start, BFF/API routes, and runtime harness are explicitly out of scope |
| Rollback boundary | Revert the transport changes in `apps/web/src/lib/api-client.ts` and their assertions in `apps/web/src/lib/api-client.test.ts` plus the abort-consumer assertion in `apps/web/src/lib/agronautas/service.test.ts`; preserve prior view-model work, existing service fields, raw API data, and unrelated worktree edits |

## Prior slice handoff

- Finish Unit A's remaining chat/polling/primitives/BFF/route integration in a separate bounded delegation; client/service transport is covered by this batch.
- Then proceed sequentially with Units B, C, D, E, F, and G as specified in `tasks.md`.

## Completed in this bounded chat/polling slice

- Chat view-model status now follows the normalized Copilot outcome, so HTTP 200 empty/unverified responses remain `empty`/non-actionable and 429 responses cannot render as `done`.
- Backward-compatible chat sources remain populated from citations when no explicit sources are supplied; normalized HTTP status, retry timing, and failure reason are retained.
- Stream normalization preserves metadata such as the pending draft and carries direct HTTP 429/retry-after fields through the normalized view model.
- Polling exposes normalized request errors through `PollingError`, including aborted transport failures, while preserving HTTP status and numeric or date-form retry-after timing for rate limits.
- The polling contract test now reads the typed nested `RequestOutcome` instead of treating the outcome object as a string.

## TDD Cycle Evidence — chat/polling slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A-chat | `apps/web/src/lib/visibility/chat.test.ts` | Unit | ⚠️ 8/10 before this slice; known status mismatch was explicitly assigned | ✅ Added source fallback, 429, and stream draft/retry tests; RED exposed 3 failures | ✅ 8/8 chat tests passing | ✅ citations-as-sources, empty/unverified output, direct and stream 429 paths | ✅ shared outcome-to-status mapping and preserved transport fields |
| A-polling | `apps/web/src/lib/visibility/polling.test.ts` | Unit/integration boundary | ⚠️ Same focused baseline; known typed-outcome assertion mismatch was explicitly assigned | ✅ Added abort normalization test and corrected typed 429 assertion; RED exposed 1 production failure | ✅ 5/5 polling tests passing | ✅ terminal polling, bounded sanitization, 429 delta-seconds, aborted transport | ✅ normalized fetch boundary and date-form retry-after parsing |

## Work Unit Evidence — chat/polling slice

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/lib/visibility/chat.test.ts src/lib/visibility/polling.test.ts` — exit 0; 13 tests, 13 pass, 0 fail, 0 skipped, 0 cancelled; final TAP duration 1764.2645 ms |
| Runtime harness command/scenario and exact result | N/A — pure chat adapters and mocked-fetch polling fixtures only; server start, BFF/API routes, runtime harness, and Playwright were explicitly out of scope |
| Rollback boundary | Revert `apps/web/src/lib/visibility/chat.ts`, `chat.test.ts`, `polling.ts`, and `polling.test.ts` to remove only chat/polling normalization and matching evidence; preserve prior view-models, client/service transport work, raw fields, and unrelated worktree edits |

## Remaining bounded slices

- Unit A remains open for visibility primitives plus BFF/API route integration; its parent task checkbox stays unchecked until those files are completed.
- Then proceed sequentially with Units B, C, D, E, F, and G as specified in `tasks.md`.

### Bounded route-boundary RED attempt — stopped on timeout

- **Work unit:** Unit A BFF/API route integration
- **Status:** Blocked by the explicit focused-test timeout; no route production source was changed and Unit A remains open.
- **Scope:** Added RED assertions only to the four direct route test files. The assertions cover BFF status/body/request-ID/retry-after preservation, Agronautas API correlation IDs, and Hydrology dashboard/timeline unavailable failures. `tasks.md` remains unchecked.
- **Baseline evidence:** `pnpm --dir apps/api exec node --import tsx --test --test-timeout=45000 src/presentation/routes/agronautas.test.ts` — exit 0; 42/42 passed. `pnpm --dir apps/api exec node --import tsx --test --test-timeout=45000 src/presentation/routes/hydrology-government.test.ts` — exit 0; 57/57 passed. The direct web route test files exist, but their explicit commands reported 0 tests and exit 0.

#### TDD Cycle Evidence — route-boundary RED

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| A-BFF/API-routes | Four direct route test files | BFF/API integration | ✅ Prior API baselines passed | ⚠️ Agronautas exposed missing `x-request-id`; Hydrology dashboard failure exposed an unhandled rejection | N/A — the user-required stop-on-timeout rule prevented source repair | N/A | N/A |

#### Exact bounded test evidence

| Test file | Command | Exact result |
|---|---|---|
| `apps/api/src/presentation/routes/agronautas.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=45000 src/presentation/routes/agronautas.test.ts` | Exit failure; 43 tests, 42 pass, 1 fail. RED assertion: expected `x-request-id: agronautas-401`, received `null`. No rerun because the Hydrology command subsequently timed out and the bounded attempt was stopped. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=45000 src/presentation/routes/hydrology-government.test.ts` | **Timed out at 45,000 ms**; 59 tests, 57 pass, 1 fail with unhandled `dashboard unavailable`, 1 cancelled; no final normal completion. Per user constraint, execution stopped. |
| `apps/web/src/app/api/agronautas/[...path]/route.test.ts` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/app/api/agronautas/[...path]/route.test.ts` | Exit 0; TAP reported 0 tests. |
| `apps/web/src/app/api/hydrology/[...path]/route.test.ts` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/app/api/hydrology/[...path]/route.test.ts` | Exit 0; TAP reported 0 tests. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Blocked: Hydrology direct route command exceeded its 45-second test timeout after the RED test exposed an unhandled dashboard repository failure. |
| Runtime harness command/scenario and exact result | N/A — servers, Playwright, and broad suites are prohibited; the focused command timeout requires stopping. |
| Rollback boundary | Revert only the new RED assertions in `apps/web/src/app/api/agronautas/[...path]/route.test.ts`, `apps/web/src/app/api/hydrology/[...path]/route.test.ts`, `apps/api/src/presentation/routes/agronautas.test.ts`, and `apps/api/src/presentation/routes/hydrology-government.test.ts`; preserve all prior completed slices and unrelated worktree edits. |

#### Handoff

- Unit A remains unchecked and incomplete.
- No changes were made to `apps/web/src/app/api/agronautas/[...path]/route.ts`, `apps/web/src/app/api/hydrology/[...path]/route.ts`, `apps/api/src/presentation/routes/agronautas.ts`, or `apps/api/src/presentation/routes/hydrology-government.ts`.
- Resume only after the timeout is explicitly resolved under the same bounded-command rules; do not proceed to Units B–G.

## Bounded verification confirmation — chat/polling slice

- **Verification status:** Passed without production or test changes.
- **Focused test command and exact result:** `pnpm --dir apps/web exec node --import tsx --test src/lib/visibility/chat.test.ts src/lib/visibility/polling.test.ts` — exit 0; 13 tests, 13 pass, 0 fail, 0 skipped, 0 cancelled; final TAP duration 5737.7311 ms.
- **Scope guard:** Only the four chat/polling files were inspected; no sibling worktree, servers, broad suites, Playwright, commits, pushes, lifecycle commands, or unrelated Unit A files were touched.
- **Next bounded slice:** Unit A visibility primitives.

## Retry attempt — visibility primitives harness lifecycle

- **Work unit:** Unit A visibility primitives; harness lifecycle repair only.
- **Status:** Blocked by the bounded test runner timeout; the primitives RED/GREEN contract cycle was not started.
- **Scope:** Only `apps/web/src/components/visibility/primitives.test.tsx` was changed in this attempt. `primitives.tsx` was preserved without changes.
- **Harness repair:** `setupDom` now tracks every JSDOM instance; an `afterEach` hook runs RTL `cleanup`, closes tracked windows, and restores the temporary `window`, `document`, `HTMLElement`, and `navigator` globals. No force-exit was used.

### TDD Cycle Evidence — retry attempt

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A-primitives-harness | `apps/web/src/components/visibility/primitives.test.tsx` | Component harness | Existing baseline timed out at 45 s | N/A — diagnosed teardown fix was applied before the contract cycle | ❌ Runner timed out after 5 s; no contract assertions executed | N/A — blocked before primitive scenarios | ✅ Teardown is centralized in `afterEach`; no force-exit |

### Work Unit Evidence — retry attempt

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=5000 src/components/visibility/primitives.test.tsx` — exit reported TAP failure; `testTimeoutFailure`, `duration_ms: 5009.4835`, `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`; the preceding post-harness run reported `duration_ms: 5021.7472` with the same timeout failure |
| Runtime harness command/scenario and exact result | N/A — runtime/server/Playwright execution was explicitly prohibited; component contract execution was blocked by the focused Node test timeout |
| Rollback boundary | Revert only the lifecycle changes in `apps/web/src/components/visibility/primitives.test.tsx`; preserve all prior Unit A edits and unrelated worktree changes |

### Retry handoff

- The primitive contract cases for live/seam/mock/unavailable labels; freshness/source/reason; actionable versus non-actionable Copilot; retry-after; empty/no-citation/unverified output; and existing props remain unverified.
- Unit A remains open. The next Unit A slice is BFF/routes after the primitives slice is unblocked and verified.

## Completed in this bounded visibility-primitives slice

- The component harness now imports `@testing-library/react/pure`, retaining explicit RTL cleanup, tracked JSDOM `window.close()`, and temporary-global restoration. A minimal `Object.defineProperty` repair keeps Node's getter-only `navigator` compatible with that explicit lifecycle.
- Source cards expose distinct `Live`, `Seam`, `Mock`, `Fallback`, and `Unavailable` labels without collapsing test or unavailable evidence into live; they now render source, freshness, observation, last-success, valid-until, and reason metadata while preserving all existing props.
- Copilot status is actionable only for a `ready` outcome with actionable, cited, verified output. Empty, citation-free, and `unverifiedClaims` output uses alert semantics and warning styling; retry-after is visible and disables the retry control until the delay elapses.
- Existing primitive contracts remain compatible, including `StatusBadge`, `VisibilityState`, `FreshnessBanner`, `EvidenceDrawer`, `MapFrame`, and the prior `SourceCard` props.

### TDD Cycle Evidence — visibility-primitives slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| A-primitives-harness | `apps/web/src/components/visibility/primitives.test.tsx` | Component harness | ✅ 3/3 baseline assertions | N/A — lifecycle repair preceded the contract cycle | ✅ 3/3 baseline tests passing after the pure RTL import and navigator descriptor repair | ✅ explicit cleanup, JSDOM close, and global restoration retained | ✅ no auto-cleanup conflict and no force-exit/timeout workaround |
| A-primitives-contract | `apps/web/src/components/visibility/primitives.test.tsx` | Component | ✅ 3/3 baseline tests | ✅ 6 total: 3 pass, 3 fail; new assertions exposed missing mode/metadata/retry/non-success behavior | ✅ 6/6 passing after primitive implementation | ✅ live/seam/mock/unavailable, freshness/source/reason, actionable/retry-after, and empty/no-citation/unverified paths | ✅ semantic queries repaired for intentionally repeated source/metadata text |

### Work Unit Evidence — visibility-primitives slice

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=20000 src/components/visibility/primitives.test.tsx` — exit 0; tests 6, pass 6, fail 0, cancelled 0, skipped 0; final TAP duration 13930.8371 ms |
| Runtime harness command/scenario and exact result | N/A — this slice is presentational component behavior only; runtime/server, BFF/API routes, Playwright, and external providers were explicitly out of scope |
| Rollback boundary | Revert only `apps/web/src/components/visibility/primitives.tsx` and `apps/web/src/components/visibility/primitives.test.tsx` changes from this slice; preserve prior Unit A view-model/client/service/chat/polling edits, raw fields, and unrelated worktree edits |

### Exact bounded test attempts

1. `pnpm --dir apps/web exec node --import tsx --test --test-timeout=20000 src/components/visibility/primitives.test.tsx` — initial pure-RTL attempt: exit failure; `tests 3`, `pass 0`, `fail 3`, `cancelled 0`; failure `Cannot set property navigator of #<Object> which has only a getter`.
2. Same exact command after the minimal navigator descriptor repair — exit 0; `tests 3`, `pass 3`, `fail 0`, `cancelled 0`, `skipped 0`; duration `8284.4265 ms`.
3. Same exact command after RED contract tests — exit failure; `tests 6`, `pass 3`, `fail 3`, `cancelled 0`; missing mode/metadata/retry/non-success assertions were observed.
4. Same exact command after GREEN implementation — exit failure; `tests 6`, `pass 4`, `fail 2`, `cancelled 0`; failures were test-query ambiguity caused by intentionally repeated source/freshness metadata.
5. Same exact command after query refactor — exit failure; `tests 6`, `pass 5`, `fail 1`, `cancelled 0`; split `dt`/`dd` text query remained.
6. Same exact command after final semantic-query refactor — exit 0; `tests 6`, `pass 6`, `fail 0`, `cancelled 0`, `skipped 0`; duration `13930.8371 ms`.

### Slice handoff

- Unit A's visibility-primitives contract is verified locally.
- The parent Unit A checkbox remains unchecked because BFF/API route integration is still pending.
- Next bounded slice: Unit A BFF/routes integration, preserving these primitive labels and non-actionable Copilot semantics.

### Bounded verification — Unit A BFF/API route preflight

- **Work unit:** Unit A BFF/API route integration
- **Status:** Blocked before RED/GREEN; the required focused route safety net timed out and the user constraint requires stopping without widening or editing.
- **Scope:** Routes and their existing direct API tests were inspected read-only. No route or test source was changed in this attempt.
- **Engram merge:** No Engram memory tools were available in this executor surface; this filesystem progress artifact was preserved and appended rather than replaced.

#### Safety-net evidence

| Test file | Command | Exact result |
|---|---|---|
| `apps/api/src/presentation/routes/agronautas.test.ts` | `pnpm exec node --import tsx --test --test-timeout=45000 src/presentation/routes/agronautas.test.ts` (from `apps/api`) | **Timed out at 45,000 ms**; TAP output showed subtests 1–42 passing before termination, but no final suite summary was emitted. Per bounded-command rule, execution stopped. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | `pnpm exec node --import tsx --test --test-timeout=45000 src/presentation/routes/hydrology-government.test.ts` (from `apps/api`) | Exit 0; 57 tests, 57 pass, 0 fail, 0 cancelled, 0 skipped; duration 30,933.54 ms. |

#### TDD Cycle Evidence — route slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| A-BFF/API-routes | Existing Agronautas and hydrology route tests | API integration | ❌ Agronautas route test command timed out; hydrology route test passed 57/57 | N/A — stopped before contract changes | N/A — no production change | N/A | N/A |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Agronautas route safety net exceeded its explicit 45-second timeout after TAP subtests 1–42 passed; hydrology route safety net completed 57/57. No replacement or broader command was run. |
| Runtime harness command/scenario and exact result | N/A — runtime servers, Playwright, and broader harnesses are prohibited for this bounded attempt; the focused safety-net timeout requires stopping. |
| Rollback boundary | No source or test edits were made in this attempt; rollback is empty. Preserve all prior Unit A slices and unrelated worktree edits. |

#### Route-slice handoff

- Unit A remains open; no task checkbox was changed.
- The Agronautas route/API compatibility behavior remains unverified because its direct test file timed out.
- Do not proceed to RED/GREEN or run any wider command until the timeout is explicitly resolved under the same bounded-command constraints.

### Completed bounded Agronautas route test-harness correction

- **Work unit:** Unit A BFF/API route integration; deterministic provider-evidence test harness only.
- **Status:** Harness correction applied; focused route test execution completed successfully.
- **Scope:** Only `apps/api/src/presentation/routes/agronautas.test.ts` was changed for implementation. `apps/api/src/presentation/routes/agronautas.ts` and all unrelated files were preserved.
- **Correction:** `createTestApp()` now injects a type-safe deterministic `ProviderEvidencePort` fake returning `mode: 'mock'` and `lastSuccessfulObservedAt: null`, preventing dashboard tests from constructing the real provider adapter and PostgreSQL-dependent runtime resources.

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=45000 src/presentation/routes/agronautas.test.ts` — exit 0; 42 tests, 42 pass, 0 fail, 0 cancelled, 0 skipped; process terminated normally within the 60-second external timeout. |
| Runtime harness command/scenario and exact result | N/A — this bounded attempt corrected only the in-process route test harness; server startup, Playwright, and production providers were explicitly out of scope. |
| Rollback boundary | Revert only the `ProviderEvidencePort` import, `providerEvidencePort` injection, and `createTestProviderEvidencePort()` helper in `apps/api/src/presentation/routes/agronautas.test.ts`; preserve route production code, all 42 assertions, prior UI/UX slices, and unrelated worktree edits. |

#### Handoff

- Unit A remains open for the separately bounded route-boundary implementation work.
- Next step: inspect/implement only route boundary changes.

### Completed bounded Hydrology route-boundary implementation

- **Work unit:** Unit A BFF/API route integration, Hydrology-only boundary.
- **Status:** Hydrology API route GREEN; Hydrology web BFF test command did not discover tests and therefore is not GREEN evidence.
- **Scope:** Only `apps/api/src/presentation/routes/hydrology-government.ts`, `apps/api/src/presentation/routes/hydrology-government.test.ts`, and `apps/web/src/app/api/hydrology/[...path]/route.ts` were changed. Agronautas route files, sibling worktrees, servers, Playwright, broad suites, commits, and pushes were not touched.
- **Implementation:** Dashboard and timeline repository failures now return the compatible 503 `HYDROLOGY_MUNICIPALITIES_UNAVAILABLE` contract with `retryable: true`, the incoming `x-request-id`, and `dashboard_query`/`timeline_query` phases. Route failure logs use the existing bounded `safeErrorLogFields` sanitizer. The Hydrology BFF forwards upstream `retry-after` while preserving status, body, content type, request ID, and `Cache-Control: no-store`. The direct API test helper now aborts requests after a bounded 10-second watchdog and closes the server in a guarded `finally` path.

#### TDD Cycle Evidence — Hydrology route-boundary slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| A-hydrology-api-route | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration | ⚠️ Prior RED run: 57/59 completed; dashboard failure + 1 cancelled timeout | ✅ Existing failure assertions exercised dashboard and timeline rejection paths | ✅ 58/58 passing; no failures/cancellations | ✅ Dashboard and timeline failures each assert status, body code, retryability, request ID, and phase; existing success paths remain covered | ✅ Shared unavailable response and sanitized route logging retained; helper watchdog/close lifecycle bounded |
| A-hydrology-bff | `apps/web/src/app/api/hydrology/[...path]/route.test.ts` | Integration boundary | ✅ Direct command completed with 0 discovered tests | ✅ Retry-after assertion exists in the bounded RED diff | ❌ Not established — runner reported 0 tests, so no BFF assertions executed | ❌ Not established because the required command discovers no tests | ✅ Production change is one response-header forwarding line; test discovery remains unresolved |

#### Exact bounded test evidence

| Test file | Command | Exact result |
|---|---|---|
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=45000 src/presentation/routes/hydrology-government.test.ts` | Exit 0; `tests 58`, `pass 58`, `fail 0`, `cancelled 0`, `skipped 0`; final `duration_ms 10142.802`; normal completion within the 60-second external timeout. |
| `apps/web/src/app/api/hydrology/[...path]/route.test.ts` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 "src/app/api/hydrology/[...path]/route.test.ts"` | Exit 0; `tests 0`, `pass 0`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 23.357`; command did not discover or execute the direct BFF tests. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | API command above: 58/58 pass. Web command above: 0 tests discovered, so BFF forwarding is not claimed GREEN. No rerun was needed for an assertion failure. |
| Runtime harness command/scenario and exact result | N/A — user prohibited servers, Playwright, and broader runtime harnesses; API tests use an in-process Express server and the BFF tests use mocked `fetch`. |
| Rollback boundary | Revert only the dashboard/timeline catches and sanitized logging in `apps/api/src/presentation/routes/hydrology-government.ts`, the bounded helper lifecycle in its direct test, and the `retry-after` response-header copy in `apps/web/src/app/api/hydrology/[...path]/route.ts`; preserve all prior Unit A slices and unrelated worktree edits. |

#### Handoff

- Unit A parent checkbox remains unchecked because this bounded attempt intentionally did not implement or modify the Agronautas route boundary.
- Remaining Unit A boundary work: `apps/api/src/presentation/routes/agronautas.ts` and `apps/web/src/app/api/agronautas/[...path]/route.ts` plus their direct test evidence, to be handled outside this bounded attempt.
- Units B–G remain pending in `tasks.md`; do not infer completion from this Hydrology-only slice.

### Bounded verification confirmation — Windows-safe Hydrology BFF test wrapper

- **Work unit:** Unit A BFF/API route integration, Hydrology BFF test discovery only.
- **Status:** Passed; the Windows-safe wrapper discovered and executed the existing dynamic-route assertions.
- **Scope:** Added only `apps/web/src/app/api/hydrology/route.test.ts`, which imports `./[...path]/route.test`. The direct dynamic route test and Hydrology BFF production route were otherwise unchanged. No sibling worktree, servers, Playwright, broad suites, commits, pushes, or lifecycle/review commands were used.
- **Diagnosis confirmed:** Node interprets `[...path]` in the CLI filename as a glob character class and reports zero tests. Importing the dynamic-path test from the wrapper avoids that discovery issue while preserving the existing status/body/retry-after/x-request-id assertions.

#### Exact bounded test evidence

| Test file | Command | Exact result |
|---|---|---|
| `apps/web/src/app/api/hydrology/route.test.ts` → `apps/web/src/app/api/hydrology/[...path]/route.test.ts` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/app/api/hydrology/route.test.ts` | Exit 0; `tests 12`, `pass 12`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 1090.0678`; normal completion within the 60-second external timeout. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/app/api/hydrology/route.test.ts` — exit 0; 12/12 pass with actual test discovery. |
| Runtime harness command/scenario and exact result | N/A — verification was limited to the in-process mocked-fetch BFF test boundary; servers, Playwright, and broader runtime harnesses were prohibited. |
| Rollback boundary | Remove only `apps/web/src/app/api/hydrology/route.test.ts`; preserve the existing dynamic route test, Hydrology BFF route, cumulative prior slices, and unrelated worktree edits. |

#### Handoff

- Hydrology BFF test discovery is now verified through the Windows-safe wrapper.
- Unit A remains open because its parent task includes the Agronautas route boundary and other work outside this verification slice.
- Next step: Agronautas route boundary.

### Completed bounded Agronautas route-boundary implementation

- **Work unit:** Unit A BFF/API route integration, Agronautas-only boundary.
- **Status:** Complete; all Unit A implementation and test items are now covered by the cumulative slices in this artifact. Units B–G remain pending.
- **Scope:** Only `apps/api/src/presentation/routes/agronautas.ts`, `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/web/src/app/api/agronautas/[...path]/route.ts`, `apps/web/src/app/api/agronautas/[...path]/route.test.ts`, and `apps/web/src/app/api/agronautas/route.test.ts` were changed in this bounded slice.
- **Implementation:** The Agronautas API router now sets `x-request-id` from the incoming request or a generated UUID before auth and route handlers, so existing response bodies and statuses remain unchanged while auth, not-found, unavailable, and rate-limit responses carry correlation IDs. The Agronautas BFF computes one request ID, forwards it upstream, returns a structured retryable 502 for fetch failures, and preserves upstream status/body plus `content-type`, `retry-after`, and upstream-or-request `x-request-id`; every BFF response is marked `Cache-Control: no-store`.
- **Discovery fix:** `apps/web/src/app/api/agronautas/route.test.ts` imports `./[...path]/route.test`, avoiding Node's `[...path]` filename glob-character-class behavior and proving the dynamic-path tests execute instead of reporting zero tests.
- **Scope guard:** No auth defaults, providers, ingest behavior, forecasts, unrelated API behavior, sibling worktree, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.

#### TDD Cycle Evidence — Agronautas route-boundary slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| A-agronautas-api-route | `apps/api/src/presentation/routes/agronautas.test.ts` | Integration | ✅ Prior route baseline 42/42 before the correlation assertion | ✅ 43 tests: 42 pass, 1 fail on missing `x-request-id` | ✅ 43/43 passing | ✅ 401, 403, 404, and 503 responses assert request IDs and preserved retryability | ✅ One router middleware sets the ID before auth/handlers; no body/status changes |
| A-agronautas-bff | `apps/web/src/app/api/agronautas/route.test.ts` → `apps/web/src/app/api/agronautas/[...path]/route.test.ts` | Integration boundary | ⚠️ Direct dynamic-path command previously discovered 0 tests; flat wrapper added before execution | ✅ 3 tests: 1 pass, 2 fail on missing response propagation/error handling | ✅ 3/3 passing | ✅ Demo query, 429 body/status/retry-after/headers, and upstream fetch failure paths | ✅ Shared request ID plus header copy/error helper; no unrelated route changes |

#### Exact bounded test evidence

| Test file | Command | Exact result |
|---|---|---|
| `apps/api/src/presentation/routes/agronautas.test.ts` | `pnpm --dir apps/api exec node --import tsx --test --test-timeout=45000 src/presentation/routes/agronautas.test.ts` | Exit 0; `tests 43`, `pass 43`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 2911.9934`. |
| `apps/web/src/app/api/agronautas/route.test.ts` → dynamic route test | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/app/api/agronautas/route.test.ts` | Exit 0; `tests 3`, `pass 3`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 958.4484`. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | API command above: 43/43 pass. Web flat-wrapper command above: 3/3 pass with actual discovery; no zero-test success accepted. |
| Runtime harness command/scenario and exact result | N/A — the required bounded scope prohibits starting servers or Playwright; API assertions use the existing in-process Express harness and BFF assertions use mocked `fetch`, both executed by the exact focused commands above. |
| Rollback boundary | Revert only the API router correlation-header middleware and its request-ID assertions, the Agronautas BFF request-ID/header/error handling and its boundary assertions, and the flat test wrapper; preserve cumulative Units A slices, existing bodies/statuses, and unrelated worktree edits. |

#### Unit A handoff

- Unit A is complete and marked `[x]` in `tasks.md`.
- Units B–G remain unchecked and untouched.
- Next recommended phase: `sdd-verify` for the completed Unit A / full change only when the orchestrator assigns it; next implementation unit is Unit B.

### Completed bounded Unit B UI slice — auth/demo/unavailable/404

- **Work unit:** B — explicit auth, demo, backend-unavailable, and capability-404 presentation in the existing Agronautas UI.
- **Status:** B UI slice complete; parent Unit B remains unchecked because API/auth middleware and API test work were explicitly outside this bounded request.
- **Scope:** Only `apps/web/src/components/agronautas/page-client.tsx`, `workspace.tsx`, `field-detail.tsx`, `page-client.test.tsx`, and `field-detail.test.tsx` were changed. No sibling worktree, API source, routes, landing, government, Unit C–G work, servers, Playwright, broad suites, commits, pushes, or lifecycle/review commands were used.
- **Implementation:** Runtime `401` now renders a non-loaded unauthorized boundary with an explicit demo-entry request; runtime `5xx`/transport failure renders a distinct backend-unavailable boundary with retry; demo mode is explicitly labeled as isolated and not production identity/role/tenancy. Geometry, activity, intelligence, and hydrology `404` outcomes render intentional unavailable states while the loaded risk/evidence sections remain visible and hydrology does not fabricate heights or forecasts. Existing component props remain compatible through optional additions; runtime retries are disabled for deterministic access-state resolution and capability retry includes the optional queries.

#### TDD Cycle Evidence — Unit B UI slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| B-access-boundary | `apps/web/src/components/agronautas/page-client.test.tsx` | Component/integration boundary | ✅ 21/21 across the three direct Agronautas files | ✅ 18 tests: 13 pass, 5 fail after auth/demo/404 assertions | ✅ 18/18 pass | ✅ 401 unauthorized, 503 unavailable, demo isolation, and four capability 404s with preserved evidence | ✅ explicit access/capability adapters; runtime retry disabled; optional capability retries retained |
| B-geometry-404 | `apps/web/src/components/agronautas/field-detail.test.tsx` | Component | ✅ 21/21 across the three direct Agronautas files | ✅ New 404 geometry assertion failed before implementation | ✅ 18/18 combined direct tests pass | ✅ 404 geometry state plus existing loaded risk/evidence assertions | ✅ optional `geometryOutcome` preserves existing presentational API usage |

#### Exact bounded test evidence

| Test file(s) | Command | Exact result |
|---|---|---|
| `page-client.test.tsx`, `workspace-intake.test.tsx`, `field-detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/agronautas/page-client.test.tsx src/components/agronautas/workspace-intake.test.tsx src/components/agronautas/field-detail.test.tsx` | Safety net exit 0; 21 tests, 21 pass, 0 fail, 0 cancelled, 0 skipped; duration 34,217.9567 ms |
| `page-client.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 --test-name-pattern="404 de capacidades" src/components/agronautas/page-client.test.tsx` | Focused 404 check exit 0; 1 test, 1 pass, 0 fail, 0 cancelled, 0 skipped; duration 21,128.9485 ms |
| `page-client.test.tsx`, `field-detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/agronautas/page-client.test.tsx src/components/agronautas/field-detail.test.tsx` | Final exit 0; 18 tests, 18 pass, 0 fail, 0 cancelled, 0 skipped; duration 26,915.2105 ms |

#### Work Unit Evidence — Unit B UI slice

| Evidence | Result |
|---|---|
| Focused test command and exact result | Final command above — exit 0; 18/18 tests passed with actual discovery and no skipped/cancelled tests |
| Runtime harness command/scenario and exact result | N/A — servers, production API, Playwright, broad suites, and external runtime checks were explicitly prohibited; component tests use the existing in-process mock service and direct `ApiError` fixtures |
| Rollback boundary | Revert only the access/capability rendering and optional geometry-state wiring in `apps/web/src/components/agronautas/page-client.tsx`, `workspace.tsx`, and `field-detail.tsx`, plus matching assertions in `page-client.test.tsx` and `field-detail.test.tsx`; preserve all prior Unit A edits, existing routes/API contracts, simulation markers, and unrelated worktree changes |

#### Unit B handoff

- Unit B remains unchecked in `tasks.md`; only this requested UI slice is complete. API/auth middleware and API tests were not touched.
- Remaining Unit B work, if later assigned: API/auth acceptance coverage and any route-level auth integration outside this allowed source perimeter.
- Units C–G remain pending and untouched: C landing/demo CTA/form; D operator summary/ingest/429; E landmarks/forms/keyboard; F responsive IA/visual consistency; G real no-stub Playwright acceptance.
- Engram progress was not written because no Engram memory tools were available in this executor surface; this OpenSpec artifact was appended cumulatively.

### Completed bounded Unit B auth boundary slice

- **Work unit:** B — auth-enabled 401/403 boundary, demo override protection, and cumulative unavailable/404 handoff.
- **Status:** Unit B complete. The prior UI slice and this API auth slice now cover the Unit B requirements; `tasks.md` is marked `[x]`.
- **Scope:** Only `apps/api/src/presentation/middleware/agronautas-auth.ts`, the existing direct `apps/api/src/presentation/routes/agronautas.test.ts`, `tasks.md`, and this cumulative progress artifact were changed. The Unit A Agronautas BFF route and flat wrapper were inspected and preserved unchanged. No sibling worktree, servers, Playwright, broad suites, commits, pushes, lifecycle, or review commands were used.
- **Implementation:** 401 auth failures now add the standard `WWW-Authenticate: Bearer` challenge while preserving the existing contract body, status, request ID, and default-disabled auth behavior. 403 failures remain explicit `FORBIDDEN` responses without an authentication challenge. The demo query remains behind the same read scope and its payload does not claim production role or tenancy. Existing UI coverage continues to label demo isolation, distinguish backend 503 from capability 404, preserve available evidence, and avoid fabricated capability data.

#### TDD Cycle Evidence — Unit B auth boundary slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| B-auth-401 | `apps/api/src/presentation/routes/agronautas.test.ts` | API integration | ✅ 43/43 baseline | ✅ 46 tests: challenge assertion failed before middleware change | ✅ 46/46 passing | ✅ missing bearer, explicit 403, and authenticated demo-query paths | ✅ conditional standard challenge; contract body/status/request ID unchanged |
| B-auth-403-demo | `apps/api/src/presentation/routes/agronautas.test.ts` | API integration | ✅ 43/43 baseline | ✅ Included in the same RED run | ✅ 46/46 passing | ✅ 403 no-challenge and demo auth/no-identity cases | ➖ No further refactor needed |
| B-ui-boundary | `apps/web/src/components/agronautas/page-client.test.tsx`, `field-detail.test.tsx` | Component/integration boundary | ✅ 21/21 prior baseline | ✅ Prior UI RED recorded above | ✅ Prior final evidence 18/18 | ✅ 401, 503, demo isolation, and four capability 404s | ✅ Prior UI adapter/state refactor recorded above |

#### Exact bounded test evidence

| Test file(s) | Command | Exact result |
|---|---|---|
| `apps/api/src/presentation/routes/agronautas.test.ts` | `pnpm exec node --import tsx --test --test-timeout=45000 src/presentation/routes/agronautas.test.ts` (from `apps/api`) | RED: exit failure; 46 tests, 45 pass, 1 fail because `www-authenticate` was `null` instead of `Bearer`. GREEN: same command, exit 0; 46 tests, 46 pass, 0 fail, 0 cancelled, 0 skipped; `duration_ms 8839.5808`. One GREEN execution followed the assertion failure. |
| `apps/web/src/components/agronautas/page-client.test.tsx`, `field-detail.test.tsx` | `pnpm exec node --import tsx --test --test-timeout=45000 src/components/agronautas/page-client.test.tsx src/components/agronautas/field-detail.test.tsx` (from `apps/web`) | Current bounded attempt exceeded the external 45,000 ms timeout before a final TAP summary; no current GREEN claim. The unchanged prior Unit B UI evidence remains 18/18 passing in the cumulative record above. No rerun was made after the timeout. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | API auth boundary: exit 0, 46/46 pass, 0 fail/cancelled/skipped. UI boundary: prior verified 18/18 pass; the later unchanged-file confirmation timed out at the required 45 seconds and is not counted as GREEN. |
| Runtime harness command/scenario and exact result | N/A — servers, Playwright, production API, and broad suites were explicitly prohibited; API coverage uses the existing in-process Express harness and UI coverage uses the existing component harness. |
| Rollback boundary | Revert only the `WWW-Authenticate` branch in `apps/api/src/presentation/middleware/agronautas-auth.ts` and the three new auth/demo tests in `apps/api/src/presentation/routes/agronautas.test.ts`; preserve prior Unit A/B UI edits, existing response bodies/statuses/request IDs/defaults, BFF route behavior, and unrelated worktree changes. |

#### Unit B handoff

- Auth-enabled 401/403 behavior is explicit and compatible: 401 includes `WWW-Authenticate: Bearer`; 403 does not; contract bodies and request IDs remain covered.
- Demo access cannot bypass enabled auth and does not assert production identity or tenancy; the UI demo label and isolation disclaimer remain covered by the prior 18/18 result.
- Backend-unavailable and capability-404 states remain distinct through status-aware UI state and existing API status/body coverage; no capability substitute was added.
- Units C–G remain pending and untouched: C landing/demo CTA/form; D operator summary/ingest/429; E landmarks/forms/keyboard; F responsive IA/visual consistency; G real no-stub Playwright acceptance.
- Engram merge was unavailable in this executor surface; this file was appended cumulatively and no prior progress was overwritten.

### Completed bounded Unit C — landing/demo CTA and form recovery

- **Work unit:** C — landing/demo CTA/form.
- **Status:** Complete; both the observable Risk Engine CTA and controlled demo-form recovery contracts are covered. Units D–G remain pending.
- **Scope:** Only `apps/web/src/components/landing/homepage.tsx`, `homepage.test.tsx`, `demo-contact-form.tsx`, and `demo-contact-form.test.tsx` were changed, plus this cumulative artifact and the Unit C checkbox in `tasks.md`. No sibling worktree, API/provider/auth/default, marketplace, operator/government, field-management, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Implementation:** `Ver Risk Engine` is now a semantic same-page anchor to `#risk-engine`. Demo submission uses const-backed distinct idle, validation, pending, success, aborted, network, and server-error states; validates an accepted `received` response before confirming; prevents concurrent duplicate submissions with an in-flight ref; preserves failed values; and exposes an explicit retry action. Success copy only confirms delivery accepted by the service and does not claim provider/lead follow-up.
- **Harness correction:** Both direct landing component tests use `@testing-library/react/pure`, explicit RTL cleanup, tracked JSDOM window closure, and restoration of temporary globals. The initial homepage safety command emitted 6/6 TAP passes but exceeded the external 45-second process timeout during teardown; the lifecycle correction produced clean bounded executions without force-exit.

#### TDD Cycle Evidence — Unit C

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| C-CTA | `apps/web/src/components/landing/homepage.test.tsx` | Component/static render | ⚠️ 6/6 TAP passes, process teardown exceeded 45s; pure-RTL lifecycle repair applied before contract cycle | ✅ 7 tests, 6 pass and the new observable-CTA assertion failed | ✅ 7/7 pass | ✅ Existing nav anchor plus distinct hero CTA target | ✅ Button replaced by semantic same-page anchor; no unrelated landing changes |
| C-form | `apps/web/src/components/landing/demo-contact-form.test.tsx` | Component/integration boundary | ✅ 3/3 pass | ✅ 6 tests, 1 pass and 5 new/updated recovery assertions failed before implementation | ✅ 6/6 after the single assertion/query correction rerun; final triangulation 7/7 | ✅ accepted response, duplicate pending submit, validation, aborted `ERR_ABORTED`, network, server failure, rejected response, preserved values, and retry | ✅ const-backed status model, shared error classifier/message mapping, pure RTL lifecycle |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `apps/web/src/components/landing/homepage.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/landing/homepage.test.tsx` | Exit 0; 7 tests, 7 pass, 0 fail, 0 cancelled, 0 skipped; duration 15,517.2145 ms |
| `apps/web/src/components/landing/demo-contact-form.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/landing/demo-contact-form.test.tsx` | Exit 0; 7 tests, 7 pass, 0 fail, 0 cancelled, 0 skipped; duration 30,721.9639 ms |

#### Work Unit Evidence — Unit C

| Evidence | Result |
|---|---|
| Focused test command and exact result | Two explicit direct landing commands above; combined result 14/14 tests pass, 0 fail, 0 cancelled, 0 skipped. No package-wide script was run. |
| Runtime harness command/scenario and exact result | N/A — the user prohibited servers, Playwright, and broad runtime harnesses; controlled `submitAction` component scenarios exercise accepted, rejected, abort, network, server, duplicate, value-preservation, and retry behavior without claiming external lead delivery. |
| Rollback boundary | Revert only `homepage.tsx` CTA anchor and its CTA assertion, plus `demo-contact-form.tsx` submission-state/classification/retry behavior and its direct tests/harness lifecycle changes; preserve all prior Unit A/B work, raw API compatibility, and unrelated worktree edits. |

#### Unit C handoff

- Unit C is marked `[x]` in `tasks.md` after both CTA and form requirements passed their direct tests.
- Units D–G remain unchecked: operator summary/ingest/429; landmarks/forms/keyboard; responsive IA/visual consistency; real no-stub Playwright acceptance.
- Engram progress was unavailable in this executor surface; this OpenSpec artifact was appended cumulatively and no prior progress was overwritten.

### Bounded Unit D slice — Agronautas / Iberá operator summary and municipality detail status rendering

- **Work unit:** D — first bounded operator-summary/status-rendering slice only.
- **Status:** Implementation applied in the allowed overview/detail perimeter; Unit D remains unchecked because ingest and 429 recovery are not implemented in this slice. Final detail execution was not repeated after the permitted rerun limit.
- **Scope:** Only `apps/web/src/components/government/overview.tsx`, `overview.test.tsx`, `detail.tsx`, and `detail.test.tsx` were changed. No ingest panel, chat transport, API, landing, auth, marketplace, field-management, sibling worktree, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Implementation:** Added pure operator-summary adapters and above-fold summary regions for provincial and municipality views with status, freshness, threshold comparison, evidence confidence, and safe next action. Municipality status treats a registered/fresh provenance record plus missing telemetry as missing rather than current; the evidence panel preserves that normalized state. Empty INA forecast rows now show a prominent unavailable boundary and suppress planning copy. Copilot output now uses the existing non-actionable status primitive, so missing citations/unverified claims do not render as grounded/actionable.
- **Compatibility:** Existing component props, telemetry/provenance fields, source URLs, simulation/unavailable markers, mappings, alerts, explanation metadata, and existing supported forecast rows remain preserved. No new API fields or provider behavior were introduced.

#### TDD Cycle Evidence — bounded Unit D summary/status slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| D-operator-summary-overview | `apps/web/src/components/government/overview.test.tsx` | Component/unit boundary | ✅ 3/3 baseline | ✅ New summary assertion failed: missing adapter | ✅ 4/4 in final permitted rerun | ✅ Pure summary values plus rendered ordering and all five operator fields | ✅ Shared `OperatorSummary` contract and semantic region |
| D-operator-summary-detail | `apps/web/src/components/government/detail.test.tsx` | Component/unit boundary | ✅ 7/7 baseline | ✅ New summary/conflict/empty-forecast/non-actionable assertions exposed missing behavior | ⚠️ Last permitted rerun: 7/10; three failures were narrowed to query semantics/duplicate alert output and corrected afterward; no further execution allowed | ✅ Normal summary, provenance/telemetry conflict, empty forecast, unsupported Copilot, existing stream/error paths | ✅ Explicit summary adapter, forecast boundary, Copilot status primitive, duplicate unsupported error suppression |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `overview.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/government/overview.test.tsx` | Last permitted rerun exit 0; 4 tests, 4 pass, 0 fail, 0 cancelled, 0 skipped; duration 16,355.0921 ms. |
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/government/detail.test.tsx` | Last permitted rerun exit failure; 10 tests, 7 pass, 3 fail, 0 cancelled, 0 skipped. The remaining failures were limited to the post-rerun test-query/duplicate-alert cleanup; no additional rerun was permitted. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | The two explicit direct commands above only; overview was 4/4 on the last permitted rerun, detail was 7/10 before the final non-executed query/alert cleanup. No package-wide command was run. |
| Runtime harness command/scenario and exact result | N/A — user explicitly prohibited servers, runtime smoke, Playwright, and broad suites; this slice is limited to mocked component rendering and direct pure-adapter assertions. |
| Rollback boundary | Revert only the operator-summary adapters/regions, normalized municipality evidence state, empty-forecast boundary, Copilot status wiring, and matching assertions in the four government overview/detail files; preserve all prior Units A–C work, raw fields, API contracts, ingest/chat behavior, and unrelated working-tree edits. |

#### Unit D handoff

- Unit D remains unchecked in `tasks.md` until the separately bounded ingest/429 slice is complete and verified.
- Remaining Unit D work: `ingest-panel.tsx` plus its direct tests for unauthorized, progress, completed, partial, failed, retry, focus, and token non-persistence; `visibility/chat.ts` plus direct chat tests for 429 timing/backoff and draft preservation.
- Units E–G remain pending and untouched: landmarks/forms/keyboard; responsive IA/visual consistency; real no-stub Playwright acceptance.
- Engram was unavailable in this executor surface; this cumulative OpenSpec artifact was appended without replacing previous progress.

### Bounded Unit D verification/repair continuation — detail test remains blocked

- **Work unit:** D — verification/repair of the already-applied operator-summary/status-rendering slice only.
- **Status:** Not GREEN. The required direct detail test timed out twice at the Node test timeout before individual test cases completed; Unit D remains unchecked. No overview rerun was needed because the overview source/test files were unchanged by the repair and the cumulative evidence remains 4/4.
- **Scope:** Only `apps/web/src/components/government/detail.test.tsx` was repaired in the allowed government perimeter; the cumulative artifact was updated for evidence. The sibling marketplace/management worktree, ingest panel, chat transport, API, servers, Playwright, broad tests, commits, pushes, lifecycle commands, and review commands were not used.
- **Repair attempted:** Switched the direct detail test harness import from `@testing-library/react` to `@testing-library/react/pure` to remove automatic RTL lifecycle interference while preserving explicit `cleanup()`. The rerun reproduced the same timeout, so no GREEN claim is made and no further detail rerun is authorized in this bounded attempt.

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=20000 src/components/government/detail.test.tsx` | Initial run: exit failure; file subtest `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`, `todo 0`; `testTimeoutFailure` after `20,000 ms`, file duration `20,069.9354 ms`; external 45-second timeout was not reached. |
| `detail.test.tsx` | Same exact command after the pure-RTL repair | Rerun: exit failure; file subtest `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`, `todo 0`; `testTimeoutFailure` after `20,000 ms`, file duration `20,061.7362 ms`; external 45-second timeout was not reached. |
| `overview.test.tsx` | Not run | Not needed: no overview file changed in this continuation; prior cumulative result remains 4/4. |

#### Work Unit Evidence — verification/repair continuation

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required detail command was run exactly twice, once before and once after the allowed harness repair; both cancelled at the 20-second Node test timeout with 0 completed assertion tests. This work unit is not GREEN. |
| Runtime harness command/scenario and exact result | N/A — user explicitly prohibited servers, runtime smoke, Playwright, and broad suites; this bounded slice has only mocked component-rendering tests. |
| Rollback boundary | Revert only the `@testing-library/react/pure` import change in `apps/web/src/components/government/detail.test.tsx`; preserve the existing operator-summary/detail production behavior, prior query/error cleanup, all Units A–C work, and unrelated working-tree edits. |

#### Unit D handoff

- Unit D remains unchecked in `tasks.md`; ingest/429 work is still required before the parent task can be marked complete.
- Remaining Unit D work: `ingest-panel.tsx` plus its direct tests for unauthorized, progress, completed, partial, failed, retry, focus, and token non-persistence; `visibility/chat.ts` plus direct chat tests for 429 timing/backoff and draft preservation.
- No detail GREEN evidence exists from this continuation; do not advance to verify for Unit D on this evidence.
- Engram was unavailable in this executor surface; this cumulative OpenSpec artifact was appended without replacing previous progress.

### Bounded Unit D government overview/detail verification — 2026-08-28

- **Work unit:** D — verification-only confirmation for the already-applied government overview/detail summary and status-rendering slice.
- **Status:** Partial; overview completed 4/4, while detail timed out at its explicit 45-second Node test timeout after one concrete test passed. No implementation or test source was changed. Unit D remains unchecked; ingest/429 work remains outstanding.
- **Scope:** Ran only the two user-specified direct government component test commands from `C:\Users\mmmau\Agronautas\monorepo-js-baseline`. No sibling worktree, servers, Playwright, broad suites, commits, pushes, lifecycle commands, or review commands were used.

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/government/detail.test.tsx` | **Exit failure** from the test runner's internal timeout; nonzero test discovery confirmed. TAP: the first concrete test passed (`ok 1`, `duration_ms 1735.5036`), then the implicit file subtest timed out (`duration_ms 45017.7305`, `test timed out after 45000ms`). Final summary: `tests 2`, `pass 1`, `fail 0`, `cancelled 1`, `skipped 0`, `todo 0`; total `duration_ms 45065.1452`. Per the timeout rule, no repair or rerun was attempted. |
| `overview.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/government/overview.test.tsx` | **Exit 0**; nonzero test discovery and all discovered tests passed: `tests 4`, `pass 4`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 26402.7614`. |

#### Work Unit Evidence — verification-only confirmation

| Evidence | Result |
|---|---|
| Focused test command and exact result | Overview: 4/4 passed. Detail: 1 concrete test passed before the file-level test timeout; all 10 detail tests were not confirmed in this run. The expected 10/10 result was not reproduced, so this work unit is not GREEN. |
| Runtime harness command/scenario and exact result | N/A — the user explicitly prohibited servers, runtime smoke, Playwright, and broad suites; this verification was limited to the two direct RTL/JSDOM component commands. |
| Rollback boundary | No source or test changes were made; rollback is empty. Preserve all existing government implementation/tests, cumulative Units A–C work, the unchecked Unit D state, and unrelated working-tree edits. |

#### Unit D handoff

- Unit D remains unchecked because ingest/429 implementation is still outstanding and the detail verification command timed out.
- Next bounded implementation slice: `apps/web/src/components/government/ingest-panel.tsx`, its direct test, and the assigned `apps/web/src/lib/visibility/chat.ts` 429/backoff contract only; preserve the detail timeout as an explicit verification risk.
- Engram was unavailable in this executor surface; this cumulative OpenSpec artifact was appended without replacing previous progress.

### Completed bounded Unit D detail test-harness lifecycle repair — 2026-08-28

- **Work unit:** D — government detail JSDOM lifecycle repair and focused verification only.
- **Status:** GREEN for the detail test harness; Unit D remains unchecked because the ingest and 429/backoff slice is still outstanding.
- **Scope:** Only `apps/web/src/components/government/detail.test.tsx` was changed for the harness repair. `detail.tsx`, ingest, chat transport, API, sibling worktrees, servers, Playwright, broad suites, commits, pushes, lifecycle commands, and review commands were not touched.
- **Repair:** The harness now records the pre-test globals, tracks every JSDOM instance, runs RTL `cleanup()`, yields one event-loop turn for pending React scheduler work, closes all tracked windows, and restores the prior globals. No assertion was weakened and no force-exit was added.

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/government/detail.test.tsx` | Initial post-lifecycle run: exit failure; all 10 concrete tests passed, but the file subtest failed on asynchronous activity after test 5 (`TypeError: Cannot read properties of undefined (reading 'event')`); TAP reported `tests 11`, `pass 10`, `fail 1`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 27684.4537`. |
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=45000 src/components/government/detail.test.tsx` | Final permitted rerun after the teardown settle point: **exit 0**; TAP reported `tests 10`, `pass 10`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 29141.3427`; normal completion within the 90-second external timeout. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Final exact command above — exit 0; 10/10 discovered concrete tests passed, with no failures, cancellations, skips, or asynchronous-activity failure. |
| Runtime harness command/scenario and exact result | N/A — this work unit is test-harness lifecycle repair for isolated RTL/JSDOM component tests; servers, external providers, runtime smoke, and Playwright were explicitly prohibited. |
| Rollback boundary | Revert only the added `originalGlobals`/`activeDoms` tracking, `afterEach` cleanup/settle/close/restore logic, and `activeDoms.push(dom)` in `apps/web/src/components/government/detail.test.tsx`; preserve the existing detail assertions, prior Unit D production behavior, cumulative Units A–C work, and unrelated working-tree edits. |

#### Unit D handoff

- The government detail focused test is now verified GREEN at 10/10 after deterministic JSDOM teardown.
- Unit D remains unchecked until the next bounded slice implements and verifies ingest unauthorized/progress/completed/partial/failed/retry/focus/token non-persistence behavior plus chat 429 backoff and draft preservation.
- **Next remaining Unit D slice:** `apps/web/src/components/government/ingest-panel.tsx`, its direct test, and the assigned `apps/web/src/lib/visibility/chat.ts` 429/backoff contract with direct chat tests.
- Engram was unavailable in this executor surface; this cumulative OpenSpec artifact was appended without replacing prior progress.

### Bounded Unit E1 preflight — direct React/JSDOM safety net blocked — 2026-08-28

- **Work unit:** E1 — document landmarks, skip links, headings, and live-region structure.
- **Status:** Blocked before RED/GREEN. The seven explicit direct React/JSDOM safety-net processes were run with a 60-second external bound and each reached the internal 50-second Node test timeout without completing a concrete test. No Unit E production or test source was changed; Unit E remains unchecked.
- **Scope:** Only the requested `monorepo-js-baseline` main worktree was used. No sibling marketplace/management worktree, broad suite, server, Playwright, commit, push, lifecycle, or review command was used.

#### Exact bounded safety-net evidence

| Test File | Command | Exact result |
|---|---|---|
| `page-client.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/page-client.test.tsx` | **Timed out**; `testTimeoutFailure`, `duration_ms: 50430.9322`, file subtest `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`; external command terminated after exceeding 60,000 ms. |
| `field-detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/field-detail.test.tsx` | **Timed out**; `testTimeoutFailure`, `duration_ms: 50261.7056`, file subtest `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`; external command terminated after exceeding 60,000 ms. |
| `overview.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/overview.test.tsx` | **Timed out**; `testTimeoutFailure`, `duration_ms: 50286.1399`, file subtest `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`; external command terminated after exceeding 60,000 ms. |
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/detail.test.tsx` | **Timed out**; `testTimeoutFailure`, `duration_ms: 50267.3711`, file subtest `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`; external command terminated after exceeding 60,000 ms. |
| `ingest-panel.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/ingest-panel.test.tsx` | **Timed out**; `testTimeoutFailure`, `duration_ms: 50352.129`, file subtest `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`; external command terminated after exceeding 60,000 ms. |
| `homepage.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/landing/homepage.test.tsx` | **Timed out**; `testTimeoutFailure`, `duration_ms: 50465.6521`, file subtest `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`; external command terminated after exceeding 60,000 ms. |
| `demo-contact-form.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/landing/demo-contact-form.test.tsx` | **Timed out**; `testTimeoutFailure`, `duration_ms: 50279.2337`, file subtest `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`; external command terminated after exceeding 60,000 ms. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Blocked: all seven direct safety-net commands reached their 50-second Node test timeout while launched concurrently; zero concrete assertions completed, so no RED/GREEN evidence is claimed. |
| Runtime harness command/scenario and exact result | N/A — runtime servers, Playwright, and broad suites are prohibited; the required component safety net was blocked before implementation. |
| Rollback boundary | No Unit E source or test implementation changes exist. Revert only this preflight progress entry if needed; preserve all prior Units A–D and unrelated worktree edits. |

#### Unit E1 handoff

- Unit E remains unchecked in `tasks.md`; no RED/GREEN cycle was started.
- The next attempt must first repair the direct React/JSDOM harness only, if necessary, using pure RTL cleanup plus JSDOM close/global restoration and no force-exit, then rerun the explicitly bounded safety net under the same timeout rule.

### Completed bounded Unit D ingest-panel slice — 2026-08-28

- **Work unit:** D — ingest-panel unauthorized recovery, progress-state, focus, and token-safety behavior only.
- **Status:** Ingest-panel slice GREEN; Unit D remains unchecked because the chat `429` backoff/draft slice is still outstanding.
- **Scope:** Only `apps/web/src/components/government/ingest-panel.tsx` and `apps/web/src/components/government/ingest-panel.test.tsx` were changed, plus this cumulative progress artifact. No chat transport, API routes, auth defaults, production ingest enablement, marketplace, field management, sibling worktree, servers, Playwright, broad suites, commits, pushes, lifecycle, or review commands were used.
- **Implementation:** Unauthorized verification and post-admission `401` failures now expose an assertive live alert linked to a reachable `Reintentar verificación` control; focus moves to the retry control on failure and back to the empty token field on retry. The token remains memory-only and is absent from serialized rendered output after failure. Existing authorized, queued polling, completed, partial, failed, source-label, and safe-diagnostic behavior remains unchanged. Started admissions are explicitly announced as progress and retain the safe ingest retry.

#### TDD Cycle Evidence — bounded ingest-panel slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| D-ingest-unauthorized-recovery | `apps/web/src/components/government/ingest-panel.test.tsx` | Component/integration boundary | ✅ 8/8 baseline | ✅ 9 tests: 8 pass, 1 fail on missing retry/focus behavior | ✅ 9/9 pass after minimum implementation | ✅ Post-admission 401 recovery plus started-progress path; final 11/11 pass | ➖ None needed; refs/effect and semantic retry control are the minimum focused change |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `ingest-panel.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/ingest-panel.test.tsx` with 60-second external timeout | Safety net exit 0; 8 tests, 8 pass, 0 fail, 0 cancelled, 0 skipped; `duration_ms 27963.0205`. |
| `ingest-panel.test.tsx` | Same command after RED assertions | RED exit failure; 9 tests, 8 pass, 1 fail, 0 cancelled, 0 skipped; missing `Reintentar verificación` behavior. |
| `ingest-panel.test.tsx` | Same command after GREEN implementation | Exit 0; 9 tests, 9 pass, 0 fail, 0 cancelled, 0 skipped; `duration_ms 26356.8232`. |
| `ingest-panel.test.tsx` | Same command after triangulation assertions | Exit 0; 11 tests, 11 pass, 0 fail, 0 cancelled, 0 skipped; `duration_ms 39263.5634`; normal completion within the 60-second external timeout. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/ingest-panel.test.tsx` with 60-second external timeout — exit 0; 11/11 tests pass, 0 fail, 0 cancelled, 0 skipped. |
| Runtime harness command/scenario and exact result | N/A — this bounded slice has no runtime/server boundary; direct component tests use mocked `fetch` and JSDOM only, while servers, Playwright, and external ingest authorization were prohibited. |
| Rollback boundary | Revert only the focus/retry/error-announcement changes in `apps/web/src/components/government/ingest-panel.tsx` and the three matching direct tests in `apps/web/src/components/government/ingest-panel.test.tsx`; preserve prior ingest API contract, source labels, memory-only token semantics, auth defaults, cumulative Units A–C/D-summary work, and unrelated edits. |

#### Unit D handoff

- Unit D remains unchecked in `tasks.md` by instruction; do not mark it complete until the separate chat `429` backoff/draft-preservation slice is implemented and verified.
- Remaining Unit D work: `apps/web/src/lib/visibility/chat.ts` and its direct test for visible `429` retry timing/backoff while preserving the draft question. No chat file was touched in this slice.
- Units E–G remain unchecked and untouched: landmarks/forms/keyboard; responsive IA/visual consistency; real no-stub Playwright acceptance.
- The JSDOM run emitted a React input-event `attachEvent` diagnostic during the intentional focus assertion, but the focused suite completed normally with all 11 assertions passing; no force-exit or timeout workaround was used.
- Engram was unavailable in this executor surface; this cumulative OpenSpec artifact was appended without replacing prior progress.

### Completed bounded Unit D chat-429 recovery slice — 2026-08-28

- **Work unit:** D — chat HTTP 429 retry-after/backoff recovery only.
- **Status:** Complete; cumulative Unit D ingest coverage plus this chat slice now cover the assigned operator-summary, ingest, and 429 requirements. Unit D is marked `[x]`; Units E–G remain pending.
- **Scope:** Only `apps/web/src/lib/visibility/chat.ts` and `apps/web/src/lib/visibility/chat.test.ts` were changed for implementation. The cumulative `tasks.md` checkbox and this progress artifact were updated as required. No polling, view-models, components, API routes, sibling marketplace/management worktree, servers, Playwright, broad suites, commits, pushes, lifecycle, or review commands were used.
- **Implementation:** Added pure Retry-After normalization for delta-seconds and HTTP-date values, a rate-limit state adapter that produces degraded/non-actionable HTTP 429 state while preserving answer, draft metadata, citations, and other stream fields, visible `retryAfterMs`/`retryAt` timing, and `canRetryChat` gating until the backoff expires. Existing normalized 200-empty, citation-free, and unverified-claim behavior remains non-actionable.

#### TDD Cycle Evidence — chat-429 recovery slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| D-chat-429-recovery | `apps/web/src/lib/visibility/chat.test.ts` | Unit | ✅ 8/8 | ✅ 10 tests: 8 pass, 2 fail because the new recovery adapter/gate did not exist | ✅ 10/10 pass | ✅ delta-seconds and HTTP-date inputs; early and permitted retry boundaries; draft/citation preservation | ✅ pure normalization, state adapter, and retry gate; existing compatibility path retained |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `chat.test.ts` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=20000 src/lib/visibility/chat.test.ts` with 45-second external timeout | Safety net exit 0; `tests 8`, `pass 8`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 968.315`. |
| `chat.test.ts` | Same exact command after RED assertions | RED exit failure; `tests 10`, `pass 8`, `fail 2`, `cancelled 0`, `skipped 0`; both failures were expected missing-export failures for `applyChatRateLimit`. |
| `chat.test.ts` | Same exact command after GREEN implementation | Exit 0; `tests 10`, `pass 10`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 1036.724`. No rerun was needed after GREEN. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=20000 src/lib/visibility/chat.test.ts` — exit 0; 10/10 pass, 0 fail, 0 cancelled, 0 skipped. Existing HTTP-200 empty-stream and unverified-claim tests remained passing. |
| Runtime harness command/scenario and exact result | N/A — this is a pure chat adapter/state boundary; servers, external providers, polling, BFF/API routes, Playwright, and broad suites were explicitly prohibited. |
| Rollback boundary | Revert only the additive Retry-After normalization, rate-limit adapter, retry gate, retry timing fields, and matching assertions in `apps/web/src/lib/visibility/chat.ts` and `apps/web/src/lib/visibility/chat.test.ts`; preserve prior chat compatibility, cumulative ingest/operator-summary work, and unrelated working-tree edits. |

#### Unit D handoff

- Unit D is marked `[x]` in `tasks.md`: prior ingest-panel evidence is 11/11 and this chat recovery evidence is 10/10.
- Units E–G remain unchecked and pending: landmarks/forms/keyboard; responsive IA/visual consistency; real no-stub Playwright acceptance.
- Engram was unavailable in this executor surface; this cumulative OpenSpec artifact was appended without replacing prior progress.

### Completed bounded Unit E1a — app skip target and Agronautas content boundary — 2026-08-28

- **Work unit:** E1a — establish the app-level skip-link entry point for the Agronautas shell without adding a new `<main>` around the existing product shell.
- **Status:** GREEN for this bounded E1a target; Unit E remains unchecked. E1b form semantics/error focus/keyboard behavior and E2 responsive/detail navigation remain outstanding.
- **Scope:** Only `apps/web/src/app/layout.tsx`, `apps/web/src/components/agronautas/page-client.tsx`, `apps/web/src/components/agronautas/page-client.test.tsx`, and this cumulative artifact were changed. No workspace-shell source, landing source, government source, sibling worktree, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Implementation:** The root layout now exposes a keyboard-visible `Saltar al contenido principal` link targeting `#main-content`. The Agronautas client adds a focusable, focus-visible-styled `#main-content` boundary around the existing workspace, preserving the existing product-shell landmark rather than introducing another `<main>` wrapper or changing visual layout/behavior.

#### TDD Cycle Evidence — Unit E1a

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| E1a-skip-target | `apps/web/src/components/agronautas/page-client.test.tsx` | Component | ✅ 15/15 baseline | ✅ 16 tests: 15 pass, 1 failed because `agronautas-main-content` did not exist | ✅ 16/16 pass after the allowed layout/page-client implementation and semantic query correction | ✅ Existing Agronautas shell main remains discoverable while the new content target is present; no additional main wrapper was introduced | ✅ Focusable target uses semantic `tabIndex={-1}` and `focus-visible` styling; no production behavior changes beyond the boundary |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `page-client.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/page-client.test.tsx` | Safety net exit 0; `tests 15`, `pass 15`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 23006.6433`. |
| `page-client.test.tsx` | Same command after RED test | Exit failure; `tests 16`, `pass 15`, `fail 1`, `cancelled 0`, `skipped 0`; the new test failed because `[data-testid="agronautas-main-content"]` was absent. |
| `page-client.test.tsx` | Same command after implementation and final allowed assertion correction | Exit 0; `tests 16`, `pass 16`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 18737.6291`; normal completion within the 90-second external timeout. |

#### Work Unit Evidence — Unit E1a

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/page-client.test.tsx` — final exit 0; 16/16 tests pass, 0 fail, 0 cancelled, 0 skipped. |
| Runtime harness command/scenario and exact result | N/A — runtime servers, production API, browser automation, and Playwright were explicitly prohibited; this slice is a layout/component boundary verified by the direct React/JSDOM test. |
| Rollback boundary | Revert only the root skip-link markup in `apps/web/src/app/layout.tsx`, the `#main-content` wrapper in `apps/web/src/components/agronautas/page-client.tsx`, and the matching E1a test; preserve existing ProductShell/workspace markup, all Units A–D behavior, and unrelated worktree edits. |

#### Unit E1a handoff

- Unit E remains unchecked in `tasks.md` by instruction; this slice does not claim the full E landmark/forms/keyboard task.

- Remaining E1 work: audit landing/Agronautas/government route landmark counts, form `name`/`autocomplete`, `aria-describedby`, live errors, focus-visible states, first-invalid focus, and keyboard submit behavior. The existing workspace/ProductShell contains pre-existing nested `<main>` markup outside this allowed source perimeter; this slice deliberately did not modify `workspace.tsx` or `product-shell.tsx`.
- E2 remains pending: responsive/detail navigation, section index/sticky summary, focus occlusion, overflow, and shared copy/status consistency.
- Units F–G remain pending: F responsive IA/visual consistency and G real no-stub Playwright acceptance.
- Engram was unavailable in this executor surface; this OpenSpec artifact was appended cumulatively without replacing prior progress.

### Completed bounded Unit E1b — Agronautas nested-main landmark removal — 2026-08-28

- **Work unit:** E1b — preserve the existing ProductShell document landmark while removing nested `<main>` elements from the Agronautas workspace and field detail states.
- **Status:** GREEN for this bounded landmark target; Unit E remains unchecked until the remaining government landmarks, form semantics, live errors, focus, and keyboard behavior are complete.
- **Scope:** Only `apps/web/src/components/agronautas/workspace.tsx`, `apps/web/src/components/agronautas/field-detail.tsx`, `apps/web/src/components/agronautas/field-detail.test.tsx`, `apps/web/src/components/agronautas/page-client.test.tsx`, and this cumulative artifact were changed in this slice. `apps/web/src/components/shell/product-shell.tsx` was preserved; no landing, government, API, sibling worktree, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Implementation:** Ready, unauthorized, unavailable, loading, and error Agronautas containers now use non-landmark `<div>` containers inside the existing ProductShell `<main>`. The workspace and field detail retain their headings, labeled sections, status components, forms, state branches, and component APIs while exposing exactly one document main landmark.

#### TDD Cycle Evidence — Unit E1b

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| E1b-field-detail-landmark | `apps/web/src/components/agronautas/field-detail.test.tsx` | Component | ✅ 3/3 baseline | ✅ 3 tests: 2 pass, 1 failed because the rendered detail had 2 main landmarks | ✅ 3/3 pass after replacing nested containers | ✅ Loaded detail and 404 geometry capability states each assert exactly one main and no `main > main` nesting | ✅ Replaced only nested layout containers; ProductShell landmark and detail markup remain unchanged |
| E1b-workspace-landmark | `apps/web/src/components/agronautas/page-client.test.tsx` | Component/integration boundary | ⚠️ Prior cumulative 16/16 evidence; current pre-change command was not rerun before the required field-detail-first RED cycle | ✅ Assertion added for loaded and unauthorized workspace states; first post-RED run reached the 50-second test timeout before completion | ✅ 16/16 pass after pure RTL/JSDOM lifecycle repair | ✅ Loaded and unauthorized workspace branches each assert exactly one main and no `main > main` nesting | ✅ Test-only lifecycle repair uses pure RTL, tracked JSDOM closure, and global restoration; no production behavior change |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `field-detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/field-detail.test.tsx` | Safety net exit 0; `tests 3`, `pass 3`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 19355.9649`. |
| `field-detail.test.tsx` | Same command after landmark RED assertions | Exit failure; `tests 3`, `pass 2`, `fail 1`, `cancelled 0`, `skipped 0`; expected `1`, received `2` main landmarks. |
| `field-detail.test.tsx` | Same command after GREEN implementation | Exit 0; `tests 3`, `pass 3`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 16951.8269`. |
| `field-detail.test.tsx` | Same command after triangulation assertions | Exit 0; `tests 3`, `pass 3`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 20856.6387`. |
| `page-client.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/page-client.test.tsx` | Initial post-RED run hit the test harness timeout; `tests 2`, `pass 1`, `fail 0`, `cancelled 1`, `skipped 0`; `testTimeoutFailure` at `50000 ms`, total `duration_ms 50582.8337`. |
| `page-client.test.tsx` | Same command after the allowed pure RTL/JSDOM lifecycle repair | Exit 0; `tests 16`, `pass 16`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 35644.5453`; normal completion within the 90-second external timeout. No separate `workspace.test.tsx` exists; this direct page-client test is the workspace test boundary. |

#### Work Unit Evidence — Unit E1b

| Evidence | Result |
|---|---|
| Focused test command and exact result | `field-detail.test.tsx`: final triangulated command exit 0 with 3/3 pass. `page-client.test.tsx`: final repaired command exit 0 with 16/16 pass. Both were run serially with `--test-timeout=50000`; no broad suite was run. |
| Runtime harness command/scenario and exact result | N/A — the user prohibited servers, runtime smoke, Playwright, and broad suites; this slice is a document-landmark component boundary verified through direct React/JSDOM rendering. |
| Rollback boundary | Revert only the nested `<main>` to `<div>` container changes in `workspace.tsx` and `field-detail.tsx`, the four landmark assertions in the two Agronautas direct tests, and the page-client test-only lifecycle repair; preserve ProductShell's app-level main, E1a skip target, Units A–D behavior, forms, state components, and unrelated worktree edits. |

#### Unit E1b handoff

- Unit E remains unchecked in `tasks.md`; this slice intentionally does not claim the full E landmarks/forms/keyboard task.
- Remaining E work: government route landmark deduplication, form `name`/`autocomplete`, `aria-describedby`, live validation errors, visible focus states, first-invalid focus, and keyboard submission behavior across audited routes.
- Unit F remains pending: responsive IA, section index/sticky summary, focus occlusion, overflow, and shared copy/status consistency.
- Unit G remains pending (historical handoff): real no-stub Playwright acceptance and production-boundary evidence.

### Bounded Unit G full real no-stub acceptance — 2026-08-29

- **Work unit:** G — the required desktop/mobile market-readiness Playwright command followed by the required web build.
- **Status:** Blocked/unknown; G remains unchecked in `tasks.md`. The one permitted G-only test correction removed the first run's verified selector/timing defects, but the rerun still had one real runtime/API capability failure and one remaining E2E locator defect. The build is GREEN.
- **Scope:** Only `apps/web/tests/e2e/market-readiness.spec.ts` was modified between the two required command executions. The correction waits for the real municipalities BFF response and loaded locality count before filtering, and scopes the ingest failure assertion away from Next's empty route-announcer alert. No application source, helper, config, API/BFF, Docker, sibling worktree, interception/stub, reset/discard, commit, push, lifecycle, review command, or broad suite was used.

#### Exact bounded evidence

| Evidence | Command / exact result |
|---|---|
| Required Playwright command, initial attempt | `$env:PLAYWRIGHT_BASE_URL=$null; $env:PLAYWRIGHT_API_PORT=$null; $env:PLAYWRIGHT_WEB_PORT=$null; $env:AGRONAUTAS_API_INTERNAL_URL=$null; pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=desktop --project=mobile` — managed real API/web harness started; `Running 14 tests using 1 worker`; **10 passed, 2 failed, 2 did not run**. Desktop municipality overview failed because the UI remained `Cargando…` before the filter empty-state assertion; mobile ingest failed because generic `getByRole('alert')` matched both the application error and Next's empty `__next-route-announcer__`. The runner output ended with the existing `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "playwright" not found` wrapper footer after test execution. |
| Permitted G-only correction | `market-readiness.spec.ts` now waits for `/api/hydrology/municipalities` and `\d+ localidades` before applying the filter, and uses a scoped ingest alert locator instead of the ambiguous generic alert collection. No production behavior was changed. |
| Required Playwright command, one permitted rerun | Same exact command/prelude after the G spec correction — managed real API/web harness started; **8 passed, 2 failed, 4 did not run**. Desktop: `2 passed, 1 failed, 4 did not run`; mobile: `6 passed, 1 failed, 0 did not run`. The desktop workspace test timed out waiting 10 seconds for `/api/agronautas/v1/runtime`; the page rendered `Backend Agronautas no disponible` with `request_aborted`. The mobile ingest test timed out after 15 seconds because the refined accessible-name locator did not observe the application error, although the final snapshot contained `#hydrology-ingest-error` and `Reintentar verificación`; no further rerun is permitted. The runner again ended with the existing `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "playwright" not found` wrapper footer after test execution. |
| Managed harness / warnings | Both executions started the config-managed API/web harness and real browser traffic. No `config.webServer` readiness timeout occurred. Command output contained only the existing Node `punycode` deprecation and PostgreSQL SSL-mode warnings before the test failures. |
| Required build | `pnpm --dir apps/web build` — **exit 0**; Next compiled successfully in `12.5s`, type checking completed, static generation completed `8/8`, and route optimization completed. Non-blocking warnings: unused `React` in `src/app/municipalities/ingest/page.test.tsx`; unused `useRef` and `AGRONAUTAS_ACCESS_STATE_VALUES`/`AGRONAUTAS_CAPABILITY_STATE_VALUES` values in `src/components/agronautas/workspace.tsx`. |

#### Per-route/project result matrix

| Route | Desktop | Mobile | Evidence boundary |
|---|---|---|---|
| `/` | Passed | Passed | Navigation and one-main/Risk Engine keyboard contract passed; no BFF request expected. |
| `/probar-demo` | Passed | Passed | Keyboard validation passed; no lead POST expected or claimed. |
| `/demo` | Failed | Passed | Desktop had no observed `/api/agronautas/v1/runtime` response within 10s and rendered the real unavailable boundary; mobile runtime assertion passed. |
| `/demo/fields/field-demo-1` | Not run after serial desktop failure | Passed | Mobile field BFF/capability contract passed. |
| `/municipalities` | Not run after serial desktop failure | Passed | Mobile real filter/empty-state contract passed after the wait correction. |
| `/municipalities/ituzaingo` | Not run after serial desktop failure | Passed | Mobile navigation/sticky-summary contract passed. |
| `/municipalities/ingest` | Not run after serial desktop failure | Failed | Mobile DOM contained the real authorization error and retry button, but the remaining test locator did not match it; verification BFF assertion was not reached. |

Numeric HTTP statuses were validated by `MarketReadinessPage` for routes that reached `assertApiResponse`, but the current list reporter did not materialize the attached network JSON into standalone files, so no exact numeric status is claimed here beyond the observed response/no-response facts above. The helper's `finally` path requested route screenshots, console JSON, page-error JSON, and filtered document/API network JSON for every executed test; no standalone PNG/JSON attachments were materialized under the corresponding `apps/web/test-results` directories. Playwright failure snapshots are available at:

- `apps/web/test-results/market-readiness-Agronauta-0646e-ized-and-unavailable-states-desktop/error-context.md`
- `apps/web/test-results/market-readiness-Agronauta-978c1--real-verification-boundary-mobile/error-context.md`
- Initial-attempt selector/timing snapshot retained at `apps/web/test-results/market-readiness-Agronauta-0a81f-truthful-empty-filter-state-desktop/error-context.md`

#### TDD Cycle Evidence — G acceptance

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-real-browser-acceptance | `apps/web/tests/e2e/market-readiness.spec.ts` + `market-readiness-page.ts` | E2E | ✅ Existing F viewport coverage and managed harness | ✅ Initial run exposed municipalities readiness timing and ingest alert-selector defects | ❌ Rerun: 8/14 passed; desktop runtime response was not observed and mobile ingest locator remained unmatched | ✅ Public/demo/field/municipality/detail routes passed where executed; real unavailable `/demo` boundary was preserved; no stub/interception | ✅ One permitted G-only spec correction; no further rerun after the remaining runtime/locator blockers |
| G-web-build | Existing application source, required build | Type-check/build | ✅ Previous build blockers repaired before this run | N/A — required post-Playwright build | ✅ Exit 0; compile, type check, static generation, and optimization completed | ✅ Existing warning-only lint output did not block build | ➖ No application change in this G acceptance attempt |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required full command executed twice total with the four process-local overrides cleared before each run. Initial: 10/14 pass, 2 fail, 2 not run. One permitted G spec correction rerun: 8/14 pass, 2 fail, 4 not run; desktop 2/7 pass, 1 fail, 4 not run; mobile 6/7 pass, 1 fail. |
| Runtime harness command/scenario and exact result | Real managed API/web harness and real browser traffic, no `page.route`, no stubs. `/demo` desktop remained blocked by no runtime BFF response and rendered `request_aborted`; mobile ingest remained blocked by the E2E locator condition despite the error/retry DOM. |
| Screenshots / console / network evidence | `testInfo.attach` was invoked for each executed route in the helper's `finally` path. The filesystem contains only the three listed failure `error-context.md` snapshots; no standalone screenshot/console/network JSON files were materialized, so clean-console and exact numeric per-route status claims are not made. |
| Rollback boundary | Revert only the two wait/locator changes in `apps/web/tests/e2e/market-readiness.spec.ts` and this cumulative evidence entry; preserve all application source, G helper/config, prior Units A–F evidence, and unrelated worktree edits. |

#### Unit G handoff

- G remains unchecked in `tasks.md`; the completion rule requires all 14 desktop/mobile tests and the build to pass, which was not met.
- Remaining blockers are separately classified: **real runtime/API capability** — desktop `/demo` did not produce `/api/agronautas/v1/runtime` within 10 seconds and rendered `request_aborted`; **test selector defect** — mobile ingest's accessible-name alert locator did not match the rendered `#hydrology-ingest-error`, with no further rerun allowed in this attempt.
- The required build is GREEN with warning-only lint output. External provider/auth/tenant/lead/authorized-ingest proof remains blocked/unknown and unclaimed; local demo/real unavailable states are not production proof.

### Completed bounded Unit G field-detail test-harness lifecycle repair and targeted mobile verification — 2026-08-29

- **Work unit:** G — repair only the Agronautas field-detail direct-test JSDOM lifecycle, then run the explicitly targeted real mobile field-detail acceptance check.
- **Status:** GREEN for the five-test direct field-detail safety net and the targeted mobile scenario. G remains unchecked in `tasks.md`; this is not full 14-route/project acceptance.
- **Scope:** Changed only `apps/web/src/components/agronautas/field-detail.test.tsx` for the harness repair and this cumulative progress artifact for evidence. `field-detail.tsx`, the G helper/spec, Playwright config, API/BFF, sibling marketplace/management worktree, and all unrelated edits were preserved.
- **Repair:** Mirrored the proven page-client harness: pure RTL import, `beforeEach` JSDOM creation/tracking, temporary-global snapshot, and async `afterEach` cleanup, one `setImmediate` settle point, window closure, and global restoration. All five existing assertions and fixtures remain intact; no force-exit or timeout workaround was added.
- **Environment:** `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_PORT`, `PLAYWRIGHT_WEB_PORT`, and `AGRONAUTAS_API_INTERNAL_URL` were cleared only in each command process and were not persisted.

#### TDD Cycle Evidence — field-detail harness lifecycle repair

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-field-detail-harness | `apps/web/src/components/agronautas/field-detail.test.tsx` | Component/JSDOM boundary | ✅ Pre-repair direct run 5/5 | ⚠️ Historical lifecycle timeout was proven, but the required pre-edit execution completed 5/5 in this process; no new assertion was written because this was a harness-only repair | ✅ Post-repair direct run 5/5 | ✅ Five existing decision, recompute, unavailable-geometry, section-index, and unavailable-index scenarios | ✅ Centralized pure-RTL teardown with tracked window closure and temporary-global restoration |

#### Exact bounded test and runtime evidence

| Test File / Command | Exact result |
|---|---|
| `field-detail.test.tsx` — `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/field-detail.test.tsx` (90-second external timeout, pre-repair safety net) | Exit 0; `tests 5`, `pass 5`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 35329.0636`. |
| `field-detail.test.tsx` — same exact command (90-second external timeout, post-repair) | Exit 0; `tests 5`, `pass 5`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 10466.4959`. |
| Playwright CLI — `pnpm --dir apps/web exec playwright --version` | Exit 0; `Version 1.60.0`. |
| Targeted mobile acceptance — `pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=mobile --grep "field detail preserves"` (180-second external timeout) | Exit 0; `Running 1 test using 1 worker`; `1 passed`; the field-detail scenario passed in `23.7s`; process summary `1 passed (1.5m)`. The managed API harness emitted only the existing `punycode` deprecation and PostgreSQL SSL-mode warnings. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Post-repair direct command — exit 0; 5/5 tests passed, 0 failures, 0 cancellations, 0 skips, 0 todos. |
| Runtime harness command/scenario and exact result | Targeted real mobile Playwright command — exit 0; 1/1 `field detail preserves evidence and explicit capability limits` passed through the managed local API/web harness, with no `page.route` or fake data. No timeout occurred before the assertion. |
| Attachments/status | No standalone files were materialized under `apps/web/test-results` after the passing targeted run; no screenshot, console JSON, or network JSON attachment is claimed. The command-level warnings are recorded above. |
| Rollback boundary | Revert only the lifecycle changes in `apps/web/src/components/agronautas/field-detail.test.tsx` and this cumulative evidence entry; preserve its five assertions/fixtures, the existing `<h2>` heading repair, all prior Unit A–F/G evidence, G's unchecked task state, and unrelated working-tree edits. |

#### Unit G handoff

- G remains unchecked in `tasks.md`; the targeted field-detail mobile check is green, but full 14-route desktop/mobile acceptance and separate production/provider/auth/tenant/lead/ingest proof remain unclaimed.
- The direct field-detail test now uses the deterministic lifecycle pattern already proven by `page-client.test.tsx`; no production source or G helper/spec change was made.

### Bounded Unit G duplicate field-detail heading repair attempt — 2026-08-29

- **Work unit:** G — correct only the duplicate mobile field-detail level-1 heading while preserving the ProductShell page heading, text, styling, focus/layout, and no-overflow behavior.
- **Status:** Blocked/not GREEN. The direct field-detail safety net reached its explicit 50-second Node test timeout with zero completed assertions, and the mobile no-stub Playwright check reached the test's 60-second timeout before the heading selector assertion ran. G remains unchecked in `tasks.md`; no G helper/spec correction was justified because the selector was not reached and no API response failure was observed.
- **Scope:** Changed only `apps/web/src/components/agronautas/field-detail.tsx` and the directly affected expectation in `apps/web/src/components/agronautas/field-detail.test.tsx`. The G helper/spec, API/BFF, timeout values, sibling marketplace/management worktree, Docker, reset/discard, commits, pushes, lifecycle, review commands, and broad tests were not touched.
- **Implementation:** The detail-card heading changed from `<h1>` to `<h2>` with identical text and className. The direct test now expects exactly one level-1 `Detalle del lote` heading and exactly one level-2 heading with the same text, proving the intended hierarchy when the safety net can complete.

#### TDD Cycle Evidence — heading hierarchy repair attempt

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-field-detail-heading-hierarchy | `apps/web/src/components/agronautas/field-detail.test.tsx` | Component/E2E boundary | ✅ Existing duplicate-heading assertion identified the real defect | ✅ Updated the hierarchy assertion before the production heading change; no separate RED execution was run | ❌ Direct test timed out before completing assertions; Playwright timed out before the heading assertion | ❌ No selector assertion or browser API response was reached in the bounded attempt | ➖ None; the source change is the minimum semantic heading correction |

#### Exact bounded test evidence

| Test File / Command | Exact result |
|---|---|
| `field-detail.test.tsx` — `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/field-detail.test.tsx` (90-second external timeout) | Exit failure; file-level Node test timed out at `50,000 ms`; TAP reported `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`, `todo 0`; `duration_ms 50138.795`. No assertion completed. |
| `market-readiness.spec.ts` — `pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=mobile --grep "field detail preserves"` (180-second external timeout) | Exit failure; one mobile test launched the managed harness but exceeded the test's configured `60,000 ms` timeout in `MarketReadinessPage.goto` at `market-readiness-page.ts:41` (`page.waitForTimeout: Target page, context or browser has been closed`). The heading selector assertion did not run. Output also ended with the existing `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "playwright" not found` wrapper message. No API response status was observed in the command output. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required direct command failed at the internal 50-second Node timeout with `0` completed, `0` passed, `0` failed assertions, and `1` cancelled file subtest; heading hierarchy is not GREEN evidence. |
| Runtime harness command/scenario and exact result | Required mobile no-stub Playwright command launched the managed harness, then failed at the test's 60-second navigation timeout before `assertCommonRouteContract` or the heading selector; no `page.route` or stub was used, and no runtime/API failure status was observed. Per bounded stop rule, no rerun or selector edit was made. |
| Rollback boundary | Revert only the `<h2>`→`<h1>` tag change in `apps/web/src/components/agronautas/field-detail.tsx` and the two heading-count expectations in `apps/web/src/components/agronautas/field-detail.test.tsx`; preserve identical text/classes, ProductShell's page `<h1>`, all prior Unit A–F work, G helper/spec/config, and unrelated worktree edits. |

#### Unit G handoff

- G remains unchecked in `tasks.md`; do not claim the duplicate-heading fix or 14-route acceptance as verified because both required bounded checks failed before completing their assertions.
- No G helper/spec change was made: the mobile heading selector was not reached, so a selector collision was not demonstrated in this attempt.
- The next authorized action must resolve/retry the direct React/JSDOM and managed Playwright timeout under the same bounded rules before any further source or selector changes. External provider/auth/tenant/lead/ingest proof remains separate and unclaimed.

### Bounded Unit G verification attempt — 2026-08-29 — Playwright capability blocked

- **Work unit:** G — required real no-stub Playwright acceptance plus the required web build confirmation.
- **Status:** Blocked by the local Playwright execution capability, not by a selector/assertion failure. The exact Playwright command was attempted once and did not discover or execute any tests; G remains unchecked in `tasks.md`. No G test/config correction was made because no test assertion ran.
- **Scope guard:** Only this cumulative progress artifact was updated. No application source, G test file, Playwright config, sibling marketplace/management worktree, Docker, page interception, stubs, reset/discard, commit, push, lifecycle, review command, or broad suite was used.

#### Exact bounded evidence

| Evidence | Command / exact result |
|---|---|
| Required Playwright command | `pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=desktop --project=mobile` — process failure; Playwright did not execute tests. Exact output included `Timed out waiting 120000ms from config.webServer` followed by `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "playwright" not found` / `Did you mean "pnpm exec playwright"?`. No selector or assertion failure occurred, and no rerun was made. |
| Runtime harness | Blocked before browser startup/test discovery: the managed API harness emitted the existing Node `punycode` deprecation warning, then the config web-server wait expired at 120,000 ms. |
| Screenshots / console / network | No Playwright test attachments were created because zero tests executed. No browser console or browser network events were captured; the only command-level console evidence was the API harness `punycode` deprecation warning and the webServer/Playwright failure above. |
| Per-route status | `/`, `/probar-demo`, `/demo`, `/demo/fields/field-demo-1`, `/municipalities`, `/municipalities/ituzaingo`, and `/municipalities/ingest`: **N/A — no route was navigated and no HTTP response was observed**. |
| Required build | `pnpm --dir apps/web build` — **exit 0**; Next compiled successfully in `16.4s`, type checking completed, static generation completed `8/8`, and route optimization completed. Non-blocking warnings: unused `React` in `src/app/municipalities/ingest/page.test.tsx`; unused `useRef` and const values in `src/components/agronautas/workspace.tsx`. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required Playwright command failed before test discovery because the local `playwright` executable was unavailable and the managed webServer wait expired; `0/14` tests executed, `0` passed, `0` failed assertions, `14` not run by test execution. No selector/harness assertion correction was authorized or needed. |
| Runtime harness command/scenario and exact result | **Blocked/N/A:** the configured local API/web harness did not reach a runnable Playwright test process; therefore no real browser route scenario exists to claim. |
| Rollback boundary | Remove only this verification entry from `openspec/changes/agronautas-uiux-market-readiness/apply-progress.md`; preserve all prior Unit A–F evidence, G files/config, unchecked G task state, and unrelated working-tree edits. |

#### Unit G handoff

- G remains unchecked. The required 14-test desktop/mobile browser acceptance is unresolved because the local Playwright executable/harness did not start; no application defect was proven in this attempt.
- The required web build is GREEN (exit 0), with only the warnings recorded above.
- Do not claim screenshots, browser console/network evidence, or per-route HTTP statuses for this attempt; all seven route statuses are N/A because no browser test executed.
- External provider/auth/tenant/lead/ingest proof remains separate, blocked/unknown, and unclaimed.

### Completed bounded Unit G Copilot response completion typing repair — 2026-08-29

- **Work unit:** G — type-safe completion-state access in `apps/web/src/lib/visibility/view-models.ts` only.
- **Status:** The exact web type blocker is repaired; the direct view-model test and required web build are GREEN. Unit G remains unchecked in `tasks.md`; the full no-stub Playwright acceptance was not run.
- **Scope:** Only `apps/web/src/lib/visibility/view-models.ts` was changed for implementation. The direct test was unchanged because its existing stream-completion and canonical empty/no-citation/unverified assertions already cover the required behavior. No sibling marketplace/management worktree, reset/discard, commit, push, lifecycle/review command, broad test, or full Playwright suite was used.
- **Implementation:** `normalizeCopilotResponse` now obtains the optional stream `done` value through a type-safe runtime normalization helper over the existing `CopilotResponseInput` boundary, then reuses that normalized value for transport selection and stream-loading semantics. No input type weakening or `any` was introduced; HTTP 200 empty, citation-free, and unverified output remains non-actionable.

#### TDD Cycle Evidence — Unit G completion typing repair

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-view-model-completion-typing | `apps/web/src/lib/visibility/view-models.test.ts` | Unit/type-check boundary | ✅ Existing 9/9 direct tests | ✅ Existing web-build error at `view-models.ts:209:78` exposed the invalid access; no assertion change was needed | ✅ Direct test 9/9 and web build completed successfully | ✅ Existing stream `done:false` loading, empty stream, citation-free, unverified, and grounded paths remained covered | ✅ Local `normalizeDone` helper uses `unknown` narrowing through the existing record adapter; no type weakening |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `view-models.test.ts` | `pnpm --dir apps/web exec node --import tsx --test src/lib/visibility/view-models.test.ts` with 60-second external timeout | Exit 0; `tests 9`, `pass 9`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 685.5282`. |
| web build | `pnpm --dir apps/web build` with 240-second timeout | Exit 0; Next compiled successfully in `10.5s`, type checking completed, static generation completed `8/8`, and route optimization completed. Non-blocking existing warnings remained for unused `React` in `src/app/municipalities/ingest/page.test.tsx` and unused `useRef`/const values in `src/components/agronautas/workspace.tsx`. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/lib/visibility/view-models.test.ts` — exit 0; 9/9 pass, 0 failures/cancellations/skips/todos. |
| Runtime harness command/scenario and exact result | N/A — this is a pure view-model/type-boundary repair; the user prohibited servers, runtime smoke, broad tests, and full Playwright. Existing direct fixtures exercise stream completion and canonical non-actionable states. |
| Rollback boundary | Revert only the `normalizeDone` helper and its two call-site substitutions in `apps/web/src/lib/visibility/view-models.ts`; preserve all prior Unit A–F behavior, canonical Copilot normalization, tests, and unrelated working-tree edits. |

#### Unit G handoff

- G remains unchecked in `tasks.md`; do not claim full acceptance. The required bounded direct test and web build now pass, but the full no-stub Playwright command remains deferred by instruction.
- No unrelated build error was exposed; only the existing non-blocking lint warnings listed above remain.
- External provider/auth/tenant/lead/ingest proof remains separate and unclaimed.

### Bounded Unit G freshness comparison type repair — 2026-08-29

- **Work unit:** G — repair only the invalid freshness/status comparison in `apps/web/src/components/government/overview.tsx`.
- **Status:** The overview type error is repaired and its direct test remains GREEN. The required web build advanced past `overview.tsx` and stopped at a new unrelated type error in `apps/web/src/lib/visibility/chat.ts:29:18`; no unrelated file was changed. Unit G remains unchecked in `tasks.md`; the full no-stub Playwright suite was not rerun.
- **Scope:** Changed only `apps/web/src/components/government/overview.tsx` in the source tree. The `observedTelemetry` and `hasMissing` predicates now use the existing canonical `value != null`/`value == null` representation for missing telemetry and no longer compare the `freshness` union against the invalid `'missing'` value. Fresh/stale/degraded handling, threshold calculation, and operator summary rendering remain unchanged and truthful. No sibling marketplace/management worktree, test source, Playwright, broad test, commit, push, lifecycle, or review command was used.
- **TDD note:** This is a type-only comparison repair with no intended runtime behavior change; the existing overview safety net was executed before and after the source change. The compiler failure was the RED acceptance signal, so no test assertion or test file change was necessary.

#### TDD Cycle Evidence — freshness comparison repair

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-overview-freshness-typing | `apps/web/src/components/government/overview.test.tsx` | Component/type-check boundary | ✅ 6/6 before edit | N/A — existing web-build compiler error was the failing acceptance signal for this type-only repair | ✅ Final focused run 6/6; final build advanced past `overview.tsx:58` | ✅ Existing populated, empty, error, landmark, and live-region paths remained covered | ➖ None needed; only canonical null-value predicates were retained |

#### Exact bounded test/build evidence

| Test File / Command | Exact result |
|---|---|
| `overview.test.tsx` — `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/overview.test.tsx` (safety net) | Exit 0; `tests 6`, `pass 6`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 15899.6768`. |
| `overview.test.tsx` — same exact command after the comparison repair | Exit 0; `tests 6`, `pass 6`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 5664.4805`. |
| `pnpm --dir apps/web build` — required post-change build | Exit failure after Next compiled successfully in `9.9s`; type checking advanced past `overview.tsx` and stopped at unrelated `./src/lib/visibility/chat.ts:29:18`: `ChatViewModel` cannot simultaneously extend `ChatStreamState` and `Pick<CopilotViewModel, "outcome" | "actionable" | "unverifiedClaims">` because `actionable` declarations are not identical. Per scope, execution stopped and no chat source was changed. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required direct overview command completed with exit 0 and 6/6 tests passing; no failures, cancellations, skips, or todos. |
| Runtime harness command/scenario and exact result | N/A — this is a type-only predicate repair; the user prohibited servers, Playwright, and broad runtime suites. Existing direct component tests exercised populated, empty, error, landmark, and live-region behavior. |
| Rollback boundary | Revert only the two canonical null-value predicate edits in `apps/web/src/components/government/overview.tsx`; preserve all summary/status rendering, prior Units A–F work, detail ref repair, and unrelated working-tree edits. |

#### Unit G handoff

- The invalid `freshness !== 'missing'` and `freshness === 'missing'` comparisons are removed without widening the freshness union or changing Unit D/E output semantics.
- G remains unchecked. Do not claim full acceptance: the required web build is now blocked by the unrelated `apps/web/src/lib/visibility/chat.ts:29:18` type conflict, and the full no-stub Playwright command remains deferred.
- Remaining G blocker/risk: resolve the exact `ChatViewModel`/`ChatStreamState` `actionable` type conflict in a separately authorized slice, then rerun the full no-stub command for all 14 desktop/mobile route cases. External provider/auth/tenant/lead/ingest proof remains separate and unclaimed.

### Bounded Unit G build-blocker ref typing repair — 2026-08-29

- **Work unit:** G — repair only the TypeScript ref typing/assignment that blocked the web build in `government/detail.tsx`.
- **Status:** The requested ref blocker is repaired and the allowed detail component regression test remains GREEN. The subsequent build advanced past `government/detail.tsx` and stopped on a new unrelated type error in `apps/web/src/components/government/overview.tsx:58:78`; no unrelated file was changed. Unit G remains unchecked in `tasks.md`; the full no-stub Playwright suite was not rerun.
- **Scope:** Changed only `apps/web/src/components/government/detail.tsx` in the source tree. `messageInputRef` now uses the input element ref type with a null runtime initializer, and `CopilotPanel.inputRef` uses the matching `React.RefObject<HTMLInputElement>` contract. Focus-on-invalid-submit behavior, input semantics, and UI output are unchanged. No sibling marketplace/management worktree, test source, Playwright, broad test, commit, push, lifecycle, or review command was used.
- **TDD note:** This is a type-only assignment repair with no new runtime behavior; the existing detail safety net was executed before and after the source change. The compiler failure was the RED acceptance signal, so no test assertion or test file change was necessary.

#### TDD Cycle Evidence — ref typing repair

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-detail-ref-typing | `apps/web/src/components/government/detail.test.tsx` | Component/type-check boundary | ✅ 14/14 before edit | N/A — existing web-build compiler error was the failing acceptance signal for this type-only repair | ✅ Final focused run 14/14; final build advanced past `detail.tsx:281` | ✅ Existing invalid-submit focus path and all detail states remained covered | ➖ None needed; only matching ref annotations were changed |

#### Exact bounded test/build evidence

| Test File / Command | Exact result |
|---|---|
| `detail.test.tsx` — `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/detail.test.tsx` (safety net) | Exit 0; `tests 14`, `pass 14`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 9527.8195`. Existing non-fatal JSDOM/React `activeElement.attachEvent` diagnostic appeared during the focus assertion. |
| `detail.test.tsx` — same exact command after the ref repair | Exit 0; `tests 14`, `pass 14`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 33801.3839`. The same non-fatal `activeElement.attachEvent` diagnostic appeared; no assertion failed and no rerun was needed for an assertion failure. |
| `pnpm --dir apps/web build` — first post-initial-ref edit | Exit failure; Next compiled successfully, then still reported the `RefObject<HTMLInputElement | null>` assignment at `./src/components/government/detail.tsx:281:19`, identifying the remaining `CopilotPanel.inputRef` prop annotation. |
| `pnpm --dir apps/web build` — final after matching the prop annotation | Exit failure after Next compiled successfully in `17.2s`; the ref error was cleared, then type checking stopped at the unrelated `./src/components/government/overview.tsx:58:78`: comparing `item.freshness` (`'fresh' | 'stale' | 'degraded' | undefined`) with `'missing'`. Per scope, no fix was made and execution stopped. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required detail command completed with exit 0 and 14/14 tests passing; no failures, cancellations, skips, or todos. |
| Runtime harness command/scenario and exact result | N/A — this is a type-only ref contract repair; the user prohibited servers, Playwright, and broad runtime suites. Existing direct component tests exercised the preserved invalid-submit focus behavior. |
| Rollback boundary | Revert only the two ref type annotations in `apps/web/src/components/government/detail.tsx`; preserve all other government behavior, test harness repairs, cumulative Units A–F work, and unrelated working-tree edits. |

#### Unit G handoff

- The exact `detail.tsx:281` `RefObject<HTMLInputElement | null>` assignment error is resolved within the authorized source file, with focus behavior preserved.
- G remains unchecked. Do not claim full acceptance: the final web build is blocked by the unrelated `apps/web/src/components/government/overview.tsx:58:78` type error, and the required full no-stub Playwright command remains deferred.
- Remaining G blockers/risks: resolve `overview.tsx:58:78` in a separately authorized slice, then rerun the full no-stub command for all 14 desktop/mobile route cases. The existing JSDOM `activeElement.attachEvent` output remains non-fatal.

### Bounded Unit G blocker repair — landing landmark and workspace index-signature access — 2026-08-29

- **Work unit:** Repair the two verified G blockers only: the public landing landmark defect and the workspace TypeScript index-signature access failure.
- **Status:** Both allowed blocker repairs are implemented and their direct tests pass. The required web build remains blocked by a separate pre-existing type error in `apps/web/src/components/government/detail.tsx`, which is outside the allowed source perimeter. Unit G remains unchecked in `tasks.md`; the full no-stub Playwright suite was intentionally not rerun.
- **Scope:** Changed only `apps/web/src/components/landing/homepage.tsx`, `apps/web/src/components/landing/homepage.test.tsx`, and `apps/web/src/components/agronautas/workspace.tsx`. No Playwright G file, sibling marketplace/management worktree, Docker, broad suite, commit, push, lifecycle, or review command was touched.
- **Implementation:** Added one semantic `<main>` around the existing public landing content, with no nested app-layout main. Added the smallest direct static assertion that the rendered landing exposes exactly one `<main>`. Converted the workspace `validationErrors` and `errors` accesses from dot notation to bracket notation wherever the current `Record<string, string>` type is read or written, preserving validation and rendering behavior while satisfying `noPropertyAccessFromIndexSignature`.

#### TDD Cycle Evidence — blocker repair

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-landing-main-landmark | `apps/web/src/components/landing/homepage.test.tsx` | Component/static render | ✅ 8/8 before new assertion | ✅ 9 tests, 8 pass and the new exact-one-main assertion failed with `0 !== 1` | ✅ 9/9 pass after the single `<main>` wrapper | ✅ Existing landing render, CTA, unavailable-copy, roadmap, and exact-one-main scenarios | ➖ None needed; the wrapper is the minimum semantic fix |
| G-workspace-index-signature | `apps/web/src/components/agronautas/workspace-intake.test.tsx` | Component/integration boundary | ✅ 11/11 before repair | N/A — no new behavior assertion was needed; the compiler error was the failing acceptance signal | ✅ 11/11 pass after bracket-notation repair | ✅ Existing intake validation, submission, pagination, capability, and recovery paths | ➖ None needed; access syntax only, no UI/validation logic change |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `homepage.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/landing/homepage.test.tsx` | Safety net exit 0; `tests 8`, `pass 8`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 29016.5716`. |
| `homepage.test.tsx` | Same command after the RED assertion | RED exit failure; `tests 9`, `pass 8`, `fail 1`, `cancelled 0`, `skipped 0`; exact failure was `landing exposes exactly one main landmark`, expected `1`, actual `0`. |
| `homepage.test.tsx` | Same command after the landing wrapper | GREEN exit 0; `tests 9`, `pass 9`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 5897.5543`. |
| `workspace-intake.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/workspace-intake.test.tsx` | Final exit 0; `tests 11`, `pass 11`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 23849.9074` after the first workspace syntax repair, and `duration_ms 9778.9138` after the remaining same-type `errors[...]` repair. The existing non-fatal JSDOM `activeElement.attachEvent` diagnostic was emitted during focus testing. |
| web build | `pnpm --dir apps/web build` | First post-repair run advanced past `workspace.tsx:317` but failed on the same index-signature family at `workspace.tsx:320`; after all workspace `validationErrors` accesses were bracketed, the next run advanced past workspace type checking and failed at `./src/components/government/detail.tsx:281:19`: `Type 'RefObject<HTMLInputElement | null>' is not assignable to type 'LegacyRef<HTMLInputElement> | undefined'`. This file is outside the allowed source perimeter; no repair was made. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Landing final: exit 0, 9/9 pass. Workspace final: exit 0, 11/11 pass. No broad test script was run. |
| Runtime harness command/scenario and exact result | N/A for this bounded source/type repair; direct component tests were the permitted runtime boundary. The G Playwright acceptance command was explicitly deferred until the separate build blocker is resolved. |
| Rollback boundary | Revert only the `<main>` wrapper and one landing landmark assertion in the two landing files, plus the bracket-notation-only changes in `workspace.tsx`; preserve all prior Unit A–F work, existing UI behavior, current test harness repairs, and unrelated working-tree edits. |

#### Unit G handoff

- The public landing now renders exactly one `<main>` in the direct static contract; no nested app-layout main was introduced.
- The workspace index-signature errors reachable from the current `Record<string, string>` validation map were converted to bracket access without changing behavior.
- G remains unchecked. Do not claim full acceptance: the required Playwright command was not rerun, and the web build is still blocked by the unrelated `government/detail.tsx:281:19` ref typing error.
- Remaining G blockers/risks: resolve that out-of-perimeter build error in an authorized follow-up, then rerun the full no-stub command for all 14 desktop/mobile route cases. The existing JSDOM `activeElement.attachEvent` output is non-fatal and did not fail either focused suite.

### Completed bounded Unit F sticky status summary implementation — 2026-08-28

- **Work unit:** F — municipality detail sticky status summary, limited to the existing summary/index/detail boundary.
- **Status:** GREEN for the sticky summary implementation and direct component contract; Unit F remains unchecked because authorized viewport evidence at desktop and 390px is still required.
- **Scope:** Only `apps/web/src/components/government/detail.tsx` was changed in this implementation pass. The existing RED assertions in `detail.test.tsx` and this cumulative progress artifact were preserved/updated. No sibling marketplace/management worktree, other source, API/BFF behavior, server, Playwright, broad test, commit, push, lifecycle, or review command was used.
- **Implementation:** Added a compact, responsive, non-interactive sticky `Estado resumido municipal` region immediately before the existing municipality section index. It renders `Estado`, `Frescura`, `Umbral`, `Confianza`, and `Próxima acción segura` in deterministic order from the existing `createMunicipalityOperatorSummary` adapter. The page now clips viewport-level horizontal overflow, bounds long summary values, and increases detail target scroll margins from `scroll-mt-24` to `scroll-mt-32` so sticky content does not occlude focused sections. Existing Unit D/E behavior, copy, API props, and links remain unchanged.

#### TDD Cycle Evidence — sticky status summary implementation

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| F-municipality-sticky-summary | `apps/web/src/components/government/detail.test.tsx` | Component | ✅ Existing cumulative detail contract 13/13 | ✅ Required run: 14 tests, 12 pass, 2 intended failures because the new region rendered labels without the expected colon-separated contract | ✅ One permitted rerun: 14/14 pass, 0 fail/cancelled/skipped | ✅ Populated and empty-data paths; all five summary values/action and non-interactive descendant contract | ✅ Reused one computed `createMunicipalityOperatorSummary` result for both summary views; bounded sticky/focus layout without changing status logic |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/detail.test.tsx` | First required run after the sticky implementation: exit failure from the two intended RED assertions; `tests 14`, `pass 12`, `fail 2`, `cancelled 0`, `skipped 0`; file completed normally in `37,819.9926 ms` (the file-level subtest was not cancelled by timeout). |
| `detail.test.tsx` | Same exact command after the assertion-contract correction | Exit 0; `tests 14`, `pass 14`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 10928.4602`; normal completion within the 90-second external timeout. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Exact direct detail command above; final exit 0 with 14/14 tests passing and no failures, cancellations, skips, or todos. The preceding 14-test RED run had exactly the two intended summary-contract failures and completed in about 34–38 seconds; it was not a timeout. |
| Runtime harness command/scenario and exact result | N/A — this bounded component slice explicitly prohibits servers, runtime smoke, Playwright, and broad suites; viewport overflow/focus-occlusion proof remains deferred to the authorized F/G browser lane. |
| Rollback boundary | Revert only the `MunicipalityStickySummaryPanel`, shared `operatorSummary` computation, `overflow-x-hidden` main boundary, and `scroll-mt-32` detail target adjustments in `apps/web/src/components/government/detail.tsx`; preserve existing Unit D/E status/copy, summary adapter, section links, API props, tests, cumulative Units A–E, and unrelated worktree edits. |

#### Unit F handoff

- Unit F remains unchecked in `tasks.md` by instruction; viewport evidence at `1440x900` and `390x844` is still required to prove no horizontal overflow and no sticky/focus occlusion.
- The direct municipality detail contract is now GREEN at 14/14. The non-fatal JSDOM `activeElement.attachEvent` diagnostic still appears during the existing focus assertion and does not fail or cancel the suite.
- Unit G remains pending (historical handoff): real no-stub Playwright acceptance and production-boundary evidence.

### Completed Unit G full real no-stub acceptance and web build — 2026-08-29

- **Work unit:** G — required desktop/mobile market-readiness Playwright acceptance followed by the required web build.
- **Status:** Complete. All 14 browser tests passed across the configured desktop and mobile projects, and the required web build passed. G is marked `[x]` in `tasks.md`.
- **Scope:** Verification only after the proven targeted ingest locator correction and field-detail lifecycle correction. No source or G test correction was needed in this run; no sibling worktree/process, Docker, interception, stubs, reset/discard, commit, push, lifecycle, review command, or unrelated suite was used.
- **Environment:** The process-local `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_PORT`, `PLAYWRIGHT_WEB_PORT`, and `AGRONAUTAS_API_INTERNAL_URL` variables were cleared immediately before the exact Playwright command. The existing config-managed API/web harness started and real browser traffic was used.

#### Exact bounded evidence

| Evidence | Command / exact result |
|---|---|
| Required Playwright acceptance | `pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=desktop --project=mobile` — exit 0; `Running 14 tests using 1 worker`; desktop 7/7 passed; mobile 7/7 passed; total 14/14 passed, 0 failed, 0 skipped, 0 not-run; total runtime `3.2m`. |
| Desktop route/project results | `/` 1/1; `/probar-demo` 1/1; `/demo` 1/1; `/demo/fields/field-demo-1` 1/1; `/municipalities` 1/1; `/municipalities/ituzaingo` 1/1; `/municipalities/ingest` 1/1. |
| Mobile route/project results | `/` 1/1; `/probar-demo` 1/1; `/demo` 1/1; `/demo/fields/field-demo-1` 1/1; `/municipalities` 1/1; `/municipalities/ituzaingo` 1/1; `/municipalities/ingest` 1/1. |
| Browser assertions | Every executed route passed the one-`main`, no-horizontal-overflow, no-page-error, keyboard/focus/error, and required real BFF response assertions applicable to that scenario. No selector/test-only failure occurred, so no rerun was authorized or needed. |
| Screenshots / console / network | `MarketReadinessPage.attachEvidence()` executed in every test `finally` path, requesting full-page PNG plus console, filtered document/API network, and page-error JSON attachments for all 14 cases. The configured list reporter did not materialize standalone attachment files under `apps/web/test-results`; therefore this artifact claims attachment capture was invoked, but does not claim independently retrievable PNG/JSON files or a clean-console result beyond the command output. |
| Route statuses | Real response status assertions passed for the required BFF paths: `/api/agronautas/v1/runtime`, `/api/agronautas/v1/fields/field-demo-1`, `/api/hydrology/municipalities`, `/api/hydrology/municipalities/ituzaingo/dashboard`, and `/api/hydrology/ingest/verify`. The helper accepted only the declared contract status set. Exact numeric per-route statuses were not printed by the list reporter and no unsupported numeric value is inferred here. |
| Harness warnings | Existing managed API harness output only: Node `punycode` deprecation warning and PostgreSQL SSL-mode compatibility warning. No harness readiness timeout occurred. |
| Required web build | `pnpm --dir apps/web build` — exit 0; Next.js 15.5.19 compiled in `17.8s`; type checking completed; static generation `8/8`; route optimization completed. Warning-only lint output: unused `React` in `src/app/municipalities/ingest/page.test.tsx`; unused `useRef` and type-only const values in `src/components/agronautas/workspace.tsx`. |

#### TDD Cycle Evidence — G acceptance

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-real-browser-acceptance | `apps/web/tests/e2e/market-readiness.spec.ts` + `market-readiness-page.ts` | E2E | ✅ Prior targeted real checks and managed harness | ✅ Prior targeted selector/timing defects were corrected and proven before this full run | ✅ 14/14 across desktop/mobile | ✅ All seven routes per project; real BFF/API responses; no interception/stubs; local unavailable/demo boundaries remain truthful | ✅ No change required in this full run; existing evidence hooks retained |
| G-web-build | Existing application source | Type-check/build | ✅ Prior blocker repairs | N/A — required post-Playwright build | ✅ Compile, type check, static generation, and route optimization passed | ✅ Existing warning-only lint output did not block build | ➖ No source change in this verification run |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Exact required Playwright command — exit 0; desktop 7/7 + mobile 7/7 = 14/14 pass; 0 fail, 0 skipped, 0 not-run. |
| Runtime harness command/scenario and exact result | Existing managed API/web harness with real browser traffic and no `page.route` interception/stubs — all 14 route scenarios passed. Local demo/unavailable behavior was asserted separately from external production/provider/auth/tenant/lead/authorized-ingest proof. |
| Rollback boundary | Revert only the G checkbox and this acceptance evidence entry in the OpenSpec artifacts; preserve all application and E2E implementation files, prior A–F evidence, and unrelated worktree edits. |

#### Evidence boundary

- **Local demo/unavailable:** proved by the managed local harness and route assertions above; `/demo` and capability/ingest boundaries are local runtime evidence only.
- **External production/provider/auth/tenant/lead/authorized ingest:** remains blocked/unknown and unclaimed. The invalid-token ingest path does not prove authorized ingest, and no production or provider claim is inferred from local traffic.

#### Unit G handoff

- G is complete and marked `[x]` in `tasks.md`: the full 14-test desktop/mobile browser acceptance and required web build both passed.
- No selector correction or rerun was needed during this full run; the prior targeted corrections were preserved.
- Next recommended phase: `sdd-verify`, with the attachment-materialization limitation and the separate external proof boundary retained as risks.

### Completed bounded Unit G ingest-locator correction and targeted verification — 2026-08-29

- **Work unit:** G — replace only the mobile ingest error locator with the rendered stable element ID, then run the two explicitly targeted real no-stub Playwright checks.
- **Status:** Targeted checks GREEN; full Unit G remains unchecked in `tasks.md`. The desktop `/demo` runtime abort did not reproduce in this isolated rerun, and the mobile ingest locator correction passed. This is not full 14-test acceptance.
- **Scope:** Changed only `apps/web/tests/e2e/market-readiness.spec.ts` for the locator correction; preserved the assertion text and behavior. Updated this cumulative artifact for evidence. No helper, Playwright config, application source, API/BFF, Docker, stubs/interception, sibling worktree/process, broad suite, commit, push, lifecycle, or review command was used.
- **Correction:** `ingestError` now uses `page.locator('#hydrology-ingest-error')`, matching the rendered alert proven by the latest mobile failure snapshot. The existing text assertion, retry/focus behavior, success alternative, response assertion, token-safety assertion, and evidence hooks are unchanged.

#### TDD Cycle Evidence — targeted locator correction

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-ingest-error-locator | `apps/web/tests/e2e/market-readiness.spec.ts` | E2E | ✅ Latest failure snapshot showed the rendered `#hydrology-ingest-error` element while the accessible-name locator did not match | ✅ Prior mobile targeted failure: 1 test launched, assertion poll failed after 15s; rendered error/retry DOM was captured | ✅ Targeted mobile run 1/1 passed after ID locator correction | ✅ Existing assertion text/behavior and real `/api/hydrology/ingest/verify` path were preserved; no stubs | ✅ Stable rendered-ID locator is the minimum test-only correction |

#### Exact bounded test evidence

| Test File / Command | Exact result |
|---|---|
| `market-readiness.spec.ts` — `$env:PLAYWRIGHT_BASE_URL=$null; $env:PLAYWRIGHT_API_PORT=$null; $env:PLAYWRIGHT_WEB_PORT=$null; $env:AGRONAUTAS_API_INTERNAL_URL=$null; pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=desktop --grep "workspace distinguishes"` (180-second external timeout) | Exit 0; `Running 1 test using 1 worker`; `1 passed`; desktop `/demo` completed in `21.9s`; process summary `1 passed (1.8m)`. No request-aborted failure reproduced. |
| `market-readiness.spec.ts` — `$env:PLAYWRIGHT_BASE_URL=$null; $env:PLAYWRIGHT_API_PORT=$null; $env:PLAYWRIGHT_WEB_PORT=$null; $env:AGRONAUTAS_API_INTERNAL_URL=$null; pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=mobile --grep "ingest rejects"` (180-second external timeout) | Exit 0; `Running 1 test using 1 worker`; `1 passed`; mobile ingest completed in `34.6s`; process summary `1 passed (1.8m)`. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Desktop targeted command: exit 0, 1/1 pass, 0 fail, 0 skipped. Mobile targeted command: exit 0, 1/1 pass, 0 fail, 0 skipped. Runs were serial and used cleared process-local overrides. |
| Runtime harness command/scenario and exact result | Both commands used the existing managed API/web harness and real browser traffic with no `page.route` or stubs. Desktop `/demo` observed the runtime contract successfully; mobile ingest observed the real verification boundary and completed the retry/error path. Harness output contained only existing Node `punycode` deprecation and PostgreSQL SSL-mode warnings. |
| Attachments / route evidence | No standalone screenshot, console JSON, network JSON, or page-error files were materialized under `apps/web/test-results` for these passing targeted runs. The Playwright reporter recorded the exact passing results above; no unsupported clean-console or numeric-status claim is made here. |
| Rollback boundary | Revert only `const ingestError = page.locator('#hydrology-ingest-error')` in `apps/web/tests/e2e/market-readiness.spec.ts` and this cumulative evidence entry; preserve the assertion text/behavior, helper/config, application/API code, prior Units A–F evidence, G unchecked state, and unrelated worktree edits. |

#### Unit G handoff

- G remains unchecked in `tasks.md`; these targeted checks do not satisfy the full 14-test desktop/mobile acceptance requirement.
- The previously observed desktop `/demo` `request_aborted` did not reproduce in this isolated targeted rerun; the exact prior snapshot remains evidence of the earlier failure, not a current failure claim. No desktop runtime fix or timeout/config/API change was made.
- The mobile ingest test now passes using the rendered `#hydrology-ingest-error` locator while preserving the original assertion behavior.
- Next step: run the full required 14-test desktop/mobile no-stub G command only under an explicitly authorized verification/apply step; keep G unchecked until all tests and the build pass. External provider/auth/tenant/lead/authorized-ingest production proof remains separate and unclaimed.

### Completed bounded Unit G ChatViewModel compatibility-boundary repair — 2026-08-29

- **Work unit:** G — repair only the `ChatViewModel` declaration conflict in `apps/web/src/lib/visibility/chat.ts`.
- **Status:** The requested type blocker is repaired; the exact chat test remains GREEN. The required web build advanced past `chat.ts` and stopped at a new unrelated type error in `apps/web/src/lib/visibility/view-models.ts:209:78`; no unrelated file was changed. Unit G remains unchecked in `tasks.md`, and the full no-stub Playwright suite was not run.
- **Scope:** Changed only `apps/web/src/lib/visibility/chat.ts`. The direct chat test was not modified because no runtime/type assertion was required beyond the existing focused safety net and compiler check. No sibling marketplace/management worktree, reset/discard, broad test, Playwright, commit, push, lifecycle, or review command was used.
- **Implementation:** `ChatViewModel` now omits the optional `actionable` and `unverifiedClaims` declarations from `ChatStreamState` before composing the canonical required fields from `Pick<CopilotViewModel, 'outcome' | 'actionable' | 'unverifiedClaims'>`. Runtime normalization and the canonical Copilot actionability semantics are unchanged; no `any` or type weakening was introduced.

#### TDD Cycle Evidence — ChatViewModel compatibility-boundary repair

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-chat-view-model-typing | `apps/web/src/lib/visibility/chat.test.ts` | Unit/type-check boundary | ✅ Existing 10/10 | N/A — the existing web-build compiler error was the failing acceptance signal for this type-only repair | ✅ Focused chat command 10/10; final build advanced past `chat.ts` | ✅ Existing empty, unverified-claim, grounded, and 429 paths remained covered | ➖ None needed; only the inheritance compatibility boundary changed |

#### Exact bounded test/build evidence

| Test File / Command | Exact result |
|---|---|
| `chat.test.ts` — `pnpm --dir apps/web exec node --import tsx --test --test-timeout=20000 src/lib/visibility/chat.test.ts` with 60-second external timeout | Exit 0; `tests 10`, `pass 10`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 626.9648`. |
| `pnpm --dir apps/web build` with 240-second timeout | Exit failure after Next compiled successfully in `12.8s`; type checking advanced past `chat.ts` and stopped at unrelated `./src/lib/visibility/view-models.ts:209:78`: `Property 'done' does not exist on type 'CopilotResponseInput'`. Per scope, execution stopped and no `view-models.ts` change was made. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required direct chat command — exit 0; 10/10 tests passed with no failures, cancellations, skips, or todos. |
| Runtime harness command/scenario and exact result | N/A — this is a type declaration compatibility boundary; the user prohibited servers, Playwright, and broad runtime suites. The existing direct chat tests cover the preserved normalized actionability and retry behavior. |
| Rollback boundary | Revert only the `Omit<ChatStreamState, 'actionable' | 'unverifiedClaims'>` compatibility-boundary change in `apps/web/src/lib/visibility/chat.ts`; preserve all runtime normalizers, canonical Copilot actionability, existing chat tests, and unrelated worktree edits. |

#### Unit G handoff

- The `ChatViewModel`/`ChatStreamState` conflicting `actionable` declaration is resolved without altering runtime behavior or weakening types.
- G remains unchecked. Do not claim full acceptance: the required web build is now blocked by the unrelated `apps/web/src/lib/visibility/view-models.ts:209:78` `done` property error, and the full no-stub Playwright command remains deferred.
- Next blocker: an independently authorized repair of `CopilotResponseInput`/`CopilotStreamInput` typing at `view-models.ts:209`, followed by the required full no-stub Playwright acceptance. External provider/auth/tenant/lead/ingest proof remains separate and unclaimed.

### Completed bounded Unit F viewport acceptance — 2026-08-29

- **Work unit:** F — real responsive viewport acceptance for the existing Agronautas field detail and Iberá-Alerta municipality detail routes.
- **Status:** Complete; both configured projects executed nonzero passing tests with real managed local API/web harness traffic. Unit G remains unchecked and pending.
- **Scope:** Added only `apps/web/tests/e2e/market-readiness-responsive.spec.ts` and the required `desktop`/`mobile` projects in `apps/web/playwright.config.mjs`; updated this cumulative artifact and the Unit F checkbox in `tasks.md`. No `page.route` interception, fake data, Docker, sibling worktree, unrelated source, broad suite, commit, push, lifecycle, or review command was used.
- **Coverage:** `/demo/fields/field-demo-1` and `/municipalities/ituzaingo` ran at desktop `1440x900` and mobile `390x844`. The suite asserts one main landmark, visible detail index and status/source/empty-state copy, document/body width bounded to the viewport, and focused section targets positioned below the municipal sticky summary when present. Each passing route/project test captured a full-page screenshot plus console and network evidence attachments.
- **Harness:** Playwright used the existing config-managed no-Docker API/web harness command exactly as configured; the API emitted only startup deprecation/SSL-mode warnings. The prior manually probed port 3000 was a stale 404 and was not used as evidence; the managed harness run completed successfully.

#### TDD Cycle Evidence — viewport acceptance

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| F-viewport-detail-acceptance | `apps/web/tests/e2e/market-readiness-responsive.spec.ts` | E2E | N/A (new test) | ✅ Test written before execution; first run exposed only a strict-selector assertion defect | ✅ Final run: 4/4 tests passed across desktop/mobile and both detail routes | ✅ Agronautas field + municipality detail; desktop + 390px; populated field and explicit municipality unavailable state | ✅ Scoped municipality evidence assertion to its operator summary region; no production change needed |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `market-readiness-responsive.spec.ts` | `pnpm --dir apps/web exec playwright test tests/e2e/market-readiness-responsive.spec.ts --project=desktop --project=mobile` | First execution: exit failure; 4 tests discovered, field desktop/mobile passed, municipality desktop/mobile failed only because the broad status/source/empty regex locator matched 20 visible descendants in the duplicated summary panels. No implementation defect was observed. |
| `market-readiness-responsive.spec.ts` | Same exact command, one permitted rerun after scoping the test assertion | **Exit 0**; 4 tests, 4 passed, 0 failed, 0 skipped; desktop field 11.8s, desktop municipality 5.7s, mobile field 3.5s, mobile municipality 2.0s; total `52.4s`. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Final required command above — exit 0; desktop project 2/2 pass and mobile project 2/2 pass, 4/4 total, with actual nonzero test discovery and no skips. |
| Runtime harness command/scenario and exact result | The same command started the existing Playwright-managed harness from `playwright.config.mjs` (API command `pnpm --dir ../../packages/zod-schemas build:ensure && pnpm --dir ../../packages/hydrology-engine build:ensure && pnpm --dir ../api dev`; web command `pnpm exec next dev --hostname 127.0.0.1 --port <reserved>`). Both detail routes rendered through real browser/BFF/API traffic; no route interception or stubs were registered. |
| Screenshots / console / network evidence | Four full-page PNG screenshots plus four console JSON and four network JSON evidence attachments were captured in the passing Playwright tests via `testInfo.attach`; no screenshot or clean-console claim is made beyond those actual captures. Console output contained the API harness `punycode` deprecation and PostgreSQL SSL-mode warnings; no test failed on them. |
| Rollback boundary | Remove `apps/web/tests/e2e/market-readiness-responsive.spec.ts`, the two added Playwright projects in `apps/web/playwright.config.mjs`, and the F checkbox/progress entry; preserve all prior Unit A–E work, the sticky summary/detail implementation, and unrelated working-tree edits. |

#### Unit F handoff

- Unit F is marked `[x]` in `tasks.md`: both `desktop` and `mobile` projects produced actual nonzero passing viewport evidence.
- The viewport checks confirmed no horizontal overflow and no focused section occlusion for the existing field and municipality detail routes. The municipality route rendered its explicit no-data summary under the local harness; this is truthful local unavailable/empty evidence, not provider or production proof.
- Unit G remains unchecked and pending: real no-stub acceptance for `/`, `/probar-demo`, `/demo`, field, municipality overview/detail, ingest, and its separate production/provider/auth boundary evidence.

### Bounded Unit E government landmarks slice — 2026-08-28

- **Work unit:** E — government document landmarks, skip-link targets, and heading structure only.
- **Status:** Partial landmark implementation applied; Unit E remains unchecked. Government form naming, autocomplete, invalid-field focus, live validation, keyboard submission, responsive IA, and browser acceptance remain outside this slice.
- **Scope:** Only `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx` and their direct tests were changed for this slice. No landing, Agronautas, API, auth, Copilot, ingest contract, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Implementation:** Government overview and detail retain their standalone single `<main>` landmarks and now expose focusable skip targets for the municipality list and telemetry sections. Overview province alerts now have one stable section heading and nested alert headings without duplicated IDs. Ingest now exposes a keyboard-visible skip link targeting the currently rendered authorization/admission form; the target is focusable in either state. Unit D status, forecast, Copilot, ingest request behavior, and public component APIs were preserved.
- **Tests:** Added/extended direct assertions for one main/no nested main, skip-link href-to-target compatibility with `tabIndex=-1`, and applicable heading structure. Existing broader pending E form assertions remain unchanged and are intentionally not implemented in this slice.

#### TDD Cycle Evidence — government landmark slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| E-government-overview-landmarks | `apps/web/src/components/government/overview.test.tsx` | Component | Existing overview direct tests | ❌ FAILED strict-TDD evidence: the added focus-target/heading assertions were written after the source patch; the required serial command then timed out before a concrete assertion completed | N/A — timeout rule prohibited rerun | N/A | Stable province-alert heading and focusable municipality target only |
| E-government-detail-landmarks | `apps/web/src/components/government/detail.test.tsx` | Component | 10/11 concrete tests completed in serial run | ❌ FAILED strict-TDD evidence for the added focus-target/heading assertions: they were written after the source patch; the run also exposed the pending form-name assertion (`governmentMessage` vs `government-copilot-message`) | ⚠️ Landmark and heading assertions passed before the remaining out-of-scope form assertion failed; final run 10/11 | Skip target, one main, no nested main, and h1/h2 checks | Focusable telemetry target only |
| E-government-ingest-landmarks | `apps/web/src/components/government/ingest-panel.test.tsx` | Component | 12 concrete tests completed in serial run | ❌ FAILED strict-TDD evidence for the added focus-target/heading assertions: they were written after the source patch; the earlier run did expose the missing skip link | ⚠️ Final run 10/12; landmark test passed after implementation, with 2 out-of-scope form/focus failures remaining | Alternate authorization form target and single-main checks | Skip link and focusable form target only |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `overview.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/overview.test.tsx` | **Timed out** at the Node test timeout; `tests 1`, `pass 0`, `fail 0`, `cancelled 1`, `skipped 0`; `testTimeoutFailure`, `duration_ms 50005.9747`, file `duration_ms 50028.9506`. Per instruction, no rerun or broad fallback was used. |
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/detail.test.tsx` | Initial serial run: exit failure; `tests 11`, `pass 10`, `fail 1`, `cancelled 0`, `skipped 0`; failure was the pending form-name assertion. One permitted rerun after landmark edits: same result, `10/11` pass; no timeout. |
| `ingest-panel.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/ingest-panel.test.tsx` | Initial serial run: exit failure; `tests 12`, `pass 9`, `fail 3`, `cancelled 0`, `skipped 0`; failures were pending form name, invalid-focus semantics, and missing skip link. One permitted rerun after landmark edits: exit failure; `tests 12`, `pass 10`, `fail 2`, `cancelled 0`, `skipped 0`; remaining failures are pending form name and invalid-focus semantics. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required commands were run serially, one file per command with `--test-timeout=50000`. Overview timed out with zero concrete tests; detail finished `10/11`; ingest finished `10/12`. Nonzero discovery was confirmed for every command (`tests 1`, `tests 11`, `tests 12`). |
| Runtime harness command/scenario and exact result | N/A — user prohibited servers, runtime smoke, and Playwright; this slice is limited to direct React/JSDOM component tests. |
| Rollback boundary | Revert only the government skip-link/target attributes and overview province-alert heading hierarchy in `overview.tsx`, `detail.tsx`, `ingest-panel.tsx`, plus the matching landmark/heading assertions in their three direct tests; preserve all Unit D behavior, APIs, current pending form/focus work, and unrelated worktree edits. |

#### Unit E handoff

- Unit E remains unchecked in `tasks.md` by instruction.
- Remaining E work: government and other audited-route form `name`/`autocomplete`, `aria-describedby`, live validation errors, first-invalid focus, and keyboard submit behavior; do not infer these from this landmark slice.
- Units F–G remain pending: responsive IA/visual consistency and real no-stub Playwright acceptance.

### Completed bounded overview test-harness lifecycle repair — 2026-08-28

- **Work unit:** E — government overview JSDOM lifecycle repair only.
- **Status:** Harness teardown is repaired and no longer times out; the required overview assertions remain non-GREEN with 4/6 passing. No production source or assertion/fixture changes were made.
- **Scope:** Only `apps/web/src/components/government/overview.test.tsx` was changed for implementation. The sibling marketplace/management worktree, `overview.tsx`, other tests, servers, Playwright, broad suites, commits, pushes, lifecycle commands, and review commands were not touched.
- **Repair:** The test now imports `render`/`cleanup` from `@testing-library/react/pure`, tracks every JSDOM instance, captures the temporary `window`/`self`/`document`/`HTMLElement`/`navigator` globals, runs cleanup and one `setImmediate` settle point, closes all windows, and restores the captured globals. All existing assertions and fixtures remain unchanged; no force-exit was added.

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `overview.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/overview.test.tsx` | Initial post-harness run: exit failure; `tests 6`, `pass 4`, `fail 2`, `cancelled 0`, `skipped 0`; duration `17388.7806 ms`. Failures: missing `name="municipalityQuery"` and missing `aria-live="assertive"`. |
| `overview.test.tsx` | Same exact command, one permitted rerun after assertion failures | Exit failure; `tests 6`, `pass 4`, `fail 2`, `cancelled 0`, `skipped 0`; duration `16261.5309 ms`. The same two assertion failures remained; no timeout occurred. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Final exact command above — exit nonzero; 4/6 tests passed, 2/6 failed, 0 cancelled/skipped. Lifecycle teardown completed normally within the 90-second external bound. |
| Runtime harness command/scenario and exact result | N/A — this bounded attempt is a direct React/JSDOM test-harness repair; servers, runtime smoke, external providers, and Playwright were explicitly prohibited. |
| Rollback boundary | Revert only the pure RTL import, captured-global snapshot, tracked `activeDoms`, async teardown settle/close/restore logic, and `activeDoms.push(dom)` in `apps/web/src/components/government/overview.test.tsx`; preserve all overview assertions/fixtures, government production code, prior cumulative slices, and unrelated working-tree edits. |

#### Handoff

- The overview lifecycle timeout is resolved, but the test file is not GREEN: `name="municipalityQuery"` and assertive error live-region behavior remain unverified/failed in the current component contract.
- No change was made to `overview.tsx` because this attempt was explicitly harness repair only.
- Units E–G remain pending; do not claim full government form semantics or responsive/browser acceptance from this result.

### Completed bounded Unit E government form/focus/live slice — 2026-08-28

- **Work unit:** E — meaningful government form names/autocomplete, inline error associations, assertive actionable errors, first-invalid focus, and keyboard-visible retry controls.
- **Status:** GREEN for the allowed government component perimeter; Unit E remains unchecked because landing and Agronautas form semantics are outside this bounded slice and still outstanding.
- **Scope:** Only `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx` were changed. Their existing direct tests were executed but not modified. No layout, landing, Agronautas, API, provider, ingest enablement, sibling worktree, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Implementation:** Overview filters now use `municipalityQuery`, `municipalitySource`, and `municipalityStatus` with `autocomplete="off"`; overview and detail fetch/actionable errors expose assertive atomic live regions; detail Copilot uses `governmentMessage`, associates the validation message with `aria-describedby`, marks the field invalid, focuses it on keyboard submit, and retains visible retry focus styling; ingest uses `ingestToken`, adds conditional invalid/error association to the memory-only token field, and keeps ingest retry keyboard-visible. Unit D status/forecast/Copilot/ingest contracts and token non-persistence remain unchanged.

#### TDD Cycle Evidence — Unit E government form/focus/live slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| E-government-overview-form-live | `apps/web/src/components/government/overview.test.tsx` | Component | ✅ 4/4 prior assertions plus lifecycle repair | ✅ Existing assertions failed 4/6 pass, 2/6 fail: missing `municipalityQuery` and `aria-live="assertive"` | ✅ 6/6 pass after the source-only fix and one permitted rerun | ✅ Names/autocomplete for all three filters and atomic assertive fetch error | ✅ Additive attributes only; existing status/forecast behavior preserved |
| E-government-detail-form-focus | `apps/web/src/components/government/detail.test.tsx` | Component | ✅ 10/10 prior concrete assertions | ✅ Existing pending form/focus contract was previously 10/11 with missing name/invalid-focus behavior; first post-fix run exposed one duplicate-alert query failure | ✅ 11/11 pass after the one permitted assertion-failure rerun | ✅ `governmentMessage`, empty-submit error association, invalid state, first-invalid focus, and existing Copilot stream/retry paths | ✅ Validation error is the sole alert while correcting the field; async Copilot errors remain assertive |
| E-government-ingest-form-focus | `apps/web/src/components/government/ingest-panel.test.tsx` | Component | ✅ 10/10 prior concrete assertions | ✅ Existing pending form/focus contract was previously 10/12 with missing name/invalid-focus behavior; first post-fix run was 11/12 with only the stale name assertion remaining | ✅ 12/12 pass after the one permitted assertion-failure rerun | ✅ `ingestToken`, conditional `aria-describedby`/`aria-invalid`, retry focus, memory-only token, progress, and result retry | ✅ Conditional error association preserves authorized form and safe result contracts |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `overview.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/overview.test.tsx` | Baseline exit failure; `tests 6`, `pass 4`, `fail 2`, `cancelled 0`, `skipped 0`; missing `municipalityQuery` and assertive live-region attributes. |
| `overview.test.tsx` | Same command, one permitted assertion-failure rerun | Exit 0; `tests 6`, `pass 6`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 12446.1946`. |
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/detail.test.tsx` | First post-fix run exit failure; `tests 11`, `pass 10`, `fail 1`, `cancelled 0`, `skipped 0`; duplicate `role="alert"` query during invalid-submit assertion. |
| `detail.test.tsx` | Same command, one permitted assertion-failure rerun | Exit 0; `tests 11`, `pass 11`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 14606.6565`. Existing JSDOM emitted a non-fatal `activeElement.attachEvent` diagnostic during focus testing. |
| `ingest-panel.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/ingest-panel.test.tsx` | First post-fix run exit failure; `tests 12`, `pass 11`, `fail 1`, `cancelled 0`, `skipped 0`; stale `name="hydrology-ingest-token"` expectation. |
| `ingest-panel.test.tsx` | Same command, one permitted assertion-failure rerun | Exit 0; `tests 12`, `pass 12`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 10454.7026`. Existing JSDOM emitted a non-fatal `activeElement.attachEvent` diagnostic during focus testing. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Three required direct files were run serially with `--test-timeout=50000` and a 90-second external bound. Final results: overview 6/6, detail 11/11, ingest 12/12; all exits 0, with 0 failures, 0 cancellations, and 0 skips. |
| Runtime harness command/scenario and exact result | N/A — runtime servers, provider/API smoke, Playwright, and broad suites were explicitly prohibited; these changes are isolated component form/accessibility behavior verified by direct React/JSDOM tests. |
| Rollback boundary | Revert only the additive form attributes/error associations/focus handling/live-region attributes in `overview.tsx`, `detail.tsx`, and `ingest-panel.tsx`; preserve Unit D status/forecast/Copilot/ingest behavior, token non-persistence, API contracts, and all unrelated working-tree edits. |

#### Unit E handoff

- Unit E remains unchecked in `tasks.md`; landing and Agronautas controls still need the same form/error/focus audit.
- Units F–G remain pending: responsive IA/visual consistency and real no-stub Playwright acceptance.
- The non-fatal JSDOM `activeElement.attachEvent` diagnostics occurred only while asserting focus; they did not cancel or fail any final direct test.

### Completed bounded Unit E landing form semantics slice — 2026-08-28

- **Work unit:** E — landing form names/autocomplete, inline error associations, assertive validation/submission errors, first-invalid focus, keyboard submit path, and visible focus-visible styling.
- **Status:** GREEN for the allowed landing source perimeter; Unit E remains unchecked in `tasks.md` until the separately required Agronautas form audit is complete. Units F–G remain pending.
- **Scope:** Only `apps/web/src/components/landing/homepage.tsx`, `homepage.test.tsx`, `demo-contact-form.tsx`, and `demo-contact-form.test.tsx` were changed, plus this cumulative artifact. No Agronautas/government/API files, sibling marketplace/management worktree, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Implementation:** Landing interactive CTAs and controls now expose visible `focus-visible` outlines. The demo form uses meaningful `name` and `autocomplete` values (`name`, `email`, `organization`, `tel`, and `off` for free-form/honeypot fields), the phone control uses `type="tel"`/`inputMode="tel"`, and the email control disables spellcheck. Validation errors expose stable IDs linked by `aria-describedby` and `aria-invalid`; validation, abort, network, and server failures use explicit assertive atomic live regions. Invalid submit focuses the first invalid control. Native form submission remains the keyboard path, while confirmed success, failed-draft preservation, and retry behavior remain unchanged.

#### TDD Cycle Evidence — Unit E landing form semantics

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| E-landing-cta-focus | `apps/web/src/components/landing/homepage.test.tsx` | Component/static render | ✅ 7/7 | ✅ 8 tests: 7 pass, 1 fail on missing CTA focus-visible styling | ✅ 8/8 after homepage implementation | ✅ Hero route CTA and same-page Risk Engine CTA | ✅ Shared focus-ring class and existing CTA destinations preserved |
| E-landing-form-semantics | `apps/web/src/components/landing/demo-contact-form.test.tsx` | Component/integration boundary | ✅ 7/7 | ✅ 12 tests: 8 pass, 4 fail on missing form semantics/error/focus styling | ✅ 12/12 after implementation and one permitted assertion-correction rerun | ✅ name/email/organization/phone/message/honeypot attributes; validation and delivery errors; keyboard submit; focus-visible controls | ✅ Reused typed control class; additive attributes and focus behavior preserve Unit C submission/retry contract |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `homepage.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/landing/homepage.test.tsx` | Safety net exit 0; `tests 7`, `pass 7`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 18008.1537`. |
| `demo-contact-form.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/landing/demo-contact-form.test.tsx` | Safety net exit 0; `tests 7`, `pass 7`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 8431.3767`. |
| `homepage.test.tsx` | Same exact command after RED test and implementation | Exit failure; `tests 8`, `pass 7`, `fail 1`, `cancelled 0`, `skipped 0`; expected missing CTA focus-visible styling. |
| `demo-contact-form.test.tsx` | Same exact command after RED tests and implementation | Exit failure; `tests 12`, `pass 8`, `fail 4`, `cancelled 0`, `skipped 0`; expected missing names/autocomplete, error association/live-region, and focus-visible assertions. |
| `homepage.test.tsx` | Same exact command, one permitted assertion-failure rerun after implementation | Exit 0; `tests 8`, `pass 8`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 9465.8182`. |
| `demo-contact-form.test.tsx` | Same exact command, one permitted assertion-correction rerun after implementation | Exit 0; `tests 12`, `pass 12`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 5484.807`. |

#### Work Unit Evidence — Unit E landing form semantics

| Evidence | Result |
|---|---|
| Focused test command and exact result | Two required direct commands, run serially one process at a time with the 90-second external bound: homepage `8/8` pass and demo form `12/12` pass; combined `20/20`, with 0 failures, cancellations, or skips. |
| Runtime harness command/scenario and exact result | N/A — runtime servers, browser automation, Playwright, and external lead/provider/API paths were explicitly prohibited; the direct component boundary exercises static CTA semantics, controlled form submission, invalid focus, confirmed success, abort/network/server failures, draft preservation, and retry without claiming external delivery. |
| Rollback boundary | Revert only `homepage.tsx` focus-visible class additions and matching homepage assertion, plus `demo-contact-form.tsx` form attributes/error IDs/live-region/focus additions and matching direct assertions; preserve Unit C CTA destinations, confirmed-success/retry/draft behavior, prior Units A–D, and unrelated worktree edits. |

#### Unit E landing handoff

- Landing form semantics are GREEN within the explicitly allowed files, but the parent Unit E checkbox remains unchecked until Agronautas forms are complete as requested.
- Remaining Unit E work: Agronautas form audit/completion and any still-authorized cross-route landmark work; no completion is inferred from this landing-only slice.
- Unit F remains pending: responsive IA, visual consistency, focus occlusion, and overflow evidence.
- Unit G remains pending (historical handoff): real no-stub Playwright acceptance and production-boundary evidence.
- The final direct form run emitted non-fatal JSDOM React `activeElement.attachEvent`/`detachEvent` diagnostics while exercising focus; the process completed normally and all 12 tests passed. No force-exit or timeout workaround was used.

### Completed bounded Unit E Agronautas form semantics slice — 2026-08-28

- **Work unit:** E — Agronautas intake and geometry-editor form semantics: meaningful control names/autocomplete, associated validation errors, assertive announcements, first-invalid/corrective focus, native keyboard submission, and visible focus-visible styling.
- **Status:** GREEN for the allowed Agronautas form perimeter; Unit E is now marked `[x]` because the cumulative E1a/E1b landmarks, government form/focus/live coverage, landing form/focus/live coverage, and this Agronautas form coverage satisfy the audited-route E requirements. Units F–G remain pending.
- **Scope:** Only `apps/web/src/components/agronautas/workspace.tsx`, `apps/web/src/components/agronautas/field-geometry-editor.tsx`, `workspace-intake.test.tsx`, `field-geometry-editor.test.tsx`, and the cumulative `tasks.md`/`apply-progress.md` artifacts were changed in this slice. `page-client.tsx` was inspected but did not need a change. No landing/government/API source, sibling marketplace/management worktree, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Implementation:** Agronautas intake controls now have stable meaningful names and autocomplete metadata, labels, conditional `aria-invalid`/`aria-describedby` links, assertive atomic validation/server errors, first-invalid focus, native submit semantics, and explicit focus-visible styles. Chat and planning fields inherit the same safe `autocomplete="off"`/focus-visible input contract, while chat validation errors are announced and focused without changing transport or response behavior. The existing geometry editor now has a real keyboard-submit form boundary; incomplete drafts announce an assertive atomic error, link it to the corrective control, and focus `Agregar vértice`. Existing auth/demo/unavailable branches, summaries, simulation markers, API payloads, and backend-authoritative geometry save behavior remain unchanged.

#### TDD Cycle Evidence — Unit E Agronautas form semantics

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| E-agronautas-intake-form | `apps/web/src/components/agronautas/workspace-intake.test.tsx` | Component/integration boundary | ⚠️ 7/8 before this slice; one pre-existing `getByRole('alert')` ambiguity in the unrelated source-query test | ✅ Added metadata, validation/focus, and native-submit assertions; RED reached 8/11 with the expected missing metadata/error behavior plus the same pre-existing failure | ✅ Final run: 10/11; all 3 new assertions pass, with only the pre-existing 1/11 failure remaining | ✅ Metadata covers ID/locality/coordinates/surface/stage/crop; validation covers assertive error association and first-invalid focus; submit covers native form path | ✅ Shared `Field` contract supplies labels, autocomplete, error associations, and focus-visible styling without changing intake payload shape |
| E-agronautas-geometry-form | `apps/web/src/components/agronautas/field-geometry-editor.test.tsx` | Component | ✅ 2/2 | ✅ Added incomplete-submit announcement/focus assertion; 2/3 passed with missing live/error/focus behavior | ✅ Final run: 3/3 pass, 0 fail/cancelled/skipped | ✅ Existing authenticated save and incomplete-draft paths plus assertive corrective-focus path | ✅ Existing save action moved into a native `<form>` boundary; backend save contract preserved |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `workspace-intake.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/workspace-intake.test.tsx` | Safety net exit failure; `tests 8`, `pass 7`, `fail 1`, `cancelled 0`, `skipped 0`; pre-existing multiple-alert query in test 7. |
| `workspace-intake.test.tsx` | Same command after RED assertions | Exit failure; `tests 11`, `pass 8`, `fail 3`, `cancelled 0`, `skipped 0`; two expected new RED failures (missing autocomplete and validation/error semantics) plus the same pre-existing multiple-alert query. |
| `workspace-intake.test.tsx` | Same command after implementation | Exit failure; `tests 11`, `pass 10`, `fail 1`, `cancelled 0`, `skipped 0`; all three new Agronautas form tests passed; only the pre-existing multiple-alert query remained. No additional rerun was made after this assertion result. |
| `field-geometry-editor.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/field-geometry-editor.test.tsx` | Safety net exit 0; `tests 2`, `pass 2`, `fail 0`, `cancelled 0`, `skipped 0`. |
| `field-geometry-editor.test.tsx` | Same command after RED assertions | Exit failure; `tests 3`, `pass 2`, `fail 1`, `cancelled 0`, `skipped 0`; expected missing assertive live/error/focus behavior. |
| `field-geometry-editor.test.tsx` | Same command after implementation | Exit 0; `tests 3`, `pass 3`, `fail 0`, `cancelled 0`, `skipped 0`; normal completion within the 90-second external bound. |

#### Work Unit Evidence — Unit E Agronautas form semantics

| Evidence | Result |
|---|---|
| Focused test command and exact result | Geometry editor: exit 0, 3/3 pass. Workspace intake: final exit failure, 10/11 pass, 0 cancelled/skipped; the three new form-semantic assertions pass, while the pre-existing source-query test still fails on an ambiguous `getByRole('alert')`. No broad fallback was run. |
| Runtime harness command/scenario and exact result | N/A — user prohibited servers, runtime smoke, Playwright, and broad suites; this slice has isolated React/JSDOM form boundaries and no new runtime/API contract. |
| Rollback boundary | Revert only the Agronautas input/select/error/focus-visible additions and intake validation in `workspace.tsx`, the geometry native-form/assertive-error/focus additions in `field-geometry-editor.tsx`, and the two matching direct test additions; preserve ProductShell/E1a/E1b landmarks, Unit D summaries/simulation/auth/demo/unavailable behavior, API payloads, and unrelated worktree edits. |

#### Unit E handoff

- Unit E is marked `[x]` in `tasks.md`: cumulative landmarks plus government, landing, and Agronautas form/error/focus/keyboard evidence are complete for this audited-route requirement.
- The Agronautas intake direct file retains one pre-existing failing assertion unrelated to this slice (`getByRole('alert')` matches the query error and unavailable intelligence boundary); the new form assertions are all green. This remains a verification risk for the next phase and was not repaired because strict-TDD safety-net rules prohibit fixing unrelated pre-existing failures.
- Unit F remains pending: responsive IA, section index/sticky summary, focus occlusion, overflow, and visual consistency evidence.
- Unit G remains pending (historical handoff): real no-stub Playwright acceptance and production-boundary evidence.
- The geometry editor exists and was audited; no unavailable-editor substitute was invented.

### Unit E alert-query correction attempt — 2026-08-28

- **Work unit:** E — deterministic Agronautas source-query alert semantics only.
- **Status:** Blocked from GREEN by the explicit two-execution limit. The pre-existing ambiguous alert assertion was narrowed, but the one permitted rerun still failed because the alert had no accessible name. A corrective source/test patch was then applied without another execution; Unit E is not GREEN and its checkbox is corrected to `[ ]` in `tasks.md`.
- **Scope:** Only `apps/web/src/components/agronautas/workspace.tsx`, `workspace-intake.test.tsx`, this cumulative artifact, and the Unit E checkbox in `tasks.md` were touched for this correction. No unrelated source, sibling worktree, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Correction:** The query-error `role="alert"` now has the stable accessible name `Error de capacidades Agronautas`; the direct test targets that named alert and still asserts the concrete `weather source unavailable` message. Existing alert role/live behavior was preserved; no live region was removed or weakened.

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `workspace-intake.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/workspace-intake.test.tsx` | Initial execution: exit failure; `tests 11`, `pass 10`, `fail 1`, `cancelled 0`, `skipped 0`; test 7 failed because `getByRole('alert')` matched both the source-query alert and unavailable intelligence boundary. |
| `workspace-intake.test.tsx` | Same exact command, one permitted assertion-failure rerun after narrowing the test query | Exit failure; `tests 11`, `pass 10`, `fail 1`, `cancelled 0`, `skipped 0`; the narrowed accessible-name query could not match because the source-query alert had no accessible name. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required command executed exactly twice under the 90-second external bound. Final permitted execution was `10/11` with `1` failure; no GREEN claim and no additional rerun is permitted. |
| Runtime harness command/scenario and exact result | N/A — this correction is isolated React/JSDOM alert semantics; servers, runtime smoke, Playwright, and broad suites were explicitly prohibited. |
| Rollback boundary | Revert only `aria-label="Error de capacidades Agronautas"` in `workspace.tsx`, the named-alert assertion in `workspace-intake.test.tsx`, and the Unit E checkbox/progress entry; preserve all existing form semantics, assertive alerts, prior cumulative units, and unrelated working-tree edits. |

#### Handoff

- Unit E remains unchecked because the final corrected source/test state was not re-executed after the permitted rerun was consumed.
- Units F–G remain pending: responsive IA/visual consistency and real no-stub Playwright acceptance.
- Known non-fatal diagnostic: the run emitted the existing JSDOM/React `activeElement.attachEvent` focus diagnostic; it did not cancel tests.

### Completed bounded Unit E Agronautas alert-query verification — 2026-08-28

- **Work unit:** E — verification-only confirmation of the corrected Agronautas source-query alert assertion.
- **Status:** GREEN; Unit E is preserved/marked `[x]` in `tasks.md`. Units F–G remain pending.
- **Scope:** Read-only verification of `workspace.tsx` and `workspace-intake.test.tsx`, followed by the required cumulative artifact updates. No code or test source was changed because the focused run passed. No sibling marketplace/management worktree, servers, Playwright, broad tests, commits, pushes, lifecycle, or review commands were used.
- **Verification:** The stable `aria-label="Error de capacidades Agronautas"` and exact named-alert query now execute successfully across the full workspace intake test file.

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `workspace-intake.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/workspace-intake.test.tsx` | Exit 0; `tests 11`, `suites 0`, `pass 11`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 18908.6206`; normal completion within the 90-second external timeout. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Exact command above — exit 0; 11/11 tests passed, 0 failures, 0 cancellations, 0 skips, 0 todos. |
| Runtime harness command/scenario and exact result | N/A — verification-only isolated React/JSDOM component coverage; servers, runtime smoke, Playwright, and broad suites were explicitly prohibited. |
| Rollback boundary | Revert only the Unit E checkbox change and this verification entry in `tasks.md`/`apply-progress.md`; preserve the already-corrected alert accessible name/query, all form semantics, cumulative Units A–D, and unrelated working-tree edits. |

#### Unit E handoff

- Unit E is now marked `[x]` with the corrected Agronautas workspace intake test verified at 11/11.
- Units F–G remain pending: responsive IA/visual consistency and real no-stub Playwright acceptance.
- The existing JSDOM/React `activeElement.attachEvent` diagnostic was non-fatal; the process completed normally and all 11 tests passed.

### Completed bounded Unit F first responsive IA slice — 2026-08-28

- **Work unit:** F — compact section index for the long municipality and field detail pages.
- **Status:** Partial Unit F implementation is GREEN in direct component tests; Unit F remains unchecked until the required responsive viewport evidence exists.
- **Scope:** Only `apps/web/src/components/government/detail.tsx`, `detail.test.tsx`, `apps/web/src/components/agronautas/field-detail.tsx`, and `field-detail.test.tsx` were changed. `workspace.tsx` was not needed. No contracts, API/BFF behavior, status copy, providers, sibling worktree, server, Playwright, broad suite, commit, push, lifecycle, or review command was used.
- **Implementation:** Municipality and field detail pages now expose compact, semantic section indexes with wrapped same-page links. Long-detail targets have stable IDs, `tabIndex=-1`, `scroll-mt-24`, and visible focus treatment so navigation remains reachable without obscuring focused content. Existing above-fold operator/decision summaries, status, freshness, threshold, confidence, safe-action, source, and empty-state copy remain unchanged and truthful. The wrapped link layout is bounded with `flex-wrap`, `min-w-0`, `max-w-full`, and `break-words` for the 390px intent; actual viewport proof remains deferred to F visual verification.

#### TDD Cycle Evidence — Unit F first responsive IA slice

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| F-municipality-index | `apps/web/src/components/government/detail.test.tsx` | Component | ✅ 11/11 | ✅ 12 tests: 11 pass, 1 fail because the index/navigation targets did not exist | ✅ 12/12 pass | ✅ 13/13 pass with empty telemetry/forecast path and preserved unavailable states | ✅ Const-backed index items plus focusable scroll targets; no status/copy contract changes |
| F-field-index | `apps/web/src/components/agronautas/field-detail.test.tsx` | Component | ✅ 3/3 | ✅ 4 tests: 3 pass, 1 fail because the index/navigation targets did not exist | ✅ 4/4 pass | ✅ 5/5 pass with unavailable geometry path and preserved decision summary | ✅ Const-backed index items plus wrapped links and focusable scroll targets; no API changes |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/detail.test.tsx` | Safety net exit 0; `tests 11`, `pass 11`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 11886.4899`. |
| `detail.test.tsx` | Same command after RED assertions | Exit failure; `tests 12`, `pass 11`, `fail 1`, `cancelled 0`, `skipped 0`; failure was the expected missing section index. |
| `detail.test.tsx` | Same command after GREEN implementation | Exit 0; `tests 12`, `pass 12`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 19066.779`. |
| `detail.test.tsx` | Same command after triangulation assertions | Exit 0; `tests 13`, `pass 13`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 15704.3381`. |
| `field-detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/agronautas/field-detail.test.tsx` | Safety net exit 0; `tests 3`, `pass 3`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 19283.797`. |
| `field-detail.test.tsx` | Same command after RED assertions | Exit failure; `tests 4`, `pass 3`, `fail 1`, `cancelled 0`, `skipped 0`; failure was the expected missing section index. |
| `field-detail.test.tsx` | Same command after GREEN implementation | Exit 0; `tests 4`, `pass 4`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 20050.0402`. |
| `field-detail.test.tsx` | Same command after triangulation assertions | Exit 0; `tests 5`, `pass 5`, `fail 0`, `cancelled 0`, `skipped 0`; `duration_ms 14542.748`. |

#### Work Unit Evidence — Unit F first responsive IA slice

| Evidence | Result |
|---|---|
| Focused test command and exact result | The two direct commands above were run serially, one process at a time, with Node `--test-timeout=50000` and a 90-second external bound. Final result: municipality `13/13` pass plus field `5/5` pass; combined `18/18`, with 0 failures, cancellations, or skips. |
| Runtime harness command/scenario and exact result | N/A for this bounded code/component slice: server and Playwright execution were explicitly prohibited. Responsive runtime evidence at `1440x900` and `390x844`, including measured overflow and focus occlusion, remains required before Unit F can be marked complete. |
| Rollback boundary | Revert only the compact index constants/components, detail target IDs/tab stops/scroll margins/focus treatment, and the matching assertions in the four listed files; preserve all prior Units A–E, existing status/source/empty copy, API contracts, and unrelated working-tree edits. |

#### Unit F handoff

- Unit F remains unchecked in `tasks.md` until responsive viewport evidence proves the compact indexes at desktop and 390px without horizontal overflow or focus occlusion.
- Remaining Unit F work: authorized viewport/screenshot evidence and any narrowly scoped correction from that evidence; do not perform a broad redesign.
- Unit G remains pending (historical handoff): real no-stub Playwright acceptance and production-boundary evidence.
- The existing non-fatal JSDOM `activeElement.attachEvent` diagnostic remains limited to prior focus assertions; all final Unit F direct tests completed normally.

### Bounded Unit G environment-repair and Playwright verification — 2026-08-29

- **Work unit:** G — environment repair and the exact real no-stub Playwright acceptance command only.
- **Status:** Blocked/unknown; G remains unchecked in `tasks.md`. The Playwright CLI became available at the declared dependency version, but the single permitted selector correction did not produce a complete 14/14 run. A real runtime/API capability failure remains, so execution stopped without further edits or reruns.
- **Scope guard:** Only `apps/web/tests/e2e/market-readiness.spec.ts` and this cumulative artifact were changed. `playwright.config.mjs`, application/config files, lockfiles, sibling marketplace/management worktree, servers, Docker, page interception/stubs, reset/discard, commits, pushes, lifecycle, review commands, broad suites, and builds were not touched or run.
- **Environment repair:** `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_API_PORT`, and `PLAYWRIGHT_WEB_PORT` were cleared for each command process without persisting environment changes. `pnpm install --frozen-lockfile` was not needed because the existing dependency was already materialized. The preflight command reported `Version 1.60.0`; browser binaries were available because Playwright launched real browser tests. No package or lockfile was added/changed.
- **Selector correction:** The demo validation assertion was narrowed from the ambiguous `getByRole('alert')` to the alert containing `Revisá los campos marcados`, fixing the verified collision with Next's empty `__next-route-announcer__` alert. No further selector edit or rerun was made after the subsequent runtime failure.

#### Exact bounded evidence

| Evidence | Command / exact result |
|---|---|
| Playwright preflight | `pnpm --dir apps/web exec playwright --version` — exit 0; `Version 1.60.0`. |
| Required Playwright command, initial attempt | `pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=desktop --project=mobile` — Playwright launched the managed harness and reported `Running 14 tests using 1 worker`; 1/14 passed, 2/14 failed, 11 did not run. Desktop demo failed on the test selector strict-mode collision with Next's empty route-announcer alert; mobile landing reported 0 `<main>` in the assertion despite the failure snapshot showing the rendered main. The command ended with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "playwright" not found` after the runner output. |
| Required Playwright command, one permitted selector-fix rerun | Same exact command after only the G test selector correction — managed API/web harness started; 5/14 passed, 2/14 failed, 7 did not run. Desktop workspace failed because no response event for `/api/agronautas/v1/runtime` arrived within 10 seconds; the page rendered `Backend Agronautas no disponible` with `request_aborted`. Mobile field detail failed on a real test-selector strict-mode collision: two visible level-1 `Detalle del lote` headings (shell and detail content). The command again ended with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "playwright" not found` after the runner output. |
| Managed harness | No `config.webServer` readiness timeout occurred in either attempt. The managed API/web children started sufficiently for browser execution; output contained only existing `punycode` and PostgreSQL SSL-mode warnings before the runtime failure. |
| Browser evidence | Real browser execution occurred for the tests that ran; failure snapshots were materialized for the selector/runtime failures. No complete route/project evidence exists because the serial suite stopped after the failures. |
| Build | Not run by instruction; prior slice recorded the build as green. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Exact required command was run twice total: initial `1/14` pass, `2` failures, `11` not run; one permitted selector-fix rerun `5/14` pass, `2` failures, `7` not run. G is not GREEN; all 14 tests did not pass. |
| Runtime harness command/scenario and exact result | Real managed API/web harness and real browser traffic were used with no `page.route`; blocked/unknown after `/demo` produced no observed `/api/agronautas/v1/runtime` response and rendered the application's unavailable boundary. No replacement webServer command or browser claim was made. |
| Rollback boundary | Revert only the alert locator narrowing in `apps/web/tests/e2e/market-readiness.spec.ts` and this verification entry in `apply-progress.md`; preserve all prior Unit A–F work, the existing G helper/spec/config, and unrelated working-tree edits. |

#### Unit G handoff

- G remains unchecked in `tasks.md`; do not claim 14/14 browser acceptance or complete per-route evidence.
- Remaining blockers: the managed `/api/agronautas/v1/runtime` response was not observed and rendered `request_aborted`; the mobile field test has a second strict selector collision for duplicate level-1 `Detalle del lote` headings. No further rerun was performed after the permitted selector-fix rerun, and no application/config change is justified by this verification.
- External provider/auth/tenant/lead/ingest proof remains separate, blocked/unknown, and unclaimed.

### Bounded Unit G real no-stub Playwright acceptance attempt — 2026-08-29

- **Work unit:** G — real no-stub Playwright acceptance for the public, demo, field, municipality, and ingest routes.
- **Status:** Blocked by a real application landmark defect and an independent web build type error; G remains unchecked in `tasks.md`. No application source was changed in this attempt and no rerun was made after the real defect.
- **Scope:** Added only `apps/web/tests/e2e/market-readiness-page.ts`, `apps/web/tests/e2e/market-readiness.spec.ts`, and `apps/web/tests/e2e/market-readiness.md`. The existing `apps/web/playwright.config.mjs` edits were preserved unchanged. No `page.route` interception, response stub, fabricated fixture, Docker, sibling worktree, commit, push, lifecycle, review, or unrelated suite was used.
- **Coverage encoded:** The spec covers `/`, `/probar-demo`, `/demo`, `/demo/fields/field-demo-1`, `/municipalities`, `/municipalities/ituzaingo`, and `/municipalities/ingest` at the configured desktop `1440x900` and mobile `390x844` projects. The helper asserts one main landmark, viewport-bounded document/body widths, no browser page crash, truthful route-specific state text, keyboard validation/retry paths, real BFF/API statuses, and screenshot/console/page-error/document/API network attachments.
- **Failure:** The first route, `/`, rendered zero `<main>` elements instead of the required one at both viewports. Playwright's snapshot showed the public landing heading, skip link, and `Ver Risk Engine` anchor but no main landmark. This is an application defect, not a selector/harness defect; the G attempt stopped without source repair. Because the spec is serial, the remaining 12 route/project cases did not run.
- **Build:** The required `pnpm --dir apps/web build` then failed during type checking at `apps/web/src/components/agronautas/workspace.tsx:317:96`: `Property 'fieldId' comes from an index signature, so it must be accessed with ['fieldId']`. This is outside the allowed G edit perimeter and remains unresolved.

#### TDD Cycle Evidence — Unit G

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G-real-browser-acceptance | `apps/web/tests/e2e/market-readiness.spec.ts` + `market-readiness-page.ts` | E2E | ✅ Existing Unit F viewport test and managed harness config | ✅ New no-stub route contract written before execution; it exposed `/` with 0 main landmarks | ❌ Not established: desktop/mobile landing assertions failed on the application defect; 12 route/project cases did not run | ❌ Not established for skipped routes; two landing snapshots captured the actual DOM boundary | ➖ Stopped per rule; no selector workaround or application edit was attempted |
| G-web-build | Existing application source, invoked by required build command | Type check/build | ✅ Existing edited workspace source was checked by Next build | N/A — build is the required post-E execution check | ❌ Failed at `workspace.tsx:317:96` on `validationErrors.fieldId` index-signature access | ➖ No change permitted in G |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `market-readiness.spec.ts` | `pnpm --dir apps/web exec playwright test tests/e2e/market-readiness.spec.ts --project=desktop --project=mobile` | Exit failure; `Running 14 tests using 1 worker`; desktop and mobile landing tests failed with `Expected 1`, `Received 0` for `locator('main')` at `market-readiness-page.ts:45`; `12 did not run` because the suite is serial. Harness emitted only the known `punycode` deprecation warning in the captured command output. |
| web build | `pnpm --dir apps/web build` | Exit failure; Next compiled successfully in `21.9s`, then type checking failed at `./src/components/agronautas/workspace.tsx:317:96`: `Property 'fieldId' comes from an index signature, so it must be accessed with ['fieldId'].` |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Required Playwright command above — exit failure; 2 executed landing tests failed on the real `/` landmark defect and 12 route/project tests did not run. No rerun was authorized after the application defect. |
| Runtime harness command/scenario and exact result | The same Playwright command started the existing managed API/web harness from `playwright.config.mjs` and used real browser/BFF/API traffic with zero `page.route` calls. `/` navigation returned HTTP 200; the actual DOM had 0 `<main>`. Remaining runtime scenarios are blocked by serial fail-fast behavior. |
| Screenshots / console / network evidence | The spec's `finally` path requests one full-page screenshot plus console, page-error, and document/API network JSON per executed test. Playwright materialized the two failure `error-context.md` snapshots under `apps/web/test-results/market-readiness-Agronauta-b733c-ath-and-keyboard-navigation-{desktop,mobile}/`; no standalone attachment files were materialized before the serial stop. The snapshots contain the actual DOM and route failure; no clean-console, provider, lead, auth, tenant, or ingest claim is made. |
| Rollback boundary | Remove only `apps/web/tests/e2e/market-readiness-page.ts`, `apps/web/tests/e2e/market-readiness.spec.ts`, `apps/web/tests/e2e/market-readiness.md`, and this G progress entry. Preserve all prior Unit A–F implementation/tests, the existing Playwright config, and unrelated worktree edits. |

#### Unit G handoff

- G remains unchecked in `tasks.md`; the checkbox must not be marked until the landing main-landmark defect and build failure are resolved in an authorized slice, followed by a fresh full route/project run.
- The landing failure is not a test-selector or harness issue: `/` is a real public route with no `<main>` element. Fixing it is outside this initial G perimeter because application source changes were prohibited.
- The web build failure is also outside the G perimeter: `apps/web/src/components/agronautas/workspace.tsx:317:96` requires bracket notation for `validationErrors.fieldId` under the current TypeScript configuration.
- External readiness is blocked/unknown and remains separate: no valid lead acceptance, production/provider citation, authenticated tenant proof, or authorized ingest completion was inferred from local execution.

### Completed bounded Unit F sticky status summary implementation — 2026-08-28

- **Work unit:** F — municipality detail sticky status summary, limited to the existing summary/index/detail boundary.
- **Status:** GREEN for the sticky summary implementation and direct component contract; Unit F remains unchecked because authorized viewport evidence at desktop and 390px is still required.
- **Scope:** Only `apps/web/src/components/government/detail.tsx` was changed in this implementation pass. The existing RED assertions in `detail.test.tsx` and this cumulative progress artifact were preserved/updated. No sibling marketplace/management worktree, other source, API/BFF behavior, server, Playwright, broad test, commit, push, lifecycle, or review command was used.
- **Implementation:** Added a compact, responsive, non-interactive sticky `Estado resumido municipal` region immediately before the existing municipality section index. It renders `Estado`, `Frescura`, `Umbral`, `Confianza`, and `Próxima acción segura` in deterministic order from the existing `createMunicipalityOperatorSummary` adapter. The page now clips viewport-level horizontal overflow, bounds long summary values, and increases detail target scroll margins from `scroll-mt-24` to `scroll-mt-32` so sticky content does not occlude focused sections. Existing Unit D/E behavior, copy, API props, and links remain unchanged.

#### TDD Cycle Evidence — sticky status summary implementation

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| F-municipality-sticky-summary | `apps/web/src/components/government/detail.test.tsx` | Component | ✅ Existing cumulative detail contract 13/13 | ✅ Required run: 14 tests, 12 pass, 2 intended failures because the new region rendered labels without the expected colon-separated contract | ✅ One permitted rerun: 14/14 pass, 0 fail/cancelled/skipped | ✅ Populated and empty-data paths; all five summary values/action and non-interactive descendant contract | ✅ Reused one computed `createMunicipalityOperatorSummary` result for both summary views; bounded sticky/focus layout without changing status logic |

#### Exact bounded test evidence

| Test File | Command | Exact result |
|---|---|---|
| `detail.test.tsx` | `pnpm --dir apps/web exec node --import tsx --test --test-timeout=50000 src/components/government/detail.test.tsx` | First required run after the sticky implementation: exit failure from the two intended RED assertions; `tests 14`, `pass 12`, `fail 2`, `cancelled 0`, `skipped 0`; file completed normally in `37,819.9926 ms` (the file-level subtest was not cancelled by timeout). |
| `detail.test.tsx` | Same exact command after the assertion-contract correction | Exit 0; `tests 14`, `pass 14`, `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`; `duration_ms 10928.4602`; normal completion within the 90-second external timeout. |

#### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Exact direct detail command above; final exit 0 with 14/14 tests passing and no failures, cancellations, skips, or todos. The preceding 14-test RED run had exactly the two intended summary-contract failures and completed normally; it was not a timeout. |
| Runtime harness command/scenario and exact result | N/A — this bounded component slice explicitly prohibits servers, runtime smoke, Playwright, and broad suites; viewport overflow/focus-occlusion proof remains deferred to the authorized F/G browser lane. |
| Rollback boundary | Revert only the `MunicipalityStickySummaryPanel`, shared `operatorSummary` computation, `overflow-x-hidden` main boundary, and `scroll-mt-32` detail target adjustments in `apps/web/src/components/government/detail.tsx`; preserve existing Unit D/E status/copy, summary adapter, section links, API props, tests, cumulative Units A–E, and unrelated worktree edits. |

#### Unit F handoff

- Unit F remains unchecked in `tasks.md` by instruction; viewport evidence at `1440x900` and `390x844` is still required to prove no horizontal overflow and no sticky/focus occlusion.
- The direct municipality detail contract is now GREEN at 14/14. The non-fatal JSDOM `activeElement.attachEvent` diagnostic still appears during the existing focus assertion and does not fail or cancel the suite.
- Unit G remains pending: real no-stub Playwright acceptance and production-boundary evidence.

### Current Unit G result — 2026-08-29

- Full required Playwright acceptance passed: desktop 7/7 and mobile 7/7, total 14/14, exit 0; all seven audited routes executed per project with real managed API/web traffic and no interception or stubs.
- Required `pnpm --dir apps/web build` passed with exit 0: compile, type check, static generation 8/8, and route optimization completed; only existing warning-only lint messages were emitted.
- Evidence hooks requested screenshots plus console/network/page-error attachments for all 14 tests; no standalone attachment files materialized under `apps/web/test-results`. Every document navigation was asserted and passed with HTTP 200; exact numeric API/BFF statuses were not printed by the list reporter. The helper's declared API status assertions passed; no unsupported status or clean-console claim is inferred.
- Local demo/unavailable evidence is separate from external production/provider/auth/tenant/lead/authorized-ingest proof, which remains blocked/unknown and unclaimed.
