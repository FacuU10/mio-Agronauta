# Proposal: Agronautas / Iberá-Alerta Market Readiness

## Intent

Make the existing Agronautas/Iberá front trustworthy and commercially demonstrable without inventing providers, identity, forecasts, or field-management features. Evidence shows dead `Ver Risk Engine`, aborted demo contact POST, ambiguous `401`/`404`, HTTP-200 Copilot/citation mismatches, conflicting Iberá freshness, empty forecast copy, weak ingest recovery, nested `<main>`, and favicon/hydration warnings. Users need to know what is known, fresh, and safe to do.

## Scope

### In Scope
- Seven strict-TDD slices: (1) evidence/status/Copilot; (2) auth/demo/unavailable/404; (3) landing/demo conversion; (4) operator summary/ingest/429 recovery; (5) landmarks/forms/keyboard; (6) responsive/detail navigation; (7) browser acceptance evidence.
- Preserve truthful `live`, `seam`, `mock`, `unavailable`, `user_assumption_simulation`, missing, stale, degraded, citation-unavailable, and non-actionable states.
- RED tests precede implementation; Playwright desktop/390px follows.

### Out of Scope
- Marketplace, new field-management, providers, forecasts/recommendations, ownership redesign, auth-default changes, and production-ingest enablement.
- Broad redesign before reliable semantics, fake data, and production claims.

## Capabilities

### New Capabilities
- `market-readiness-ui`: truthful conversion, status presentation, accessibility, navigation, and browser acceptance.

### Modified Capabilities
- `runtime-evidence-foundation`: access, unavailable endpoint, freshness, Copilot outcomes, and acceptance boundaries.
- `intelligence-foundation`: undecided risk and non-actionable/insufficient evidence presentation.
- `ibera-alerta`: reconciled telemetry/provenance, empty forecast, ingest, and grounded Copilot.

## Approach

1. Normalize typed evidence, auth, availability, Copilot transport/stream/citations, retryability, and safe-next-action view models; keep API fields compatible.
2. Render them in `apps/web/src/components/agronautas/{page-client,workspace,field-detail}.tsx` and `apps/web/src/components/government/{overview,detail,ingest-panel}.tsx`.
3. Repair `apps/web/src/components/landing/{homepage,demo-contact-form}.tsx`; make `Ver Risk Engine` observable or remove it, classify `ERR_ABORTED`, and prove success/retry.
4. Add above-fold operator status, ingest recovery, and chat-429 backoff while preserving drafts.
5. Fix landmarks, autocomplete/errors, focus, keyboard paths, mobile navigation, copy, favicon, and hydration warnings.
6. Verify `apps/web/src/lib/{api-client.ts,agronautas/service.ts,visibility/chat.ts}`, API routes/auth middleware, and BFF responses.
7. Capture screenshots, console/network, BFF/API, and local-versus-external readiness evidence without unproven claims.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/web/src/components/{landing,agronautas,government}` | Modified | States, CTA, recovery, summaries, navigation, accessibility. |
| `apps/web/src/lib/{api-client.ts,agronautas/service.ts,visibility/chat.ts}`; `apps/web/src/app/api/hydrology/[...path]/route.ts` | Modified | Client/BFF normalization; no fabrication. |
| `apps/api/src/presentation/routes/{agronautas.ts,hydrology-government.ts}`; `middleware/agronautas-auth.ts` | Modified | API/auth outcome contracts. |
| `apps/web/tests/e2e/{agronautas-reality-runtime,agronautas-planning}.spec.ts`; government tests | Modified | RED-GREEN/browser acceptance coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Demo mistaken for production proof | High | Label mode; separate external evidence. |
| Normalization regresses evidence | Med | Compatible fields, fixtures, slice rollback. |

## Rollback Plan

Revert slices independently, retaining API fields, provenance, auth defaults, telemetry, and ingest behavior. Disable mappings at the existing capability/provider boundary.

## Dependencies

- Existing contracts/tests and Next.js/Express boundaries; strict TDD RED-GREEN-REFACTOR.
- External gates: production identity/auth, providers/Copilot, lead capture, endpoint availability, and approved ingest authorization. No fallback implies proof.

## Success Criteria

- [ ] Desktop/390px Playwright proves no overflow, one `<main>`, keyboard/focus/errors, screenshots, clean console, and expected BFF/API network.
- [ ] Observed 401/404/429, empty forecast, Copilot mismatch, demo failure, and ingest failure have truthful recovery.
- [ ] CTA/demo and operator next actions are observable; live/seam/mock/unavailable remain distinct.
- [ ] Evidence separates local demo from production/provider/auth/ingest readiness and adds no excluded behavior.
