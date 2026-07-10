# Proposal: Safe PNA Ingest Timeout Fix

## Intent

Fix the production PNA ingest timeout safely: classify and bound slow/unreachable PNA requests without creating provider load, while preserving degraded municipal data and the structured ingest contract.

## Scope

### In Scope
- PNA-only timeout alignment so the active fetch aborts within one bounded source budget.
- Per-source diagnostics for timeout/provider failures, including `attempts=1`, timeout, provenance host/path, and reason.
- Anti-DDoS guards: no retry storms, no polling loop, one request per manual ingest per source, and optional source-scoped cooldown/circuit/cache after failures.
- Source-scoped smoke verification: one municipalities GET and one PNA ingest POST only.

### Out of Scope
- Rewriting all hydrology ingestion or changing non-PNA provider behavior beyond shared response typing.
- Scraping loops, aggressive retries, browser automation, or repeated production probes.
- Guaranteeing PNA availability if the official host blocks Render or the configured URL is not machine-readable.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `ibera-alerta`: Production-safe hydrology ingest gains explicit PNA single-attempt timeout/diagnostic/cooldown constraints.

## Approach

Make PNA timeout source-specific and ensure the client aborts before or at the runner budget, avoiding the current outer-timeout masking. Keep each manual ingest to a single `fetch` per requested source (`attempts=1`). Extend the structured result/schema with safe diagnostics. Optionally add a conservative PNA cooldown/circuit/cache that returns `skipped`/degraded on immediate repeat failures without contacting PNA. Preserve existing scheduler bounds; add no new retries.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modified | PNA timeout, abort, provider diagnostics. |
| `packages/hydrology-engine/src/adapters/pna-adapter.ts` | Modified | Provenance and parse-failure clarity if needed. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modified | Single-attempt ingest result, optional cooldown, no retry loop. |
| `packages/zod-schemas/src/agronautas.ts` | Modified | Ingest diagnostic fields. |
| `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` | Guarded | Do not increase retry cadence. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PNA host remains slow/blocked | Med | Fail bounded with diagnostics and keep last data. |
| Cooldown hides a valid retry | Low | Source-scoped, short TTL, explicit `skipped` result. |
| Diagnostics break clients | Low | Additive schema fields only. |

## Rollback Plan

Revert the timeout/diagnostic/cooldown changes and schema additions; restore the previous ingest runner while keeping production environment unchanged. Disable optional cooldown with config if implemented.

## Dependencies

- Existing `HYDROLOGY_PNA_URL`; may need an ops-verified machine-readable PNA endpoint.

## Success Criteria

- [ ] PNA timeout produces one bounded failed/skipped result with `attempts=1` and no fixture writes.
- [ ] Tests prove no retry storm, no polling loop, and one fetch per manual ingest per source.
- [ ] Production smoke is source-scoped only: one GET municipalities, one POST `source=PNA`.
