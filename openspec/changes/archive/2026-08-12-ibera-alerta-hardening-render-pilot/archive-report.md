# Archive Report: ibera-alerta-hardening-render-pilot

- **Status:** archived-with-warnings; not production-ready.
- **Date:** 2026-08-12
- **Branch:** continuation/agronautas-ibera-unified-2026-08-04
- **Artifact mode:** hybrid (OpenSpec + Engram)
- **Tasks:** 13/13 complete; archived tasks artifact contains no unchecked implementation tasks.

## Archive actions

- Delta spec `ibera-alerta-hardening` synced into `openspec/specs/ibera-alerta/spec.md`.
- Change moved to `openspec/changes/archive/2026-08-12-ibera-alerta-hardening-render-pilot/`.
- Archived artifacts preserved: `proposal.md`, `exploration.md`, `design.md`, `tasks.md`, `apply-progress.md`, `verify-report.md`, and `specs/`.
- Agronautas separation, provider history, migrations, branches, worktrees, and stashes were preserved. No application code, Docker, or deployment state was changed by archive.

## Evidence recorded truthfully

- Focused API: 85/85; web: 94/94; zod schemas: 30/30; contracts: 5/5 plus schema validation; Python worker: 35/35.
- `pnpm build`: PASS, Turbo 4/4; Next static generation 8/8.
- Configured local PostgreSQL and real providers: PASS, `proof-20260812T044942Z`; PNA 200/16, INA 200/32, INMET 200/75, SMN 200/29, with durable correlation.
- Iberá Playwright journeys passed; overall E2E was 13 passed, 1 skipped, 1 failed.

## Explicit unresolved boundaries

- Full `pnpm test` remains failed by an unrelated Agronautas Groq degraded-chat baseline assertion.
- Hydrology package has an intermittent PNA timing assertion (`expected 2`, `actual 1`).
- Full Playwright has an unrelated Agronautas stale snapshot failure (`Snapshot stale detectado`).
- No Render production Cron execution, restart, production API/DB, provider, or revision-correlated evidence exists.
- Therefore this archive does **not** claim production readiness or production ownership proof.

## Engram traceability

OpenSpec artifacts are authoritative in the archive folder. Engram archive-report topic: `sdd/ibera-alerta-hardening-render-pilot/archive-report`. No review/receipt/iron/general flows were run per explicit instruction.
