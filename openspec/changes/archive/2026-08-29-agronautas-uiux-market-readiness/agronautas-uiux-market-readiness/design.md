# Design: Agronautas / Iberá-Alerta UI/UX Market Readiness

## Technical Approach

Follow the contract-first sequence: normalize transport, access, evidence, freshness, and Copilot outcomes before layout; then compose dumb status components into landing and product surfaces. Preserve API fields, route prefixes, auth defaults, simulation markers, and unavailable states. Marketplace and new field-management features remain excluded.

## Architecture Decisions

| Decision | Choice | Rationale / rejected alternative |
|---|---|---|
| View-model boundary | Pure web adapters for request, evidence, Copilot, ingest, and safe-action models; containers translate, components render props. | Prevents duplicated conditions in JSX. |
| Compatibility | Additive normalization in client/service/BFF layers; preserve status, fields, and unknown compatible data. | Avoids breaking consumers and fixtures. |
| UI composition | Extend `visibility/primitives.tsx` with status, evidence, retry/focus, and Copilot components using existing Tailwind tokens. | No new system or Storybook before semantics stabilize. |
| Rendering | Server-owned data/auth where possible; client islands only for queries, forms, streaming, focus, and timers. | Limits hydration work. |

## Data Flow

    API/BFF response
      → normalizer (raw status retained)
      → typed outcome/evidence/Copilot models
      → page container (auth/demo/capability policy)
      → dumb summary/detail/recovery components
      → retry, focus, submit, or navigation intent

Map `401/403/404/429/5xx`, abort/network, loading, empty, stale, degraded, and `live/seam/mock/unavailable` without turning HTTP 200 into success. Copilot is actionable only when transport, tokens, citations, metadata, and `unverifiedClaims` agree. Containers place one status/freshness/threshold/next-action summary above sections.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/lib/visibility/view-models.ts` | Create | Const-backed outcome/evidence/Copilot/next-action types and normalizers. |
| `apps/web/src/lib/{api-client.ts,agronautas/service.ts,visibility/chat.ts,visibility/polling.ts}` | Modify | Normalize errors, streams, citations, 429 timing, and ingest; retain raw contracts. |
| `apps/web/src/components/visibility/primitives.tsx` | Modify | Dumb status/evidence/retry/focus components with consistent copy and metadata. |
| `apps/web/src/components/agronautas/{page-client,workspace,field-detail}.tsx` | Modify | Auth/demo/unavailable boundaries, summary/index, recovery, mobile navigation; remove nested `main`. |
| `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx` | Modify | Reconcile telemetry/provenance/forecast/Copilot; add summary, retry, progress, and draft preservation. |
| `apps/web/src/components/landing/{homepage,demo-contact-form}.tsx` | Modify | Observable CTA; classify submit outcomes and preserve failed drafts. |
| `apps/web/src/app/api/{agronautas,hydrology}/[...path]/route.ts`; `apps/api/src/presentation/routes/{agronautas,hydrology-government}.ts` | Modify | Compatible route bodies/statuses with consistent retryable errors and request IDs; no auth/ingest enablement change. |
| `apps/web/src/lib/visibility/view-models.test.ts` plus existing component/API tests | Create/Modify | RED-GREEN-REFACTOR coverage for normalized states and observed mismatches. |
| `apps/web/tests/e2e/market-readiness.{spec.ts,md}`, `market-readiness-page.ts` | Create | No-stub acceptance against the BFF harness, using role/label selectors. |
| `apps/web/playwright.config.mjs` | Modify | `1440x900` and `390x844` projects with baselines and no interception. |

## Interfaces / Contracts

```ts
const OUTCOME = { READY: 'ready', LOADING: 'loading', EMPTY: 'empty', UNAVAILABLE: 'unavailable', UNAUTHORIZED: 'unauthorized', FORBIDDEN: 'forbidden', RETRYABLE: 'retryable' } as const
type Outcome = (typeof OUTCOME)[keyof typeof OUTCOME]
interface RequestOutcome<T> { outcome: Outcome; data?: T; httpStatus?: number; code?: string; reason?: string; retryable: boolean; retryAfterMs?: number }
interface CopilotViewModel { outcome: Outcome; answer: string; citations: string[]; sources: string[]; citationMode: 'validated-context' | 'context-only' | 'none'; citationUnavailable: boolean; retryable: boolean; retryAfterMs?: number; reason?: string }
```

Existing evidence, chat, ingest, and contract-error fields remain accepted and adapted at boundaries. Use dedicated interfaces; never `any`.

## Testing Strategy

| Layer | Coverage | Approach |
|---|---|---|
| Unit | Normalizers, citations, freshness, auth/status, abort/429, safe actions | RED first; assert no fabricated success and field preservation. |
| Component/integration | Summary/detail, focus, retry, empty forecast, form, BFF/API, token non-persistence | Node runner, Testing Library, API tests for unavailable branches. |
| E2E | `/`, `/probar-demo`, `/demo`, field, municipality, detail, ingest | No `page.route` stubs; both viewports, one `main`, no overflow, keyboard/error paths, console/network, expected statuses. |
| Visual/performance | Above-fold summary, index, errors, empty forecast, mobile nav | `toHaveScreenshot` with reduced motion; parallel reads, minimal serialization, no new dependency, no client business logic. |

## Threat Matrix

BFF routing changes; no shell, subprocess, VCS, PR, or executable classification is introduced.

| Boundary | Applicability | Design response | RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable documentation | None | None |
| Git repository selection | N/A — no git automation | None | None |
| Commit state | N/A — no commit automation | None | None |
| Push state | N/A — no push automation | None | None |
| PR commands | N/A — no PR automation | None | None |

## Migration / Rollout

No data migration. Ship seven reversible slices: contracts; access/unavailable; landing; operator recovery; accessibility; responsive IA; browser acceptance. Roll back mappings/components independently while retaining API fields, provenance, auth behavior, simulation markers, and unavailable states. Production readiness is separate: local strict-TDD and no-stub browser checks must pass, followed by authorized checks for identity/tenant behavior, provider/Copilot citations, lead capture, endpoint availability, and ingest authorization. Demo, seam/mock, unavailable, and external evidence remain separate; missing proof is never inferred.

## Open Questions

None. Production evidence is a release gate, not a design assumption.
