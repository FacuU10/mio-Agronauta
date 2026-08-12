# Tasks: Iberá-Alerta Hardening and Institutional Render Pilot

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 700–1,000 authored lines; broad API/engine/migration/schema/web/test slice |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 ledger → PR2 Cron/prune → PR3 UI/proof |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending team choice |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|
| 1 Contracts/ledger | `pnpm --dir packages/hydrology-engine test; pnpm --dir apps/api test` | N/A (fakes) | Revert migration/repository before Cron |
| 2 Lease/Cron/prune | `pnpm --dir apps/api test` | Configured PostgreSQL + `pnpm --dir apps/api exec tsx src/scripts/run-hydrology-scheduler-once.ts` | Disable Cron; revert wiring; isolate ledger |
| 3 Evidence/UI/proof | `pnpm --dir apps/web test; pnpm test; pnpm build` | Playwright, local real providers/DB, then Render | Revert schemas/routes/components; retain telemetry |

## Phase 1: RED Contracts and Failure Cases

- [x] 1.1 RED in `packages/zod-schemas/src/agronautas.ts`: add `RunStatus`, diagnostics, coverage, `Citation`, and `CopilotMetadata`; reject unsupported zones/citations without changing Agronautas contracts. (Coverage-gap and provider/source-result contracts are now exercised by the reconciled coverage slice.)
- [x] 1.2 RED in `apps/api/src/presentation/routes/hydrology-government.test.ts`: `createHydrologyIngestionCoordinator`/`observe` survives restart; partial retry preserves successful results/diagnostics.
- [x] 1.3 RED in `hydrology-ingestion-scheduler.test.ts` and due-run tests: deterministic scheduled-slot and cross-instance duplicate safety contracts added; expired-lease recovery covered at repository contract level.
- [x] 1.4 RED in `hydrology-engine.test.ts` and API tests: bounded prune/ledger retention is implemented; additive schema repair and the configured PNA/INA/INMET/SMN runtime matrix now pass.
- [x] 1.5 RED in `apps/web/src/components/government/detail.test.tsx`: citation absence and degraded overview/detail/ingest render forecast provenance, URLs/timestamps, telemetry, alerts, freshness, and local context safely.

## Phase 2: GREEN Durable API and Render Ownership

- [x] 2.1 Create additive `apps/api/prisma/migrations/<timestamp>_ibera_ingest_ledger/migration.sql`: `ibera_ingest_runs`, unique `scheduled_slot`, lease/expiry indexes, child `run_id`/diagnostics, validated rollback isolation, no telemetry deletion.
- [x] 2.2 Implement typed ledger/lease/source-result/coverage projections in `packages/hydrology-engine/src/types.ts` and `repository.ts`; extend `HydrologyRepository` with admission, CAS claim, restart read, and bounded `pruneOldData`.
- [x] 2.3 Reconcile municipality geometry/locality inventory and PNA/INA/INMET/SMN station relationships in the municipality migration and `seed-municipality-alert-coverage.ts`; make seeds idempotent and unsupported mappings explicit. (17 Corrientes localities, 17 SMN coverage entries, 34 INMET coverage entries, and only the three adapter-supported INA station IDs are represented; missing INA mappings surface as explicit gaps.)
- [x] 2.4 Replace process maps in `hydrology-government.ts` (`createHydrologyIngestionCoordinator`, runner, status handlers) with durable transitions, stable slots, recovery, bounded diagnostics, and honest provider evidence; preserve `{pna,ina,inmet,smn}-adapter.ts` behavior. (Manual observation now consults the durable ledger first and only uses bounded process state when no ledger row exists.)
- [x] 2.5 Route `HydrologyIngestionScheduler`, `startHydrologySchedulerFromEnv`, and `HydrologyPruneJob` through DB ownership; disable API scheduling in `server.ts`; make `run-hydrology-scheduler-once.ts` the fixed authenticated Cron and declare one owner in `render.yaml` with non-zero failure exit. (One Render Cron is declared at hourly cadence, requires existing `HYDROLOGY_INGEST_TOKEN` plus fixed `HYDROLOGY_CRON_OWNER_ID`, and API in-process hydrology scheduling remains disabled.)

## Phase 3: GREEN UI, Copilot, and Proof

- [x] 3.1 Update `HydrologyCopilotService.streamChat` and hydrology SSE to emit validated stable citations, `citationMode`, source URL/time, and explicit citation-unavailable behavior.
- [x] 3.2 Update `pollStatusPath`/`SafeIngestView`, `overview.tsx`, `detail.tsx`, and `ingest-panel.tsx` for recovered/expired/degraded states, coverage gaps, forecasts, telemetry, alerts, freshness, provenance, links, and local context without invented values.
- [x] 3.3 REFACTOR, run focused tests, `pnpm test`, and `pnpm build`; execute separate local real-provider/PostgreSQL smoke and production Render evidence for one Cron, disabled schedulers, durable status, and bounded outcomes. Record unavailable providers; history is not proof. Evidence is complete for the executable local boundary: focused API 85/85, web 94/94, zod 30/30, contracts 5/5 plus schema validation, Python 35/35, configured real-provider/PostgreSQL smoke PASS (`proof-20260812T044942Z`), and build PASS (Turbo 4/4; Next 8/8). Full `pnpm test` remains 1 due to the unrelated Agronautas Groq degraded-chat baseline assertion; Playwright completed 14/15 with 13 passed, 1 skipped, and the same unrelated Agronautas stale-snapshot failure (`Snapshot stale detectado`). Production Render/Cron execution and production DB/API proof are unavailable external evidence gaps and remain explicitly unclaimed.
