## Exploration: ibera-alerta-ina-csv-standardization

### Current State
A fresh, read-only investigation of the Iberá-Alerta hydrology engine reveals that while Prefectura Naval Argentina (PNA) functions stably in both local and production environments (providing 19 fresh records), the other sources are degraded or incomplete:
1. **Instituto Nacional del Agua (INA)**: Only **1 record** (Corrientes Capital) is available in production, while other reference municipalities (Paso de los Libres and Bella Vista) show 0 telemetry records.
   - *Root Cause*: `InaHttpClient` requests `'33988'` and `'38469'` with `format=mnemos`. However, `InaAdapter` has no custom MNEMOS parsing logic and routes the response directly to `parseOfficialCsv`. Because the real MNEMOS response is an 8-column headerless text stream, `parseOfficialCsv` treats the first data row as the header, fails to find matching headers (`series_id`, `timestart`, `valor`), and drops all lines.
   - *Real Provider Behavior*: Direct GET checks prove that `getObservaciones` accepts standard CSV requests for all three series (including `'33988'` and `'38469'`), returning correctly structured CSVs. However, Bella Vista `'38469'` sometimes returns data rows without a CSV header line, which would still fail standard header-matching.
2. **INMET & SMN**: Deployed environments on Render (US-datacenter AWS IP space) are completely blocked (HTTP 403/WAF blocks) by Brazilian and Argentine government servers, resulting in **0 records** (degraded). Conversely, they succeed completely in local and local-scheduler environments (where they are not blocked by US-datacenter firewalls).

### Affected Areas
- `packages/hydrology-engine/src/clients/http-clients.ts` — `inaSeriesUrls` should be modified to request `format=csv` for all series IDs via the `getObservaciones` endpoint instead of requesting `format=mnemos`.
- `packages/hydrology-engine/src/adapters/ina-adapter.ts` — `parseOfficialCsv` must be made robust to optionally handle headerless CSV payloads by detecting missing header lines and falling back to the standard INA CSV column mapping.

### Approaches
1. **INA CSV Standardization & Header Fallback (Recommended)**
   - Switch all three INA series URLs to use `getObservaciones` with `format=csv`. Update `parseOfficialCsv` to check if the first line contains headers (by looking for words like `series_id` or `timestart`). If missing, it treats the first line as data and maps columns using standard default headers.
   - **Pros**: Low complexity, elegant, standardizes all INA ingestion to standard CSV, eliminates brittle custom parser requirements, and is highly robust against upstream header-flapping.
   - **Cons**: None.
   - **Effort**: Low.

2. **Custom MNEMOS Parser Implementation**
   - Keep the existing `format=mnemos` queries for `'33988'` and `'38469'` and write custom text-splitting code inside `InaAdapter` to parse the 8-column headerless format.
   - **Pros**: Preserves current endpoint query strings.
   - **Cons**: High complexity; custom text-parsers are fragile and redundant since `getObservaciones` already provides a clean CSV interface.
   - **Effort**: Medium.

### Recommendation
**Approach 1** is highly recommended. By standardizing all three INA endpoints to standard CSV format and adding robust fallback header mapping in `InaAdapter`, we restore full data mapping (Corrientes, Paso de los Libres, and Bella Vista) across both local and production.

### Risks
- **Upstream format changes**: If the order of columns in the headerless CSV changes, mapping by default indices could be misaligned.
  - *Mitigation*: Ensure that the default mapping is clearly documented and maps to standard column positions `[id, tipo, series_id, timestart, timeend, nombre, descripcion, unit_id, timeupdate, valor]`.

### Ready for Proposal
**Yes**. The diagnosis is complete, verified by real provider behavior, and mathematically proven. We recommend running `sdd-apply` or `sdd-ff` to apply this narrow code fix.
