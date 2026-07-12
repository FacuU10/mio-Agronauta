# Apply Progress: Iberá Alerta Real Feeds Local Production Launch

## Status

All implementation tasks plus the verification BLOCKER remediation are complete. PNA HTML fetching is bounded to 1MB bytes/chars by default, official table parsing is bounded by rows/cells/value length, and the local-real verifier captured an HTTP 202 proof with PNA `recordsIngested: 9`.

## Completed Tasks

- [x] 1.1 Default PNA URL to `https://contenidosweb.prefecturanaval.gob.ar/alturas/`.
- [x] 1.2 Expose source client `timeoutMs`.
- [x] 1.3 Add runner timeout helper with +2s cushion and 60s cap.
- [x] 2.1 Parse official-style PNA HTML table rows for monitored Corrientes stations.
- [x] 2.2 Treat INMET HTTP 204 as empty success.
- [x] 2.3 Return honest INA/SMN degraded diagnostics for unsupported official HTML/JSON.
- [x] 2.4 Preserve one network fetch attempt per source; no retries/polling added.
- [x] 3.1 Use dynamic source deadlines in the ingestion runner.
- [x] 3.2 Preserve provider diagnostics in per-source route results.
- [x] 4.1 Add PNA parser unit tests.
- [x] 4.2 Add HTTP client degraded/204 tests.
- [x] 4.3 Update local-real verifier to assert PNA records when expected and capture source responses.
- [x] 4.4 Run one bounded local-real all-source verification against production DB.
- [x] 5.1 Replace unbounded PNA HTML `response.text()` with bounded streaming read and safe `response_too_large` diagnostics.
- [x] 5.2 Bound official PNA table parsing: max 50 matched rows, max 12 cells per row, max 120 chars per cell value.
- [x] 5.3 Add oversized response and row/cell bound regression tests.
- [x] 5.4 Re-run package/root tests, build, and one bounded local-real all-source verifier against production DB.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1, 1.2, 2.2, 2.3, 2.4 | `packages/hydrology-engine/src/clients/http-clients.test.ts` | Unit | ✅ `packages/hydrology-engine` 22/22, `apps/api` 139/139 baseline | ✅ New tests failed for old PNA default and INMET 204 | ✅ `packages/hydrology-engine` 27/27 | ✅ PNA default, 204 empty, INA/SMN degraded paths | ✅ Constants/helper extraction |
| 2.1 | `packages/hydrology-engine/src/adapters/pna-adapter.test.ts` | Unit | ✅ Same baseline | ✅ Official table parser test failed with zero rows | ✅ `packages/hydrology-engine` 27/27 | ✅ Monitored + ignored malformed/non-monitored rows | ✅ Parser helpers for cells, dates, station normalization |
| 1.3, 3.1, 3.2 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Unit/integration | ✅ `apps/api` 139/139 baseline | ✅ Timeout/diagnostics expectations added before runner changes | ✅ `apps/api` 140/140 | ✅ Provider diagnostic preservation with client timeout metadata | ✅ `runnerTimeoutFor` helper and timeout constants |
| 4.3, 4.4 | `apps/api/src/scripts/verify-hydrology-local-real.ts` + local-real artifact | Script/contract | ✅ Existing API tests baseline | ✅ Verifier assertions added before local-real run | ✅ One-shot local-real proof passed | ✅ Captures all source responses and PNA assertion | ✅ Bounded output structure only |
| 5.1, 5.3 | `packages/hydrology-engine/src/clients/http-clients.test.ts` | Unit | ✅ `packages/hydrology-engine` 27/27 baseline before blocker fix | ✅ Oversized PNA response test failed before bounded reader | ✅ `packages/hydrology-engine` 30/30 | ✅ Oversize path plus existing normal PNA success path | ✅ Bounded reader extracted with default PNA caps |
| 5.2, 5.3 | `packages/hydrology-engine/src/adapters/pna-adapter.test.ts` | Unit | ✅ Same baseline | ✅ Row bound test failed at 64 records before parser bounds | ✅ `packages/hydrology-engine` 30/30 | ✅ Row bound and cell bound cases | ✅ Parser loop rewritten to bounded iteration without materializing all rows/cells |
| 5.4 | local-real artifact | Script/contract | ✅ `pnpm build` and `pnpm test` passed before local-real rerun | ✅ N/A; verifier already enforced one-shot assertions | ✅ One-shot local-real proof passed | ✅ Captures PNA success plus degraded source diagnostics | ✅ No retries/polling added |

## Verification Evidence

- `pnpm --dir packages/hydrology-engine test` — PASS, 30/30.
- `pnpm --dir packages/zod-schemas test` — PASS, 26/26.
- `pnpm --dir apps/api test` — PASS, 140/140.
- `pnpm build` — PASS, 4/4 turbo build tasks.
- `pnpm test` — PASS, 6/6 turbo test tasks.
- One bounded local-real verification command:
  - `$env:NODE_ENV='production'; $env:HYDROLOGY_PNA_TIMEOUT_MS='25000'; pnpm --dir apps/api exec tsx src/scripts/verify-hydrology-local-real.ts --mode api --all-sources --out ../../artifacts/hydrology-local-real-prod-ibera-alerta-real-feeds-local-prod.json`
  - Result: HTTP `202`, contract valid, `status: partial`, production DB target `remote`, PNA `status: success`, PNA `recordsIngested: 9`, `assertions.passed: true`.

## Local-Real Source Results

| Source | Status | recordsIngested | Diagnostic |
|--------|--------|-----------------|------------|
| PNA | success | 9 | Official fast endpoint, provenance `https://contenidosweb.prefecturanaval.gob.ar/alturas/` |
| INA | failed | 0 | Honest `unexpected_content_type` for official HTML endpoint |
| INMET | failed | 0 | Honest `http_status` 404 from `apitempo.inmet.gov.br/estacao/diaria/2026-07-12` |
| SMN | failed | 0 | Honest `http_status` 403 from official alerts endpoint |

## Deviations

- INMET now defaults to the actual `apitempo.inmet.gov.br/estacao/diaria/{date}` style endpoint and reports HTTP 404 as degraded when the endpoint has no row for the generated date; 204 is explicitly supported as empty.
- INA/SMN were not given fake parsers; unsupported/blocked official responses remain degraded diagnostics.
- Added public-safe diagnostic failure kind `response_too_large` so the bounded PNA client can report oversized official HTML without leaking response bodies.

## Readiness

Ready for SDD verify. The previous blocker is remediated, and no repeated provider verification calls were made beyond the single local-real all-source run recorded above.
