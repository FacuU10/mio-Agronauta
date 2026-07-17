# Tasks: Iberá Alerta Production Stability Smoke

## Review Workload Forecast

- Delivery mode: single PR / small bounded slice.
- 400-line budget risk: Low.
- Chained PRs recommended: No.
- Decision needed before apply: No.
- Operator-only Render, keep-alive, regional-routing, and cron tasks are excluded from this implementation workload and remain pending for a separately approved operator phase.

## Phase 1: Runtime Configuration and Health

- [x] 1.1 Add RED tests for finite `AGRONAUTAS_READINESS_DEPENDENCY_TIMEOUT_MS` parsing, the 2000 ms fallback, safe upper cap, and optional revision sourcing only from `RENDER_GIT_COMMIT`.
- [x] 1.2 Implement bounded runtime timeout and safe optional revision metadata in the API runtime configuration adapter.
- [x] 1.3 Add RED tests for `/health` and `/ready` revision safety and configured dependency timeout behavior, including assertions that credentials, URLs, and environment dumps are absent.
- [x] 1.4 Wire the configured dependency timeout and safe revision metadata into `/health` and `/ready`; preserve existing readiness semantics.
- [x] 1.5 Run focused API health tests and record exact RED, GREEN, TRIANGULATE, REFACTOR, runtime harness, and rollback evidence.

## Phase 2: API Verification

- [x] 2.1 Add RED tests for protected `POST /api/hydrology/ingest/verify`: exact success contract/version, existing credential check, 401 contract, no runner/coordinator call, no token in response/logs, and `Cache-Control: no-store`.
- [x] 2.2 Implement the side-effect-free verification route using the existing hydrology ingest credential check.
- [x] 2.3 Triangulate valid, missing, and invalid credentials and verify that protected ingestion remains the only coordinator path.
- [x] 2.4 Run focused API hydrology tests and record exact RED, GREEN, TRIANGULATE, REFACTOR, runtime harness, and rollback evidence.

## Phase 3: BFF Protected-Path Forwarding

- [x] 3.1 Add RED tests for the exact protected-path allowlist covering `POST /api/hydrology/ingest/verify` and the existing protected ingest path.
- [x] 3.2 Implement credential forwarding only for those two POST paths; preserve method, body, status, content type, and `no-store` semantics.
- [x] 3.3 Triangulate unprotected paths and non-POST requests to prove the token is never forwarded elsewhere or logged.
- [x] 3.4 Run focused BFF tests and record exact RED, GREEN, TRIANGULATE, REFACTOR, runtime harness, and rollback evidence.

## Phase 4: Browser Memory-Only Ingest Gate

- [x] 4.1 Add RED component and browser tests for hidden controls before verification, successful verification, failed verification, refresh/unmount revocation, and absence of token in storage, cookies, DOM, URL, response, and logs.
- [x] 4.2 Implement the verification form and memory-only token/verified state; reveal existing controls only after successful verification.
- [x] 4.3 Route existing ingest actions through the in-memory header and clear token and verified state after ingestion, refresh, or unmount without persistent storage.
- [x] 4.4 Run focused component tests and browser gate tests, then record exact RED, GREEN, TRIANGULATE, REFACTOR, runtime harness, and rollback evidence.

## Corrective Blocker Slice: Verified Production-Smoke Findings

- [x] C.1 Add a BFF timeout regression test and remove `upstreamOrigin`/`upstreamPath` from timeout responses while retaining those fields in server-only failure logs.
- [x] C.2 Add deterministic API evidence that INMET/SMN environmental geo-block failures preserve last-known telemetry, persist zero records with failed status, and never report source success.

## Operator Remainder (Pending; Do Not Automate Here)

- [ ] O.1 Obtain redacted Render approval/evidence for the finite BFF timeout and approved connection policy.
- [ ] O.2 Obtain redacted regional routing approval/evidence for production hydrology traffic.
- [ ] O.3 Obtain one redacted hourly cron execution proof with timestamp, run identity, and outcome.
- [ ] O.4 Assemble bounded production smoke evidence correlating revision, health/readiness, BFF behavior, browser gate, cron, and independent INMET/SMN outcomes.

## Work Unit Evidence Requirements

Every completed phase/work unit MUST include all of the following in apply progress:

| Evidence | Required value |
|---|---|
| Focused test command and exact result | The smallest command proving the unit, including exit status and relevant test counts. |
| Runtime harness command/scenario and exact result | A real integration/runtime scenario; use `N/A` only when no runtime boundary exists and explain why. |
| Rollback boundary | Exact files and behavior that can be reverted without removing unrelated work. |

## Strict TDD Evidence Requirements

Each implementation task must follow RED (test written and failing before production code), GREEN (minimum implementation passes), TRIANGULATE (additional distinct scenario passes), and REFACTOR (behavior-preserving cleanup with tests still passing). Unexpectedly passing RED tests must be recorded as a TDD deviation rather than fabricated as failure evidence.
