# Iberá-Alerta Source UI Analysis

## Official source patterns reviewed

### Prefectura Naval Argentina (PNA)
- **Useful pattern to preserve:** compact port/gauge tables with current river height and tendency are familiar to operational users.
- **Bottleneck:** users must compare gauges manually across pages; timestamps and station provenance are not presented as an agricultural logistics workflow.
- **Iberá-Alerta decision:** adapt the table into per-zone cards showing current height, 24h tendency, alert threshold, evacuation threshold, source, and exact “Último dato obtenido”.

### Instituto Nacional del Agua (INA)
- **Useful pattern to preserve:** forecast rows by station/horizon are high-value for planning.
- **Bottleneck:** critical 7-to-30-day forecast heights can be locked in static PDF-style reports, forcing users to download, scan, and compare manually.
- **Iberá-Alerta decision:** replace the PDF bottleneck with a responsive HTML table inside each gauge card. Forecasts stay capped at 30 days; days 15-30 are labeled as speculative/low-confidence planning guidance.

### INMET (Brasil)
- **Useful pattern to preserve:** upstream rain telemetry provides early signal for Paraná/Iguazú/Uruguay headwaters.
- **Bottleneck:** data is meteorological and regional, not directly phrased for Corrientes field movement decisions.
- **Iberá-Alerta decision:** summarize INMET as upstream context within the local zone card, without converting rain to custom hydraulic routing.

### Servicio Meteorológico Nacional (SMN)
- **Useful pattern to preserve:** official alert severity and regional storm/rainfall notices.
- **Bottleneck:** province/regional alert pages can over-broadcast; Phase 1 must not show generic province-wide flood alerts as local gauge alerts.
- **Iberá-Alerta decision:** render active alerts only inside their mapped zone/gauge card (for example, Paso de la Patria only in the Mercedes card).

## Dashboard design criteria

Iberá-Alerta reuses official presentation when it is already clear, tabular, timestamped, and provenance-friendly. It redesigns the presentation when official sites require PDF scanning, hard-to-compare pages, external previews, or non-local alert context.

The Phase 1 UI prioritizes:
- Spanish-only labels and descriptions.
- One card per local zone/gauge relationship: Virasoro, Ituzaingó, Mercedes, and mapped reference gauges.
- Centralized PNA/INA/INMET/SMN context with source provenance.
- Exact successful observation timestamp using: `Último dato obtenido: DD/MM/AAAA HH:MM`.
- Clean mobile-friendly forecast tables/lists instead of PDF dependency.
- No external Sentinel-1 preview links and no interactive flood simulation controls; both are shown only as inline “Próximamente” stubs.
