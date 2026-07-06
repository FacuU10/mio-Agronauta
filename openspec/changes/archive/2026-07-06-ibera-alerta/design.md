# Design: ibera-alerta production fix

## Technical Approach

Make Iberá-Alerta production-safe without changing the public hydrology namespace. The web app will add a Next.js BFF route for `/api/hydrology/*` and adapt `GovernmentOverview`/`GovernmentDetail` to the canonical backend payload. The API will keep `apps/api/src/presentation/routes/hydrology-government.ts` as the controller boundary, but change ingest from all-or-nothing execution to per-source resilient execution and expose the new canonical ingest response through `@repo/zod-schemas`.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Frontend proxy | Create `apps/web/src/app/api/hydrology/[...path]/route.ts`, modeled on the existing agronautas BFF. | `next.config.mjs` rewrites only. | Route handler can preserve body/status/content-type, set `cache: 'no-store'`, forward bearer envs, and be unit-tested without relying on platform rewrite behavior. Keep `next.config.mjs` unchanged unless deployment later needs host-level rewrites. |
| UI mapping | Derive view fields in pure helpers inside `overview.tsx` or `government/municipality-view.ts`. | Ask backend to return legacy `latest/riskLevel/localizedWarning`. | Spec requires canonical backend contract; frontend owns presentation derivation. |
| Ingest resilience | `createGovernmentIngestionRunner` loops sources independently and never throws for individual source failures. | Reject whole request on first failed source. | Keeps last known official data visible and satisfies partial-failure contract. |
| DB safety | Runtime seeding performs idempotent upserts only; extension/admin setup stays in migrations/bootstrap. | Keep `CREATE EXTENSION` in request-time seed. | Avoids production privilege failures and unsafe request-time DDL. |

## Data Flow

Browser `/municipalities` → Next BFF `/api/hydrology/*` → Express `/api/hydrology/*` → `HydrologyRepository` → Postgres tables.  
Manual ingest → hydrology router → per-source clients/adapters → `saveTelemetryDeduped` + `saveIngestionRun` per source → canonical response with `results[]`.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/app/api/hydrology/[...path]/route.ts` | Create | Proxy `GET/POST/PUT/PATCH/DELETE` to `${AGRONAUTAS_API_INTERNAL_URL || http://localhost:3001}/api/hydrology/${path}`, forward `accept`, `content-type`, `x-request-id`, optional `AGRONAUTAS_BFF_BEARER_TOKEN`, upstream status/body/content-type, `no-store`. |
| `apps/web/next.config.mjs` | No change planned | Keep existing strict Next config; route handler is the proxy implementation. |
| `apps/web/src/components/government/overview.tsx` | Modify | Replace legacy types (`latest`, `riskLevel`, `localizedWarning`, `sourceFreshness.status`, alert `title`) with canonical `provinceCode`, `freshness/label`, `message`, `gaugeMappings`, `latestTelemetry[]`; render empty telemetry as `Sin datos oficiales recientes`. |
| `apps/web/src/components/government/detail.tsx` | Modify | Use `inaPredictions30d`, `alerts`, and `provenance[].freshness/label`; derive degraded from `freshness !== 'fresh'`; parse SSE lines for string token events and JSON events. |
| `apps/web/src/components/government/format.ts` | Modify | Add labels for canonical risk states (`normal`, `alerta`, `evacuacion`, `sin_datos`) if helpers need them. |
| `apps/web/src/app/municipalities/page.tsx`, `[id]/page.tsx` | Read/verify | Keep routing; verify they still pass IDs to components. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Wrap `/ingest` in contract error handling; update deps return type; implement per-source `results[]`; remove throw-on-source-failure; set success `lastSuccessfulObservedAt = observedTo`; upsert municipalities with `ON CONFLICT DO UPDATE`; remove runtime `CREATE EXTENSION`. |
| `packages/zod-schemas/src/agronautas.ts` | Modify | Change ingest response to `status: completed|partial|failed`, `requestedSources[]`, `results[] { source,status,recordsIngested,errorMessage?,provenanceUrl?,observedFrom?,observedTo? }`; keep `sources?` only if backward compatibility is required by tests. |
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modify | Read `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`; unsupported content returns `ok:false` with provenance, never fixture success. |
| `packages/hydrology-engine/src/repository.ts` | Modify | Ensure `saveTelemetryDeduped([], failed/empty run)` persists runs; no null-date conversion for absent telemetry rows. |
| `apps/api/prisma/migrations/*` / bootstrap SQL | Modify only if needed | Existing migration already creates PostGIS and municipality tables; add corrective migration only if constraints/defaults are missing. |

## Interfaces / Contracts

`POST /api/hydrology/ingest` response:

```ts
{ contractVersion:'hydrology-government-ingest-v1'; runId:string; status:'completed'|'partial'|'failed'; requestedSources: HydrologySource[]; results: Array<{ source: HydrologySource; status:'success'|'failed'|'empty'|'skipped'; recordsIngested:number; errorMessage?:string; provenanceUrl?:string; observedFrom?:string; observedTo?:string }> }
```

Frontend canonical municipality helpers: `latestTelemetry[]` max `lastSuccessfulObservedAt`, PNA height from `source=PNA/metric=river_height_m`, rain from `metric=rain_mm`, risk from thresholds.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | UI derivation with empty telemetry/canonical payload; SSE string tokens. | Vitest/React tests near government components. |
| Integration | BFF preserves GET/POST/body/status; ingest partial failure persists runs and continues. | Next route tests and `hydrology-government.test.ts`. |
| E2E | `/municipalities` loads 17 localities and detail renders telemetry/forecast/provenance. | Playwright with mocked API plus optional live smoke. |

## Migration / Rollout

No destructive migration. Keep old telemetry nullable behavior: frontend treats absent/empty `latestTelemetry` and null timestamps as `no disponible`. Runtime seed changes update existing municipality names, thresholds, boundary, and gauge mappings via upsert; old rows remain valid. Failed/empty ingest runs do not delete telemetry, so last known official readings remain visible. Roll out BFF/UI first, then ingest contract; keep additive schema changes backward-compatible where practical.

## Open Questions

None blocking.
