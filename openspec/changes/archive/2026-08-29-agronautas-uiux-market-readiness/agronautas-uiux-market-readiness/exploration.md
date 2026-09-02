# Agronautas / Iberá-Alerta UI/UX Market-Readiness Exploration

## Executive assessment

The product has a credible evidence-first direction and a usable mobile baseline, but it is not yet market-ready for high-consequence operational use. The largest issues are not cosmetic: production/auth configuration is easy to confuse with demo mode, several visible controls and data sections do not complete their advertised journeys, and Copilot can return HTTP 200 while presenting an error/no-evidence state. Operators need a consistent answer to three questions on every screen: what is known, how fresh it is, and what action is safe to take next.

## Current State

- The Next.js web app exposes a public landing page, demo request form, Agronautas workspace/field detail, municipality overview/detail, and protected hydrology ingest flow.
- The Express API exposes Agronautas and Iberá-Alerta BFF routes. A local demo run was exercised with API port `3101`, `AGRONAUTAS_AUTH_ENABLED=false`, and `AGRONAUTAS_RUNTIME_MODE=demo`; the web app ran on `3010`.
- Existing UI patterns emphasize provenance, evidence states, stale/degraded data, and explicit labeling of planning simulation as `user_assumption_simulation` rather than a forecast.
- The 390px audit found no horizontal overflow on the audited routes. Desktop and mobile layouts are structurally stable, but long detail pages require substantial scrolling and weakly prioritize the next operator action.
- Existing component and E2E tests cover important contracts, but runtime evidence exposed integration gaps not apparent from the happy-path test suite.

## Affected Areas

- `apps/web/src/components/landing/homepage.tsx` — public value proposition and the non-functional `Ver Risk Engine` affordance.
- `apps/web/src/components/landing/demo-contact-form.tsx` — lead capture submission and failure recovery.
- `apps/web/src/components/agronautas/page-client.tsx` — workspace loading, authentication, degraded states, and endpoint orchestration.
- `apps/web/src/components/agronautas/workspace.tsx` — field intake, workspace navigation, chat, planning, and intelligence surfaces.
- `apps/web/src/components/agronautas/field-detail.tsx` — operational field detail, report, recompute, timeline, and missing-data states.
- `apps/web/src/components/government/overview.tsx` — municipality filtering and empty-state behavior.
- `apps/web/src/components/government/detail.tsx` — telemetry, evidence status, thresholds, forecasts, source provenance, and Copilot presentation.
- `apps/web/src/components/government/ingest-panel.tsx` — token verification, authorization errors, and retry behavior.
- `apps/web/src/lib/api-client.ts`, `apps/web/src/lib/agronautas/service.ts`, `apps/web/src/lib/visibility/chat.ts` — transport and error/status normalization.
- `apps/api/src/presentation/routes/agronautas.ts` and `apps/api/src/presentation/routes/hydrology-government.ts` — endpoint availability and response contracts.
- `apps/api/src/presentation/middleware/agronautas-auth.ts` — shared authentication behavior across demo and production modes.
- `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts`, `apps/web/tests/e2e/agronautas-planning.spec.ts`, and `apps/web/src/components/government/*.test.tsx` — regression coverage to extend before implementation.

## Audited journeys and real evidence

### Public acquisition

- `/`: page title and primary `Probar demo` CTA work. `Ver Risk Engine` is a button with no observable route, scroll, or action; it is a dead affordance. Favicon request returned `404`.
- `/probar-demo`: visible labels and form structure are usable. Submission displayed the expected failure alert, but `POST /api/agronautas/v1/contact/demo` failed with `net::ERR_ABORTED`; successful lead capture was not demonstrated.

### Agronautas

- `/demo` without the local demo override returned `401` for workspace/runtime and rendered an error/fallback state. This is valid security behavior but the boundary between “sign in,” “demo,” and “backend unavailable” is not sufficiently explicit.
- `/demo` in demo mode loaded workspace/runtime; creating `auditoria-lote-001` returned `201` and navigated to a field. Most field requests returned `200`, while geometry, hydrology dashboard, activity, and intelligence requests returned `404`. Alerts/current returned `202`.
- Planning simulation returned `200` and the UI correctly labeled the result as `user_assumption_simulation`, explicitly distinguishing assumptions from forecasts, recommendations, or market data.
- Chat returned `429 Too Many Requests`; the UI showed `HTTP 429` and logged `ApiError`. Recovery guidance and retry/backoff behavior need verification.
- `/demo/fields/field-demo-1` showed a clear load-error state when unauthenticated, with numerous `401` requests. In demo mode core data loaded but geometry remained unavailable. The route was responsive without horizontal overflow.
- The workspace accessibility snapshot contained nested `<main>` elements, which should be corrected to preserve document landmarks.

### Iberá-Alerta

- `/municipalities`: dashboard request returned `200`, no console errors, and the no-results filter message was clear. Search/select controls do not declare `autocomplete`.
- `/municipalities/virasoro`: dashboard returned `200` with no initial console errors. Copilot `POST` returned `200`, but the UI rendered `ERROR · REINTENTABLE`, “El stream todavía no entregó tokens,” and zero verified references despite response metadata containing citation data. This is a contract/status rendering mismatch.
- `/municipalities/bella-vista`: dashboard returned `200`, no console errors, and no horizontal overflow. It displayed observed PNA/INA values and threshold comparison, but marked INA, missing telemetry, and source provenance as missing while also showing current source cards as vigente. The forecast table was empty but still displayed the 15–30 day planning guidance. This combination is difficult to interpret without a single authoritative freshness/status model.
- Bella Vista Copilot `POST` returned `200`, but the UI rendered `ERROR · REINTENTABLE`, no tokens, no verified reference, and metadata with `citationMode: none`, `unverifiedClaims: true`, and `citationUnavailable: true`. The warning is safer than displaying unsupported advice, but HTTP success and UI error need an explicit typed outcome.
- `/municipalities/ingest`: invalid token verification returned `401`, one browser error, and a visible authorization alert. The token input is described as memory-only and was not persisted. Authorized success and ingest-progress completion were not tested because no approved token was available.

## Personas and jobs to be done

1. **Producer / agronomist** — “Give me a field-level risk read and the evidence behind it so I can decide whether to inspect, wait, or escalate.” Needs fast summary, freshness, missing-data explanation, and safe next action.
2. **Municipal operations coordinator** — “Tell me which local signal changed, whether it crosses an official threshold, and which source supports it.” Needs current-vs-stale distinction, source links, threshold context, and operational handoff.
3. **Civil-defense ingest operator** — “Verify access, run a controlled source update, and know whether it completed or failed.” Needs explicit auth state, progress, retry safety, and no ambiguity about token handling.
4. **Evaluator / prospective customer** — “Understand the product’s real capability before requesting a demo.” Needs working acquisition CTA, credible demo path, and transparent distinction between live evidence, simulation, and unavailable services.

## UX, accessibility, and responsive findings

### Strengths

- Primary headings, visible labels, status regions, alert regions, tables, source links, and skip-link affordances are present in audited flows.
- Mobile layouts at 390px did not overflow horizontally across the audited public, workspace, municipality, detail, and ingest routes.
- Error and degraded states are generally visible rather than silently failing.
- The product uses explicit observed/missing/degraded vocabulary and warns against turning source mappings into impact claims.

### Market-readiness defects

- Dead `Ver Risk Engine` button undermines trust at the first conversion step.
- Demo contact failure is not distinguished from a user validation error or server outage, and successful submission remains unproven.
- Long municipal detail pages place the most decision-relevant state deep below the fold; the operator must scroll through telemetry, governance, mappings, alerts, forecast, sources, and Copilot before reaching the next action.
- Status vocabulary is inconsistent: source cards say `Vigente`, evidence rows say `missing`, and Copilot can say `Listo` before a query then `ERROR` after a successful HTTP response.
- Empty forecast data and “planning speculative” copy appear together without a prominent “no forecast available” explanation at the table boundary.
- Copilot metadata, citation count, stream/token state, and visible result state are not normalized into one contract.
- Invalid ingest verification leaves the button disabled and does not visibly move focus to the error or provide an immediate retry affordance in the captured state.
- Nested `<main>` landmarks appear on `/demo`.
- Visible labels are mostly strong, but hidden/locality fields and autocomplete semantics should be intentionally documented or improved where user-agent assistance is expected.

## Trust, freshness, provenance, and business-decision review

- **Trust:** explicit simulation labeling and “no geometry verified” language are good safety patterns. Dead CTAs, 401/404 noise, and HTTP-200 Copilot errors reduce perceived reliability.
- **Freshness:** timestamps are exposed, but the page can present conflicting freshness/evidence signals. Every metric should share a normalized status such as `observed`, `stale`, `missing`, `degraded`, or `unavailable`, with timestamp and source reason.
- **Provenance:** official source URLs are exposed in municipality detail, but the “source provenance missing” state conflicts with current source cards and mappings. The product needs a single provenance summary and clear distinction between source registration, station mapping, and latest observed record.
- **Business decisions:** planning simulation is safely bounded, but no user should infer operational advice from a Copilot response with `unverifiedClaims:true` or no citations. The UI must make “not actionable” a first-class state and prevent success styling for unsupported output.
- **Identity/provider risks:** local demo mode bypasses normal auth and cannot prove production tenant/role behavior. Lead capture, chat rate limits, Copilot provider availability, and authorized ingest require environment-specific validation before promising them commercially.

## Approaches

1. **Contract-first reliability slice** — normalize endpoint outcomes and evidence/Copilot states first, then update shared status components and tests.
   - Pros: fixes the most dangerous trust mismatch; reduces duplicated route-specific logic; creates a stable basis for UI polish.
   - Cons: touches API and client contracts; requires coordinated fixture/runtime coverage.
   - Effort: Medium.

2. **Surface-first conversion slice** — repair landing/demo acquisition, shorten detail-page decision path, and improve error/retry UX before contract normalization.
   - Pros: fastest visible market-readiness improvement; directly affects evaluation and onboarding.
   - Cons: risks polishing states that remain semantically inconsistent; leaves operational trust defects.
   - Effort: Medium.

3. **Broad redesign** — restructure all dashboard/detail pages around role-based layouts and a shared design system.
   - Pros: strongest long-term information architecture.
   - Cons: high scope and regression risk; not justified before endpoint/status contracts are reliable.
   - Effort: High.

## Recommendation

Use a contract-first sequence followed by a narrow conversion/accessibility slice. First define typed outcome states for auth, unavailable endpoint, missing data, stale data, provider failure, rate limit, empty forecast, and citation-unavailable Copilot results. Make the UI render those states consistently and add regression tests from the observed failures. Then repair the dead CTA/demo submission path, focus/retry behavior, nested landmarks, and the above-the-fold operator summary. Defer a broad visual redesign until production identity, providers, lead capture, and endpoint availability are verified.

## Prioritized backlog and thin SDD slices

### P0 — safety and trust

- **P0.1 Evidence/status contract:** reconcile `Vigente`, `observed`, `missing`, `fresh`, and `unavailable` into one typed model; show timestamp/source/reason together.
- **P0.2 Copilot outcome contract:** distinguish transport success, stream success, grounded citations, provider failure, empty stream, and retryable error. Never style HTTP 200/no-citation output as ready or actionable.
- **P0.3 Auth/runtime boundary:** make production auth, demo mode, and backend outage visually distinct; add protected-route acceptance tests.
- **P0.4 Missing endpoint behavior:** replace raw 404 noise with intentional capability/unavailable states for geometry, activity, intelligence, and hydrology dashboard endpoints, or restore the contracts.

### P1 — conversion and operational flow

- **P1.1 Repair landing/demo journey:** make `Ver Risk Engine` either functional or remove it; classify demo-submit failures; add success and retry acceptance tests.
- **P1.2 Operator summary:** put current status, freshness, threshold comparison, confidence, and next safe action above the long detail sections.
- **P1.3 Ingest verification:** add explicit authorized-success, invalid-token, expired-token, progress, completion, and safe retry states; restore focus to actionable error/retry controls.
- **P1.4 Rate-limit recovery:** present 429 with retry timing/backoff guidance and preserve the user’s draft question.

### P2 — accessibility and polish

- **P2.1 Landmarks:** remove nested `<main>` and verify one document main landmark per route.
- **P2.2 Form semantics:** review autocomplete, error association, focus management, and keyboard navigation across all audited forms.
- **P2.3 Detail navigation:** add a compact section index or sticky status summary while preserving mobile readability.
- **P2.4 Visual consistency:** align status labels, capitalization, timestamps, badges, and source-card language across Agronautas and Iberá-Alerta.

## Acceptance evidence for the next phase

- Browser tests at desktop and 390px mobile verify no horizontal overflow and one main landmark.
- `/` either navigates from `Ver Risk Engine` or no longer presents it.
- `/probar-demo` proves validation, successful submission, server failure, and retry behavior against a controlled test endpoint.
- Demo and production auth tests prove distinct `401`, demo, unavailable, and loaded states.
- Field routes prove intentional behavior for every currently observed 404 capability.
- Municipality detail tests assert that displayed evidence status, freshness, source URL, and threshold comparison are internally consistent.
- Copilot tests cover HTTP 200 with tokens/citations, HTTP 200 with empty stream, no citations, provider failure, rate limit, and retry; UI state must match metadata.
- Ingest tests cover invalid token, authorized access, ingest progress, completion, and retry without exposing or persisting the token.
- Manual smoke evidence records production/provider identity separately from local demo-mode evidence.

## Rollback boundaries

- Roll back client status rendering independently if normalized states regress existing evidence displays.
- Keep API response fields backward-compatible while clients migrate; do not remove existing provenance or simulation markers in the first slice.
- Gate Copilot changes behind the existing provider/feature boundary so a provider failure can fall back to a clearly non-actionable unavailable state.
- Ship landing/demo fixes separately from operational contract changes where possible.
- Do not enable production ingest or change authentication defaults as part of a UI-only slice.

## Risks and blockers

- Local demo-mode behavior is not proof of production auth, tenant isolation, provider credentials, lead capture, or ingest authorization.
- The contact endpoint failure, multiple 404s, rate limiting, and Copilot empty-stream behavior may reflect local configuration or real integration defects; each needs environment-specific confirmation.
- Conflicting municipality freshness/evidence fields could cause operators to over-trust or under-trust a reading unless the contract is normalized before visual polish.
- No approved ingest token was available, so authorized ingest completion remains unverified.
- No application code was modified during this exploration. The only known untracked working-tree artifact is the preexisting `openspec/changes/agronautas-runtime-canonical-risk-contract/verify-report.md`.

## Ready for Proposal

**Yes.** Proceed with a proposal centered on P0 evidence/Copilot/auth contract normalization, followed by the P1 conversion and ingest slices. Treat the runtime findings above as verified local evidence, not as proof of production readiness, and require the acceptance matrix before implementation.
