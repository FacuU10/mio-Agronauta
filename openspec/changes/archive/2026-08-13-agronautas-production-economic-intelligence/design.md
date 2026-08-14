# Design: Agronautas Evidence-First Economic Intelligence Foundation

## Technical Approach

Add a backend-owned, read-only intelligence view model at a new Agronautas field endpoint. It composes only persisted field, field-context, climate, and risk evidence through existing ports and extends Zod/JSON contracts additively. No provider, migration, economic calculation, recommendation engine, or risk-engine selection is introduced. The dashboard requests it alongside the existing payload and renders typed states.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Read model ownership | API application view model/use case | Route/browser composition | Keeps eligibility, mapping, and lineage rules outside transport/UI. |
| Capability representation | Discriminated `available` / `unavailable` / `insufficient_evidence` | Nullable values or flags | Prevents absent evidence becoming a numeric fact. |
| Evidence lineage | Source, unit, optional currency, observed/retrieved timestamps, source/run references | Generic JSON | Future-compatible without provider selection or invented observations. |
| Route/UI integration | Add `/fields/:fieldId/intelligence`; preserve dashboard | Widen/replace dashboard | Bounded rollback and compatibility. |

## Data Flow

    FieldRepository + FieldContextRepository
              │
    SignalSummaryRepository + RiskSnapshotRepository
              │
              ▼
    BuildAgronautasIntelligenceUseCase
              │  typed state mapping; no derived economics
              ▼
    `GET /agronautas/fields/:fieldId/intelligence`
              │
              ▼
    Web service schema → server-owned query boundary → IntelligencePanel

Climate and risk carry existing values, freshness/degradation, engine identity, and lineage. Soil, prices, FX, and economics carry no usable value; they are `unavailable` without verified observations. Recommendation is `insufficient_evidence` with all prerequisites.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add versioned metadata, capability-state, intelligence, and blocked-recommendation schemas/types. |
| `packages/contracts/schemas/agronautas-contracts.v1.schema.json` | Modify | Mirror the contract for cross-runtime validation. |
| `apps/api/src/application/viewmodels/agronautas-intelligence.ts` | Create | Pure mapping/view-model builder; preserves `selectionStatus: undecided`. |
| `apps/api/src/application/usecases/get-field-intelligence-usecase.ts` | Create | Orchestrates existing repositories and returns the validated read model. |
| `apps/api/src/presentation/routes/agronautas.ts` | Modify | Register read-scoped endpoint and not-found behavior. |
| `apps/api/src/presentation/routes/agronautas.test.ts` | Modify | RED/GREEN coverage for states, lineage, and blocked recommendation. |
| `apps/web/src/lib/agronautas/schemas.ts` | Modify | Export the shared intelligence schema/types. |
| `apps/web/src/lib/agronautas/service.ts` | Modify | Add `getFieldIntelligence` to the service and mock contract without invented economic values. |
| `apps/web/src/components/agronautas/workspace.tsx` | Modify | Add responsive evidence-first panel and states. |
| `apps/web/src/components/agronautas/page-client.tsx` | Modify | Fetch via a narrow React Query boundary. |
| `apps/web/src/components/agronautas/intelligence-panel.test.tsx` | Create | Verify rendered values, unavailable states, lineage, and recommendation blocking. |
| `packages/zod-schemas/src/agronautas.test.ts` | Modify | Validate discriminated states and metadata requirements. |

## Interfaces / Contracts

```typescript
const INTELLIGENCE_STATE = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence',
} as const

interface ObservationMetadata {
  source: string
  unit: string
  currency?: string
  observedAt: string
  retrievedAt: string
  lineage: { sourceRunIds: string[]; observationRefs: string[] }
}

interface Capability<T> {
  state: 'available' | 'unavailable' | 'insufficient_evidence'
  value?: T
  metadata?: ObservationMetadata
  reason?: string
  missingInputs?: string[]
}
```

The schema requires `value` and metadata for `available`; other states require a reason and forbid usable values. Recommendation returns `insufficient_evidence` with soil, crop-history/yield, price, FX, and cost blockers. Risk retains `undecided`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | State refinement, metadata, pure mapping, complete blocker list | Node test runner with fixtures containing only existing climate/risk evidence. |
| Integration | Endpoint, authorization, not-found, degraded/latest-good lineage | Existing route harness and repository fakes; assert no economic value. |
| Contract | Shared Zod and JSON schema parity | Existing contracts validation commands and schema tests. |
| UI | Loading/error, available climate/risk, unavailable domains, blocked recommendation | Component tests and mock service; no UI calculations. |
| E2E | Intelligence panel in the existing Agronautas route | Playwright smoke against the existing mock/demo service, asserting truthful labels only. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable-file classification | None | None |
| Git repository selection | N/A — no VCS automation | None | None |
| Commit state | N/A — no commit automation | None | None |
| Push state | N/A — no push automation | None | None |
| PR commands | N/A — no PR automation | None | None |

The endpoint is ordinary authenticated application routing; it introduces no shell, subprocess, VCS, PR, or process-integration boundary.

## Migration / Rollout

No migration required. The slice is additive and read-only, uses existing persistence, is independently removable, and leaves Iberá-Alerta routes, schemas, storage, vocabulary, and ownership unchanged. No provider rollout or feature flag is needed; unavailable states are the default when evidence is absent.

## Open Questions

None blocking. Provider selection, observation persistence, economic formulas, and recommendation eligibility policy remain future SDD changes.
