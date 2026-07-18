# Apply Progress: ibera-alerta-ina-csv-standardization

## Status

- **Mode:** Strict TDD
- **Artifact store:** Hybrid (OpenSpec + Engram)
- **Delivery:** single PR (`size-exception` chain strategy from tasks; forecast is Low)
- **Work unit:** Standardize INA URLs, headers, parsing, and local proof
- **Apply state:** Implementation complete; ready for review with the SMN upstream limitation recorded separately
- **User guard honored:** No commit, push, deploy, manual DB data, secret/token output, review launch, reset, stash, checkout, or discard of the partial INA client/adapter/tests/fixtures

## Completed Tasks

- [x] 1.1 Added `ina-6764-headered.csv` for Corrientes.
- [x] 1.2 Added `ina-33988-headerless.csv` for Paso de los Libres.
- [x] 1.3 Added `ina-38469-headerless.csv` for Bella Vista.
- [x] 1.4 Appended the INA CSV requirements delta to `openspec/specs/ibera-alerta/spec.md`.
- [x] 2.1 Added URL assertions for all fixed INA series, `getObservaciones`, `format=csv`, and rejection of `format=mnemos`.
- [x] 2.2 Standardized `inaSeriesUrls()` on the canonical CSV endpoint while preserving the encoded 24-hour range and concurrent requests.
- [x] 2.3 Added headered, headerless, malformed-width, and malformed-date assertions.
- [x] 2.4 Added supplied-header detection and the exact ten-column INA fallback mapping with row-width validation.
- [x] 2.5 Retained the existing small CSV line parser; no additional refactor was necessary after the focused suite passed.
- [x] 3.1 Completed focused and full regression tests.
- [x] 3.2 Completed bounded local real ingestion and browser rendering proof.
- [x] 4.1 Validated rollback boundaries statically: no migration or persisted-data rewrite is part of this change. A destructive checkout/revert was intentionally not executed because the user required preservation of all unstaged work.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1–1.4 | `packages/hydrology-engine/src/clients/http-clients.test.ts` | Unit/fixture | N/A for new fixtures; existing focused suite later passed 40/40 | N/A structural fixtures/spec | ✅ Fixture-backed parser/client tests passed | ✅ Headered Corrientes plus two distinct headerless municipalities | ➖ None needed |
| 2.1–2.2 | `packages/hydrology-engine/src/clients/http-clients.test.ts` | Unit/integration | Existing client regression covered by focused suite | ✅ URL test written before the canonical implementation in the interrupted apply; mixed `mnemos` implementation could not satisfy it | ✅ 40/40 focused tests; URL assertions passed for `6764`, `33988`, `38469` | ✅ Three IDs, canonical path, format, and negative `mnemos` assertion | ➖ Existing URL construction remained minimal |
| 2.3–2.4 | `packages/hydrology-engine/src/clients/http-clients.test.ts` | Unit | Existing adapter/client regression covered by focused suite | ✅ Headerless and malformed-row tests written before fallback implementation in the interrupted apply | ✅ 40/40 focused tests; headered/headerless/malformed assertions passed | ✅ Headered row, two headerless rows, wrong width, invalid date | ➖ Existing `parseCsvLine` retained |
| 2.5 | `packages/hydrology-engine/src/clients/http-clients.test.ts` | Unit | ✅ Focused suite passed after review | N/A refactor-only | ✅ 40/40 | ✅ Existing edge cases remain covered | ✅ No behavior-changing cleanup required |
| 3.2 | Temporary Playwright proof removed after execution; existing `apps/web/tests/e2e/hydrology-government.spec.js` also passed | E2E/runtime | ✅ API and web suites included in full run | N/A runtime acceptance | ✅ API endpoint and UI proof passed | ✅ Exact Corrientes/Paso de los Libres/Bella Vista records and rendered names | ➖ No production refactor |
| 4.1 | Rollback boundary review | Operational | N/A destructive action forbidden by user guard | N/A | ✅ No migration/persisted rewrite found | ✅ Client, adapter, focused tests, and fixtures are the isolated rollback slice | ➖ No checkout/revert executed |

### Test Summary

- **Focused:** `pnpm --dir packages/hydrology-engine test` — exit 0; **40 passed, 0 failed**.
- **Full:** `pnpm test` — exit 0; Turborepo **6/6 tasks successful**; API suite reported **166 passed, 0 failed**.
- **Build:** `pnpm build` — exit 0; Turborepo **4/4 tasks successful**. One pre-existing unused `React` warning in `apps/web/src/app/municipalities/ingest/page.test.tsx`.
- **Browser:** `pnpm --dir apps/web exec playwright test tests/e2e/hydrology-government.spec.js` — exit 0; **1 passed**.
- **Exact municipal browser proof:** temporary Playwright scenario asserted API-mapped INA station/value records and visible `Corrientes`, `Paso de los Libres`, `Bella Vista`, plus `INA ·` — exit 0; **1 passed**. Temporary file was removed afterward.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir packages/hydrology-engine test`; exit 0; 40 passed, 0 failed |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/api verify-local -- --out C:\\Users\\mmmau\\AppData\\Local\\Temp\\opencode\\ibera-alerta-ina-csv-standardization-local-proof.json`; one request per PNA/INA/INMET/SMN, retries 0; exit 1 only because SMN timed out at 15s; PNA/INA/INMET passed and DB-correlated |
| Browser/local endpoint command and exact result | API `GET /api/hydrology/municipalities` returned HTTP 200, contract `hydrology-government-municipalities-v1`, 18 municipalities; existing real E2E 1/1 passed; exact three-municipality temporary proof 1/1 passed |
| Rollback boundary | Revert only `packages/hydrology-engine/src/clients/http-clients.ts`, `packages/hydrology-engine/src/adapters/ina-adapter.ts`, `packages/hydrology-engine/src/clients/http-clients.test.ts`, and the three INA fixtures; no migration or data rewrite |

## Bounded Local Real Source Matrix

Proof run: `proof-20260717T154236Z` (remote configured DB, no secrets printed, one attempt per source, retries 0).

| Source | Provider result | Records | DB correlation | Classification |
|---|---:|---:|---|---|
| PNA | HTTP 200, 1 attempt | 9 | Pass; one proof row | Local functional success |
| INA | HTTP 200, 1 attempt per fixed series | 37 | Pass; one proof row | Local functional success; parser returned mapped records |
| INMET | HTTP 200, 1 attempt | 100 | Pass; one proof row | Local functional success; production geo-block remains an operator/regional-runner concern |
| SMN | Timeout after 15,022 ms, 1 attempt | 0 | Pass for correlated failed run row | Upstream/provider limitation, not INA parser failure; production geo-block/operator/regional-runner concern |

## INA Municipal Mapping and Rendering

The live `GET /api/hydrology/municipalities` response returned HTTP 200 and mapped these non-empty INA records:

| Municipality | Series/station | Value | Metric | Observed at |
|---|---|---:|---|---|
| Corrientes | `6764` | `3.16 m` | `river_height_m` | `2026-07-17T14:00:00.000Z` |
| Paso de los Libres | `33988` | `1.86 m` | `river_height_m` | `2026-07-17T11:00:00.000Z` |
| Bella Vista | `38469` | `2.01 m` | `river_height_m` | `2026-07-17T03:00:00.000Z` |

The browser proof rendered all three municipality names and an `INA ·` telemetry label. These are upstream-backed records, not `offline-fixture://` records. Therefore INA was **not upstream-empty** and no INA parser failure was observed.

## Deviations / Issues

- No implementation deviation from the approved design.
- The local all-source harness is not globally green because the configured SMN CAP RSS endpoint timed out once. INMET succeeded locally. This is recorded as provider/network availability and an operator/regional-runner requirement, not as an INA or parser code failure.
- The existing web build emits one unused-`React` warning outside this change; build still passes.

## Files Changed by This Apply

| File | Action | Scope |
|---|---|---|
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modified | Canonical INA CSV URLs for all fixed series |
| `packages/hydrology-engine/src/adapters/ina-adapter.ts` | Modified | Headered/headerless CSV mapping and exact-width fallback |
| `packages/hydrology-engine/src/clients/http-clients.test.ts` | Modified | URL, fixture, parser, malformed-row, and source isolation assertions |
| `packages/hydrology-engine/src/clients/fixtures/ina-6764-headered.csv` | Added | Corrientes headered fixture |
| `packages/hydrology-engine/src/clients/fixtures/ina-33988-headerless.csv` | Added | Paso de los Libres headerless fixture |
| `packages/hydrology-engine/src/clients/fixtures/ina-38469-headerless.csv` | Added | Bella Vista headerless fixture |
| `openspec/specs/ibera-alerta/spec.md` | Modified | Approved INA requirements delta |
| `openspec/changes/ibera-alerta-ina-csv-standardization/tasks.md` | Modified | Completed task checkboxes |
| `openspec/changes/ibera-alerta-ina-csv-standardization/apply-progress.md` | Added | This cumulative apply evidence |

## Recommendation

**Ready for review for the INA CSV standardization slice.** Do not interpret the SMN timeout as an INA code failure. Keep the production INMET/SMN geo-block and regional-runner/operator requirement explicitly separate from this change.
