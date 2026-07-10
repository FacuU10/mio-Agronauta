# Design: Safe PNA Ingest Timeout Fix

## Technical Approach

Keep PNA ingest single-attempt and make timeout ownership explicit: the PNA HTTP client aborts the real upstream `fetch` before the API runner's source budget expires, so production returns classified diagnostics instead of the current generic runner timeout. The API route remains `202` for source-level failures, persists failed source runs without fixture writes in production, and exposes only safe diagnostic fields. Final proof remains bounded real HTTP smoke: one backend PNA POST, one web-proxy PNA POST, and one municipalities GET.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Timeout ownership | Default PNA client timeout `10_000ms`; runner budget `12_000ms` as safety net | Remove runner deadline entirely; increase both to 15s | Client aborts the active request first, avoiding masked in-flight fetches while preserving a route-level guard for injected/misbehaving clients. |
| Diagnostics shape | Add `diagnostic` object on each ingest result | Top-level `diagnostics[]`; raw error strings only | Per-source diagnostics match the spec and avoid breaking existing top-level contract. |
| Retry/cooldown | No new retries; optional short in-memory PNA cooldown only if implementation finds repeated manual calls are easy to guard without distributed state | Browser scraping, polling, automatic retry | Anti-DDoS requirement is satisfied by one network attempt per source; non-distributed cooldown must not be relied on as correctness. |
| Provider config | Keep `HYDROLOGY_PNA_URL`; add optional `HYDROLOGY_PNA_USER_AGENT` and `HYDROLOGY_PNA_TIMEOUT_MS` parsing | Hardcode production-only values | Existing env URL override is already the right ops seam; user-agent/timeout are safe additive tuning knobs. |

## Data Flow

```text
POST /api/hydrology/ingest source=PNA
  -> createGovernmentIngestionRunner
  -> PnaHttpClient.fetchTelemetry() [AbortController 10s]
  -> ScraperResult { ok:false, error, diagnostic }
  -> saveTelemetryDeduped([], failed run)
  -> 202 { results[0].diagnostic, status:"failed" }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modify | Extend `ScraperResult` failure with `diagnostic`; classify `timeout`, `http_status`, `unexpected_content_type`, `parse_failure`, and `network_failure`; sanitize `providerHost`/`providerPath`; use `HYDROLOGY_PNA_URL`, optional `HYDROLOGY_PNA_USER_AGENT`, optional `HYDROLOGY_PNA_TIMEOUT_MS` defaulting below runner budget. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Add `diagnostic` to `GovernmentIngestionSourceResult`; replace hardcoded `fetchWithDeadline(..., 12_000)` with named source budgets; merge client diagnostics with runner fields `attempts: 1`, `durationMs`, `timeoutMs`; preserve `202` contract and add safe startup-failure diagnostics. |
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add `hydrologyGovernmentIngestDiagnosticSchema` with bounded public fields and attach optional `diagnostic` to result items. Prefer `failureKind` plus `durationMs`; keep `elapsedMs` only if matching the spec wording is desired. |
| `packages/hydrology-engine/src/hydrology-engine.test.ts` | Modify | Assert PNA timeout classification, env/user-agent option behavior, provider host/path sanitization, and no more than one fetch call. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modify | Assert production PNA failure persists zero records, returns `diagnostic.attempts === 1`, includes duration/timeout/failureKind, and mixed-source failures return `partial`. |
| `packages/zod-schemas/src/agronautas.test.ts` | Modify | Assert ingest schema accepts diagnostic and rejects unsafe/oversized diagnostic fields. |

## Interfaces / Contracts

```ts
type HydrologyIngestDiagnostic = {
  failureKind?: 'timeout' | 'network_failure' | 'http_status' | 'unexpected_content_type' | 'parse_failure' | 'empty_response' | 'runner_timeout' | 'startup_failure'
  reason?: string
  attempts: 1
  timeoutMs?: number
  durationMs?: number
  providerHost?: string
  providerPath?: string
  upstreamStatus?: number
}
```

`ScraperResult` should carry the same safe diagnostic on failures. Runner-created diagnostics must not include stack traces, full URLs with query strings, credentials, internal hostnames, or raw response bodies.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | PNA abort/classification and env options | Node tests with fake `fetch` and AbortSignal; count exactly one invocation. |
| Route/runner | Budget alignment, persistence, partial status | Existing Express/runner tests with fake clients and production `NODE_ENV`. |
| Schema | Additive diagnostic contract | Zod parse/reject tests. |
| Deployed smoke | Real public behavior | Exactly one backend-origin PNA POST, one web-proxy PNA POST, one municipalities GET; no loops or retries. |

## Migration / Rollout

No data migration required. Deploy code, optionally set `HYDROLOGY_PNA_URL`, `HYDROLOGY_PNA_TIMEOUT_MS=10000`, and `HYDROLOGY_PNA_USER_AGENT` in production, then run the bounded smoke once.

## Open Questions

- [ ] Does ops have a verified machine-readable official PNA URL, or should production keep the current default while relying on safe degradation?
