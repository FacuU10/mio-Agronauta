# Tasks: Agronautas Stabilization and Next Features

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900-1,400 incl. tests; current diff already ~2,200 touched lines with generated noise |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Hygiene/build → provider+scheduler → dashboard/PDF → next features → verify |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Salvage hygiene + deterministic gates | PR 1 | remove generated files; fix `.gitignore`, `turbo.json`, package scripts |
| 2 | Provider truth + scheduler persistence | PR 2 | base after PR 1; API/domain/schema/tests |
| 3 | Dashboard/PDF shared payload | PR 3 | base after PR 2; route/UI/PDF parity tests |
| 4 | Safe next features + verification | PR 4 | gated admin/freshness/alerts plus final review |

## Phase 1: Hygiene / Salvage

- [x] 1.1 RED: add/confirm a provenance check that fails on `.next`, `dist`, `.turbo`, `coverage`, `*.tsbuildinfo`, `__pycache__`, `*.pyc`, `*.egg-info`, generated maps/declarations.
- [x] 1.2 GREEN: inspect `git status --short` and remove generated/test-output artifacts from the working tree; keep only source, tests, docs, config, SQL, OpenSpec.
- [x] 1.3 REFACTOR: map every kept file to a spec requirement in `docs/runbooks/agronautas-production-hardening.md`; rollback by reverting this slice only.

## Phase 2: Deterministic Build / Test Gates

- [x] 2.1 RED: tests for `packages/zod-schemas` build output and `turbo.json` no-cache `web#build` + `@repo/zod-schemas#build` policy.
- [x] 2.2 GREEN: fix `package.json`, `apps/web/package.json`, `packages/zod-schemas/package.json`, `turbo.json` so clean Next builds run after schema `build:ensure`.
- [x] 2.3 VERIFY commands: `pnpm --filter @repo/zod-schemas build`, `pnpm --filter web build`, `pnpm turbo test --force`, `pnpm test`; rollback scripts/config only.

## Phase 3: Provider Truth + Scheduler

- [x] 3.1 RED: schema/API tests for modes `live|seam|mock|unavailable`, evidence, failure reason, last-success, next-due, overdue, and extended ingestion backoff: attempt 1 waits 45s, attempt 2 waits 5m, attempt 3 waits 10m, attempt 4 waits 15m, then desist until the next scheduled hourly run.
- [x] 3.2 GREEN: update `packages/zod-schemas/src/agronautas.ts`, provider adapters, repositories, scheduler, and routes to persist cadence, classify truthfully, and enforce extended backoff without touching Iberá-Alerta.
- [x] 3.3 VERIFY: `pnpm --filter @repo/zod-schemas test`, `pnpm --filter api test -- agronautas`, plus restart/due-window/backoff-desist tests; rollback API/schema slice.

## Phase 4: Dashboard / PDF Parity

- [x] 4.1 RED: API/web/PDF tests prove one persisted dashboard payload feeds dashboard and PDF with provider modes, freshness, fallback disclaimers.
- [x] 4.2 GREEN: wire `apps/api/src/presentation/routes/agronautas.ts`, `apps/web/src/lib/agronautas/*`, `apps/web/src/components/agronautas/*`, PDF route/export to shared payload.
- [x] 4.3 VERIFY: `pnpm --filter web test -- agronautas`, `pnpm --filter web test:e2e -- agronautas`; rollback UI/PDF route slice.

## Phase 5: Gated Next Features

- [x] 5.1 RED: tests for ingestion status/admin panel, source freshness panel, agriculture-wide/Corrientes-first copy, and disabled/non-production alerts when unsafe.
- [x] 5.2 GREEN: add gated admin/status, freshness UI, and alerts only when stabilization state is green; avoid rice-only regressions.
- [x] 5.3 VERIFY: `pnpm --filter api test -- agronautas`, `pnpm --filter web test -- agronautas`, scoped Playwright; rollback feature flags/UI only.

## Phase 6: Verification / Review

- [ ] 6.1 Run direct gates from clean tree: `pnpm install --frozen-lockfile`, `pnpm --filter @repo/zod-schemas build`, `pnpm --filter web build`, `pnpm turbo test --force`, `pnpm test`.
- [ ] 6.2 Run Playwright: `pnpm --filter web test:e2e -- agronautas`; save failures without archiving.
- [ ] 6.3 Fresh-context pessimistic review: inspect diff, generated artifacts, provider claims, dashboard/PDF parity, rollback boundaries; NO ARCHIVE.

## Subagent Grouping Guidance

Group apply by work unit above: hygiene/build, provider+scheduler, dashboard/PDF, next-features, verify. Each group starts RED, ends with exact verify commands, and stops on generated-artifact, false-live-provider evidence, missing backoff-desist protection, or any Iberá-Alerta touch.
