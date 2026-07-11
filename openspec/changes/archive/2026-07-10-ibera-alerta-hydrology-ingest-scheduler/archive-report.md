# Archive Report: ibera-alerta-hydrology-ingest-scheduler

**Change**: `ibera-alerta-hydrology-ingest-scheduler`
**Date**: 2026-07-10 (Archived on 2026-07-11)
**Status**: Completed

## Executive Summary

The hydrology ingest scheduler and authenticated trigger have been successfully implemented, verified, and merged into `main` (`d102e22`). The system now supports opt-in in-process scheduling, authenticated manual/external cron triggers, and safe diagnostics with provider URL overrides. Production smoke tests confirmed that the API is stable, although public provider endpoints currently require verified machine-readable URL overrides.

## Artifacts (Engram IDs)

- **Exploration**: #3836
- **Proposal**: #3838
- **Spec**: #3840
- **Design**: #3842
- **Tasks**: #3844
- **Apply Progress**: #3845
- **Verification Report**: #3848

## Implementation Details

- **Auth**: `HYDROLOGY_INGEST_TOKEN` bearer auth enforced for `POST /api/hydrology/ingest`.
- **Scheduler**: Gated by `HYDROLOGY_SCHEDULER_ENABLED` (default `false`). Safe startup without immediate ingest.
- **Provider Overrides**: Configurable via `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`.
- **Resiliency**: Independent per-source processing; failure in one source does not block others. Safe bounded diagnostics returned in HTTP 202.

## Verification Results

- **Local**: 100% pass for auth, scheduler gating, and all-source runner logic.
- **Production Smoke**:
  - Ingest endpoint (202) works with all sources attempted once.
  - Providers (PNA, INA, INMET, SMN) correctly degraded to safe diagnostics when using default fragile URLs.
  - Municipalities GET (200) confirms data integrity and freshness metadata presence.

## Operational Requirements

- Configure verified machine-readable `HYDROLOGY_*_URL` feeds for production reliability.
- Use external cron for Render Free Tier deployments to avoid service sleep issues.

## SDD Cycle Complete
The change folder has been moved to `openspec/changes/archive/2026-07-10-ibera-alerta-hydrology-ingest-scheduler/`.
Main specs were updated to reflect the new scheduling and auth requirements.
