# Proposal: Iberá Alerta Production Browser Ingest

## Intent

Let authenticated civil-defense operators trigger the existing production hydrology ingest from a minimal same-origin web UI, without exposing, persisting, recovering, or logging an ingest token.

## Scope

### In Scope
- Dedicated `/municipalities/ingest` operator page with a password-masked token field held only in React memory.
- Same-origin Next.js BFF forwarding `x-hydrology-ingest-token` only to canonical `POST /api/hydrology/ingest`.
- Sanitized rendering of the existing structured ingest result, including safe failure/partial states.
- Anonymous-access rejection; authenticated upstream rejection remains visible as a safe error.

### Out of Scope
- Token recovery, rotation, provisioning, persistence, browser storage, cookies, telemetry/logging, or hardcoded values.
- A `/hidrology/ingest` compatibility alias, backend ingest redesign, dashboard integration, or additional provider retries.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `ibera-alerta`: Extend hydrology proxy and production-safe ingest behavior with an authenticated, same-origin operator trigger and safe result presentation.

## Approach

Add a narrowly scoped client operator page and presentational ingest panel. Keep the token in local component state; POST it to the Next.js proxy, whose explicit header allowlist adds `x-hydrology-ingest-token` and forwards it unchanged to the existing canonical route. The UI displays only the upstream safe structured contract and clears token state after submission/unmount. No token is retained or emitted by either UI or proxy.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/app/municipalities/ingest/page.tsx` | New | Operator-only trigger route |
| `apps/web/src/components/government/ingest-panel.tsx` | New | Masked input and sanitized result UI |
| `apps/web/src/app/api/hydrology/[...path]/route.ts` | Modified | Explicitly forward ingest token header |
| `openspec/specs/ibera-alerta/spec.md` | Modified | Browser ingest/proxy requirements |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Token disclosure | Med | Memory-only masked field; prohibit storage, cookies, logs, literals, and recovery |
| Unauthorized trigger | Med | Reject anonymous access; preserve upstream token validation |
| Historic secret exposure | Med | Do not reproduce values; rotate/revoke externally if still valid |

Historical Git audit found prior token-like literal additions (lengths 9, 137, and 187); `1493df9`'s `env.env` contained only a database URL. This change performs no secret recovery or value disclosure.

## Rollback Plan

Revert the route, panel, and proxy allowlist changes as one stacked-to-main slice; remove the operator route. The existing ingest endpoint and public read paths remain unchanged. Revoke/rotate the operational token outside Git if exposure is suspected.

## Dependencies

- Existing authenticated `POST /api/hydrology/ingest`, production token configuration, and route-level operator access control.
- Strict TDD evidence; force-chained/stacked-to-main delivery with a 1,200-line review budget.

## Success Criteria

- [ ] Anonymous users cannot access or trigger ingest; authorized operators can submit only to `/api/hydrology/ingest` through the same-origin BFF.
- [ ] The BFF forwards the token header; token values never reach source, Git, storage, cookies, or logs.
- [ ] UI renders sanitized `completed`, `partial`, and `failed` results without exposing internal diagnostics or secrets.
- [ ] Production smoke performs the bounded existing ingest verification and rollback removes browser-trigger capability without affecting reads.
