## Exploration: ibera-alerta-real-feeds-local-prod

### Current State

- Local hydrology ingest is implemented in `apps/api/src/presentation/routes/hydrology-government.ts` as `POST /api/hydrology/ingest`; it seeds government municipalities, then runs `PNA`, `INA`, `INMET`, and `SMN` sequentially with one attempt per source and returns HTTP `202` with per-source diagnostics.
- The source runner has a hard `SOURCE_RUNNER_TIMEOUT_MS = 12_000`; increasing only `HYDROLOGY_PNA_TIMEOUT_MS` cannot let PNA run longer than 12s because `fetchWithDeadline()` wins first and returns `runner_timeout`.
- HTTP clients live in `packages/hydrology-engine/src/clients/http-clients.ts`. Env URL overrides already exist: `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`; PNA also supports `HYDROLOGY_PNA_TIMEOUT_MS` and `HYDROLOGY_PNA_USER_AGENT`.
- Current adapters expect synthetic/simple shapes: PNA parses `<tr data-station="...">`, while INA/INMET/SMN expect JSON shaped as `{ predictions }`, `{ measurements }`, and `{ rainfall, alerts }`. Those shapes do not match current official public pages/APIs discovered below.
- Local-real verifier was run once against local backend code + remote/prod DB with `HYDROLOGY_PNA_TIMEOUT_MS=30000`. It returned HTTP `202`, `contractValid: true`, `databaseTarget: remote`, and all sources failed safely with exactly one attempt; evidence: `artifacts/hydrology-local-real-urgent-explore.json`.

### Bounded Source Investigation

No retry storm or polling was used. Each candidate below was requested once with bounded timeout and browser-like UA.

| Source | Candidate URL | Status | Content-Type | Time | Body sample / result | Conclusion |
|---|---|---:|---|---:|---|---|
| PNA | `https://www.prefecturanaval.gob.ar/alturas` | 504 | `text/html` | 32326ms | `Gateway Timeout` | Raising timeout may only wait until upstream gateway times out; not enough and still wrong default for production. |
| PNA | `https://contenidosweb.prefecturanaval.gob.ar/alturas/` | 200 | `text/html; charset=UTF-8` | 966ms | Page title: `Prefectura Naval Argentina - Registro del estado de los rios`; body 111569 bytes | Best PNA candidate found, but it is HTML and current parser likely does not match because code requires `data-station` rows. Need HTML table parser/mapping or a verified machine-readable PNA feed. |
| INA | `https://www.ina.gob.ar/alerta/index.php` | 200 | `text/html; charset=UTF-8` | 298ms | `Instituto Nacional del Agua (INA) - Alerta Hid...` | Current client wrongly expects JSON. Need source-specific HTML parser or discover/configure a real INA JSON endpoint. |
| INMET | `https://portal.inmet.gov.br/dadoshistoricos` | 200 | `text/html; charset=UTF-8` | 1402ms | `Instituto Nacional de Meteorologia - INMET` | Current default is a human portal, not JSON. |
| INMET | `https://apitempo.inmet.gov.br/estacoes/T` | 200 | `application/json; charset=utf-8` | 1076ms | JSON station metadata with `CD_ESTACAO`, `SG_ESTADO`, coordinates | Usable official machine-readable station catalog. Needs adapter to select relevant upstream states/stations. |
| INMET | `https://apitempo.inmet.gov.br/estacao/dados/2026-07-12/A846` | 204 | empty | 683ms | empty body | Endpoint shape is machine-readable but chosen station/date yielded no content. Need station/date selection and 204-as-empty handling. |
| SMN | `https://www.smn.gob.ar/alertas` | 403 | `text/html; charset=UTF-8` | 248ms | Cloudflare `Just a moment...` | Current default is not usable for server-side JSON ingestion. Do not bypass Cloudflare. |
| SMN | `https://ws.smn.gob.ar/alerts/type/ALERT` | 503 | `text/html` | 265ms | `No server is available to handle this request` | Alert API candidate unavailable during check; safe fallback needed. |
| SMN | `https://ws.smn.gob.ar/alerts` | 404 | `text/html; charset=utf-8` | 285ms | `Cannot GET /alerts` | Not a valid endpoint. |
| SMN | `https://ws.smn.gob.ar/map_items/weather` | 200 | `application/json; charset=utf-8` | 280ms | JSON weather stations with `province`, `weather`, `updated` | Usable official machine-readable weather observations, but it does not directly provide rainfall/alerts required by current `SmnAdapter`; can ingest weather-derived telemetry only if schema/product scope changes, or preserve no-alert fallback. |

### Local Verifier Baseline

- Command: from `apps/api`, ran `HYDROLOGY_PNA_TIMEOUT_MS=30000 pnpm exec tsx src/scripts/verify-hydrology-local-real.ts --all-sources --mode api --out ../../artifacts/hydrology-local-real-urgent-explore.json`.
- Result: HTTP `202`, valid ingest contract, `databaseTarget: remote`, provider overrides false.
- PNA result changed from client `timeout after 10000ms` to runner `timeout after 12000ms`, proving the current runner deadline blocks longer PNA attempts even when PNA client timeout is increased.
- INA and INMET still fail due to unexpected HTML (`text/html; charset=UTF-8`); SMN still fails with HTTP 403. This proves timeout tuning alone does not solve all-source real ingestion.

### Affected Areas

- `packages/hydrology-engine/src/clients/http-clients.ts` — add per-source timeout envs or a runner/client timeout alignment, update defaults to verified endpoints, and add source-specific fetch/parse branches for official HTML/JSON shapes.
- `packages/hydrology-engine/src/adapters/pna-adapter.ts` — replace/add parser for the real PNA `contenidosweb` HTML table and normalize Corrientes/Uruguay river station IDs to existing municipality mappings.
- `packages/hydrology-engine/src/adapters/ina-adapter.ts` — either parse INA Alerta Hidrológico HTML safely or fail with a clear `unsupported_content_type` until a real JSON/feed URL is found; current JSON shape is incompatible with the official page.
- `packages/hydrology-engine/src/adapters/inmet-adapter.ts` — add parser for INMET `apitempo` station catalog and station-day observations; handle `204 No Content` as `empty` not parse failure.
- `packages/hydrology-engine/src/adapters/smn-adapter.ts` — add parser for `ws.smn.gob.ar/map_items/weather` only if product accepts non-rain weather observations, and keep alerts unavailable unless `alerts/type/ALERT` recovers or another official alerts feed is verified.
- `apps/api/src/presentation/routes/hydrology-government.ts` — make source runner timeout configurable/aligned with the max client timeout, while preserving one attempt per source and no retries/polling.
- `apps/api/src/scripts/verify-hydrology-local-real.ts` — already useful for one-shot local backend + prod DB proof; can be extended to expose timeout/env override evidence more explicitly.

### Approaches

1. **Endpoint-correct adapters with bounded one-shot ingestion** — switch/configure sources to the verified official candidates and adapt parsers to their real shapes.
   - Pros: Real local ingestion can succeed where official machine-readable data exists; keeps official provenance; preserves anti-DDoS one request per configured source/run.
   - Cons: PNA/INA HTML parsing is brittle; SMN alerts endpoint was unavailable; INMET station-day ingestion needs station/date selection beyond one catalog request.
   - Effort: Medium-High

2. **Timeout-only tuning** — raise `HYDROLOGY_PNA_TIMEOUT_MS` and `SOURCE_RUNNER_TIMEOUT_MS`.
   - Pros: Small change; may reduce PNA false negatives if the upstream occasionally responds after 10-12s.
   - Cons: Proven insufficient: default PNA returned 504 after 32.3s, runner still caps at 12s, INA/INMET/SMN failures are parser/endpoint issues, not timeout issues.
   - Effort: Low

3. **Safe partial official ingestion plus explicit no-feed fallbacks** — ingest only verified machine-readable official feeds now (INMET catalog/weather-ish SMN) and return source-level `empty/failed` with clear diagnostics for unavailable/non-machine-readable official feeds.
   - Pros: Honest production behavior; no fake data; can ship quickly while preserving DB and UI stability.
   - Cons: Does not satisfy “all sources ingest records” unless HTML parsers/API feeds are completed; user-facing freshness remains degraded for blocked sources.
   - Effort: Medium

### Recommendation

Proceed to proposal with Approach 1 plus Approach 3 guardrails. Concretely: (1) do not rely on `https://www.prefecturanaval.gob.ar/alturas`; configure PNA to `https://contenidosweb.prefecturanaval.gob.ar/alturas/` and implement a real HTML table parser, (2) align runner timeout with configured source timeouts but cap it conservatively (for example 35-45s max, one attempt only), (3) implement INMET against `apitempo.inmet.gov.br` with station selection and 204-as-empty, (4) use SMN `map_items/weather` only for supported observations and keep alerts/rainfall unavailable unless an official alerts/rain feed is verified, and (5) treat INA as a specific HTML parser task or blocked-by-feed if no stable machine-readable endpoint is identified. Timeout-only is not a valid solution.

### Risks

- Official HTML pages can change without notice; adapters need strict parsing tests, sanitized body samples, and source-level failure instead of throwing.
- PNA default can hold connections for >30s and return 504; any increased timeout must remain bounded and lower than infrastructure limits.
- SMN `www` is Cloudflare-protected; attempting to bypass would be inappropriate. Use `ws.smn.gob.ar` only where it returns public JSON.
- INMET station-day endpoint can return 204; ingestion must distinguish legitimate empty data from failures.
- Production DB writes must remain deduped/idempotent because rerunning manual one-shot checks can otherwise spam telemetry.

### Ready for Proposal

Yes. The proposal should explicitly reject timeout-only, define exact endpoint/parser work by source, preserve one-shot/no-retry constraints, and require local-real verification against the production DB before deployment.
