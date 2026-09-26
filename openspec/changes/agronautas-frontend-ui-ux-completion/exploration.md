# Exploration: Agronautas frontend UI/UX completion

## Current State

The web app already contains the main Agronautas, marketplace, and Iberá-Alerta journeys, but they are exposed through a mixture of marketing, demo, protected, and embedded workspace surfaces rather than one consistently navigable product flow. The main operational surface is composed inside `apps/web/src/components/agronautas/workspace.tsx`; management, planning, field activity, geometry, intelligence, evidence, and Copilot are not separate top-level pages.

The frontend has a typed API adapter and a deterministic mock service. The adapter validates responses with Zod schemas and exposes fields, management, planning, marketplace/RFQ, geometry, evidence, and Copilot operations. The mock service provides demo-only state, including explicit geometry fallback and degraded Copilot responses. This supports truthful local/demo states, but the boundary between demo, seam/mock, unavailable, maintenance, and live API behavior must remain visible in the UI.

The existing route-contract test declares most routes but omits `/agronautas/marketplace`, even though the page exists. Public discovery intentionally includes only public non-parameterized routes and requires an explicitly configured origin; without one, sitemap output is empty and canonical URLs are omitted. Existing browser evidence is substantial for seven routes at desktop and mobile, but it is local-only, and several suites use network stubs. The real-runtime suite separately records blocked or unavailable prerequisites instead of claiming production readiness.

## Affected Areas

- `apps/web/src/app/` — route composition and boundary pages for marketing, demo, protected Agronautas, marketplace, and Iberá-Alerta.
- `apps/web/src/components/agronautas/` — operational workspace, intake, field detail, management, planning, evidence, Copilot, auth, and maintenance states.
- `apps/web/src/components/marketplace/` — catalog and RFQ flow, currently less integrated with the shared product navigation.
- `apps/web/src/components/government/` — municipality overview/detail/ingestion and hydrology Copilot surfaces.
- `apps/web/src/components/shell/product-shell.tsx` — shared navigation and product-level information architecture.
- `apps/web/src/lib/agronautas/service.ts` and `apps/web/src/lib/agronautas/schemas.ts` — API/mock boundaries and response validation.
- `apps/web/src/lib/route-contracts.test.ts`, `robots.ts`, `sitemap.ts` — route metadata/discovery contract; marketplace omission requires reconciliation.
- `apps/web/src/lib/visibility/` — live/seam/mock/unavailable/freshness/provenance display rules.
- `apps/api/src/presentation/routes/agronautas.ts` and `hydrology-government.ts` — backend contracts already available to the frontend.
- `apps/api/src/scripts/seed-corrientes-rice-demo.ts`, `seed-government-hydrology.ts`, and `infra/bootstrap/agronautas/` — deterministic local data and reproducibility.
- `apps/web/tests/e2e/` — existing smoke, readiness, responsive, auth, planning, marketplace, hydrology, and real-runtime coverage; coverage must distinguish stubbed local acceptance from real service evidence.
- `apps/web/.env.example`, `apps/api/.env.example`, and root/package scripts — setup, auth bootstrap, service startup, seed, and verification documentation.

## Approaches

1. **Incremental route and state completion** — preserve the current component architecture, reconcile route contracts/navigation, then close the highest-value missing states and journeys in the existing workspace and page components.
   - Pros: lowest risk; reuses existing schemas, BFF routes, visibility helpers, seeds, and passing browser coverage; keeps scope aligned with MVP outcomes.
   - Cons: some operational capabilities remain embedded rather than independently addressable; navigation and state logic may stay distributed.
   - Effort: Medium

2. **Rebuild the frontend information architecture** — introduce a new route hierarchy and split embedded operational capabilities into dedicated pages before completing individual states.
   - Pros: clearer long-term navigation and ownership boundaries.
   - Cons: high regression risk; duplicates or disrupts existing tested flows; unnecessary while backend contracts and current surfaces are already usable.
   - Effort: High

## Recommendation

Choose incremental route and state completion. First reconcile the route contract and shared navigation, then prioritize truthful loading/error/empty/degraded/auth/maintenance states across the existing Agronautas, marketplace, and Iberá-Alerta surfaces. Reuse the existing BFF contracts, schemas, visibility model, and deterministic seeds. Extend real-runtime and responsive browser coverage only where it proves an unverified boundary; do not treat stub-only tests or local managed-harness evidence as production proof.

The next planning phase should define a small ordered slice: route/navigation truthfulness, operational workspace completeness, marketplace/RFQ discoverability, Iberá-Alerta state coverage, and setup/evidence documentation. It should explicitly separate functional gaps from external evidence blockers such as missing public origin, credentials, provider access, worker/queue services, or production topology.

## Risks

- `/agronautas/marketplace` can drift from metadata, route-contract, sitemap, and navigation behavior because it is implemented but not declared in the route contract test.
- Embedded features may be difficult to deep-link, test independently, or recover from without introducing clearer route-level boundaries.
- Demo/mock data can appear live unless every response and UI state preserves the existing provenance, freshness, and capability labels.
- Existing E2E evidence mixes real browser traffic with route stubs; coverage reports must identify which claims are local, stubbed, managed-harness, blocked, or production.
- Production readiness cannot be inferred until approved origin, tenant/auth credentials, provider access, and required API/worker/queue/hydrology prerequisites are available.
- The repository has pre-existing dirty backend changes; implementation must avoid resetting or overwriting unrelated work.

## Ready for Proposal

Yes. The codebase and current evidence are sufficient for a scoped proposal. The proposal should keep the incremental approach, define explicit route/state acceptance criteria, and preserve the separation between local evidence and production readiness.
