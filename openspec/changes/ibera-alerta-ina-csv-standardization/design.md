# Design: Iberá Alerta INA CSV Standardization

## Technical Approach

Keep the existing `InaHttpClient` → `InaAdapter` → government-ingestion pipeline. Make `inaSeriesUrls()` construct the same `getObservaciones` CSV endpoint for fixed series `6764`, `33988`, and `38469`; retain its 24-hour encoded range and concurrent bounded fetches. In `InaAdapter`, parse CSV rows with supplied headers when recognized; otherwise treat the first row as data using the documented ten-column INA order. Existing normalization, persistence, and municipal rendering stay unchanged.

## Architecture Decisions

| Decision | Alternatives / tradeoff | Rationale |
|---|---|---|
| Construct one canonical URL shape | Preserve mixed `/obs/...` MNEMOS endpoints | A single official CSV contract removes format-dependent parsing while retaining fixed IDs, bounds, and client behavior. |
| Header detection before fallback | Always assume default columns; introduce a CSV library | Recognized headers remain backward compatible. A narrow local fallback is sufficient for the verified INA payload and avoids a dependency. |
| Require exact default-column count | Loosely map partial rows | Ten values prevent a malformed headerless row from becoming telemetry; existing date/value validation remains the final guard. |
| Fixture-backed tests in existing test file | New parser abstraction or E2E-only proof | `node:test` tests already mock client fetches; focused fixtures make the source-format regression reproducible. |

## Data Flow

```
INA series IDs
  -> InaHttpClient: getObservaciones?tipo=puntual&series_id=…&format=csv
  -> bounded concurrent fetchText
  -> InaAdapter: recognized header | INA_DEFAULT_CSV_COLUMNS
  -> normalized INA river_height_m records
  -> existing government ingestion/persistence -> municipality dashboard
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modify | Generate canonical `getObservaciones` CSV URLs for every fixed INA series. |
| `packages/hydrology-engine/src/adapters/ina-adapter.ts` | Modify | Detect a header and safely apply the documented headerless mapping. |
| `packages/hydrology-engine/src/clients/http-clients.test.ts` | Modify | Add RED/green URL, headered, headerless, malformed-row, and three-series ingestion assertions. |
| `packages/hydrology-engine/src/clients/fixtures/ina-*.csv` | Create | Small immutable headered/headerless INA payload fixtures, including Bella Vista (`38469`). |
| `openspec/specs/ibera-alerta/spec.md` | Modify | Add the approved INA CSV reliability delta. |

## Interfaces / Contracts

No public API changes. Internal parsing contract:

```ts
const INA_DEFAULT_CSV_COLUMNS = [
  'id', 'tipo', 'series_id', 'timestart', 'timeend',
  'nombre', 'descripcion', 'unit_id', 'timeupdate', 'valor',
] as const
```

The first CSV row is a header only if it identifies required `series_id`, `timestart`, and `valor` fields. Otherwise it is data and every row MUST have exactly ten parsed columns. Valid output remains the current normalized INA record (`stationId`, observed date, metre value, source URL).

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (RED → green) | All URLs use `getObservaciones`, `format=csv`, each ID; headered and headerless rows normalize; wrong-width/headerless malformed rows are rejected | Extend `http-clients.test.ts` with checked-in CSV fixtures and mocked fetch. |
| Integration | Three concurrent fixture responses produce distinct `6764`, `33988`, `38469` INA records and preserve source URLs | Run `pnpm --dir packages/hydrology-engine test`. |
| Local real proof | Live local ingestion records/returns the three municipal INA values through the existing pipeline | With configured local environment and production database, run `pnpm --dir apps/api verify-local`; capture INA result and municipal evidence separately from unit fixtures. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes.

## Migration / Rollout

No migration required. Deploy as one client/adapter/test slice. Existing last-known telemetry remains usable. Roll back by reverting that slice, restoring the prior URL construction and parser; no stored records are rewritten.

## Open Questions

- [ ] Confirm live local proof can observe all three INA series during the selected 24-hour range; fixture acceptance is deterministic if a live series is temporarily empty.
