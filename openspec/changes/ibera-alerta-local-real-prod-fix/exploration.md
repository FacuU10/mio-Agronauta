## Exploration: ibera-alerta-local-real-prod-fix

### Current State

- Local API start command is `pnpm --dir apps/api dev` (`tsx watch src/index.ts`); one-off local API checks can import `createApp()` from `apps/api/src/server.ts` and call Express directly without the web UI.
- API envs are loaded with `dotenv.config()` from the API process cwd. Present local env files include `DATABASE_URL`, `API_PORT`, and `REDIS_URL`; current local env files do **not** declare `HYDROLOGY_INGEST_TOKEN` or provider override URLs, so local ingest is unauthenticated and uses provider defaults unless env vars are added.
- `POST /api/hydrology/ingest` lives in `apps/api/src/presentation/routes/hydrology-government.ts`. It builds a default `createGovernmentIngestionRunner()`, seeds Iberá-Alerta municipalities if needed, then processes `PNA`, `INA`, `INMET`, and `SMN` sequentially with one bounded attempt per source.
- Provider defaults live in `packages/hydrology-engine/src/clients/http-clients.ts`:
  - PNA: `https://www.prefecturanaval.gob.ar/alturas`, HTML parser, 10s provider timeout.
  - INA: `https://www.ina.gob.ar/alerta/index.php`, expects JSON.
  - INMET: `https://portal.inmet.gov.br/dadoshistoricos`, expects JSON.
  - SMN: `https://www.smn.gob.ar/alertas`, expects JSON.
- Remote/prod-like DB is reachable locally: a direct `SELECT current_database(), now()` against `apps/api/.env` completed in `3242ms` and returned database `neondb`.
- Seed path is idempotent and currently not the blocker: direct `seedGovernmentMunicipalitiesIfEmpty()` returned `{ inserted: 0, skipped: true }` after a pre-count of `18` municipalities.

### Local-Real Evidence

Bounded checks performed from local code against remote/prod-like DB, without browser/web UI and without retry loops or polling storms:

1. **Local API route one-shot all-source POST**
   - Command shape: start `createApp()` on an ephemeral localhost port, then one `POST /api/hydrology/ingest` with body `{ contractVersion: "1.0.0", reason: "sdd-explore-local-real-one-shot-after-db-check" }`.
   - Result: HTTP `503`, `content-type: application/json; charset=utf-8`, duration `232ms`.
   - Body: structured ingest response with `status: "failed"`, `requestedSources: ["PNA","INA","INMET","SMN"]`, and every source marked `failed` with `diagnostic.failureKind: "startup_failure"`, `reason: "ingest startup failed"`, `attempts: 1`, `timeoutMs: 12000`.
   - Log evidence: `errorName: "AggregateError"`, message `Government hydrology ingestion could not start`.
   - Interpretation: the API route has a startup/runtime path that can fail before provider calls and masks the underlying cause behind generic startup diagnostics. This is a local API/server-startup integration issue, not proof of provider success/failure.

2. **Direct local ingestor runner one-shot all-source execution**
   - Command shape: call `createGovernmentIngestionRunner()` directly once with `{ reason: "sdd-explore-direct-runner-one-shot" }` using local code and remote DB.
   - Result: success at runner level in `17811ms`; returned top-level `status: "failed"` because all four real providers failed safely; persisted failed run records.
   - Exact source results:
     - `PNA`: `failed`, `recordsIngested: 0`, error `PNA network failure: timeout after 10000ms`, diagnostic `{ failureKind: "timeout", reason: "PNA request timed out", attempts: 1, timeoutMs: 10000, providerHost: "www.prefecturanaval.gob.ar", providerPath: "/alturas", durationMs: 10015 }`.
     - `INA`: `failed`, `recordsIngested: 0`, error `INA unexpected content-type text/html; charset=UTF-8; expected JSON payload`, diagnostic `{ failureKind: "unexpected_content_type", reason: "INA returned unsupported content type", attempts: 1, timeoutMs: 15000, providerHost: "www.ina.gob.ar", providerPath: "/alerta/index.php", durationMs: 639 }`.
     - `INMET`: `failed`, `recordsIngested: 0`, error `INMET unexpected content-type text/html; charset=UTF-8; expected JSON payload`, diagnostic `{ failureKind: "unexpected_content_type", reason: "INMET returned unsupported content type", attempts: 1, timeoutMs: 15000, providerHost: "portal.inmet.gov.br", providerPath: "/dadoshistoricos", durationMs: 1750 }`.
     - `SMN`: `failed`, `recordsIngested: 0`, error `SMN HTTP 403 Forbidden`, diagnostic `{ failureKind: "http_status", reason: "SMN upstream returned HTTP 403", attempts: 1, timeoutMs: 15000, providerHost: "www.smn.gob.ar", providerPath: "/alertas", upstreamStatus: 403, durationMs: 1030 }`.
   - Interpretation: DB and runner wiring can work locally; the operational blocker is provider URL/default mismatch plus the API route startup/diagnostic masking behavior.

### Affected Areas

- `apps/api/src/presentation/routes/hydrology-government.ts` — route, auth, startup catch, all-source runner, seeding, per-source result shaping, and response schema parse boundary.
- `packages/hydrology-engine/src/clients/http-clients.ts` — provider defaults, content-type expectations, timeout diagnostics, URL override support.
- `packages/hydrology-engine/src/adapters/*.ts` — parsing assumptions for PNA/INA/INMET/SMN once real machine-readable feeds are selected.
- `packages/hydrology-engine/src/repository.ts` — persistence of failed/successful runs and municipality readback from remote DB.
- `apps/api/src/server.ts` and `apps/api/src/index.ts` — local/server startup behavior, dotenv load timing, scheduler disabled-by-default behavior.
- `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` and env examples — must document required provider URLs/tokens and local-real verification commands.
- `openspec/specs/ibera-alerta/spec.md` — current requirements already demand production-safe independent source results, bounded attempts, provider configurability, and deployed smoke.

### Error Classification

- **Provider URL/default**: confirmed blocker for all sources. INA/INMET defaults are HTML pages while clients require JSON; SMN default returns 403; PNA default times out.
- **Parser/adapters**: likely secondary blocker. Current INA/INMET/SMN clients expect JSON before adapters run; adapters cannot be validated until real machine-readable payloads or source-specific HTML adapters are provided.
- **Auth/env**: local env lacks `HYDROLOGY_INGEST_TOKEN`, so local POST is allowed by design. Production must configure the token. Provider override envs are missing locally and are required for production readiness.
- **DB**: not the main blocker. Remote DB connectivity and seed idempotency were verified locally.
- **Server startup/API route**: confirmed blocker. Local API route returned generic startup failure with logged `AggregateError` while direct runner worked; proposal/spec should require preserving root-cause diagnostics safely and making API route behavior match direct runner behavior.

### Approaches

1. **Configure verified machine-readable provider URLs first** — keep clients strict, require real JSON/API endpoints via env, and fail safely when absent.
   - Pros: lowest code churn; aligns with existing env override design; avoids brittle scraping.
   - Cons: blocked until valid official provider feeds are found and configured; PNA may still require HTML parsing or alternate source.
   - Effort: Medium.

2. **Adapter hardening for current public pages** — extend clients/adapters to parse the actual public HTML or blocked responses where legally/operationally acceptable.
   - Pros: could work with current defaults if providers expose usable public data.
   - Cons: brittle, higher maintenance, possible provider blocking/anti-bot issues; must be extra careful not to scrape aggressively.
   - Effort: High.

3. **Operational safe-degraded release** — fix API route/startup diagnostics and env docs now, keep all providers degraded until verified URLs are supplied, and preserve last-known data.
   - Pros: makes local/prod smoke honest and stable; no fake telemetry; fastest route to production-safe behavior.
   - Cons: does not make fresh telemetry operational until provider feeds are resolved.
   - Effort: Medium.

### Recommendation

Proceed with a proposal that combines Approach 1 and Approach 3: fix the API route/startup behavior so local API POST returns the same structured per-provider diagnostics as the direct runner, require/document `HYDROLOGY_INGEST_TOKEN` plus verified provider override URLs, and keep providers explicitly failed/degraded until real machine-readable feeds or source-specific adapter fixes are validated with one-shot local-real checks. Do not implement repeated retries, polling, browser verification, or fixture fallback for production.

### Risks

- Verified official machine-readable provider URLs may not exist for all sources, especially PNA/SMN, requiring either provider agreements, alternate official feeds, or HTML adapter work.
- Current API route can hide root causes behind `startup_failure`, making production smoke less actionable if not fixed.
- Direct runner failed all providers and wrote failed ingestion-run rows; further verification should remain bounded to avoid noisy provider traffic and DB clutter.
- Production push/smoke must include only bounded calls: exact source-scoped POSTs and municipalities GET as already specified.

### Ready for Proposal

Yes. The next SDD phase should define a fix scoped to: API route/direct-runner parity, safe root-cause diagnostics, required env/provider URL configuration, provider adapter/feed validation strategy, local-real one-shot verification, production push to `main`, and bounded production smoke.
