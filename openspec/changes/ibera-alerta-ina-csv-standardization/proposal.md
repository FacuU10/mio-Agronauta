# Proposal: Iberá Alerta INA CSV Standardization

## Intent

Restore reliable INA telemetry ingestion and dashboard rendering for Corrientes, Paso de los Libres, and Bella Vista. INA currently mixes CSV and MNEMOS requests; headerless Bella Vista CSV can be discarded as an invalid header row.

## Scope

### In Scope
- Standardize the three INA `getObservaciones` series URLs on `format=csv`.
- Parse INA CSV with its supplied header or the documented standard INA column mapping when the header is absent.
- Add strict-TDD tests and local acceptance proving three distinct mapped municipal INA records: Corrientes, Paso de los Libres, and Bella Vista.

### Out of Scope
- PNA behavior or endpoints.
- INMET/SMN production geo-block handling, browser ingest, proxies, or deployment changes.
- Custom MNEMOS parsing, provider retry-policy changes, and broader dashboard redesign.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `ibera-alerta`: Official INA source configuration and parsing must reliably yield mapped municipal telemetry when standard CSV is headerless.

## Approach

Keep the existing INA client/adapter boundary. Request CSV for all fixed series IDs. Detect whether the first CSV row is a header; otherwise apply the verified INA default order (`id`, `tipo`, `series_id`, `timestart`, `timeend`, `nombre`, `descripcion`, `unit_id`, `timeupdate`, `valor`) before existing mapping/rendering paths run. Write failing tests before implementation.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modified | Canonical INA CSV query URLs |
| `packages/hydrology-engine/src/adapters/ina-adapter.ts` | Modified | Headerless CSV fallback |
| `packages/hydrology-engine/src/clients/http-clients.test.ts` | Modified | URL and ingestion fixtures/tests |
| `openspec/specs/ibera-alerta/spec.md` | Modified | INA reliability requirement delta |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| INA changes headerless column order | Low | Explicit default mapping plus fixtures for all three municipalities |
| Fallback accepts malformed rows | Low | Require expected column count and existing validation |

## Rollback Plan

Revert the INA client/adapter and test changes as one change set, restoring the prior queries and parser. No migration or persisted-data rewrite is required; last known telemetry remains intact.

## Dependencies

- INA `getObservaciones` CSV availability for series `6764`, `33988`, and `38469`.

## Success Criteria

- [ ] All three INA series use standard CSV query URLs.
- [ ] Headered and headerless fixtures produce valid mapped records.
- [ ] Local acceptance renders distinct INA records for Corrientes, Paso de los Libres, and Bella Vista.
- [ ] Hydrology-engine tests pass under strict TDD evidence.
