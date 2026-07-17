# Design: Iberá Alerta Production Browser Ingest

## Technical Approach

Add a small server page at `/municipalities/ingest` which renders a client `IngestPanel`. The panel submits the entered token only as `x-hydrology-ingest-token` to the existing same-origin `POST /api/hydrology/ingest`; it does not create an endpoint or compatibility alias. The existing hydrology BFF forwards that header through its explicit allowlist only for the canonical `POST ingest` path, rejects a missing header before fetch, and preserves the API's token validation and rate limit. The panel parses an allowlisted view model, not arbitrary upstream diagnostics.

## Architecture Decisions

| Decision | Options / tradeoff | Choice and rationale |
|---|---|---|
| Credential lifetime | Storage/cookie vs component state | Local React state only; clear in `finally` after every request and in effect cleanup on unmount. No literals, logs, telemetry, URL params, server state, or recovery. |
| BFF scope | New browser endpoint vs existing canonical proxy | Extend only `apps/web/src/app/api/hydrology/[...path]/route.ts`; forward the token exclusively for `POST /ingest`. This retains upstream authorization and adds no anonymous endpoint. |
| Result display | Render raw JSON/errors vs allowlisted model | Render status, run/proof IDs, requested source names, each source status, and numeric records; map all failures to fixed Spanish messages. Never render `errorMessage`, diagnostics, headers, or unknown fields. |
| Operator access | Invent web auth vs current boundary | The repository has no web middleware/session guard. The token remains the existing authorization factor; BFF rejects absent tokens and upstream rejects invalid tokens. A page-level identity gate is out of scope until a real operator-auth primitive exists. |

## Data Flow

    operator input (memory only)
              │ POST + x-hydrology-ingest-token
              ▼
    /municipalities/ingest → same-origin /api/hydrology/ingest
                                      │ explicit path/header allowlist
                                      ▼
                            existing API authorization/rate limit
                                      │ safe ingest contract
                                      ▼
                         allowlisted UI result and live status

On submit, disable the button, clear any prior result, send the fixed ingest body, parse only JSON, and clear the token in `finally`. Network/non-JSON/401/429/5xx outcomes become fixed user-safe states. Do not poll `statusPath` in this slice; show the queued response and approved identifiers only.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/app/municipalities/ingest/page.tsx` | Create | Server page that renders the client panel. |
| `apps/web/src/components/government/ingest-panel.tsx` | Create | Accessible memory-only form and sanitized result view. |
| `apps/web/src/components/government/ingest-panel.test.tsx` | Create | RED/GREEN component tests, including cleanup. |
| `apps/web/src/app/api/hydrology/[...path]/route.ts` | Modify | Path-gated header forwarding and missing-header rejection; redact the sensitive header from forwarding logs. |
| `apps/web/src/app/api/hydrology/[...path]/route.test.ts` | Modify | BFF contract and non-forwarding tests. |
| `apps/web/tests/e2e/hydrology-government.spec.js` | Modify | Mocked browser flow and accessibility assertions without an operational token. |

## Interfaces / Contracts

```ts
type SafeIngestView = {
  status: 'queued' | 'started' | 'completed' | 'partial' | 'failed'
  runId?: string; proofRunId?: string
  requestedSources: string[]
  results: Array<{ source: string; status: 'success' | 'failed' | 'empty' | 'skipped'; recordsIngested: number }>
}
```

The BFF accepts `x-hydrology-ingest-token` only when `request.method === 'POST'` and route path equals `ingest`; the exact value is forwarded unchanged and is never included in logs or response headers. All other paths retain today's allowlist. The API contract remains `hydrology-government-ingest-v1`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (RED first) | Masked labeled input, busy state, status/live region, safe completed/partial/failed render; token cleared after success, failure, and unmount | Node test + Testing Library/JSDOM, mocked `fetch`; assert no raw diagnostic/token text. |
| Integration (RED first) | Canonical POST forwards token; token is absent for GET/non-ingest paths and logs; missing token stops before upstream; status/body/content type persist | Extend existing Next route tests with mocked `fetch`. |
| E2E | Keyboard submission, disabled control, accessible label/status, sanitized mocked result | Playwright route interception; no real credential or production mutation. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable classification | N/A | N/A |
| Git repository selection | N/A — no VCS command | N/A | N/A |
| Commit state | N/A — no commit automation | N/A | N/A |
| Push state | N/A — no push automation | N/A | N/A |
| PR commands | N/A — delivery is planned, not executed | N/A | N/A |

## Migration / Rollout

No migration required. Deliver one stacked-to-main slice under the 1,200-line budget. Roll back by reverting the page, panel, BFF path/header change, and tests together; public read paths and the canonical API ingest route remain intact. Historical Git secret exposure is a rotation/audit concern only: audit and rotate/revoke externally if warranted, without recovering or reproducing values.

## Open Questions

- [ ] Is a real operator identity/session mechanism available for a future page-level access gate? It is not present in the current web boundaries.
