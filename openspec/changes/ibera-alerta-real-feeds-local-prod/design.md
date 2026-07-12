# Design: Iberá Alerta Real Feeds Local Production Launch

## Technical Approach

Implement a bounded one-shot official ingest path that makes PNA the first real-success proof while keeping INA/INMET/SMN honest. Provider clients keep one fetch attempt, public-safe diagnostics, configurable URLs/timeouts, and no fixture writes outside tests. The API runner uses a deadline derived from source/client timeout so client diagnostics are not hidden by the current 12s cap. The local verifier records the full all-source response and fails only when the bounded contract or expected PNA success proof is missing.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| PNA source | Default `HYDROLOGY_PNA_URL` to `https://contenidosweb.prefecturanaval.gob.ar/alturas/` and parse HTML tables in `PnaAdapter` | Raise timeout on old `www.prefecturanaval.gob.ar/alturas` | Old endpoint 504s; fast endpoint is the verified launch path. |
| Provider attempts | One request per source, no retry/poll loop | Retry after timeout | Spec forbids repeated provider requests and protects official sites. |
| Non-parseable sources | Return `failed`/`empty` diagnostics; preserve prior DB data | Fake success or fixture fallback | Production must be honest; existing data remains readable. |
| Runner deadline | Use source timeout + small cushion, capped at 60s | Fixed 12s runner cap | Prevents runner timeout from masking provider timeout/HTTP/204 diagnostics. |

## Data Flow

`verify-hydrology-local-real.ts` → local Express app → `POST /api/hydrology/ingest` → `createGovernmentIngestionRunner` → source client → adapter/parser → `HydrologyRepository.saveTelemetryDeduped` → verifier artifact JSON.

Failures stay source-local: provider diagnostic → result entry → degraded run persistence with `recordsIngested: 0` → next source continues.

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modify | Default PNA URL to `contenidosweb.../alturas/`; expose per-client timeout access or metadata for runner; keep safe UA. Add fetch handling for `204` as empty/degraded, especially INMET. Add INA/SMN degraded diagnostics when no confirmed parser is enabled. |
| `packages/hydrology-engine/src/adapters/pna-adapter.ts` | Modify | Parse real PNA HTML rows/table cells, normalize accents/names to mapped station ids, extract height/tendency/date, set official source URL. |
| `packages/hydrology-engine/src/adapters/inmet-adapter.ts` | Modify | Parse `apitempo.inmet.gov.br` station/day payloads into rainfall records for relevant basin states; tolerate empty arrays. |
| `packages/hydrology-engine/src/adapters/ina-adapter.ts` | Modify | Keep JSON parser only if verified; otherwise rely on client degraded diagnostic rather than throwing fake parser assumptions. |
| `packages/hydrology-engine/src/adapters/smn-adapter.ts` | Modify | Same as INA: parse only confirmed official JSON; otherwise safe degraded diagnostic. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Replace fixed `SOURCE_RUNNER_TIMEOUT_MS` with `runnerTimeoutFor(client, source)` using client timeout + cushion/cap. Preserve client diagnostics in result. |
| `apps/api/src/scripts/verify-hydrology-local-real.ts` | Modify | Capture all source results; require HTTP 202 and valid contract; when PNA is expected, require PNA `recordsIngested > 0`; write artifact even on failure. |
| `packages/zod-schemas/src/agronautas.ts` | Modify if needed | Only extend diagnostics with safe fields such as `emptyReason`/`providerEndpoint` if implementation needs them; keep strict schema. |
| Tests | Modify/Create | Add parser/client tests and runner/verifier assertions. |

## Interfaces / Contracts

Provider clients should expose timeout without leaking internals:

```ts
type GovernmentSourceClient = { fetchTelemetry(): Promise<ScraperResult>; timeoutMs?: number }
```

Diagnostics remain schema-safe: `failureKind`, `reason`, `attempts: 1`, `timeoutMs`, `elapsedMs`, `providerHost`, `providerPath`, `upstreamStatus?`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | PNA real-ish HTML table parsing; INMET 204/empty handling; INA/SMN degraded behavior | `node:test` fixtures/mocked fetch, one call assertions. |
| Route/runner | Timeout alignment, diagnostics preservation, all-source continuation | Extend `hydrology-government.test.ts`. |
| Contract | Any new diagnostic fields | Extend `agronautas.test.ts`. |
| Local real | Prod DB one-shot all-source proof | `cd apps/api; $env:NODE_ENV='production'; $env:DATABASE_URL='<prod>'; $env:HYDROLOGY_INGEST_TOKEN='<token>'; $env:HYDROLOGY_PNA_TIMEOUT_MS='25000'; pnpm exec tsx src/scripts/verify-hydrology-local-real.ts --mode api --all-sources --out ../../artifacts/hydrology-local-real-prod.json` |

## Migration / Rollout

No migration required. Run unit/route tests, then the local real verifier once against production DB before push. Do not rerun provider POST verification unless the first artifact is invalid due to local setup.

## Open Questions

- [ ] Exact production `DATABASE_URL`/token values are operational inputs, not stored in artifacts.
