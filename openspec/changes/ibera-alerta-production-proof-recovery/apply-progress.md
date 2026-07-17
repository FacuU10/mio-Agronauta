# Apply Progress: Iberá-Alerta Production Proof Recovery

**Updated:** 2026-07-15T17:39Z
**Mode:** Strict TDD continuation
**Delivery:** stacked-to-main; current batch covers the PR 2/PR 3 implementation boundary
**Auth:** untouched and explicitly out of scope

**Engram receipts:** apply-progress `#4063` (latest); tasks `#4059`; runtime discovery `#4060`; architecture decision `#4061`.

## Cumulative Task State

- [x] 1.1 Contract tests for `proofRunId` and `httpSummary` (previous slice)
- [x] 1.2 Contract/type implementation (previous slice)
- [x] 1.3 Proof-correlated repository persistence tests
- [x] 1.4 Additive `proof_run_id` migration and repository persistence (previous slice; migration applied to configured production DB)
- [x] 1.5 Contract build/test verification (previous slice and current full checks)
- [x] 2.1 Safe HTTP summary client tests
- [x] 2.2 Safe one-attempt HTTP diagnostics (previous slice)
- [x] 2.3 Ingest route proof correlation test
- [x] 2.4 Per-source ingest and `proofRunId` propagation (previous slice plus route echo hardening)
- [x] 2.5 BFF timeout/error classification (previous slice)
- [x] 3.1 Verification-script database-proof tests
- [x] 3.2 Matrix verifier implementation and read-only DB correlation (previous slice plus current DB query hardening)
- [x] 3.3 Real `/municipalities` Playwright test
- [x] 3.4 Local browser evidence capture and matrix update
- [x] 4.1 Local verification passes all proof items — current PNA, INA, INMET, SMN provider/API/DB/browser proof passed locally
- [ ] 4.2 Submit/approve PRs — BLOCKED: no deployment/approval access was configured
- [ ] 4.3 Deploy and run production smoke — BLOCKED after bounded smoke: production responded, but ingest returned 503 upstream timeout and the live revision is not commit-correlated
- [x] 4.4 Rollback — not applicable; no deployment was made, so no rollback mutation was required
- [x] 4.5 Bounded async ingest acknowledgement — public POST returns `202 queued` with generated `runId`/`proofRunId`; the same one-shot runner remains in flight until all source persistence completes.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 1.1–1.2 | `packages/zod-schemas/src/agronautas.test.ts` | Unit/contract | Inherited previous slice | Inherited; exact prior RED receipt unavailable | Previous slice reported passing package tests | Existing contract cases | Previous slice |
| 1.3 | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit | 20/20 focused suite before final state | ⚠️ Test was added against behavior already present from the previous partial slice; no new failing RED was observable | 20/20 focused tests passed | Correlated row plus filtered source case | SQL assertions kept focused |
| 2.1 | `packages/hydrology-engine/src/clients/http-clients.test.ts` | Unit | 18/18 baseline client/engine tests | ⚠️ Initial assertion exposed an incorrect expected PNA timeout; production behavior was already present | 20/20 focused tests passed after correcting the expectation | Success summary plus secret-query/status case | No production refactor |
| 2.3 | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration | 27/27 baseline route tests | ✅ Failed because the route omitted the requested `proofRunId` when the runner did not echo it | ✅ 29/29 route tests passed after request-ID precedence hardening | Runner echo, omission, and mismatch cases | Response construction remains bounded |
| 3.1 | `apps/api/src/scripts/verify-hydrology-local-real.test.ts` | Unit | New file | ✅ Failed because exported DB-proof behavior did not exist and import executed the CLI | ✅ 2/2 script tests passed | Correlated success, mismatch, and degraded row cases | Direct-execution guard and pure gate helper |
| 3.3–3.4 | `apps/web/tests/e2e/hydrology-government.spec.js` | Real E2E | New file | ⚠️ No isolated failing RED was captured; the UI route already existed and the test was added as runtime proof coverage | ✅ 1/1 Playwright test passed locally after real verifier run | API contract plus rendered source cards | Role-based selectors and evidence artifact |

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | From `packages/hydrology-engine`: `pnpm exec node --import tsx --test src/clients/http-clients.test.ts src/hydrology-engine.test.ts` → 20/20 passed. From `apps/api`: `pnpm exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts src/scripts/verify-hydrology-local-real.test.ts` → 31/31 passed across both files. Final API type-check `pnpm exec tsc --noEmit --pretty false` passed. |
| Supplemental full test/build | `pnpm test` → 6 workspace tasks successful; API 143/143 and web 29/29 passed. `pnpm build` → 4 workspace build tasks successful. |
| Runtime harness | `pnpm verify-local` → exit 1 by design because the current real provider gate is blocked. Proof run `proof-20260714T074216Z`; one POST per PNA/INA/INMET/SMN, `retries=0`, remote DB rows correlated for all four. PNA success; INA HTTP 200 HTML; INMET HTTP 404; SMN HTTP 403. `pnpm --dir apps/web test:e2e -- tests/e2e/hydrology-government.spec.js` → 1/1 passed and wrote local browser evidence. |
| Rollback boundary | Revert the current script, route fallback, focused tests, Playwright evidence test, local evidence artifacts, and additive migration only. Do not revert auth or unrelated dirty files. |

## Runtime Evidence

- Matrix: `artifacts/hydrology-local-real-matrix.json`
- Local browser evidence: `artifacts/hydrology-municipalities-local-browser-evidence.json`
- Local screenshot: `artifacts/hydrology-municipalities-local.png`
- Production current observation (not acceptance): `artifacts/hydrology-production-current-observation.json`
- Production screenshot: `artifacts/hydrology-municipalities-production-current.png`
- Post-deploy production smoke: `artifacts/hydrology-production-post-deploy-20260715.json`
- Post-deploy production screenshot: `artifacts/hydrology-municipalities-production-post-deploy.png`

## Bounded Async Acknowledgement Correction — 2026-07-15T14:35Z

- `apps/api/src/presentation/routes/hydrology-government.ts` now generates the job/run correlation IDs before scheduling exactly one background runner promise. The route acknowledges with HTTP `202`, `status: queued`, `runId`, `proofRunId`, requested sources, and empty result arrays; it never fabricates completion.
- Admission remains held until the background promise settles, so the existing rate/concurrency guard still rejects overlapping work with HTTP `429`. No token, retry, polling, or auth path was added.
- The default runner accepts the route-generated `runId`, persists the final per-source result rows under the shared `proofRunId`, and emits only sanitized completion/failure logs. `/municipalities` remains unchanged and retains fixture filtering.
- Focused API route tests: `29/29` passed. API typecheck: `pnpm exec tsc --noEmit --pretty false` passed. Web suite: `31/31` passed.
- Direct local route proof against the remote DB: `proof-async-route-20260715T143155Z` returned HTTP `202`/`queued` in `1234ms`, then completed with PNA `9`, INA `22`, INMET `100`, SMN `117`; read-only DB correlation found one successful row per source. Sanitized artifact: `artifacts/hydrology-async-ingest-local-proof-20260715.json`.
- Scheduler real-runtime cross-check: `scheduler-proof-20260715T142611Z`, one invocation per source, retries `0`, passed with inserted `9/22/100/117`. Artifact: `artifacts/hydrology-scheduler-async-fix-local-receipt.json`.
- The existing `pnpm verify-local` matrix was run once as requested but remains blocked by its one-POST-per-source loop: after the first `202 queued`, the retained in-flight guard correctly returned `429` for the next three requests (`proof-20260715T142419Z`). Its generated failure artifact is not accepted as production readiness evidence.
- Production is not redeployed or re-smoked in this task. Existing production blocker remains: `proof-20260715T141011Z` had BFF HTTP `503` after the old 12-second timeout and the live revision was not commit-correlated.

### Corrective Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused tests | API hydrology route `29/29`; API `tsc --noEmit --pretty false`; web suite `31/31`. |
| Runtime harness | Local Express route, one unauthenticated all-source POST, HTTP `202` in `1234ms`; background completed and remote DB rows correlated under `proof-async-route-20260715T143155Z`. Scheduler proof `scheduler-proof-20260715T142611Z` also passed. |
| Rollback boundary | Revert the async acknowledgement/run-ID plumbing, route tests, and the two new sanitized evidence artifacts; leave auth, BFF error classification, provider adapters, migrations, and existing dirty production evidence untouched. |

## Bounded Production Smoke — 2026-07-15T14:13Z

- Waited 15 seconds after the requested commit observation. Production HTTP was live, but no response header exposed a commit; the live revision is not correlated to `4c5f4e4`.
- `GET /api/hydrology/municipalities` returned HTTP `200`, 18 municipalities, 20 telemetry rows, no `offline-fixture://` URLs, fresh PNA/INA, and degraded INMET/SMN with zero telemetry rows.
- Exactly one unauthenticated `POST /api/hydrology/ingest` was sent with `proofRunId=proof-20260715T141011Z`; the BFF returned HTTP `503 HYDROLOGY_BFF_UPSTREAM_UNAVAILABLE` after the 12-second Render upstream timeout and did not echo the proofRunId.
- A read-only remote DB query nevertheless found one correlated row per source for that proofRunId; only source counts and row IDs were recorded. This does not override the failed HTTP ingest gate.
- A real browser opened `/municipalities` and rendered 18 cards: PNA/INA `ACTUALIZADA`; INMET/SMN `NO DISPONIBLE`. Screenshot: `artifacts/hydrology-municipalities-production-post-deploy.png`.
- No production cron receipt/log existed; the local scheduler receipt was not used as production evidence.
- Verdict remains `BLOCKED`; task 4.3 stays unchecked and no production-ready/archive claim is made. Full sanitized evidence: `artifacts/hydrology-production-post-deploy-20260715.json`.

The additive migration `20260714120000_hydrology_proof_run_id` was applied once with `pnpm exec prisma migrate deploy --schema prisma/schema.prisma` against the explicitly configured remote PostgreSQL target; a subsequent `prisma migrate status` reported the schema up to date. No secrets were printed.

## Blockers / Deviations

1. INA currently returns HTTP 200 `text/html; charset=UTF-8`; the adapter remains honestly blocked because there is no actual machine-readable payload evidence to justify a parser change.
2. INMET currently returns HTTP 404 for the configured daily endpoint.
3. SMN currently returns HTTP 403 for the configured alert endpoint.
4. The live production revision is not commit-correlated to `4c5f4e4`; the bounded smoke returned production evidence but cannot close the gate because ingest timed out with HTTP 503 and INMET/SMN remain unavailable.
5. Strict-TDD RED evidence for 1.3, 2.1, and 3.3 was not observable because those behaviors were already present in the inherited partial slice; this is recorded rather than fabricated.

## Current Provider Recovery — 2026-07-15T07:09Z

- Updated INMET to the observed current official RSS endpoint `https://apiprevmet3.inmet.gov.br/avisos/rss` and SMN to the observed current official CAP RSS endpoint `https://ssl.smn.gob.ar/feeds/CAP/rss_alertaCAP_nuevo_2026.xml`. The old SMN 403 path, stale SMN map feeds, and empty INMET station-day default are no longer defaults.
- Added bounded RSS parsers: INMET max 100 items and SMN max 120 items, strict item/link/timestamp requirements, bounded title/description cells, official source URLs, and `null` alert values where the provider does not publish a numeric severity.
- Removed bearer handling from the hydrology ingest route and verifier. Direct requests retain the application rate limiter and now reject overlapping in-process work with HTTP 429 before invoking a second runner.
- Added `apps/api scheduler:once`, which invokes `HydrologyIngestionScheduler` against the real `createGovernmentIngestionRunner`, forwards one shared proofRunId, and writes a sanitized receipt. Scheduler metadata now carries optional proofRunId into the ingestion workflow.
- Captured bounded endpoint research, including rejected stale/blocked alternatives and selected current official feeds, in `artifacts/hydrology-provider-research-20260715.json`.

### Current Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused tests | Hydrology engine `23/23`; API route/scheduler/verifier `40/40`; API typecheck and package builds passed. |
| Runtime provider/API/DB | `pnpm verify-local` → exit `0`, proofRunId `proof-20260715T070558Z`, one direct unauthenticated POST per source, retries `0`; PNA `200/9`, INA `200/3`, INMET `200/93`, SMN `200/94`; all correlated DB rows pass. |
| Runtime browser | `pnpm --dir apps/web test:e2e -- tests/e2e/hydrology-government.spec.js` → `1/1` passed; local `/municipalities` rendered 18 municipalities, all four source cards, no fixture URL, and real INA rendering for the same proofRunId. |
| Runtime scheduler | `pnpm --dir apps/api scheduler:once --out ../../artifacts/hydrology-scheduler-local-receipt.json` → exit `0`, proofRunId `scheduler-proof-20260715T070904Z`, PNA/INA/INMET/SMN invoked once with inserted `9/3/93/94`, retries `0`, no skips. |
| Rollback boundary | Revert RSS defaults/parsers, alert-station persistence, direct-ingest overlap guard, scheduler proof metadata/CLI, tests, runbook, task artifacts, and generated evidence only; leave auth, existing migrations, fixture rows, and unrelated dirty files untouched. |

## Bounded Correction Transaction — review-65761c6de5ad5b6e

- **Status:** applied locally; production proof remains blocked and no deploy, commit, push, or auth change was made.
- **Frozen mapping:** risk findings `hydrology-government.ts:180` and `route.ts:76` → remove proxy bearer injection; keep direct tokenless ingest with per-client `4/60s` admission, one in-flight run, fixed four-source allowlist, and existing one-attempt source execution. Seed initialization is memoized per runner and remains SQL-idempotent.
- **Frozen mapping:** resilience `repository.ts:35` → partial telemetry errors now best-effort persist a failed ingestion run with inserted-count observability before rethrowing; no provider retry is introduced.
- **Frozen mapping:** resilience `smn-adapter.ts:47` / `inmet-adapter.ts:47` → shared linear bounded RSS item/tag scanner handles namespace prefixes and max-item caps without dynamic tag regexes.
- **Frozen mapping:** resilience `http-clients.ts:203` / `:176` → INA requests use a rolling previous-24-hour window and continue remaining fixed series after an individual fetch/parse failure, returning healthy records when available.
- **Frozen mapping:** Municipal Copilot `hydrology-government.ts:265` → only supported municipal zone names receive telemetry; other municipalities get an empty, degraded, schema-valid context instead of `zone: null` with data.
- **Correction delta:** 180 changed lines total, within the 200-line budget. Existing completed bounded PNA reader, scheduler overlap result, fixture filtering, and provider semantics were not duplicated or changed.
- **Focused evidence:** hydrology engine focused suite passed 23/23; API route suite passed 29/29; API `tsc --noEmit --pretty false` passed; `git diff --check` found only pre-existing whitespace in unrelated tracked artifacts.
- **Full safety net:** `pnpm test` passed with 6/6 workspace tasks successful (API 143/143, web 31/31); no runtime/provider smoke was repeated.
- **Artifacts:** `packages/hydrology-engine/src/adapters/rss-parser.ts`, `packages/hydrology-engine/src/adapters/inmet-adapter.ts`, `packages/hydrology-engine/src/adapters/smn-adapter.ts`, `packages/hydrology-engine/src/clients/http-clients.ts`, `packages/hydrology-engine/src/repository.ts`, `apps/api/src/presentation/routes/hydrology-government.ts`, `apps/web/src/app/api/hydrology/[...path]/route.ts`, and this transaction record.
- **Risks:** process-local admission is intentionally not a distributed lock; production deployment/restart and post-deploy proof remain outside this transaction. DB failed-run recording is best effort when the connection itself is unavailable.
- **skill_resolution:** loaded `C:\Users\mmmau\.config\opencode\skills\sdd-apply\SKILL.md`, `C:\Users\mmmau\.config\opencode\skills\_shared\global-mindset.md`, and `C:\Users\mmmau\.config\opencode\skills\curated\typescript\SKILL.md`.

## Recovery Iteration — 2026-07-14T17:26Z

- INA now accepts its real official HTML landing page with 15-second/256-KiB bounds and a tolerant table parser. The observed page (`www.ina.gob.ar/alerta/index.php`, HTTP 200, 17,029 bytes) contains report links and update metadata but no numeric telemetry rows, so the fresh correlated run is correctly persisted as `partial`, 0 records; it is not fabricated as success.
- INMET remains blocked: one bounded official request to `apitempo.inmet.gov.br/estacao/datos/2026-07-14` returned HTTP 404 (`E_ROUTE_NOT_FOUND`). The configured client request in the fresh proof run also returned HTTP 404. No alternate success URL was invented.
- SMN remains blocked: one bounded request to `www.smn.gob.ar/alertas` with browser-compatible headers returned HTTP 403 and `Cf-Mitigated: challenge`. No challenge bypass, retry, or fixture fallback was used.
- Cron now schedules one source identity per configured provider (`PNA`, `INA`, `INMET`, `SMN`), maps directly to the real ingestion runner, prevents overlapping same-source execution, and does not enqueue retries. Focused scheduler tests passed (8/8).
- Fresh local runtime: `pnpm build` passed (4 tasks); then `pnpm verify-local` produced proof run `proof-20260714T172633Z` with one POST/source, retries 0, and read-only correlated remote DB rows: PNA `success`/9 records; INA `partial`/0; INMET `failed`/0; SMN `failed`/0. It exited 1 as required by the unmet all-provider gate.
- Current local browser runtime: `pnpm --dir apps/web test:e2e -- tests/e2e/hydrology-government.spec.js` passed (1/1) with the API and web started by Playwright; `/municipalities` rendered 18 localities and PNA/INA/INMET/SMN for the same proof ID. Evidence: `artifacts/hydrology-municipalities-local-browser-evidence.json` and screenshot.
- Production remains unproven: no deployment access or post-deployment correlated DB/API/UI run is available. Existing production fixture-derived rows are not accepted.

## Slice 1 Recovery — 2026-07-14T18:59Z

- Replaced INA's landing-page ingestion with bounded official CSV/MNEMOS series requests for `6764` (Corrientes), `33988` (Paso de los Libres), and `38469` (Bella Vista). The adapter persists the series ID, observed timestamp, level, and source URL; the municipality seed creates those official INA station IDs before ingest.
- Replaced INMET's obsolete daily URL with the official station-day route for `A830`, `A809`, `A846`, and `A826`. The real route returned HTTP `204` for each station on the current day, which is persisted as an empty/partial source result; no synthetic rainfall was inserted.
- `/municipalities` now excludes `offline-fixture://` telemetry from freshness and renders sources without a persisted official datum as `No disponible` / `Fuente oficial no disponible`.
- Fresh official observations: INA `getObservaciones` returned HTTP 200 `text/plain` (2,088 bytes); the two MNEMOS series returned HTTP 200 `text/csv`; INMET's four selected station-day requests returned HTTP 204.
- Focused checks passed: hydrology engine 21/21, API route 29/29 plus API typecheck, web unit tests 29/29, and browser E2E 1/1. `pnpm build` passed (4 tasks).
- Final bounded local + configured remote-DB smoke: `pnpm verify-local` produced `proof-20260714T185905Z` and exited 1 as required by the all-provider gate. PNA passed (9 records); INA passed (15 records, correlated DB row); INMET blocked as empty/204; SMN blocked with HTTP 403. The local browser rendered `/municipalities` for this proof run. Production remains unproven.

## Slice 2 Runtime Recovery — 2026-07-14T19:09Z

- Delivery is `feature-branch-chain`; no main push or production readiness claim was made.
- Scheduler results are now observable: same-source overlap produces `skipped: true` without a second provider call, and completed or skipped results are logged. Cadence remains PNA/INMET/SMN each hour and INA daily at 18:30 UTC; no retry or polling exists.
- Focused strict-TDD evidence: baseline scheduler 8/8 passed; the new overlap-observability assertion failed before implementation and passed afterwards. The focused API command passed 40/40 tests and `tsc --noEmit` passed.
- Fresh endpoint proof: `proof-slice2-20260714T191000Z` POSTed PNA to `http://127.0.0.1:3001/api/hydrology/ingest` and received HTTP 202, success, 9 records, one official HTTP 200 request.
- Fresh matrix proof: `proof-20260714T190629Z` used exactly one request/source with `retries=0`; configured remote DB rows correlate PNA 9 and INA 16 records. INMET remains partial/0 and SMN failed/0 after official HTTP 403, so the command exited 1 and task 4.1 remains unchecked.
- Fresh Playwright local browser evidence showed PNA updated and INA/INMET/SMN unavailable. The actual BFF payload still contains `offline-fixture://` telemetry records and fails the required UI contract; fresh INA records are not mapped to what the UI renders. This is a blocker, not an unavailable-state success.
- Sanitized evidence is `artifacts/hydrology-slice2-runtime-evidence.json`. A real scheduler-triggered provider invocation and an explicit external-cron contract for Render remain unproven.

## Focused Remediation — 2026-07-14T19:27Z

- Removed runtime fixture telemetry without deleting old DB rows: the repository excludes `offline-fixture://` URLs and the `/municipalities` route applies the same defensive filter before source freshness and province alerts are generated.
- Added read-time mappings for INA official series `6764` (Corrientes), `33988` (Paso de los Libres), and `38469` (Bella Vista). The Government overview now displays a current INA level, timestamp, and official link rather than stale weather data.
- Fresh one-shot local proof `proof-20260714T192622Z` used the configured remote DB with no retry/polling: PNA `success/9` (`59eb36ab-ab03-49e0-9cbf-b1b88f55bd2b`), INA `success/16` (`1081cb16-5f7a-4cdc-9faa-e81ef3e3db29`), INMET `partial/0`, SMN `failed/0`. The matrix intentionally exited 1 because INMET is HTTP 204/empty and SMN is HTTP 403.
- The live local `/municipalities` response had zero fixture URLs and rendered Corrientes INA station `6764`, `3.11 m`, a timestamp, and its official INA URL. Playwright E2E passed 1/1 and wrote local evidence for the same proof ID.
- The Render runbook explicitly distinguishes the external-cron invocation contract from a production execution receipt and records in-process scheduler run-result observability. No Render cron fire, production deploy, or production smoke is claimed.

### TDD Cycle Evidence
| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| Fixture exclusion and INA municipality mapping | `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit/repository | 15/15 focused baseline | Added failing fixture/official INA case | 16/16 passed | Fixture URL and official INA rows | Added query + response defense; retained DB rows |
| Runtime response fixture defense | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration | 29/29 focused baseline | Added failing route fixture case | 30/30 passed | Repository and route defenses cover separate paths | Filter is applied before alerts/freshness |
| INA UI presentation | `apps/web/src/components/government/overview-summary.test.ts` | Unit | New helper | Missing-helper import failed | 2/2 passed | Real INA + unavailable/weather-only cases | Pure summary prevents stale weather substitution |

### Work Unit Evidence
| Evidence | Exact result |
|---|---|
| Focused tests | Hydrology engine `16/16`; API route `30/30`; web summary `2/2`; Playwright local `/municipalities` `1/1` passed. |
| Runtime harness | `pnpm verify-local` → `proof-20260714T192622Z`, exactly one call/source, retries `0`, configured remote DB; exited `1` only because INMET/SMN remain blocked. Local query returned 0 fixture URLs, PNA 19 and INA station `6764` value `3.11`. |
| Rollback boundary | Revert repository/route filtering and INA read mappings, UI summary/card, focused tests, E2E evidence check, and runbook wording. Existing fixture DB rows and auth remain untouched. |

## Current Apply Correction — 2026-07-15T17:10Z

- Strict-TDD correction: INA's three fixed official series requests now execute concurrently with one bounded attempt per series. This preserves fixed source scope, no retry/polling, and continues to collect successful series when one fails.
- RED: the new client test observed `maxActive=1` before implementation; GREEN: the same test and the hydrology-engine focused suite pass after the change. Focused client suite: 8/8; hydrology-engine client + engine suite: 24/24.
- Official INA behavior was re-confirmed from the public INA API page: `getObservaciones` CSV and `obs/puntual/series/{id}` Mnemos endpoints are documented. The prior sequential implementation exceeded the 17-second runner deadline when one series stalled.
- Fresh configured-remote-DB scheduler proof `scheduler-proof-20260715T170855Z` invoked PNA, INA, INMET, and SMN once, with retries `0`; inserted counts were `9/21/100/117`. A separate read-only query correlated one successful ingestion row per source to that proofRunId. Evidence: `artifacts/hydrology-scheduler-apply-proof-20260715-ina-parallel.json`.
- Local `/municipalities` browser proof remains `1/1` with 18 municipalities, all four source labels, and no fixture URLs. The existing one-POST-per-source verifier remains blocked because the public route now acknowledges asynchronously with empty `results`; it cannot honestly claim provider HTTP/DB completion from a queued response. Evidence: `artifacts/hydrology-local-real-matrix.json` and `artifacts/hydrology-municipalities-local-browser-evidence.json`.
- Production baseline was attempted against the requested `https://www.agronautas.com.ar` and `/`, `/municipalities`, `/api/hydrology/municipalities`, and `/api/hydrology/ingest`; all failed DNS resolution. No production mutation was attempted. Existing production evidence for the separate resolved `agronauta.com.ar` hostname remains blocked and is not accepted as proof for this requested hostname.
- Operational tasks remain blocked and intentionally unchanged: 0.1/0.2/4.2 require authorized access or backup delivery; 4.3 requires deployment and post-deploy proof; 4.4 is not applicable because no deployment occurred. No commit, push, auth change, or deployment was made.

### Correction TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 2.2 correction | `packages/hydrology-engine/src/clients/http-clients.test.ts` | Unit | 24/24 hydrology-engine suite before correction | ✅ New max-concurrency assertion failed (`1 !== 3`) | ✅ Client 8/8 and engine/client 24/24 passed | ✅ Existing success, failure, and bounded-attempt cases retained | ✅ Fixed-series `Promise.all` only; no retry/polling |

### Correction Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `pnpm exec node --import tsx --test src/clients/http-clients.test.ts src/hydrology-engine.test.ts` from `packages/hydrology-engine` → 24/24 passed. |
| Runtime harness | `pnpm --dir apps/api scheduler:once --out ../../artifacts/hydrology-scheduler-apply-proof-20260715-ina-parallel.json` → exit 0; one invocation/source, retries 0; PNA/INA/INMET/SMN inserted 9/21/100/117. Read-only DB correlation returned 4 successful rows for the proofRunId. |
| Final checks | `pnpm test` → 6/6 workspace tasks successful, API 145/145; sequential `pnpm build` → 4/4 successful; API hydrology focused suite → 42/42; Playwright `/municipalities` → 1/1. A concurrent build/test attempt had a transient generated-dist race and was rerun sequentially successfully. |
| Rollback boundary | Revert only the INA request scheduling change, its focused regression test, and the scheduler/read-only evidence artifacts; preserve prior provider endpoints, auth, migrations, route behavior, and unrelated dirty files. |

## Corrective Re-run — 2026-07-15T17:39Z

- **Queued-ingest limitation resolved locally:** the public `202 queued` response now includes a relative `statusPath`. A single GET to that path may wait server-side for at most 60 seconds and returns the terminal, sanitized provider result. The verifier performs exactly one POST and one bounded status GET per source; it does not poll or retry. Unknown/expired run IDs return a safe 404 without secrets.
- **Strict TDD:** RED added the completion-path and unknown-run route tests plus terminal-observation verifier tests. The initial route/verifier run failed 2/32 (missing status path/endpoint) and the verifier test failed 1/3 (missing terminal gate). GREEN/refactor then passed the focused route + verifier suite at **35/35**.
- **Fresh local runtime proof:** `pnpm verify-local -- --all-sources --out ../../artifacts/hydrology-async-observation-local-proof-20260715-rerun.json` used proofRunId `proof-20260715T173713Z`, remote configured DB, one POST/source, one bounded status GET/source, retries `0`, and completed PNA/INA/INMET/SMN with HTTP `200`, DB-correlated rows, and counts `9/23/100/117`. The command exited `0` and `passed=true`.
- **Final supplemental checks:** sequential `pnpm test` passed **6/6 workspace tasks** (API **148/148**, web **31/31**); sequential `pnpm build` passed **4/4** tasks. The earlier generated-dist race was not reproduced in the final sequential run.
- **Authoritative URL reconciliation:** the requested plural `https://www.agronautas.com.ar` currently returns DNS `NXDOMAIN` and was not used for further probing. The verified canonical web deployment is `https://www.agronauta.com.ar` (singular): current DNS `104.21.42.115,172.67.161.168`, root HTTP `200`, hydrology municipalities HTTP `200`. The configured Render API service is `https://agronauta.onrender.com`: current DNS includes `216.24.57.8,216.24.57.9`, root HTTP `404` with `X-Render-Origin-Server: Render`, and municipalities HTTP `200`. These are safe GET observations only; no production POST/mutation was made.
- **Task reconciliation:** `4.4` is now checked as not applicable because no deployment occurred. `0.1` remains unchecked because its exact wording requires authorized deployment access and post-deployment read-only production proof authority; `0.2` remains unchecked because its exact wording requires a commit/push to `pre-cambios`, explicitly prohibited by this rerun; `4.2` remains unchecked because PR submission/approval cannot occur without the prohibited commit/push and approval authority; `4.3` remains unchecked because deployment and post-deploy proof are required and were not authorized. Apply remains blocked and must not advance to verify/archive.

### Corrective TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| Queued completion observation | `apps/api/src/presentation/routes/hydrology-government.test.ts` | Integration | 30/30 route tests | ✅ 2 failures before implementation | ✅ 32/32 route tests after implementation | ✅ terminal completion plus unknown/queued states | ✅ bounded wait clears its timer |
| Verifier terminal gate | `apps/api/src/scripts/verify-hydrology-local-real.test.ts` | Unit | 2/2 verifier tests | ✅ 1 missing-export failure before implementation | ✅ 3/3 verifier tests | ✅ completed, queued, and mismatched proof IDs | ✅ pure terminal gate |

### Corrective Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | From `apps/api`: `pnpm exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts src/scripts/verify-hydrology-local-real.test.ts` → **35/35 passed**. |
| Runtime harness | `pnpm verify-local -- --all-sources --out ../../artifacts/hydrology-async-observation-local-proof-20260715-rerun.json` → **exit 0**, terminal status observed for each source after one bounded GET, remote DB rows correlated, `passed=true`; production cells intentionally `not_run`. |
| Rollback boundary | Revert only `packages/zod-schemas/src/agronautas.ts`, `apps/api/src/presentation/routes/hydrology-government.ts`, `apps/api/src/presentation/routes/hydrology-government.test.ts`, `apps/api/src/scripts/verify-hydrology-local-real.ts`, `apps/api/src/scripts/verify-hydrology-local-real.test.ts`, and the corrective design/spec/evidence additions. Preserve auth, provider adapters, migration, scheduler semantics, and unrelated dirty files. |
