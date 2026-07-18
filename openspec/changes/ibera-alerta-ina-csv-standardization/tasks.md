# Tasks: Iberá Alerta INA CSV Standardization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60-110 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Standardize INA URLs, headers, and parsing | PR 1 | `pnpm --dir packages/hydrology-engine test` | `pnpm --dir apps/api verify-local` | Revert http-clients.ts, ina-adapter.ts, and test changes |

## Phase 1: Foundation / Infrastructure (Fixtures)

- [x] 1.1 Create mock fixture `packages/hydrology-engine/src/clients/fixtures/ina-6764-headered.csv` representing Corrientes (headered)
- [x] 1.2 Create mock fixture `packages/hydrology-engine/src/clients/fixtures/ina-33988-headerless.csv` representing Paso de los Libres (headerless)
- [x] 1.3 Create mock fixture `packages/hydrology-engine/src/clients/fixtures/ina-38469-headerless.csv` representing Bella Vista (headerless)
- [x] 1.4 Update project-level spec at `openspec/specs/ibera-alerta/spec.md` to append the INA CSV requirements delta

## Phase 2: Core Implementation (RED → GREEN → REFACTOR)

- [x] 2.1 RED test: In `packages/hydrology-engine/src/clients/http-clients.test.ts`, add failing assertions that all 3 INA URLs use `getObservaciones` and `format=csv`, rejecting `format=mnemos`
- [x] 2.2 GREEN implementation: Modify `inaSeriesUrls()` in `packages/hydrology-engine/src/clients/http-clients.ts` to return CSV format for all series
- [x] 2.3 RED test: In `packages/hydrology-engine/src/clients/http-clients.test.ts`, add assertions for parsing headered, headerless, and malformed CSV rows
- [x] 2.4 GREEN implementation: Modify `InaAdapter.parse()` in `packages/hydrology-engine/src/adapters/ina-adapter.ts` to detect header, else apply default `id`, `tipo`, `series_id`, `timestart`, `timeend`, `nombre`, `descripcion`, `unit_id`, `timeupdate`, `valor` mapping, rejecting row if column count is not 10
- [x] 2.5 REFACTOR: Clean up CSV parsing line helper or validation if necessary

## Phase 3: Integration & Local Real Verification

- [x] 3.1 Verify integration and complete unit/regression tests via `pnpm --dir packages/hydrology-engine test`
- [x] 3.2 Verify live local ingestion dashboard rendering via `pnpm --dir apps/api verify-local` (or `verify-hydrology-local-real.test.ts` scenario) and record separate proof for Corrientes, Paso de los Libres, and Bella Vista

## Phase 4: Rollback & Verification

- [x] 4.1 Perform rollback test plan: ensure git checkout/revert is clean and leaves telemetry database unmodified
