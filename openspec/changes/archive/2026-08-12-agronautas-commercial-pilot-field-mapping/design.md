# Design: Agronautas Commercial Pilot Field Mapping

## Technical Approach

Deliver two additive slices over `/demo` and field detail: (1) server-authoritative geometry using the existing PostGIS `fields.boundary`, and (2) a narrow client mapping island enhancing the current shell. Preserve existing risk, alerts, freshness, provenance, recompute, report, chat, and Agronautas hydrology contracts; Iberá/government code remains untouched.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Geometry | Validate canonical `POLYGON` WKT, normalize to SRID 4326, and return WKT plus derived metrics. | Retains the current seam and makes saved area/centroid/perimeter authoritative. |
| GIS rules | PostGIS validates closure, simplicity, non-empty/valid geometry, supported coverage, and bounds; derives m², hectares, and meters using geography. | Prevents client/server drift and keeps spatial logic out of UI. |
| API | Add authenticated `GET /fields/:fieldId/geometry` and idempotent `PATCH /fields/:fieldId/geometry`; reuse read/write scopes and BFF forwarding. | Additive, independently rollbackable, and consistent with current route/auth/service patterns. |
| Google | Optional browser adapter/loader gated by restricted `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; search/drawing are capabilities, not requirements. | No API secret, hard dependency, or false Google evidence. |
| UI | “Field operations editorial”: existing IBM Plex Sans + Source Serif 4, semantic Tailwind tokens, restrained motion, high-contrast evidence cards, asymmetric map/detail layout. | Commercial clarity without a second route or generic dashboard. |

## Data Flow

`Google/point fallback → client adapter → validated PATCH → Express use case → PostGIS → GET/query cache → map, evidence, risk/report/chat panels`

The response exposes `geometryStatus` (`saved|point_only|unavailable`), `source` (`operator|google|fallback`), and update time. Google is never an agronomic evidence source. Geometry edits do not silently recompute risk; the UI invokes the existing asynchronous action and shows only `enqueued` or `already_in_progress`. Reports/chat continue to disclose their existing freshness and degradation.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/zod-schemas/src/agronautas.ts` | Modify | Strict WKT/update/response schemas and numeric bounds. |
| `apps/api/src/domain/{entities,repositories}/agronautas.ts` | Modify | Geometry value object, metrics invariants, and repository port. |
| `apps/api/src/application/usecases/` | Create/modify | Geometry validation/update orchestration and domain errors. |
| `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.ts` | Modify | Parameterized PostGIS read/write, validity, coverage, metrics. |
| `apps/api/prisma/migrations/<timestamp>_agronautas_field_geometry/` | Create | Additive compatibility migration; preserve rows. |
| `apps/api/src/presentation/routes/agronautas.ts` and tests | Modify | GET/PATCH, auth, and 400/401/403/404/422/500 mapping. |
| `apps/web/src/lib/agronautas/{schemas,service,intake-map}.ts` | Modify | Contracts, queries/mutation, optional Google adapter/fallback. |
| `apps/web/src/components/agronautas/{page-client,workspace,field-detail}.tsx` | Modify | Mapping island, evidence cards, states/actions, Tailwind upgrade. |
| `apps/web/src/app/globals.css` and focused tests/E2E | Modify | Tokens/focus/motion and contract-stubbed journeys. |

## Interfaces / Contracts

```ts
interface FieldGeometry {
  polygonWkt: string; centroid: GeoPoint; areaM2: number; hectares: number;
  perimeterM: number; status: 'saved' | 'point_only' | 'unavailable';
  source: 'operator' | 'google' | 'fallback'; updatedAt: string | null;
}
interface UpdateFieldGeometryInput { polygonWkt: string; expectedUpdatedAt?: string }
```

PATCH repeats safely for identical canonical geometry. A stale `expectedUpdatedAt` returns a contract error and triggers refetch. Valid polygon hectares replace caller hectares; point-only intake remains backward compatible.

## Testing Strategy

| Layer | Coverage | Approach |
|---|---|---|
| Unit/contract | WKT, closure, self-intersection, SRID/coverage, bounds, metrics, schemas, auth/errors. | RED first; Node runner and Zod. |
| Integration | PostGIS round-trip, canonical WKT, metrics, idempotency, legacy point rows. | Configured PostgreSQL smoke; no Docker. |
| UI/E2E | Google missing/load/error, fallback, draw/edit/save, loading/empty/error/forbidden, invalidation, recompute/report/chat evidence. | Playwright stubs plus keyboard/focus/name assertions at desktop/mobile; not provider/Google/production proof. |

## Threat Matrix

| Boundary | Applicability | Response / RED test |
|---|---|---|
| Documentation-like paths | N/A — no executable classification. | No task/test. |
| Git repository selection | N/A — no Git automation. | No task/test. |
| Commit state | N/A — no commit automation. | No task/test. |
| Push state | N/A — no push automation. | No task/test. |
| PR commands | N/A — no PR automation. | No task/test. |

## Migration / Rollout

No destructive migration. Deploy schema/repository/API first, retain point-only reads, then enable UI. Missing/invalid Google config renders an explicit unavailable card and coordinate fallback. Rollback disables adapter/UI mutation and restores prior writes without deleting geometry.

## Evidence Levels

Level 0: tests/contracts. Level 1: local API + configured PostGIS. Level 2: credential-backed Google browser runtime. Level 3: pilot/production runtime. Display only observed levels; never invent provider or Google evidence.

## Open Questions

- [ ] Confirm polygon area/perimeter bounds and precision.
- [ ] Confirm production Google restrictions, APIs, and billing owner before Level 2.
