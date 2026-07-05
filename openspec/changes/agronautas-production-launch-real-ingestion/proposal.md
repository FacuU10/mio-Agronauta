# Proposal: Agronautas Production Launch Real Ingestion

## Intent

Launch Agronautas MVP as a real-data agricultural risk dashboard for Argentina, starting with Corrientes, replacing rice-only/demo assumptions with reliable scheduled ingestion, explainable risk, and supportable reporting.

## Scope

### In Scope
- Expand Agronautas contracts/copy/boundaries from Corrientes rice to Corrientes-first Argentina agriculture.
- Implement real scheduled multi-signal ingestion: weather, alerts, satellite/vegetation, fire, hydric/soil stress, and reusable hydrology signals, with a base scheduler tick every 1 hour and per-source cadence before final provider scheduling.
- Persist raw evidence, normalized summaries, run status, freshness, confidence, degradation reasons, and deterministic risk snapshots.
- Dashboard-first presentation with signal cards, provenance, scheduler/recompute status, alerts, timelines, and PDF export from persisted dashboard state.
- Strict TDD gates before implementation: contracts, adapters, repositories, scheduler, API, E2E, PDF, and worker tests.

### Out of Scope
- Auth/accounts/billing/RBAC replacement; future auth uses our own `auth security` library.
- Full Argentina rollout on day one, IoT/edge automation, legal ESG/carbon certification, and Iberá-Alerta as product identity.

## Capabilities

### New Capabilities
- `agronautas-field-scope`: Corrientes-first Argentina agricultural field intake and regional boundary behavior.
- `agronautas-signal-ingestion`: Real provider ingestion, evidence persistence, freshness, degradation, and idempotent scheduled runs.
- `agronautas-risk-dashboard`: Dashboard/PDF payloads, provenance, alerts, timelines, scheduler status, and deterministic risk presentation.

### Modified Capabilities
- None; no existing `openspec/specs/` capabilities were found.

## Approach

Use Approach 2 from exploration: production MVP real-ingestion slice. Keep domain/risk logic outside UI; define typed TS/Python contracts first, then implement provider adapters and a single cron/scheduler entrypoint with a 1-hour base tick. Before final provider scheduling, research and record each provider/source update cadence, rate limit, and freshness SLA; schedule each source according to its real cadence instead of blindly running all sources hourly. PDF is generated from persisted dashboard state, not separate logic.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/zod-schemas/src/agronautas.ts` | Modified | Multi-crop/category/signal contracts. |
| `packages/contracts/schemas/*agronautas*` | Modified | Regenerated TS/Python contract bridge. |
| `apps/api/src/presentation/routes/agronautas.ts` | Modified | Real-mode dashboard, PDF, copy, recompute/status APIs. |
| `apps/api/src/infrastructure/{adapters,jobs,queue,database}/agronautas-*` | Modified | Providers, scheduler, idempotency, persistence. |
| `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` | Modified | Scheduled multi-signal recompute/ingestion worker path. |
| `apps/web/src/components/agronautas/workspace.tsx` | Modified | Dashboard-first Agronautas UI, PDF action, freshness/provenance. |
| `docs/runbooks/agronautas-production-hardening.md` | New | Scheduler/provider/SLA/rollback operations. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Provider failure/quota | High | Fixtures, retries, latest-good degraded mode, freshness/confidence display, and per-source cadence/rate-limit documentation before final scheduling. |
| Scope ballooning | Med | MVP limited to real ingestion + dashboard + PDF; auth deferred. |
| Duplicate scheduled jobs | Med | Idempotency keys, Postgres/Redis locks, run status tests. |
| Misleading PDF/satellite confidence | Med | Timestamp, evidence refs, cloud/staleness/degradation disclaimers. |

## Rollback Plan

Keep feature/config flags for new scheduler/providers/PDF route. Disable cron entrypoint, revert to latest-good snapshots, and roll back contract/API/UI changes as one deployment slice if launch checks fail.

## Dependencies

- Selected real providers and credentials/rate limits.
- Cron host capable of a 1-hour base tick: Render Cron, GitHub Actions schedule, or Vercel Cron trigger.
- Provider cadence research for each selected real source before final scheduler configuration.
- PostGIS/Postgres and Redis availability.

## Success Criteria

- [ ] `pnpm test`, package tests, Playwright E2E, and worker `pytest` pass with new failing-first coverage.
- [ ] Real-mode dashboard uses persisted provider data and never silently swaps demo fixtures.
- [ ] Scheduler ticks hourly, then enqueues each source only when due by recorded provider cadence, with visible freshness, failures, and next-run status.
- [ ] PDF includes timestamp, risk, drivers, evidence, confidence, and degradation disclaimers.
