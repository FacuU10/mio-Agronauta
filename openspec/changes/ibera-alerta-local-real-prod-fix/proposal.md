# Proposal: Iberá-Alerta Local Real Production Fix

## Intent

Make hydrology ingest operationally honest before production: local API POST must expose safe per-source diagnostics like the direct runner, provider configuration must be machine-readable, and verification must prove local-real and production behavior with bounded one-shot calls.

## Scope

### In Scope
- Fix `POST /api/hydrology/ingest` so all-source provider failures are not collapsed into `startup_failure` when the runner can return per-source results.
- Add/configure provider URL env path and diagnostics for PNA timeout, INA/INMET HTML, and SMN 403; degrade gracefully until verified feeds are configured.
- Add local-real verification: one local API POST and one direct runner call against remote DB, no retries/polling.
- Push final fix to `main` and run bounded production smoke.

### Out of Scope
- Browser automation, polling, repeated provider retries, or fixture fallback as official telemetry.
- Building brittle scrapers for current public HTML unless later specs/design prove no official machine-readable feed exists.
- Broad hydrology UI redesign.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `ibera-alerta`: tighten ingest diagnostic parity, provider configuration, local-real verification, and production smoke requirements.

## Approach

Preserve the existing independent source-runner model. Move API startup/error handling so source-level provider failures flow through the standard ingest response; reserve `startup_failure` only for true pre-source failures such as DB/config initialization. Make provider defaults/overrides explicit through env/config docs and adapter diagnostics. Treat unverified or non-machine-readable providers as safe degraded failures, not success. Verification remains bounded: local API + direct runner against remote DB, then deploy/push to `main` and smoke production with exact one-shot calls.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Route error boundary, per-source response shaping, startup failure classification |
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modified | Provider URL env/defaults, timeout/content-type/status diagnostics |
| `packages/hydrology-engine/src/adapters/` | Modified | Source diagnostics or parsing boundaries for real feeds |
| `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md`, env examples | Modified | Required provider URLs, token, local-real and prod smoke commands |
| `openspec/specs/ibera-alerta/spec.md` | Modified | Delta requirements for this fix |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Official machine-readable URLs may be unavailable | Med | Ship safe degradation and document required configured feeds |
| API still masks root causes | Med | Add route-level tests plus local-real API POST evidence |
| Verification may create provider/DB noise | Low | One-shot calls only; no retries or polling |

## Rollback Plan

Revert the route/client/doc/spec changes from `main`; restore prior provider defaults. Disable production manual ingest by removing `HYDROLOGY_INGEST_TOKEN` or provider URLs while preserving read-only municipalities data.

## Dependencies

- Remote/prod-like DB credentials available locally.
- Production deploy access and provider URL/token env configuration.

## Success Criteria

- [ ] Local API POST returns structured per-source failures, not all `startup_failure`, for provider failures.
- [ ] Provider URLs and diagnostics are machine-readable/configurable and fail safely when invalid.
- [ ] Local API and direct runner one-shot verification pass against remote DB with no retries/polling.
- [ ] Changes are pushed to `main`; production smoke returns bounded structured ingest/municipality responses.
