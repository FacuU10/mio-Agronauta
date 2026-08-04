# Design: Data-First Evidence Visibility

## Technical Approach

Keep the existing Express routes, Next.js BFF (`cache: 'no-store'`), and applied shells. Parse verified payloads at `apps/web/src/lib/agronautas/schemas.ts` and normalize presentation semantics once in a new pure `apps/web/src/lib/visibility/evidence-state.ts`; components remain dumb renderers. The API changes only when a contract test proves an already-produced field is being dropped by a schema/adapter. Missing or unproven acquisition, geometry, scheduler, and Copilot correlations remain explicitly missing/conditional.

## Explicit Exclusions

This design does not implement or imply Google Maps, WhatsApp, broad Corrientes/national precomputation, a scheduler rewrite, Risk Engine rewrite or consolidation, durable editable polygons, hydraulic simulation, or official municipality mapping without verified geometry and impact semantics. Each is a separate gated change requiring its own evidence and approval.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Normalize in each component | Fast, but duplicates state rules and risks “live” claims | Reject; one typed view-model normalizer |
| Add a new evidence API | Strong boundary, but invents acquisition/trace contracts | Reject; preserve current routes and add only proven additive fields |
| Extend the applied shell | Repeats completed UI work | Reject; add evidence panels/labels in existing workspace/detail surfaces |

The shared state vocabulary is `observed`, `forecast`, `cached/latest-good`, `stale`, `degraded`, `missing`, and `mock/seam`. `observed`/`forecast` require source plus timestamp; `mock/seam` names mode/seam. Freshness is derived only from returned timestamps/status, never from a fetch assumption.

## Data Flow

`Express route → Zod contract parser → evidence-state view model → existing workspace/detail/overview components`

Agronautas maps field, risk, alert, status, timeline, dashboard, hydrology, and Copilot responses into source/time/state rows. Iberá maps municipality/dashboard telemetry, INA forecasts, alerts, mappings, provenance, and the verified protected-ingest response/status contract into the same vocabulary. Copilot panels render only returned metadata/evidence; absent references stay missing.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/lib/visibility/evidence-state.ts` | Create | Typed state constants, timestamp/freshness normalization, and conditional/missing helpers. |
| `apps/web/src/lib/agronautas/schemas.ts`, `service.ts` | Modify | Preserve parsed source, provenance, freshness, degradation, and returned Copilot metadata without transport logic. |
| `apps/web/src/components/agronautas/{workspace,field-detail,page-client}.tsx` | Modify | Render field context, risk/weather/hydrology evidence, diagnostics, and Copilot evidence with stable semantic labels; do not rebuild the applied UX. |
| `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx` | Modify | Render telemetry/INA/alerts/mappings/provenance, partial protected-ingest outcomes, bounded in-memory status, and Copilot trace; retain list fallback and accessibility. |
| `apps/api/src/presentation/routes/{agronautas,hydrology-government}.ts` | Conditional modify | Keep route topology and acquisition behavior; expose only evidence fields already produced and proven by route tests. |
| `packages/zod-schemas/src/agronautas.ts` | Conditional modify | Preserve/parse only contract-tested additive optional fields already emitted by routes. `runId`, complete evidence references, geometry, and scheduler lifecycle remain conditional/missing until proven. |
| `contract-to-screen-matrix.md` | Modify | Add implementation view-model/component and test references; every row requires a concrete acceptance assertion and deterministic test receipt before acceptance, not merely a generic suite pass. |

## Interfaces / Contracts

```ts
const EVIDENCE_STATE = { OBSERVED: 'observed', FORECAST: 'forecast', CACHED: 'cached/latest-good', STALE: 'stale', DEGRADED: 'degraded', MISSING: 'missing', MOCK: 'mock/seam' } as const
type EvidenceState = (typeof EVIDENCE_STATE)[keyof typeof EVIDENCE_STATE]
interface EvidenceViewModel { state: EvidenceState; source?: string; observedAt?: string; lastSuccessfulObservedAt?: string; detail?: string }
```

Agronautas geometry persistence, durable job/scheduler state, complete acquisition trace, and full Copilot context are not contracts in this slice. Iberá status remains bounded in-memory (15-minute TTL/32 entries); it is not durable history. Thresholds and mappings are labeled mapped/threshold-based, never hydraulic impact or official geometry. Any identifier not present in the allowed artifacts is forbidden unless a task first proves its source/route/schema contract and adds a matrix row; no fields may be invented.

## Testing Strategy

Strict TDD: RED contract tests first, then GREEN normalizer/component changes, then refactor. Unit/contract tests cover all seven states, timestamp requirements, only verified optional fields, hydrology contracts, and protected-ingest sanitization. Focused component tests cover complete, missing, stale/degraded, mock/seam, partial-ingest, empty, error, accessibility, and returned Copilot evidence. Every matrix row must have its own acceptance assertion and deterministic test receipt; implementation is not accepted while any row lacks either. Run existing API, hydrology-engine, web, and worker pytest suites as regression. The deterministic browser receipt uses `agronautas-smoke.spec.js`, `agronautas-production.spec.js` (workspace plus field detail), `government-ui.spec.js` (Iberá overview/detail), and `hydrology-ingest.spec.js`, all with roles/labels. `hydrology-government.spec.js` is a separate live-provider check and is explicitly skipped without its authorized runtime; no live or production result is inferred. The prior known `government-ui.spec.js:78` baseline note remains historical and is not reclassified as a current pass/failure without a matching run.

## Threat Matrix

N/A — no new route topology, shell command, subprocess, VCS/PR automation, executable classification, or process-integration boundary; existing HTTP routes are consumed without acquisition changes.

## Migration / Rollout

No migration or Docker. Roll back the evidence normalizer, additive proven contract fields, matrix references, and UI labels together; existing applied journeys and data remain intact. Runtime proof requires externally configured PostgreSQL/Redis, provider endpoints, credentials/tokens, and real source responses; report local/production evidence separately and never infer live data from fixtures.

## Open Questions

- [ ] Which optional Copilot evidence-reference fields, if any, are emitted by a verified route fixture and may graduate from conditional?
- [ ] Future on-demand remains a separate PR: prove one centroid/source, request/run IDs, timeout/rate/latency, cache/latest-good, durable persistence/history, freshness, and Copilot correlation before implementation or any Corrientes-wide claim.
