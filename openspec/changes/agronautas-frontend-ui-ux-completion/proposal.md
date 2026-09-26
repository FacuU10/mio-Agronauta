# Proposal: Agronautas Frontend UI/UX Completion

## Intent

Complete the Agronautas web MVP as a truthful, navigable operational product—not a cosmetic redesign. Operators, producers, marketplace participants, and government users need route-level access to real backend capabilities, understandable lifecycle transitions, and explicit evidence/provenance boundaries across desktop and mobile.

## Scope

### In Scope
- Reconcile product navigation, route metadata/contracts, deep links, and marketplace discovery with the existing BFF/API boundaries.
- Complete workspace information architecture for fields, activity, geometry, management, planning, evidence, intelligence, Copilot, marketplace catalog/RFQ, and Iberá-Alerta/government surfaces where contracts exist.
- Expose management/RFQ state transitions and all required loading, empty, error, unavailable, degraded, maintenance, forbidden, recovery, and provenance/freshness states.
- Standardize responsive, accessible, keyboard/focus, and Tailwind visual-system behavior; add deterministic local seed/demo data and one documented startup/seed path.
- Extend Playwright/browser evidence to label stubbed/demo, local real, blocked, and production claims separately.

### Out of Scope
- Payments, payouts, checkout, escrow, custody, Money Out, Alqui, or Vialovers.
- New providers, backend redesign, unsupported production claims, or Gate G production evidence.
- Pivot worktree access or broad visual/architectural rewrites.

## Capabilities

### New Capabilities
- `marketplace-catalog-rfq`: Navigable catalog, discovery, RFQ creation/review/cancellation, provenance, and state transitions.
- `frontend-demo-evidence`: Deterministic demo states, reproducible startup/seed documentation, and evidence attribution.

### Modified Capabilities
- `frontend-route-foundations`, `agronautas-operational-journey`, `management-foundation`, `intelligence-foundation`, `ibera-alerta`: complete route-level workspace and operational exposure.
- `truthful-state-recovery`, `shared-accessibility-status-focus`, `responsive-visual-consistency`: cover the full state matrix and responsive accessibility contract.
- `browser-acceptance-evidence`, `seo-discoverability`: reconcile marketplace/navigation coverage and separate local evidence from production proof.

## Approach

Use the exploration recommendation: incremental route/state completion. Preserve typed schemas, BFF adapters, visibility helpers, current components, and seeds; first fix shell/route truthfulness, then add deep-link boundaries and missing states, followed by responsive/accessibility hardening and browser evidence. Keep UI dumb and preserve live/seam/mock/unavailable semantics.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/app`, `components/**`, `product-shell.tsx` | Modified | Routes, IA, stateful surfaces, navigation, responsive UI |
| `apps/web/src/lib/**`, `apps/web/tests/e2e/**` | Modified | Contracts, visibility, seeds, evidence matrix and browser proof |
| `apps/api/src/presentation/routes/**`, scripts, env docs | Contract-aligned | Consume existing backend contracts; document local startup/seed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Demo data appears live | High | Persistent provenance/mode/freshness labels and negative tests |
| Embedded surfaces remain hard to deep-link | Med | Route contract matrix and slice-level boundaries |
| External prerequisites block production proof | High | Report blocked/unavailable separately; never fabricate success |

## Rollback Plan

Revert each route/state/evidence slice independently, preserving unrelated dirty files and existing API contracts; restore the prior navigation/fixture boundary if a verified regression occurs.

## Dependencies

- Existing schemas, BFF routes, auth/permissions, deterministic seeds, and local service startup prerequisites.
- Product decisions remain bounded by the stated non-goals; production origin, credentials, providers, workers, queues, and hydrology access are external evidence prerequisites.

## Success Criteria

- [ ] Every in-scope surface is reachable by truthful navigation and stable deep link at desktop/mobile sizes.
- [ ] Each operation exposes confirmed transitions and the complete applicable state matrix without fabricated evidence.
- [ ] Local demo startup/seed is reproducible, and browser reports distinguish demo/stubbed/local-real/blocked/production evidence.
- [ ] Keyboard/accessibility, responsive, route-contract, unit, and Playwright checks pass for the completed slices.
