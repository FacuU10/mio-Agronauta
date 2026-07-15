# Apply Progress: Iberá-Alerta Production Proof Recovery

**Updated:** 2026-07-15T07:09Z
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
- [ ] 4.3 Deploy and run production smoke — BLOCKED: no deployment access; current production is not correlated to this change
- [ ] 4.4 Rollback — not applicable; no deployment was made

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

The additive migration `20260714120000_hydrology_proof_run_id` was applied once with `pnpm exec prisma migrate deploy --schema prisma/schema.prisma` against the explicitly configured remote PostgreSQL target; a subsequent `prisma migrate status` reported the schema up to date. No secrets were printed.

## Blockers / Deviations

1. INA currently returns HTTP 200 `text/html; charset=UTF-8`; the adapter remains honestly blocked because there is no actual machine-readable payload evidence to justify a parser change.
2. INMET currently returns HTTP 404 for the configured daily endpoint.
3. SMN currently returns HTTP 403 for the configured alert endpoint.
4. No deployment access or post-deployment production proof authority is configured. Current production observations are not proof for this source revision and cannot close the production API/UI gate.
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
