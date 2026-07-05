# Proposal: Agronautas Stabilization and Next Features

## Intent

Stabilize the current Agronautas production-launch work before adding features. The problem is not missing ambition; it is an unstable, mixed working tree with generated artifacts, uncertain Turbo/Next builds, unproven provider claims, and failed prior launch gates.

Decision: **salvage via stabilization slices, not blind reset**. Treat the current diff as a candidate patch set, keep verified value, discard generated/cache noise, and block new feature work until canonical gates are green.

## Scope

### In Scope
- Clean working tree/generated-artifact policy and canonical release commands.
- Deterministic `web` build/Turbo/schema package behavior without stale cache confidence.
- Truth-in-provider claims: real vs fixture vs placeholder must be explicit and tested.
- Scheduler persisted cadence and last-success/next-run behavior.
- Dashboard/PDF contract parity from the same persisted payload.
- Test command standardization, strict TDD, Playwright, and pessimistic fresh-context review.
- Next features only after stabilization: dashboard-first improvements, per-source cadence visibility, ingestion admin/status, PDF parity polish, and alerts/notifications if safe.

### Out of Scope
- Blind reset of all current work.
- Archive of prior noisy SDD change.
- Implementation in this phase.
- Auth/accounts/RBAC/billing.
- Marketing any provider as live/real without evidence gates.

## Capabilities

### New Capabilities
- `agronautas-stabilization-gates`: canonical build/test/artifact hygiene and release verification policy.
- `agronautas-ingestion-operations`: admin/status visibility for provider cadence, runs, failures, retries, and source freshness.

### Modified Capabilities
- `agronautas-signal-ingestion`: enforce persisted source cadence, last-success fallback, and honest provider mode claims.
- `agronautas-risk-dashboard`: require dashboard/PDF payload parity, Playwright coverage, and dashboard-first next improvements.
- `agronautas-field-scope`: preserve Argentina agriculture-wide/Corrientes-first scope and remove rice-only regressions.

## Approach

Use grouped subagents by slice: hygiene/build, domain/provider/scheduler, dashboard/PDF, and verify/review. Each slice starts with failing tests or artifact checks, then implementation, then canonical verify. No next feature slice starts until stabilization passes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `turbo.json`, package scripts | Modified | deterministic cache/build policy |
| `packages/zod-schemas/*` | Modified | schema build/export stability |
| `apps/api/src/**/agronautas*` | Modified | providers, scheduler, routes, contracts |
| `apps/web/src/components/agronautas/*` | Modified | dashboard/PDF UX contract |
| `apps/web/tests/e2e/*`, API/worker tests | Modified | canonical Playwright/TDD gates |
| `docs/runbooks/agronautas-production-hardening.md` | Modified | release gate commands |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Large mixed diff hides regressions | High | slice triage plus fresh-context review |
| Turbo/Next false green | Med | force clean/non-cached gates |
| Provider overclaiming | High | mode labels and live evidence requirements |
| Feature creep before stability | High | stabilization-first dependency gate |

## Rollback Plan

Revert a failed slice independently, restore last green proposal/spec/design state, and keep generated artifacts excluded. If salvage proves unsafe, escalate to reset/reapply with preserved verified tests.

## Dependencies

- Prior exploration artifact and existing Agronautas delta specs.
- Playwright availability and pessimistic fresh-context reviewer.

## Success Criteria

- [ ] Clean artifact policy documented and enforceable.
- [ ] Canonical commands pass without stale cache reliance.
- [ ] Provider, scheduler, dashboard/PDF claims match tested behavior.
- [ ] Playwright plus fresh-context pessimistic review are mandatory release gates.
