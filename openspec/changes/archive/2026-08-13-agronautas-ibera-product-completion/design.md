# Design: Agronautas and Iberá-Alerta Product Completion

## Technical Approach

Implement slices A–E as additive read models over current repositories and contracts. Agronautas keeps `Field`, PostGIS geometry, risk snapshots, signal timelines, and PDF generation as sources of truth; Iberá-Alerta keeps `ibera_ingest_runs`, `hydrology_telemetry`, official alerts, thresholds, and forecast rows as sources of truth. New application view-model builders translate those records into explicit evidence states. No new engine, hydraulic model, provider, tenant, campaign, or authoritative Iberá geometry is introduced.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| New domain aggregates | More semantic surface and migrations; unsupported ownership | Reject; use read-only application projections. |
| Enrich existing dashboard JSON implicitly | Fast but couples UI to persistence and hides evidence semantics | Reject; add versioned Zod contracts and named view models. |
| Separate product APIs/UI | More files, but preserves authorization, copy, and claims | Choose; only shared primitives may be reused. |
| New geometry/provider integration | External credentials and unverified capabilities | Reject; expose existing PostGIS/operator geometry truth only. |

## Data Flow

    fields/PostGIS ─→ Agronautas field index ─→ `/demo` selection ─→ existing detail reads
         │                    │                         ├─ geometry/report evidence
         └ risk/signals ──────┴────────────────────────┴─ explanation view model

    ibera_ingest_runs ─→ operator run-history projection ─→ `/municipalities/ingest`
    telemetry + alerts + mappings + thresholds ─→ municipal explanation/timeline ─→ detail

Slice A adds `FieldRepository.list` and `GET /fields`; `agronautas.ts` maps records through a field-index view model. Slices B–C compose existing geometry, dashboard, risk, alert, and weather results without changing their persistence. Slice D adds bounded ledger listing and sanitized diagnostics; `observe` remains restart-safe. Slice E derives ordered dated events and threshold comparisons from persisted rows, marking forecast horizon >14 days speculative and never inferring territorial impact.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/domain/repositories/agronautas.ts` | Modify | Add typed `list` port for persisted fields. |
| `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.ts` | Modify | Bounded, deterministic field query; retain PostGIS read-back. |
| `apps/api/src/application/viewmodels/agronautas-pilot.ts` | Create | Field-index projection builder; route projections remain explicit at their owning route boundary. |
| `apps/api/src/presentation/routes/agronautas.ts` | Modify | Add authenticated `GET /fields`; enrich report metadata from saved snapshot/geometry. |
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add `agronautasFieldIndex`, `agronautasEvidence`, and report metadata schemas; namespace explicitly. |
| `apps/web/src/lib/agronautas/{schemas,service}.ts` | Modify | Parse `FieldIndexResponse` and evidence/report metadata; preserve API error states. |
| `apps/web/src/components/agronautas/{page-client,field-detail,field-geometry-editor}.tsx` | Modify | Index navigation plus saved/point-only, observed/forecast/degraded/missing evidence states. |
| `packages/hydrology-engine/src/{types,repository}.ts` | Modify | Add bounded `listIberaIngestRuns` and municipal timeline/explanation projection over existing rows. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Authenticated `GET /ingest/runs`; add explanation/timeline fields to dashboard response; sanitize diagnostics. |
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add Iberá run-history and municipal explanation/timeline schemas in the hydrology namespace. |
| `apps/web/src/components/government/{ingest-panel,detail}.tsx` | Modify | Operator history and accessible municipal explanation/timeline boundaries. |

## Interfaces / Contracts

```ts
GET /fields?limit=50&cursor=<opaque> → { contractVersion, items: FieldIndexItem[], nextCursor: string|null }
GET /ingest/runs?limit=25&cursor=<opaque> → { contractVersion, items: SafeIberaRun[], nextCursor }
MunicipalityDashboard += { explanation: MunicipalityExplanation, timeline: MunicipalityEvent[] }
```

`SafeIberaRun` includes run/proof IDs, requested sources, source results, status, lifecycle timestamps, freshness, last-successful timestamps, and allowlisted diagnostic fields only. `MunicipalityExplanation` includes threshold values, observed value/time, comparison, tendency, forecast horizon/confidence, freshness, source URL, and run ID. Missing values remain `null`/empty with an evidence label; no invented incident or geometry is serialized.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | View-model evidence, ordering, cursors, sanitization, speculative horizon | Node RED-GREEN-REFACTOR tests with fixtures for empty, stale, failed, and mixed sources. |
| Integration | Repository SQL, route auth/contracts, PostGIS save→read, stale geometry, durable restart read, telemetry immutability | API/hydrology-engine tests with query doubles and migration-backed checks. |
| E2E | Field index→detail; geometry/report labels; ingest history; municipality timeline/error states | Playwright desktop/mobile journeys using existing seams; no live-provider claim. |
| Python | None expected | Existing worker/risk engine is unchanged; run regression pytest only. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and RED test |
|---|---|---|
| Documentation-like paths | N/A — no executable-file classification | No task/test. |
| Git repository selection | N/A — no Git automation | No task/test. |
| Commit state | N/A — no commit automation | No task/test. |
| Push state | N/A — no push automation | No task/test. |
| PR commands | N/A — no PR automation | No task/test. |

## Migration / Rollout

No migration required: all reads use existing tables and indexes. Ship A–C behind route/UI capability checks, then D–E; absent repository methods return explicit unavailable/empty states. Roll back each additive route/view component independently; never delete telemetry, ledger, or geometry data. Evidence levels remain `observed`, `forecast`, `degraded`, `missing`, `point_only`, and `unavailable`; local tests are not production/provider proof.

## Open Questions

- [ ] None blocking. Cursor encoding and exact page limits should follow existing API pagination conventions if a later shared convention is found.
