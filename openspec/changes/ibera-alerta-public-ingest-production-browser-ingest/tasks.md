# Tasks: Iberá Alerta Production Browser Ingest

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450-550 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (BFF Route) → PR 2 (Client Component & Route) |
| Delivery strategy | stacked-to-main |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | BFF proxy routing & token header forwarding | PR 1 | `node --import tsx --test apps/web/src/app/api/hydrology/[...path]/route.test.ts` | Mocked upstream API server / Local dev BFF testing | Revert BFF changes in `route.ts` & `route.test.ts` |
| 2 | Masked UI client panel & ingest route | PR 2 | `node --import tsx --test apps/web/src/components/government/ingest-panel.test.tsx` | Next.js local development server (`pnpm dev`) | Delete `/municipalities/ingest` and `ingest-panel.tsx` |

## Phase 1: Hydrology BFF proxy adjustments (PR 1)

- [x] 1.1 **RED**: Add failing integration test to `apps/web/src/app/api/hydrology/[...path]/route.test.ts` asserting token-forwarding fails for GET/non-ingest paths, rejects missing header on POST, and forwards `x-hydrology-ingest-token` only to canonical POST `/api/hydrology/ingest`.
- [x] 1.2 **GREEN**: Update `apps/web/src/app/api/hydrology/[...path]/route.ts` to implement canonical-path check, header forwarding, missing-header rejection, and redaction in logs. Ensure no hardcoded tokens or anonymous triggers exist.
- [x] 1.3 **REFACTOR**: Polish BFF proxy code ensuring strict compliance with Vercel React Best Practices, correct TypeScript assertions, and complete error handling.

## Phase 2: Client Operator UI (PR 2)

- [x] 2.1 **RED**: Add failing unit tests in `apps/web/src/components/government/ingest-panel.test.tsx` for password-masked token input, keyboard operability, clear-on-finally, and sanitized outputs for completed/partial/failed states.
- [x] 2.2 **GREEN**: Create client panel in `apps/web/src/components/government/ingest-panel.tsx` using memory-only React state, masking, explicit cleanup in `finally` and unmount, and aria-live announcements.
- [x] 2.3 **GREEN**: Create page `apps/web/src/app/municipalities/ingest/page.tsx` rendering `IngestPanel` under default layout.
- [x] 2.4 **REFACTOR**: Refactor UI elements to align with tailwind-4 utility structure and react-19 memory patterns. Eliminate all token leak risks.

## Phase 3: Integration & E2E Testing

- [x] 3.1 **RED/GREEN**: Add a deterministic Playwright test in `apps/web/tests/e2e/hydrology-ingest.spec.js` covering the token-gated operator flow, one sanitized same-origin POST, and non-persistence without an operational secret.
- [x] 3.2 **GREEN**: Mock the Next.js BFF response within E2E context to satisfy Playwright routing without actual operational secrets. Ensure no credentials are saved.
- [x] 3.3 **REFACTOR**: Use accessible labels/roles and stable request/result assertions; page-level identity gating remains outside this slice because no existing web auth/session primitive is available.

## Phase 4: Production Evidence & Secret Rotation (Operator-Gated)

- [ ] 4.1 **Operator-Gated**: Conduct manual audit of historical repository git commits for accidental secret exposures; perform key rotation on Next.js/Express secret managers externally.
- [ ] 4.2 **Operator-Gated**: Generate live production browser-origin ingest evidence, capture UI screenshot, and sign the verify report.
