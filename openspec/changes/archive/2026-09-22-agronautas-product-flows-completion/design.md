# Design: Agronautas Product Flows Completion

## Technical Approach

Use additive, evidence-first vertical slices over the existing Express/Prisma/PostGIS/Redis API, Next.js/React Query web app, and Python worker. `B0` freezes ownership and vocabulary; `S1` resolves an authorized location; `S2` ingests provider evidence; `S3` composes the desktop/mobile view model; `S4` grounds Agronautas Copilot; `S5` and `S6` independently complete Iberá readiness and management; `S7` adds non-custodial discovery/RFQ; `G` proves real services. Preserve v1 reads while v2 contracts roll out behind capability flags.

## Architecture Decisions

| Decision | Choice and rationale | Rejected |
|---|---|---|
| Canonical truth | Version `Location`, `Evidence`, `Freshness`, `Provenance`, and per-source `Readiness` envelopes. Include workspace/field scope, geometry/coverage truth, observed/forecast/retrieved times, lineage, provider mode, and failure state. Backend composition prevents client-derived freshness and false readiness. | Duplicated source DTOs; client freshness. |
| Authorization | API use cases resolve actor → workspace → field/location for every read/write and Copilot citation. React Query keys include actor/session/workspace. This extends existing auth middleware and repository mapping without trusting filters in the UI. | Frontend-only filtering or global evidence cache. |
| Providers/runtime | `ProviderPort` adapters normalize climate, weather/SMN, FIRMS, and Sentinel/STAC. Persist immutable runs/evidence keyed by provider/signal/location/window; schedule idempotent jobs with Redis locks, Postgres leases, bounded retries, DLQ, and explicit `degraded`/`unavailable`. | Provider calls from routes; typed seams treated as live. |
| Boundaries | Agronautas, Iberá official-source readiness, management, and marketplace RFQ have separate routes/repositories/namespaces. Cross-product reuse is versioned, read-only, and allow-listed; marketplace has no money or settlement. | Universal context; imported Alqui/Vialovers behavior. |

## Data Flow

```text
BFF/session → scope resolver → location authorization → evidence composer → responsive view model
                                  ↑                         ↓
cron → Redis lease/queue → worker → ProviderPort → normalize → Postgres runs/evidence → readiness/Copilot citations
```

Selection uses a configured map/geocoder or truthful point-only fallback; geometry is never inferred from rendering. Copilot receives only selected-field v2 evidence and returns citation/run IDs. Iberá Copilot remains municipal and official-source scoped.

## File Changes

| File/module | Action | Responsibility |
|---|---|---|
| `packages/zod-schemas/src/agronautas-product-flows.ts`; API domain entities/repositories | Create/modify | v2 envelopes, ports, readiness, scope contracts; retain v1 parsers. |
| `apps/api/prisma/schema.prisma`, `prisma/migrations/*` | Additive | Location/evidence lineage, provider runs, campaigns/operations/tasks/audit, listings/RFQs; workspace ownership and idempotency keys; no destructive migration. |
| API `infrastructure/adapters`, `jobs/agronautas-*`, repositories, `presentation/routes/agronautas.ts` | Modify/create | Provider seams, normalization, cadence, leases/retries, scoped evidence, management/RFQ routes. |
| Web `lib/agronautas/{schemas,service}.ts`, BFF route, `components/agronautas/*` | Modify | Scoped query/cache keys, responsive view models, map capability, evidence/citation and failure states; no business rules. |
| `apps/workflow-runtime-python/src/{worker/runtime/agronautas_jobs.py,providers,graph}` | Modify | Real processors, v2 validation, durable outcome-before-ACK, evidence-only Copilot context. |
| Iberá routes/engine/government UI; `verify-*-real.ts`; E2E; `render.yaml` | Modify/create | Recovery/readiness, official geometry/coverage, operator permissions, observability, and separated local/production proof. |

## Interfaces / Contracts

```ts
type EvidenceV2 = { contractVersion: 'agronautas-evidence-v2'; locationId: string; workspaceId: string; fieldId?: string; provider: string; signalType: string; providerMode: 'live'|'seam'|'mock'|'unavailable'; status: 'fresh'|'stale'|'degraded'|'missing'; observedAt?: string; forecastAt?: string; retrievedAt: string; runId: string; sourceUrl: string; rawHash?: string; lastSuccessfulObservedAt?: string; degradationReasons: string[] }
interface ProviderPort { fetch(input: { locationId: string; window: { start: string; end: string }; requestId: string }): Promise<EvidenceV2> }
```

## Testing Strategy

| Layer | Coverage |
|---|---|
| Unit/RED | Envelope invariants; geometry/coverage; scope denial; provider timeout/schema/license; idempotency, lease expiry, retry/DLQ, freshness. |
| Integration | PostGIS/evidence persistence; queue-worker transitions; BFF/cache isolation; Copilot citation filtering; Iberá source isolation; audit and payment-free RFQ lifecycle. |
| E2E/real | Desktop/mobile rendering, map fallback, degraded recovery, citations, operator flows; then source-by-source local and production smoke using configured services only. |

## Threat Matrix

| Boundary | Applicability | Response |
|---|---|---|
| Documentation-like paths | N/A — no executable classification | No execution boundary. |
| Git selection; commit state; push state; PR commands | N/A — no VCS/PR automation | No repository or command mutation. |

API/BFF, queue, cron, and provider integration remain process boundaries: reject missing scope/configuration, fail closed on lease loss, retain last-good evidence as degraded, and log/return correlation, request, and run IDs.

## Migration / Rollout

Implementation uses additive migrations, dual-read compatibility, per-capability flags, and source-specific rollout. Stop only the affected worker/cron/provider; preserve v1 and last-good evidence; roll back additive schema when safe. Never touch auth artifacts. Local DB/Redis/worker/browser evidence is recorded separately from production evidence; credentials remain configuration categories, never invented.

## Open Questions

- [ ] Approve map/geocoder and Sentinel/STAC licensing owners.
- [ ] Confirm official Iberá geometry/coverage registry and management roles.
- [ ] Assign production cron/worker ownership and evidence retention.
