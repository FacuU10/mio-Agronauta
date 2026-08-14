# Design: Iberá-Alerta Institutional Evidence Expansion

## Technical Approach

Extend the existing Iberá read model additively. A reviewed registry becomes the only activation path for municipality/source associations; repository adapters read registry metadata, persisted telemetry, official-alert mappings, and durable ingest outcomes; API routes validate versioned Zod contracts and compute bounded explanations; existing government screens render the resulting states. Generated PostGIS squares remain storage placeholders and are never returned as official geometry.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Registry | Add PostgreSQL registry and association records containing official identifiers, source/station/coverage keys, URL, freshness policy, registry version, review status, reviewed-at, and geometry status metadata. | Infer associations from locality names, coordinates, or existing arrays. | Makes provenance and activation explicit and prevents synthetic coverage from becoming institutional fact. |
| Timeline | Query persisted telemetry and reviewed official-alert evidence with server-enforced time, cursor, and count bounds; call it an evidence timeline, not incidents. | Add acknowledgement, assignment, escalation, resolution, or case tables. | Delivers history without creating an unowned case-management domain. |
| Explanations | Compute threshold comparison and bounded tendency server-side. Use provider tendency initially; calculate a deterministic observed-window summary only when a stable same-source series exists. Keep forecasts provider-supplied and ≤30 days. | Client calculations, generated forecasts, influence/impact models, or long-range forecasts. | Preserves source truth, existing horizon limits, and the no-hydraulic boundary. |
| Geometry | Return a typed `unverified`/`unavailable` geometry status and provenance metadata only; do not expose the seeded polygon. | Publish current squares or add geometry-derived maps/alerts. | The current `squareBoundary()` data is not authoritative administrative geometry. |

## Data Flow

```text
Reviewed registry + telemetry + alert coverage + ingest ledger
             │                 │
             └──── Repository read models ────┐
                                               ↓
                                  API contract validation
                                               ↓
                         Overview/detail/operator UI state
```

Registry activation rejects incomplete provenance and leaves the association `unavailable` or `unverified`. Timeline queries use the registry’s station/coverage keys, order by observation time, and cap results. Last-known evidence is returned separately from current source status. No browser mutation changes registry, mappings, geometry, or evidence.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add typed persistence models for registry entries and reviewed source associations; preserve existing municipality/telemetry tables. |
| `apps/api/prisma/migrations/<timestamp>_ibera_source_registry/migration.sql` | Create | Additive tables, review/status constraints, uniqueness, and bounded-query indexes; no geometry backfill. |
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add Iberá-namespaced const-backed status values and schemas for provenance, coverage, geometry, timeline, and explanation envelopes; extend overview/dashboard contracts additively. |
| `packages/hydrology-engine/src/types.ts` | Modify | Add flat TypeScript ports/read-model types for registry entries, evidence events, coverage status, and bounded query input. |
| `packages/hydrology-engine/src/repository.ts` | Modify | Read reviewed registry associations, bounded historical telemetry/alerts, and source status; never select seeded geometry as an official field. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Expose validated provenance/coverage/timeline/explanation data, enforce bounds and existing ingest authorization, and retain `EXCLUDED_TOPIC_RE`. |
| `apps/api/src/infrastructure/database/postgres/seed-municipality-alert-coverage.ts` | Modify | Keep finite reviewed mappings idempotent; registry rows activate only with complete source-backed metadata. |
| `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx` | Modify | Render provenance, coverage/geometry status, bounded evidence history, explanation limitations, durable run state, and loading/empty/stale/failed/blocked/unavailable/unauthorized/retry states. |
| `packages/zod-schemas/src/agronautas.test.ts`, `packages/hydrology-engine/src/{hydrology-engine.test.ts}`, `apps/api/src/presentation/routes/hydrology-government.test.ts`, `apps/web/src/components/government/{overview,detail,ingest-panel}.test.tsx` | Modify | Add strict-TDD RED/GREEN coverage for contracts, bounds, authorization, provenance, safe degradation, and forbidden hydraulic/impact/provider behavior. |

## Interfaces / Contracts

Use const objects before inferred types (no direct string unions):

```ts
const IBERA_COVERAGE_STATUS = {
  SUPPORTED: 'supported', PARTIAL: 'partial', UNAVAILABLE: 'unavailable',
  STALE: 'stale', FAILED: 'failed', BLOCKED: 'blocked', UNVERIFIED: 'unverified',
} as const

interface IberaEvidenceQuery { municipalityId: string; from: string | null; to: string | null; limit: number; cursor: string | null }
interface IberaSourceProvenance { source: HydrologySource; stationId: string | null; coverageKey: string | null; sourceUrl: string; freshnessPolicy: string; registryVersion: string; reviewStatus: 'reviewed' | 'pending' | 'blocked'; reviewedAt: string | null }
```

The response must distinguish `currentStatus`, `lastKnownEvidence`, `geometryStatus`, and `explanationAvailability`; absent evidence is null/unavailable, never inferred.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Status derivation, registry activation, deterministic tendency window, 30-day forecast gate, bounded detail sanitization. | Node tests with table cases, including incomplete provenance and generated geometry. |
| Integration | SQL registry joins, timeline ordering/cursor/limit, last-known versus current status, authenticated ingest history, route schema validation. | Repository fakes and API HTTP tests; first assert RED cases, then implementation. |
| UI/E2E | Overview/detail/operator loading, empty, stale, failed, blocked, unavailable, unverified, unauthorized, retry, and safe copy. | Existing component tests plus Playwright route checks at desktop/mobile sizes. |

## Threat Matrix

N/A — this design adds HTTP read contracts but no shell commands, subprocesses, VCS/PR automation, executable-file classification, or process-integration boundary; all documentation-like path, Git selection/commit/push, and PR-command rows are therefore not applicable.

## Migration / Rollout

Add tables and nullable metadata only. Existing mappings remain readable, but associations without complete reviewed provenance project as `unavailable`/`unverified`. Roll out read fields behind contract-compatible defaults; rollback by disabling registry activation and omitting additive projections. No provider, geometry, hydraulic, impact, or Agronautas ownership data is introduced.

## Open Questions

None.
