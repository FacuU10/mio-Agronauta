# Tasks: Iberá Alerta Real Feeds Local Production Launch

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Core adapters, timeout runner, and verifier script | PR 1 | Target: main. Single clean deliverable with unit tests. |

## Phase 1: Foundation / Infrastructure
- [x] 1.1 Config: In `packages/hydrology-engine/src/clients/http-clients.ts`, default PNA url to `https://contenidosweb.prefecturanaval.gob.ar/alturas/`.
- [x] 1.2 Config: Expose `timeoutMs` or a custom accessor on `GovernmentSourceClient`.
- [x] 1.3 Config: In `apps/api/src/presentation/routes/hydrology-government.ts`, add helper `runnerTimeoutFor(client, source)` returning client timeout + 2s cushion, capped at 60s.

## Phase 2: Core Implementation & Adapters
- [x] 2.1 PNA: In `packages/hydrology-engine/src/adapters/pna-adapter.ts`, rewrite `parse(body)` to handle PNA's fast HTML table structure, extract name, height, trend, and date, and map names to official station IDs.
- [x] 2.2 INMET: In `packages/hydrology-engine/src/clients/http-clients.ts`, handle HTTP 204 response gracefully, resolving with `ok: true, records: []` rather than failure.
- [x] 2.3 INA/SMN: In `packages/hydrology-engine/src/clients/http-clients.ts` and adapters, return clean degraded diagnostics if no stable parseable JSON feed is found, rather than reporting fake success.
- [x] 2.4 Anti-DDoS: Enforce exactly one network fetch attempt per source with no retry loop, polling, or repeated scraping.

## Phase 3: Route & Runner Alignment
- [x] 3.1 Route: In `apps/api/src/presentation/routes/hydrology-government.ts`, update `createGovernmentIngestionRunner` to use dynamic deadlines from `runnerTimeoutFor` instead of the fixed 12s cap.
- [x] 3.2 Route: Retain and merge specific client-level diagnostics in the final `GovernmentIngestionSourceResult` response payload instead of masking them behind runner timeouts.

## Phase 4: Testing & Verification
- [x] 4.1 Unit Tests: Add tests in `pna-adapter.test.ts` verifying real HTML table parsing against a mock HTML fixture.
- [x] 4.2 Unit Tests: In `http-clients.test.ts`, assert graceful INMET 204 handling and INA/SMN degraded diagnostic behavior.
- [x] 4.3 Verifier: In `apps/api/src/scripts/verify-hydrology-local-real.ts`, require `recordsIngested > 0` for PNA when official rows are available.
- [x] 4.4 Smoke Test: Execute one-shot local backend run against production database to produce the verification artifact.

## Phase 5: Verify Blocker Remediation
- [x] 5.1 PNA client safety: Replace unbounded `response.text()` with bounded streaming read for PNA HTML, capped at 1MB bytes/chars by default, returning `response_too_large` diagnostics on exceed.
- [x] 5.2 PNA parser safety: Bound official table parsing to max rows, max cells per row, and max cell value length.
- [x] 5.3 Regression tests: Add oversized PNA response and official row/cell bound tests.
- [x] 5.4 Readiness rerun: Re-run tests/build and one bounded local-real all-source verifier against the production DB.
