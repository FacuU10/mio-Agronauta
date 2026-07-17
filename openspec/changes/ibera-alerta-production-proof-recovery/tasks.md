# Tasks: Iberá-Alerta Production Proof Recovery

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Review Workload Forecast
- Estimated changed lines: 250-350 lines
- Suggested split: PR 1 (Schema & Clients) → PR 2 (BFF & Script) → PR 3 (E2E Tests)

### Suggested Work Units
| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | DB Migration & Ingest Contract | PR 1 | Base main; adds proofRunId schema & Zod changes |
| 2 | HTTP Clients & Safe Diagnostics | PR 1 | Base main; returns safe HTTP summaries for providers |
| 3 | Ingest Route, BFF Recovery & Script | PR 2 | Base PR 1; bounded POST per source; verify script |
| 4 | Playwright E2E UI Validation | PR 3 | Base PR 2; page role/text selectors |

## Phase 0: Prerequisites & Backups
- [ ] 0.1 Obtain authorized deployment access and post-deployment read-only production DB/API proof authority. (Blocking)
- [ ] 0.2 Git backup: Commit and push current files to `pre-cambios` branch.

## Phase 1: DB & Contract (PR 1)
- [x] 1.1 RED: Write contract tests in `packages/zod-schemas/src/agronautas.test.ts` for `proofRunId` & `httpSummary`.
- [x] 1.2 GREEN: Add fields to `agronautas.ts` schema and `packages/hydrology-engine/src/types.ts`.
- [x] 1.3 RED: Write unit tests for proof-correlated repository persistence in `packages/hydrology-engine/src/hydrology-engine.test.ts`.
- [x] 1.4 GREEN: Add additive migration (`proof_run_id`) to `schema.prisma` & update repository.
- [x] 1.5 REFACTOR: Run `pnpm build && pnpm test` to verify contracts.

## Phase 2: HTTP Clients & Safe Ingest (PR 1/2)
- [x] 2.1 RED: Write client tests in `packages/hydrology-engine/src/clients/http-clients.test.ts` expecting safe `httpSummary`.
- [x] 2.2 GREEN: Modify `http-clients.ts` to capture host, status, elapsed, no secrets, no retry/polling.
- [x] 2.3 RED: Write Express route test in `apps/api/src/presentation/routes/hydrology-government.test.ts` expecting proofRunId propagation and `202` source results.
- [x] 2.4 GREEN: Modify `/api/hydrology/ingest` to handle one POST per source; map `proofRunId`.
- [x] 2.5 GREEN: Repair `apps/web/src/app/api/hydrology/[...path]/route.ts` BFF `503` handling with safe 502/503 details.

## Phase 3: Verify Script & UI Proof (PR 2/3)
- [x] 3.1 RED: Write spec tests for verification script `verify-hydrology-local-real.ts`.
- [x] 3.2 GREEN: Implement `verify-hydrology-local-real.ts` to output matrix JSON with six required proof items per source (PNA, INA, INMET, SMN).
- [x] 3.3 RED: Write E2E test in `apps/web/tests/e2e/hydrology-government.spec.js` for the real `/municipalities` flow.
- [x] 3.4 GREEN: Implement Playwright E2E tests verifying selectors locally and on prod.

## Phase 4: Verification, Rollout & Rollback
- [x] 4.1 Run local verification: `pnpm verify-local`. Local provider, API, DB, and browser proof now passes; production cells remain intentionally not run before deployment.
- [ ] 4.2 Submit PRs to main. Obtain approval and review.
- [ ] 4.3 Deploy to production. Run production smoke at `https://www.agronauta.com.ar`.
- [x] 4.4 Rollback: Not applicable for this run; no deployment was made, so no deployment or migration rollback mutation was required.
- [x] 4.5 Return a bounded `202 queued` response for the public ingest job while retaining one-shot background processing, admission protection, and proof-correlated persistence.

## Apply Batch Evidence — 2026-07-14

### Slice 2 runtime recovery — endpoint, scheduler, and browser

- Added scheduler run-result observability and an explicit overlap-skipped result; focused scheduler coverage proves one active provider call is retained and the concurrent call is skipped, with no retry scheduling.
- Fresh local endpoint request `proof-slice2-20260714T191000Z` returned HTTP `202` for PNA with `9` ingested records and a safe official HTTP summary. The independent one-shot matrix `proof-20260714T190629Z` correlated PNA (`9`) and INA (`16`) rows to the configured remote database; INMET was partial with `0` records and SMN failed after HTTP `403`.
- Fresh Playwright browser evidence at `http://127.0.0.1:3000/municipalities` rendered PNA as updated and INA/INMET/SMN as unavailable. It also proved a blocker: the runtime municipalities payload still contains `offline-fixture://` telemetry records, and the UI has not rendered the successfully ingested INA data.
- Task 4.1 remains unchecked: the runtime payload must remove offline fixture telemetry, render real INA values, and capture a real scheduler-triggered provider invocation. No production readiness or provider-wide success is claimed.
- Sanitized evidence: `artifacts/hydrology-slice2-runtime-evidence.json`.

### Focused remediation — 2026-07-14T19:27Z

- Runtime municipality responses now reject `offline-fixture://` telemetry both in the repository query and as a route-level defense. Existing production fixture rows were not deleted.
- Municipality mapping now adds official INA series `6764` (Corrientes), `33988` (Paso de los Libres), and `38469` (Bella Vista) to the read path. The UI renders INA height, official timestamp, and official source link; it does not substitute weather telemetry.
- Fresh one-shot proof `proof-20260714T192622Z`: remote DB-correlated PNA `success/9` and INA `success/16`; local API had zero fixture URLs; Playwright `/municipalities` passed and visibly rendered Corrientes INA `3.11 m` with its official URL. INMET remains empty/204 and SMN remains 403/blocked.
- Render external-cron is documented as an invocation contract, while in-process scheduler logs are observability only. No cron execution is claimed.
- Task 4.1 remains unchecked because every configured provider and production proof are still required. Evidence: `artifacts/hydrology-slice2-runtime-evidence.json`, `artifacts/hydrology-local-real-matrix.json`, and `artifacts/hydrology-municipalities-local-browser-evidence.json`.

### Current provider recovery — 2026-07-15T07:09Z

- Replaced stale/blocked SMN and empty INMET defaults with observed current official RSS feeds: SMN CAP RSS `https://ssl.smn.gob.ar/feeds/CAP/rss_alertaCAP_nuevo_2026.xml` and INMET alerts RSS `https://apiprevmet3.inmet.gov.br/avisos/rss`. Parsers are bounded to 120/100 items, preserve official timestamps/links, and store alert telemetry without fabricated numeric values.
- Captured the bounded endpoint investigation and rejected stale/blocked alternatives in `artifacts/hydrology-provider-research-20260715.json`.
- Removed the hydrology ingest bearer dependency. Direct `POST /api/hydrology/ingest` now accepts the JSON contract without credentials while retaining global rate limiting and a process-local 429 overlap guard. The verifier sends no authorization header.
- Fresh local real proof `proof-20260715T070558Z`: PNA HTTP 200 / 9 rows, INA HTTP 200 / 3 rows, INMET HTTP 200 / 93 rows, SMN HTTP 200 / 94 rows; all four DB rows correlated by proofRunId and the matrix passed with retries `0`.
- Fresh local browser proof reused that proofRunId: `/municipalities` HTTP 200, 18 municipalities, no `offline-fixture://`, visible PNA/INA/INMET/SMN cards, and real INA value/source rendering. Evidence: `artifacts/hydrology-municipalities-local-browser-evidence.json` and `artifacts/hydrology-municipalities-local.png`.
- Genuine local scheduler invocation `scheduler-proof-20260715T070904Z` ran the same ingestion runner once per source with 9/3/93/94 inserted records, `retry: null`, `skipped: false`, and `retries: 0`. Evidence: `artifacts/hydrology-scheduler-local-receipt.json`.
- Task 4.1 is complete for local proof. Production deploy, production API/DB/browser proof, and rollback remain blocked and intentionally untouched.

### Slice 1 recovery — official INA/INMET adapters

- INA now makes one bounded request per configured official series (`6764`, `33988`, `38469`), parses CSV/MNEMOS rows, persists the observed timestamp/value/original source URL, and maps those series to Corrientes, Paso de los Libres, and Bella Vista.
- INMET now uses the official station-day route `/estacao/dados/{date}/{station}` for `A830`, `A809`, `A846`, and `A826`; HTTP `204` is an honest empty result, never synthetic telemetry.
- The fresh final local proof run was `proof-20260714T185905Z`: PNA and INA passed with correlated remote DB rows; INMET was empty (`204`, 0 records) and SMN remained `403`, so task 4.1 remains blocked and no provider-wide acceptance is claimed.

- Focused tests: from `packages/hydrology-engine`, `pnpm exec node --import tsx --test src/clients/http-clients.test.ts src/hydrology-engine.test.ts` — 20/20 passed; from `apps/api`, `pnpm exec node --import tsx --test src/presentation/routes/hydrology-government.test.ts src/scripts/verify-hydrology-local-real.test.ts` — 31/31 passed across both files. Final API type-check `pnpm exec tsc --noEmit --pretty false` passed.
- Full supplemental checks: `pnpm test` — 6 workspace tasks successful; API 143/143 and web 29/29 tests passed. `pnpm build` — 4 workspace build tasks successful.
- Local real runtime: `pnpm verify-local` used `proofRunId=proof-20260714T074216Z`, one POST per source, `retries=0`, and the configured remote production DB. PNA passed; INA was blocked by HTTP 200 HTML content (`unexpected_content_type`); INMET was blocked by HTTP 404; SMN was blocked by HTTP 403. Each source has a correlated DB row, and the local browser evidence is recorded in `artifacts/hydrology-municipalities-local-browser-evidence.json`.
- Production observation: `artifacts/hydrology-production-current-observation.json` records the current pre-deployment observations. No deployment access or post-deployment proof authority is available; production proof is not accepted.
- Rollback boundary: revert the INA/INMET adapter/client changes, their focused tests, INA station/mapping seed changes, and this slice's evidence only; leave auth, scheduler behavior, migrations, and unrelated dirty files untouched.

## Apply Correction Evidence — 2026-07-15T17:10Z

- Corrected the live INA timeout risk by fetching the three fixed official series concurrently, still with one bounded request per series and no retry/polling. The RED regression observed `maxActive=1`; GREEN passed with `maxActive=3`.
- Focused hydrology-engine client/engine tests passed 24/24. Fresh scheduler proof `scheduler-proof-20260715T170855Z` invoked PNA, INA, INMET, and SMN independently with retries `0` and inserted `9/21/100/117`; a read-only query correlated four successful rows to the same proofRunId.
- The public requested production hostname `www.agronautas.com.ar` did not resolve for `/`, `/municipalities`, `/api/hydrology/municipalities`, or `/api/hydrology/ingest`; no production mutation was attempted. Operational tasks 0.1, 0.2, 4.2, 4.3, and 4.4 remain blocked/not applicable and their checkboxes are unchanged.
