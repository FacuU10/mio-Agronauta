# Design: Agronautas Frontend UI/UX Completion

## Technical Approach

Incrementally turn the existing Next.js 15/React 19 workspace into a navigable operational product. Preserve the BFF, Zod contracts, `AgronautasService`, React Query, Zustand selection store, visibility model, and current components; add route boundaries and shared presentation primitives without rewriting the workspace. Gate G production proof and the pivot worktree remain explicitly out of scope.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Information architecture | Keep `/demo` as isolated demo; add protected `/agronautas/fields/[fieldId]`; use `/agronautas?view=fields\|activity\|management\|planning\|evidence\|intelligence\|copilot` for workspace slices; keep `/agronautas/marketplace` and Iberá routes stable. | Full route rewrite; one route per widget | Deep links improve recovery and testing while preserving existing query orchestration and URLs. |
| Data boundary | `AgronautasService` is the typed port; API/BFF, deterministic mock, and demo mode are adapters. Containers resolve provider and normalize outcomes; presentational components receive view models only. | Direct `fetch` in components; a new transport abstraction | Matches current schemas, BFF security boundary, and dumb-UI rule with minimal churn. |
| State ownership | React Query owns server data/cache and invalidation; Zustand owns only field/location selection and draft/error handoff; URL owns view and field identity. | Persisting server data in Zustand | Prevents stale cross-workspace data and keeps auth scope in query keys. |
| Visual system | Extend existing CSS variables and `components/ui` (`Button`, `Card`, `Badge`, `Input`, `Label`, `Select`) with semantic Tailwind variants and shared status/evidence primitives. | New design system or Storybook | Reuses current tokens, focus styling, and test conventions. |

## Route Map and Composition

`/` → public discovery → `/probar-demo` or `/demo`; `/login` → protected `/agronautas`.

`/agronautas` = `ProductShell` + workspace header/context + field index/intake + selected-field panels. URL view changes panel composition, not provider contracts. `/agronautas/fields/[fieldId]` reuses `FieldDetail`, evidence, geometry, activity, and Copilot with the same auth scope. `/agronautas/marketplace` composes catalog, RFQ form, RFQ history/audit, and provenance. `/municipalities`, `/municipalities/[id]`, and `/municipalities/ingest` retain the Iberá shell and government components. Add marketplace to `ROUTE_CONTRACTS`, metadata, navigation, and route-discovery tests.

## Data Flow

```text
URL/auth scope → route container → React Query + AgronautasService port
                              → Zod schema → normalized view model
                              → dumb panels + Status/Evidence primitives
```

Every operation renders applicable `loading`, `empty`, `error`, `unavailable`, `unauthorized`, `forbidden`, `maintenance`, `retry/recovery`, `stale`, `degraded`, `missing`, `mutating`, and `conflict` states. Management shows planned→active→completed plus blocked/cancelled and audit/revision conflicts. Marketplace shows fresh/degraded/unavailable/empty listings and RFQ invalid/submitting/created/duplicate/conflict/stale/not-found/cancelled; it never implies checkout, payment, offer, or order.

## Interfaces / Contracts

```ts
interface ProviderContext { mode: 'live' | 'seam' | 'mock' | 'unavailable'; source?: string; freshness: 'fresh' | 'stale' | 'degraded' | 'missing'; observedAt?: string; reason?: string }
interface ScreenState<T> { data?: T; status: 'loading' | 'ready' | 'empty' | 'error' | 'unavailable'; provider: ProviderContext; retryable: boolean }
```

Derive these from existing `normalizeRequestError`, `normalizeEvidenceStatus`, marketplace schemas, and runtime headers; never infer live status from HTTP 200 alone.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/web/src/app/agronautas/fields/[fieldId]/page.tsx` | Create | Protected deep-link boundary using existing detail composition. |
| `apps/web/src/app/agronautas/marketplace/page.tsx`, `route-contracts.ts`, `product-shell.tsx` | Modify | Metadata, active navigation, route truthfulness, role-aware links. |
| `apps/web/src/components/agronautas/**`, `marketplace/**`, `government/**` | Modify | Slice containers/panels, all state variants, management/RFQ UX. |
| `apps/web/src/lib/agronautas/**`, `visibility/**`, `components/ui/**`, `globals.css` | Modify | Provider/view-model boundary, tokens, status primitives. |
| `apps/web/tests/e2e/**`, component/unit tests, `README.md` | Modify | State matrix, responsive/accessibility evidence, startup/seed runbook. |

## UX, Responsive, and Accessibility

Desktop uses a bounded two-column workspace; mobile collapses to one column with a horizontally scrollable shell nav, field/context controls before panels, 44px touch targets, scrollable tables, and no hidden critical actions. Keep one `main#main-content`, skip link, semantic headings/landmarks, labelled controls, `aria-live` status/error regions, focus restoration after view/route changes, keyboard-operable disclosure/forms, visible focus rings, and reduced-motion behavior. Status badges pair text with color and expose source, mode, freshness, observed/last-success timestamps, and reason.

## Deterministic Startup and Testing

Required safe preview: install workspace dependencies once, run `pnpm run demo:local`, then open `/demo`. This starts only the web app and uses deterministic browser-side fixtures with stable IDs/timestamps; all frontend flows are visually explorable, demo state is labeled, mutations reset on reload, and the preview makes zero API writes. It does not start or connect to a database, run migrations, or invoke a seed.

Optional local-real verification is a separate path documented in `apps/web/tests/e2e/README.md`; use it only when real API/provider/database behavior is the subject of verification. Any required environment setup, auth/bootstrap, migrations or seed, and service startup must be invoked explicitly under that runbook, never by `demo:local`. Pin fixture timestamps/IDs and use the same provider mode labels in demo and mock paths. Unit tests cover route contracts, provider normalization, state matrices, management revisions, RFQ idempotency, and primitive accessibility. Playwright uses the existing managed harness, role/label selectors, and projects at 1440×900 and 390×844 for every route/deep link; reports keep demo, local-real, blocked, and production evidence separate. Demo evidence does not weaken or substitute for local-real claims. No production claim is made here.

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and RED test |
|---|---|---|
| Routing | Applicable | Unknown/missing route contracts fail closed; RED test covers marketplace registration, metadata, navigation, and deep links. |
| Documentation-like paths | N/A — no executable-file classification. | No task/test. |
| Git repository selection | N/A — no VCS automation. | No task/test. |
| Commit state | N/A — no commit automation. | No task/test. |
| Push state | N/A — no push automation. | No task/test. |
| PR commands | N/A — no PR automation. | No task/test. |

## Migration / Rollout

No database migration. Deliver reversible slices: route contract/shell, workspace deep links, management/RFQ states, primitives/tokens, then browser evidence/runbook. Roll back a slice by removing its route/link and restoring the prior container; preserve API contracts and unrelated dirty files. No feature flag is required unless a verified regression demands one.

## Open Questions

- [ ] Confirm the final protected field-detail URL name before implementation (`/agronautas/fields/[fieldId]`).
- [ ] Confirm which auth workspace is canonical for optional local-real verification; the browser-only demo does not require seeded auth.
