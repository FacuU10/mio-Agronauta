# Tasks: Agronautas Production Launch Real Ingestion

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1800-3200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Work units 1 → 2 → 3 → 4; implementation should use multiple subagents grouped by related tasks to avoid context bloat |
| Delivery strategy | grouped-subagents with reviewable work units |
| Chain strategy | chained or grouped slices recommended |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: grouped-subagents-by-related-tasks
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Contracts, field scope, additive persistence | main | Roll back by disabling real mode; no destructive schema changes. |
| 2 | Source cadence research + real ingestion scheduler/worker/adapters | grouped subagent | Roll back cron/queue flag; keep latest-good snapshots. |
| 3 | Dashboard/PDF/copilot from persisted payload | main | Roll back UI routes/PDF action to hidden state. |
| 4 | Runbook, observability, launch gates | main | Roll back operational toggles only. |

## Today / Near-Term MVP Tasks

### Phase 1: Contract and Scope TDD
- [x] 1.1 RED: add failing tests in `packages/zod-schemas/src/agronautas.test.ts` for Corrientes non-rice, unsupported regions, evidence, scheduler, dashboard, PDF; run `pnpm --filter @repo/zod-schemas test`.
- [x] 1.2 GREEN: update `packages/zod-schemas/src/agronautas.ts`, regenerate `packages/contracts/schemas/*agronautas*`, rerun schema tests.
- [x] 1.3 REFACTOR: remove rice-only copy/invariants in `apps/api/src/domain/entities/agronautas.ts`; verify `pnpm --filter api test -- agronautas`.

### Phase 2: Persistence and Ingestion TDD
- [x] 2.1 RED: add repository tests for PostGIS fields, raw evidence, normalized summaries, risk snapshots, latest-good fallback in `apps/api/src/infrastructure/database/postgres/*agronautas*.test.ts`.
- [x] 2.2 GREEN: implement additive `apps/api/src/infrastructure/database/postgres/agronautas-*.ts` repositories and migrations; verify idempotent upserts.
- [x] 2.3 RED: add adapter/job/scheduler tests for provider success, failure, duplicate lock, retry/DLQ, hourly tick, and per-source due selection in `apps/api/src/infrastructure/adapters` and `jobs`.
- [x] 2.4 RESEARCH: record selected source/provider update cadence, rate limits, freshness SLA, and source references in contracts/runbook before final provider scheduling.
- [x] 2.5 GREEN: implement real provider adapters, `agronautas-signal-ingestion-job.ts`, Redis scheduled-window locks, a 1-hour base cron tick, and per-source due planning from recorded cadence.

### Phase 3: Worker, API, Dashboard, PDF TDD
- [x] 3.1 RED: add `pytest` cases for `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` success/duplicate/retry/DLQ/stale schema behavior.
- [x] 3.2 GREEN: implement Python worker orchestration and deterministic risk snapshot writes; run `pytest apps/workflow-runtime-python`.
- [x] 3.3 RED: add route/UI/PDF tests for dashboard payload, recompute status, no-auth boundary, degraded evidence, and PDF parity.
- [x] 3.4 GREEN: update `apps/api/src/presentation/routes/agronautas.ts`, `apps/web/src/components/agronautas/*`, and server PDF generation from persisted dashboard payload.

### Phase 4: Refactor and Launch Verification
- [x] 4.1 REFACTOR: centralize freshness/confidence/degradation helpers; keep UI dumb and business rules backend-owned.
- [x] 4.2 Verify full gate: `pnpm test`, `pnpm --filter api test`, `pnpm --filter web test`, `pnpm exec playwright test`, `pytest apps/workflow-runtime-python`; tests/build alone are insufficient.
- [ ] 4.3 Run a fresh-context pessimistic/adversarial verify agent against the code/diff, launch claims, scheduler cadence behavior, Playwright evidence, and rollback plan.
- [x] 4.4 Document provider credentials, per-source cadence, cron, SLA, rollback, degradation playbook in `docs/runbooks/agronautas-production-hardening.md`.

## Future Big-Picture Backlog
- [ ] F1 Add `auth security` integration, accounts/RBAC/billing boundaries after MVP.
- [ ] F2 Expand enabled Argentina provinces, crop calibrations, provider rate-limit governance.
- [ ] F3 Add hydrology reuse APIs, advanced satellite indices, alert subscriptions, and regional benchmarking.
- [ ] F4 Add PDF branding/templates, signed exports, audit history, and operator admin console.
