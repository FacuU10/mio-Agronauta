# Design: Iberá Alerta Production Stability Smoke

## Technical Approach

Keep production stabilization at existing boundaries: parse a bounded API readiness setting in the runtime-config adapter, add safe deployment revision metadata to health responses, and add an API-verified, memory-only UI gate before the existing ingest action. The Next.js BFF remains the sole browser-to-API boundary and forwards the ingest credential only to the two explicit protected paths. Render/cron settings are operator prerequisites, not application configuration or automatic mutations.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Parse `AGRONAUTAS_READINESS_DEPENDENCY_TIMEOUT_MS` in `getAgronautasRuntimeConfig()` with a positive capped value and retain 2s as the safe fallback. | Hard-code a longer timeout; tune each dependency independently. | One explicit API-only cold-start control fixes the verified PostgreSQL readiness flap without silently making outage detection unbounded. |
| Add optional non-secret `revision` from `RENDER_GIT_COMMIT` (or equivalent) to `/health` and `/ready`. | Expose all environment/build fields; omit revision. | Correlates smoke evidence to a deploy while excluding URLs, credentials, and infrastructure internals. |
| Introduce authenticated `POST /ingest/verify`; retain the credential only in React state after a successful verification. | Trigger ingestion as verification; session/cookie/local-storage auth. | Verification has no ingestion side effect and refresh/unmount revokes UI access without a persistent browser secret. |
| Treat API, web BFF, and Render/cron settings as separate operator configurations. | Share one cross-service timeout/config variable. | Prevents a web proxy change from weakening API readiness, and makes operational ownership/audit evidence clear. |

## Data Flow

    Browser token (React memory)
             │ POST /api/hydrology/ingest/verify (header only; no-store)
             ▼
    Next BFF allowlist ──► API verify ──► { authorized: true }
             │                         (no token in response/logs)
             ▼
    verified React state reveals existing ingest controls
             │ POST /api/hydrology/ingest (same in-memory header)
             ▼
            Next BFF ──► API ingestion coordinator

`/health` and `/ready` independently read runtime config and return the same optional safe revision value. An unset revision is `null`/omitted by the agreed contract, never a fabricated value.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/infrastructure/config/agronautas-runtime.ts` | Modify | Parse and bound the readiness timeout and safe revision metadata. |
| `apps/api/src/presentation/routes/health.ts` | Modify | Consume configured timeout and include revision in liveness/readiness payloads. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Add side-effect-free authenticated verification route using the existing credential check. |
| `apps/web/src/app/api/hydrology/[...path]/route.ts` | Modify | Allowlist/forward credential only for POST ingest and verify; preserve redacted logs and bounded BFF timeout. |
| `apps/web/src/components/government/ingest-panel.tsx` | Modify | Render a verification form first; retain credential and verified state only in component memory; clear on unmount and after ingestion. |
| `apps/api/src/presentation/routes/health.test.ts` | Modify | RED/GREEN config-bound, fallback, and revision contract tests. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modify | RED/GREEN verify authorization/no-side-effect/no-secret-response tests. |
| `apps/web/src/app/api/hydrology/[...path]/route.test.ts` | Modify | RED/GREEN verify forwarding allowlist and token non-forwarding tests. |
| `apps/web/src/components/government/ingest-panel.test.tsx` | Modify | RED/GREEN hidden-control, successful gate, reset, and no-token-rendering tests. |
| `apps/web/tests/e2e/hydrology-ingest.spec.js` | Modify | Browser gate, refresh revocation, storage-empty, and request-header-only coverage. |

## Interfaces / Contracts

```ts
type HealthResponse = { status: 'ok'; timestamp: string; revision?: string | null }
type ReadyResponse = { ready: boolean; revision?: string | null; /* existing fields */ }
type IngestVerificationResponse = { contractVersion: '1.0.0'; authorized: true }
```

`POST /api/hydrology/ingest/verify` accepts the existing `x-hydrology-ingest-token` request header, returns `401 HYDROLOGY_INGEST_UNAUTHORIZED` on failure, uses `Cache-Control: no-store`, performs no runner/coordinator call, and never returns or logs the credential. Only verified memory state reveals ingestion controls; it is lost on reload/unmount.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Config fallback/cap, health revision, verify authorization | Node tests first (RED), then implementation. |
| Integration | BFF protected-path header allowlist and API verify has no ingestion side effect | Existing route test harness; assert logs/responses lack the token. |
| E2E | Controls hidden until verification; refresh clears access; token absent from DOM/URL/storage | Playwright interception and browser storage assertions. |
| Smoke | Cold start, revision correlation, BFF timeout/keep-alive, regional route, hourly cron | Redacted operator evidence; classify INMET/SMN regional blocks as environmental. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. The Next route is an existing HTTP BFF; its explicit protected-path allowlist and token non-disclosure are covered above.

## Migration / Rollout

No data migration required. Configure API readiness/revision separately from web BFF timeout/internal URL. Operators separately set Render keep-alive/regional routing and confirm cron execution; artifacts record only names, bounds, timestamps, revision, and redacted outcomes. Roll back by reverting the narrow code changes and restoring prior operator settings.

## Open Questions

- [ ] Confirm the approved upper bound and production value for `AGRONAUTAS_READINESS_DEPENDENCY_TIMEOUT_MS` before apply.
- [ ] Confirm Render's exact keep-alive, regional-routing, and hourly-cron settings/evidence owner; no application change will mutate them.
