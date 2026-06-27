# Proposal: Iberá-Alerta Phase 1 Optimization & Audit

## Intent

Harden Iberá-Alerta Phase 1 after audit findings by restoring Prisma type safety for hydrology tables, preventing false-success ingestion in production, fixing scheduler memory growth, and narrowing Iberá-Alerta telemetry to PNA flood-vulnerable municipalities while preserving Agronautas agricultural coverage.

## Scope

### In Scope
- Add Prisma models for SQL-created hydrology operational tables and `AgronautasJobRun.lease_expiresAt` mapping.
- Remove the unused `hydrology_field_risk_snapshots` table from active schema/migrations only after confirming no runtime dependency.
- Keep MongoDB exactly as-is: no config, health-check, dependency, or connection removal.
- Change production ingestion fallback behavior so scraper failures are logged and surfaced as failed/partial runs, not silent mock success.
- Fix `HydrologyIngestionScheduler.timeouts` cleanup.
- Split locality ownership: Agronautas retains agricultural localities such as Gobernador Virasoro and Goya; Iberá-Alerta telemetry targets PNA flood-vulnerable municipalities.

### Out of Scope
- MongoDB cleanup or retirement.
- Dam discharge, lag-time, wave propagation, evacuation authority, or custom hydraulic routing.
- Full province expansion unrelated to PNA flood-risk coverage.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `hydrology-telemetry`: Prisma-backed station, telemetry, ingestion-run, municipality, and gauge-mapping persistence.
- `hydrology-ingestion`: production failures are explicit; mock fixtures are development/test only.
- `government-crisis-monitoring`: municipality list pivots to comprehensive PNA flood-vulnerable coverage without deleting Agronautas agricultural localities.

## Approach

Implement in cohesive slices: (1) schema/type-safety cleanup, (2) ingestion runner hardening, (3) scheduler leak fix, (4) locality seed/scope split. Preserve existing MongoDB and Agronautas records; make Iberá-Alerta filtering explicit at seed/query boundaries.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/db/prisma/schema.prisma` | Modified | Add hydrology SQL tables and missing job-run lease field. |
| `infra/bootstrap/agronautas/*.sql` | Modified | Remove unused field-risk table and align municipality/gauge seeds. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Replace silent production mock fallback with failed/partial reporting. |
| `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` | Modified | Remove completed timeout handles. |
| hydrology municipality seed/query code | Modified | Separate Agronautas localities from Iberá-Alerta PNA flood scope. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---:|---|
| Prisma model mapping mismatches legacy SQL names | Medium | Use explicit `@@map`/`@map`, migration smoke tests, and typed query tests. |
| Removing dead table breaks hidden cleanup code | Low | Delete/adjust only the known prune path and verify no references remain. |
| Production ingestion becomes noisier | Medium | Log structured errors and persist partial runs with last-success freshness. |

## Rollback Plan

Revert slices independently: restore prior Prisma schema/migrations, restore fallback behavior only in non-production, revert scheduler cleanup, and restore previous municipality seed set. MongoDB remains untouched throughout.

## Dependencies

- Existing PostgreSQL/PostGIS database and current hydrology migrations.
- Current PNA municipality/port threshold source list.

## Success Criteria

- [ ] Hydrology raw-SQL tables are represented in Prisma with generated types.
- [ ] `hydrology_field_risk_snapshots` is absent from active schema and unused in code.
- [ ] Production scraper failures create logged failed/partial runs and do not write mock success telemetry.
- [ ] Scheduler timeout tracking does not grow unbounded after daily callbacks.
- [ ] Agronautas retains Virasoro, Goya, and agricultural metrics; Iberá-Alerta covers PNA flood-vulnerable municipalities only.
- [ ] MongoDB files/config/health checks are unchanged.
