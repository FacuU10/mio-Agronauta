# Design: Iberá-Alerta Phase 1 Optimization & Audit

## Technical Approach

Make the hydrology SQL surface type-safe without physical table churn: add Prisma models that map exactly to existing Postgres tables/columns, remove active ownership of the dead field-risk snapshot table, prune scheduler timeout handles as callbacks finish, and make production ingestion fail fast instead of writing offline fixtures. Seed data is split by domain: Agronautas agricultural centers remain separate from Iberá-Alerta PNA civil-defense localities.

## Architecture Decisions

| Topic | Decision | Rationale |
|---|---|---|
| Prisma hydrology mapping | Map legacy snake_case tables with `@map`/`@@map`; use `Unsupported("geometry(...)")` for PostGIS. | Prevents Prisma migrations from renaming/dropping SQL-created tables and preserves PostGIS columns. |
| Dead snapshots | Remove `hydrology_field_risk_snapshots` from schema/migration ownership; do not add Prisma model. | Spec says no runtime references; avoiding model recreation keeps cleanup explicit. |
| Scheduler leak | Track timeout handles in a `Set`; delete each handle in the timeout callback `finally` and on cancellation. | Arrays retain fired daily timeout handles today. `finally` handles success/failure. |
| Production failures | Production records failed/partial runs and throws clean provider errors; fixtures only under explicit non-production flag. | Avoids synthetic success telemetry after upstream outages. |
| Localities | Add a small data dictionary with `domain: 'agriculture' | 'flood_risk_pna'`; seed PNA list separately. | Virasoro stays agricultural-only; Goya can belong to both domains. |

## Prisma Physical Design

Add to `apps/api/prisma/schema.prisma`:

```prisma
// Keep legacy CHECK-constrained text columns as String @db.Text, not Prisma enums,
// because the physical DB columns are text and no Postgres enum types exist.
model HydrologyStation {
  id          String   @id @db.Text
  source      String   @db.Text
  stationCode String   @map("station_code") @db.Text
  stationName String   @map("station_name") @db.Text
  riverName   String?  @map("river_name") @db.Text
  zone        String?  @db.Text
  provinceCode String? @map("province_code") @db.Text
  countryCode String  @map("country_code") @db.Text
  location    Unsupported("geometry(Point,4326)")?
  sourceUrl   String? @map("source_url") @db.Text
  isActive    Boolean @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)
  ingestionRuns HydrologyIngestionRun[]
  telemetry HydrologyTelemetry[]
  @@unique([source, stationCode])
  @@index([source, zone], map: "hydrology_stations_source_zone_idx")
  @@index([location], type: Gist, map: "hydrology_stations_location_gix")
  @@map("hydrology_stations")
}

model HydrologyIngestionRun {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  source String @db.Text
  stationId String? @map("station_id") @db.Text
  status String @db.Text
  startedAt DateTime @default(now()) @map("started_at") @db.Timestamptz(6)
  finishedAt DateTime? @map("finished_at") @db.Timestamptz(6)
  observedFrom DateTime? @map("observed_from") @db.Timestamptz(6)
  observedTo DateTime? @map("observed_to") @db.Timestamptz(6)
  lastSuccessfulObservedAt DateTime? @map("last_successful_observed_at") @db.Timestamptz(6)
  recordsIngested Int @default(0) @map("records_ingested")
  excludedMetrics String[] @default([]) @map("excluded_metrics")
  errorMessage String? @map("error_message") @db.Text
  provenanceUrl String? @map("provenance_url") @db.Text
  station HydrologyStation? @relation(fields: [stationId], references: [id], onDelete: SetNull)
  @@index([source, startedAt(sort: Desc)], map: "hydrology_ingestion_runs_source_started_idx")
  @@index([stationId, startedAt(sort: Desc)], map: "hydrology_ingestion_runs_station_idx")
  @@map("hydrology_ingestion_runs")
}

model HydrologyTelemetry {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  stationId String @map("station_id") @db.Text
  source String @db.Text
  metric String @db.Text
  observedAt DateTime @map("observed_at") @db.Timestamptz(6)
  ingestedAt DateTime @default(now()) @map("ingested_at") @db.Timestamptz(6)
  lastSuccessfulObservedAt DateTime @map("last_successful_observed_at") @db.Timestamptz(6)
  value Decimal? @db.Decimal
  unit String @db.Text
  tendency String? @db.Text
  forecastHorizonDays Int? @map("forecast_horizon_days")
  confidence String? @db.Text
  quality String @db.Text
  freshness String @db.Text
  sourceUrl String? @map("source_url") @db.Text
  raw Json @default("{}")
  station HydrologyStation @relation(fields: [stationId], references: [id], onDelete: Cascade)
  @@unique([stationId, source, metric, observedAt, forecastHorizonDays])
  @@index([stationId, metric, observedAt(sort: Desc)], map: "hydrology_telemetry_station_metric_observed_idx")
  @@index([source, observedAt(sort: Desc)], map: "hydrology_telemetry_source_observed_idx")
  @@map("hydrology_telemetry")
}

model AgronautasMunicipality {
  id String @id @db.Text
  localityId String @unique @map("locality_id") @db.Text
  name String @db.Text
  provinceCode String @default("AR-W") @map("province_code") @db.Text
  boundary Unsupported("geometry(MultiPolygon,4326)")
  alertHeightM Decimal? @map("alert_height_m") @db.Decimal(8,3)
  evacuationHeightM Decimal? @map("evacuation_height_m") @db.Decimal(8,3)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)
  gaugeMapping MunicipalityGaugeMapping?
  @@index([provinceCode, name], map: "agronautas_municipalities_province_name_idx")
  @@index([boundary], type: Gist, map: "agronautas_municipalities_boundary_gix")
  @@map("agronautas_municipalities")
}

model MunicipalityGaugeMapping {
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  municipalityId String @unique @map("municipality_id") @db.Text
  primaryPnaPortId String? @map("primary_pna_port_id") @db.Text
  secondaryPnaPortIds String[] @default([]) @map("secondary_pna_port_ids")
  inaStationIds String[] @default([]) @map("ina_station_ids")
  smnRegionIds String[] @default([]) @map("smn_region_ids")
  inmetStationIds String[] @default([]) @map("inmet_station_ids")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)
  municipality AgronautasMunicipality @relation(fields: [municipalityId], references: [id], onDelete: Cascade)
  @@index([secondaryPnaPortIds], type: Gin, map: "municipality_gauge_mappings_secondary_pna_gin")
  @@index([inaStationIds], type: Gin, map: "municipality_gauge_mappings_ina_gin")
  @@index([smnRegionIds], type: Gin, map: "municipality_gauge_mappings_smn_gin")
  @@index([inmetStationIds], type: Gin, map: "municipality_gauge_mappings_inmet_gin")
  @@map("municipality_gauge_mappings")
}
```

Also add `leaseExpiresAt DateTime? @map("lease_expiresAt") @db.Timestamptz(6)` to `AgronautasJobRun` only if the physical column exists or is added by a safe `ADD COLUMN IF NOT EXISTS` migration.

## Data Flow

`/api/hydrology/ingest` → runner → seed PNA municipalities if empty → per-source live client → on success save telemetry + success run → on failure save failed/partial run with `errorMessage`, log `{runId, source, stationId?, cause}`, throw/return failed result without fixture records.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add mapped hydrology models/enums and `leaseExpiresAt`. |
| `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` | Modify | Replace `timeouts: NodeJS.Timeout[]` with `Set<NodeJS.Timeout>` and delete handle in callback `finally`. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Remove production fallback injection; add explicit fixture gate and 17 PNA seed dictionary. |
| `infra/bootstrap/agronautas/001-postgis-schema.sql` | Modify | Stop creating `hydrology_field_risk_snapshots`; leave telemetry/stations/runs intact. |

## Scheduler Timeout Pattern

```ts
private readonly timeouts = new Set<NodeJS.Timeout>()
private scheduleDaily(source, cadence, delayMs) {
  let handle: NodeJS.Timeout
  const cb = Object.assign(async () => {
    try { await this.runSource(source) }
    finally {
      this.timeouts.delete(handle)
      if (this.running) this.scheduleDaily(source, cadence, dayMs)
    }
  }, { source })
  handle = this.setTimeout(cb, delayMs)
  this.timeouts.add(handle)
}
```

## Data Dictionary / Seeds

Create `AGRICULTURAL_CENTERS = [{id:'virasoro', name:'Gobernador Virasoro'}, {id:'goya', name:'Goya'}]` for Agronautas metrics. Create `PNA_FLOOD_RISK_PORTS` with exactly: Corrientes Capital, Paso de los Libres, Goya, Bella Vista, Itatí, Esquina, Ituzaingó, Empedrado, Monte Caseros, Yahapé, Alvear, Santo Tomé, Paso de la Patria, Itá Ibaté, Garruchos, La Cruz, Yapeyú, each carrying `river`, `alertHeightM`, `evacuationHeightM`, `primaryPnaPortId`, and source metadata. Seed civil-defense tables only from `PNA_FLOOD_RISK_PORTS`; Goya appears in both arrays, Virasoro only in agriculture.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Schema | Prisma maps tables without destructive migration | `prisma validate`, migration diff review. |
| Unit | Timeout handle pruning | Fake timers/setTimeout array and assert tracked count returns to zero. |
| Integration | Production upstream failure | Mock failing clients, assert no fixture telemetry and failed/partial run persisted. |
| Seeds | 17 PNA ports and Agronautas separation | Assert civil-defense list excludes Virasoro and includes Goya. |

## Migration / Rollout

Use additive/schema-only Prisma mapping first; no table rename. Drop or stop applying `hydrology_field_risk_snapshots` only after grep confirms no references. Production fixture bypass must be released with tests before live scheduling is enabled.

## Open Questions

- [ ] Confirm whether `agronautas_job_runs.lease_expiresAt` physically exists or should be introduced as `lease_expires_at` instead; spec names camel-case physical column, so design maps exactly to `lease_expiresAt` until DB inspection says otherwise.
