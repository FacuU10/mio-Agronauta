# Tasks: Agronautas + Iberá UI/UX MVP Visibility

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 1,850–1,980; within the user’s 2,000-line cap |
| 2,000-line budget risk | Low |
| 400-line budget risk | High (local work units, one PR under the approved cap) |
| Chained PRs recommended | No |
| Delivery strategy | single-pr; automatic through apply/verify |
| Suggested split | One PR, nine cohesive work units |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal / acceptance | Focused test | Runtime harness | Rollback boundary |
|---|---|---|---|---|
| 1 | `components/shell`, `components/visibility/*`, `app/globals.css`, `layout.tsx`: shared tokens, shell, states, a11y. | `pnpm --dir apps/web test` | `pnpm dev`; `/demo`, `/municipalities` | Revert shared UI files. |
| 2 | `/app/demo`, `components/agronautas/*`, `lib/agronautas/service.ts`, map adapter: intake, search/pin, coverage, decision dashboard. | Agronautas component tests | `/demo` with inside/outside coverage fixtures | Revert Agronautas workspace files. |
| 3 | `/app/demo/fields/[fieldId]`, Agronautas detail components/service: risk, alerts, timelines, evidence, freshness, recompute, PDF. | detail/view-model tests | `/demo/fields/{id}` | Revert field-detail slice. |
| 4 | `lib/visibility/sse.ts`, `ChatPanel`, existing Agronautas chat wiring: facts, metadata, citations, partial/error SSE. | SSE + page-client tests | Inject `metadata/token/error` stream | Revert harness/adapters only. |
| 5 | `app/municipalities*`, `components/government/*`, hydrology client: overview/list fallback, telemetry, INA/PNA/INMET/SMN, provenance. | Government tests | `/municipalities/{id}` | Revert Iberá overview/detail files. |
| 6 | `app/municipalities/ingest`, `ingest-panel`, `lib/visibility/polling.ts`: `202`→`statusPath`, per-source results, sanitized diagnostics/retry. | polling + ingest tests | POST ingest fixture then poll | Revert ingest/polling adapter. |
| 7 | Existing Copilot in `components/government/detail.tsx` plus `ChatPanel`: metadata, citations, timestamps, limits, SSE failure. | detail/chat tests | Failed/partial Copilot stream | Revert Copilot enrichment. |
| 8 | Agronautas/Iberá future cards: prices, trends, crop decisions, marketplace/export, connections, management. | placeholder assertions | Navigate both routes; confirm no action/payload | Revert placeholder cards. |
| 9 | `apps/web/tests/e2e/*` and unit/integration suites: full journeys, desktop/mobile, keyboard, contrast, map alternative, honest states. | `pnpm --dir apps/web test:e2e` | `pnpm dev` + Playwright journeys | Revert test additions only. |

## Phase 1: Shared foundation

- [x] 1.1 RED state/primitives and shell tests; GREEN `ProductShell`, tokens, `StatusBadge`, freshness/evidence/source/table/timeline/map/chat/report primitives; REFACTOR without auth/security work.
- [x] 1.2 RED contract tests; GREEN `MapProviderAdapter`, view-model state matrix, and `SseEvent` types. Threat matrix rows are all N/A; no threat RED tasks apply.

## Phase 2: Agronautas first

- [x] 2.1 RED intake/dashboard tests; GREEN `/demo` workspace, locality search, point pin/coverage, allowed crop fields, and decision-first navigation.
- [x] 2.2 RED detail/recompute/report tests; GREEN `/demo/fields/[fieldId]` risk, drivers, evidence, alerts, timelines, freshness, `enqueued|already_in_progress`, and PDF disclaimer.
- [x] 2.3 RED partial-SSE tests; GREEN existing Agronautas chat harness with injected facts, metadata, citations, trace, limits, retry, and preserved tokens.

## Phase 3: Iberá second

- [x] 3.1 RED overview/detail tests; GREEN municipalities list/map fallback, locality telemetry, mappings, official alerts, INA horizon labels, sources and freshness.
- [x] 3.2 RED `202`/polling tests; GREEN ingest start, bounded `statusPath` polling, terminal/partial states, source diagnostics sanitization, and safe retry.
- [x] 3.3 RED Copilot stream tests; GREEN existing Iberá Copilot enrichment without creating a chat or changing prompts.

## Phase 4: Honest completion and verification

- [x] 4.1 RED no-fake-data tests; GREEN explicit “Próximamente/contrato pendiente” placeholders with no fabricated values or actions.
- [x] 4.2 RED-to-GREEN Playwright journeys and accessibility checks; run `pnpm --dir apps/web test`, `pnpm --dir apps/web test:e2e`, `pnpm build`, and real local route smoke.
