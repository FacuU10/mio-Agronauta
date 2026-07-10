# Apply Progress: ibera-alerta-pna-ingest-safe-fix

## Status

Implementation complete for code/test tasks. Production smoke tasks are intentionally pending for verify after commit/deploy.

## Completed Tasks

- [x] 1.1 Add `hydrologyGovernmentIngestDiagnosticSchema` in `packages/zod-schemas/src/agronautas.ts` with public diagnostics.
- [x] 1.2 Integrate diagnostic schema as an optional property in ingest result schemas in `packages/zod-schemas/src/agronautas.ts`.
- [x] 2.1 Implement timeout parsing and UA headers in `packages/hydrology-engine/src/clients/http-clients.ts`.
- [x] 2.2 Add AbortController fetch to enforce anti-DDoS single-attempt and 10s PNA timeout in `packages/hydrology-engine/src/clients/http-clients.ts`.
- [x] 2.3 Map failures to safe diagnostics with host/path sanitization in `packages/hydrology-engine/src/clients/http-clients.ts`.
- [x] 3.1 Update named source budgets (10s PNA, 12s general deadline) in `apps/api/src/presentation/routes/hydrology-government.ts`.
- [x] 3.2 Add diagnostic merging, support independent failures returning HTTP 202, and return structured startup failures in `apps/api/src/presentation/routes/hydrology-government.ts`.
- [x] 4.1 Write diagnostic schema validation tests in `packages/zod-schemas/src/agronautas.test.ts`.
- [x] 4.2 Assert client abort, options handling, host/path sanitization, and single-attempt fetch in `packages/hydrology-engine/src/hydrology-engine.test.ts`.
- [x] 4.3 Test source timing, partial statuses, and failed run persistence without fixture fallback in `apps/api/src/presentation/routes/hydrology-government.test.ts`.

## Remaining Tasks

- [ ] 5.1 Perform exactly one backend-origin `POST /api/hydrology/ingest` for `source=PNA` after deploy.
- [ ] 5.2 Perform exactly one frontend-proxy `POST /api/hydrology/ingest` for `source=PNA` after deploy.
- [ ] 5.3 Run one `GET /api/hydrology/municipalities` after deploy; no retries, polling, or loops.

## Implementation Notes

- PNA client timeout defaults to `10_000ms` and can be tuned with `HYDROLOGY_PNA_TIMEOUT_MS`; `HYDROLOGY_PNA_USER_AGENT` is supported.
- The runner keeps a `12_000ms` safety timeout so the real PNA client can classify timeout first; runner timeout is still classified as `runner_timeout` for injected/misbehaving clients.
- Diagnostics are safe, structured, and bounded: `failureKind`, `reason`, `attempts`, `timeoutMs`, `durationMs`, `elapsedMs`, `providerHost`, `providerPath`, and `upstreamStatus` only.
- Provider URL diagnostics intentionally expose host/path only; query strings and unknown diagnostic keys are rejected by schema.
- Production source failure persists a failed/partial ingestion run with zero records and does not write fixture telemetry, preserving previous successful data.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `packages/zod-schemas/src/agronautas.test.ts` | Unit | ✅ 24/24 | ✅ Missing export failed | ✅ 26/26 | ✅ accepts valid + rejects unsafe fields | ✅ Strict bounded schema |
| 1.2 | `packages/zod-schemas/src/agronautas.test.ts` | Unit | ✅ 24/24 | ✅ Response diagnostic parse failed | ✅ 26/26 | ✅ valid response + invalid diagnostic cases | ✅ Shared diagnostic schema |
| 2.1 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit | ✅ 20/20 | ✅ Env UA/timeout assertions failed | ✅ 21/21 | ✅ env URL with query sanitization + custom UA | ✅ PNA constructor option normalization |
| 2.2 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit | ✅ 20/20 | ✅ Timeout diagnostic absent | ✅ 21/21 | ✅ abort signal + one fetch call | ✅ Existing AbortController path preserved |
| 2.3 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit | ✅ 20/20 | ✅ failureKind/provider fields absent | ✅ 21/21 | ✅ network/status/content/parse failures | ✅ Central diagnostic builder |
| 3.1 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration | ✅ 125/125 | ✅ runner diagnostics absent | ✅ 127/127 | ✅ PNA failure + mixed-source partial | ✅ Named runner timeout constant |
| 3.2 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration | ✅ 125/125 | ✅ startup and partial diagnostics absent | ✅ 127/127 | ✅ startup failure + failed run persistence | ✅ Diagnostic merge helpers |
| 4.1 | `packages/zod-schemas/src/agronautas.test.ts` | Unit | ✅ 24/24 | ✅ New tests failed before schema | ✅ 26/26 | ✅ safe/unsafe diagnostic cases | ✅ Clean |
| 4.2 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit | ✅ 20/20 | ✅ New assertions failed before client changes | ✅ 21/21 | ✅ options, abort, sanitization, single attempt | ✅ Clean |
| 4.3 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration | ✅ 125/125 | ✅ New assertions failed before route changes | ✅ 127/127 | ✅ no fixture write + partial + startup failure | ✅ Clean |

## Test Summary

- **Total tests written**: 7 new/expanded behavior tests across schema, hydrology client, and API route.
- **Total tests passing**: zod-schemas 26/26; hydrology-engine 21/21; api 127/127.
- **Layers used**: Unit (schema/client), Integration (Express route/runner).
- **Approval tests**: Existing test suites run before changes as safety net.
- **Pure functions created**: 7 small helpers/constants (`parsePositiveInt`, `safeProviderUrl`, diagnostic builders/mergers, timeout constants).

## Validation Commands

- `pnpm --dir packages/zod-schemas test` ✅
- `pnpm --dir packages/hydrology-engine test` ✅
- `pnpm --dir packages/zod-schemas build` ✅
- `pnpm --dir packages/hydrology-engine build` ✅
- `pnpm --dir apps/api build` ✅
- `pnpm --dir apps/api test` ✅

## Deviations

- None for implementation scope. Production smoke was not run by design and remains for verify.

## Workload / PR Boundary

- Mode: single PR (`400-line budget risk: Low`).
- Boundary: schemas, hydrology HTTP client, API runner, and their tests only.
