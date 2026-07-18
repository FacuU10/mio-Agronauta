schema: gentle-ai.verify-result/v1
evidence_revision: sha256:fbe3df1a8c65c78b11b7e3adef8f6d636dd6fec5c6661db68cc91d9427acef0a
verdict: fail
blockers: 4
critical_findings: 4
requirements: 4/7
scenarios: 8/12
test_command: pnpm test (not run; full verification blocked by incomplete operator tasks)
test_exit_code: not_run
test_output_hash: n/a
build_command: pnpm build (not run; full verification blocked by incomplete operator tasks)
build_exit_code: not_run
build_output_hash: n/a

## Verification Report

**Change**: ibera-alerta-production-stability-smoke
**Version**: OpenSpec hybrid artifacts
**Mode**: Strict TDD
**Phase status**: blocked
**Scope**: Bounded production/operator verification for main commit `bf76bf105fd32d03e582e3afd6203cd5a7e8c000`. No application, configuration, test, staging, commit, push, deploy, review, cron, or ingest mutation was performed.

### Completeness

| Metric | Value |
|---|---:|
| Tasks total | 23 |
| Tasks complete | 19 |
| Tasks incomplete | 4 |
| Incomplete tasks | O.1, O.2, O.3, O.4 |
| Application tasks | 19/19 complete in the existing task artifact |
| Operator terminal status | BLOCKED: approval, cron, and authenticated ingest evidence unavailable |

The four unchecked tasks are the operator remainder: Render BFF/connection approval, regional routing approval, hourly cron proof, and the correlated bounded production evidence bundle. The native status also reports `applyProgress` missing; the prior Engram session summary is not a full apply-progress artifact, so strict-TDD evidence cannot be independently re-audited in this phase.

### Deployment Revision Matrix

| Check | Result | Sanitized evidence |
|---|---|---|
| Main commit under verification | ✅ PASS | Local `HEAD` is `bf76bf105fd32d03e582e3afd6203cd5a7e8c000`; branch is `main` and matches `origin/main` at the time of the check. |
| Render live revision | ✅ PASS | Safe `GET https://agronauta.onrender.com/health` returned `status=ok` and revision exactly `bf76bf105fd32d03e582e3afd6203cd5a7e8c000` on the first bounded-window sample. |
| Render auto-deployment mechanism | ⚠️ NOT INDEPENDENTLY CONFIRMED | Render CLI is unavailable and no safe Render authentication/configuration was detected. The live revision match proves the deployed revision, not the control-plane event. |
| Bounded deployment window | ✅ PASS | One health sample matched immediately; no extended retry was needed. |

### API Health/Readiness Stability

| Sample | `/health` | `/ready` | Result |
|---:|---|---|---|
| 1 | HTTP success, `status=ok`, target revision | `ready=true`, target revision | ✅ PASS |
| 2 | HTTP success, `status=ok`, target revision | `ready=true`, target revision | ✅ PASS |
| 3 | HTTP success, `status=ok`, target revision | `ready=true`, target revision | ✅ PASS |

Observed latency was approximately 0.24–0.27 seconds for `/health` and 2.2–2.3 seconds for `/ready`; no credentials, URLs, or environment dumps were printed.

### Web BFF and Dashboard Matrix

| Check | Result | Sanitized evidence |
|---|---|---|
| Municipalities BFF | ✅ PASS | `GET https://www.agronauta.com.ar/api/hydrology/municipalities` returned HTTP 200, contract `hydrology-government-municipalities-v1`, 18 municipalities, and 4 freshness entries. |
| Dashboard BFF | ✅ PASS | One read-only dashboard request for the first returned municipality returned HTTP 200 with 4 provenance entries, 1 telemetry entry, 0 alerts, and 0 forecast entries. |
| Web-origin hydrology routing | ✅ PASS | Both read-only BFF requests completed through the web origin without a web-origin 404. |
| Dashboard data availability | ✅ PASS WITH DATA LIMITATION | The dashboard contract was readable; the current payload had no alert or INA forecast entries. This is recorded as observed data, not converted into a success claim. |

### Data-Source Availability/Freshness Matrix

| Source | Current freshness | Last-success metadata | Classification |
|---|---|---|---|
| PNA | `fresh` | present | ✅ Available |
| INA | `fresh` | present | ✅ Available |
| INMET | `degraded` | absent | ⚠️ Expected regional-availability degradation; not classified as a scraper regression |
| SMN | `degraded` | absent | ⚠️ Expected regional-availability degradation; not classified as a scraper regression |

The read-only municipalities and dashboard payloads independently exposed all four source entries and preserved the distinction between fresh PNA/INA data and degraded INMET/SMN data. A current provider-level HTTP 403/geo-block cause was not independently proven because the required authenticated ingest operation was not run.

### Ingest-Page Gate Matrix

| Check | Result | Sanitized evidence |
|---|---|---|
| Anonymous page load | ✅ PASS | Playwright loaded `https://www.agronauta.com.ar/municipalities/ingest` successfully. |
| Verification gate visible | ✅ PASS | The page displayed the access-verification form and disabled `Verificar acceso` button before credentials were supplied. |
| Ingest controls hidden | ✅ PASS | No ingest-control text was present in the anonymous DOM. |
| Browser persistence | ✅ PASS | `localStorage` and `sessionStorage` each had 0 entries; no cookie header was present. |
| Credential safety | ✅ PASS | No credential was entered, submitted, or exposed in DOM, URL, storage, or report evidence. |
| Browser console | ⚠️ WARNING | One non-sensitive `favicon.ico` HTTP 404 was observed; no application-flow failure was observed. |

### Render/Cron/Mutation Safety

| Check | Result | Evidence |
|---|---|---|
| Render approval/connection policy | ❌ BLOCKED | No safely authenticated Render control-plane access or redacted approval artifact was available. |
| Regional routing approval | ❌ BLOCKED | No safely authenticated Render control-plane access or redacted routing approval artifact was available. |
| Hourly cron execution | ❌ BLOCKED | No safe authenticated cron receipt or redacted run identity/timestamp/outcome was available. |
| Authenticated ingest | ✅ NOT RUN | No external safe authorization mechanism was configured; no authenticated ingest request was attempted. |
| Infrastructure/data mutation | ✅ NOT RUN | Verification was read-only; no deployment, configuration, cron, or provider-data mutation was performed. |

The production runbook requires a real cron-provider receipt and explicitly forbids inferring cron success from deployment logs or a later municipalities response. Those controls are therefore not marked complete.

### Commands and Runtime Evidence

The strict full-suite commands were intentionally not executed in this operator slice because the task artifact still contains four unchecked tasks; the sdd-verify gate requires blocked verification rather than running the full suite with incomplete tasks. Existing same-commit local evidence remains historical context only:

| Layer | Existing evidence | Status |
|---|---|---|
| Full tests | `pnpm test`, exit 0, prior hash `sha256:a049ad15f1f620f9771402eace04137cf51d32216429a598c982f24399367ea3` | Historical, not rerun in this phase |
| Full build | `pnpm build`, exit 0, prior hash `sha256:510b6c15336e9f8bee2d6d28053c5fd11a8812b8c20d4ab31db97a831cd7c6ae` | Historical, not rerun in this phase |
| Production health/readiness | Bounded safe HTTP probes described above | ✅ PASS |
| Production BFF/UI | Bounded read-only HTTP and Playwright probes described above | ✅ PASS WITH WARNINGS |
| Coverage | No coverage tool/report available for this operator slice | ➖ Not available |

### Spec Compliance Matrix

| Requirement | Scenario | Test/evidence | Result |
|---|---|---|---|
| Configurable readiness and revision metadata | Cold-start readiness uses configured bound | Production `/ready` stability samples; target revision observed | ✅ COMPLIANT |
| Configurable readiness and revision metadata | Health metadata is safe | Production `/health` returned only safe status/revision evidence | ✅ COMPLIANT |
| Geo-blocked provider degradation | Provider is blocked from deployment region | Current source freshness is independently degraded for INMET/SMN; provider-level 403 not run | ⚠️ PARTIAL |
| Hydrology frontend proxy routing | Municipalities proxy succeeds | Production web BFF GET, HTTP 200, canonical contract, 18 municipalities | ✅ COMPLIANT |
| Hydrology frontend proxy routing | Ingest proxy preserves method/body | Authenticated production ingest deliberately not run; local historical evidence only | ❌ UNTESTED |
| Hydrology frontend proxy routing | Upstream exceeds BFF bound | No production timeout challenge issued; local historical regression evidence only | ❌ UNTESTED |
| Ephemeral ingest authorization | Verified visitor reveals controls | No credential was available for a safe production authorization flow | ❌ UNTESTED |
| Ephemeral ingest authorization | Invalid or refreshed visitor is blocked | Anonymous production page gate, disabled verification, empty storage | ✅ COMPLIANT |
| Render runtime control evidence | Approved controls are evidenced | No safe Render authentication or redacted approval artifact | ❌ UNTESTED |
| Render runtime control evidence | Approval absent defers without mutation | No control-plane access; no infrastructure mutation performed | ✅ COMPLIANT |
| Hourly cron proof | Scheduled execution completes | No safe cron receipt or run identity available | ❌ UNTESTED |
| Bounded production evidence | Independent provider outcomes are correlated | Revision/health/BFF/UI/source freshness correlated; ingest and cron absent | ⚠️ PARTIAL |

**Compliance summary**: 8/12 scenarios compliant, 2/12 partial, and 4/12 untested. Requirement completion remains 4/7 because the three operator requirements are not evidenced.

### Correctness (Static and Runtime Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Safe health/revision metadata | ✅ Runtime-proven | Live `/health` and `/ready` exposed the target revision without secret/config dumps. |
| Readiness stability | ✅ Runtime-proven | Three paired health/readiness samples returned success and the target revision. |
| Municipalities/dashboard BFF routing | ✅ Runtime-proven | Web-origin read-only endpoints returned structured production data. |
| Source freshness classification | ⚠️ Partial runtime proof | INMET/SMN are currently degraded and retained as degradation; the cause was not challenged via ingest. |
| Memory-only ingest page gate | ✅ Runtime-proven anonymously | Controls were hidden before verification and browser storage was empty. |
| Render/cron operator controls | ❌ Not proven | Required redacted approvals and cron receipt are unavailable. |

### Design Coherence

| Decision | Followed? | Notes |
|---|---|---|
| Keep API, BFF, and Render/cron settings separate | ✅ Yes | Verification did not mutate infrastructure or application configuration. |
| Use safe revision metadata for correlation | ✅ Yes | Revision was read only from `/health` and `/ready`. |
| Keep ingest authorization ephemeral | ✅ Yes | No token was entered or persisted; anonymous gate behavior was verified. |
| Treat INMET/SMN regional blocking as degradation | ✅ Yes | Current degraded source state was not mislabeled as a scraper regression. |
| Require bounded, redacted operator evidence | ❌ Incomplete | Render approvals, cron proof, and authenticated ingest evidence remain unavailable. |

### TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | ⚠️ Not independently retrievable | Native status reports no `applyProgress` file; prior Engram summary is not the full artifact. |
| All tasks have tests | ⚠️ Not re-audited | Application task summary reports test coverage, but the required full apply-progress artifact is unavailable. |
| RED/GREEN/Triangulation | ⚠️ Not re-audited | No new source/test work was performed in this operator verification. |
| Assertion quality | ⚠️ Not re-audited | No test files were edited or re-scanned in this operator slice. |

**TDD Compliance**: blocked by unavailable apply-progress context; no TDD claim is added beyond the prior report's historical evidence.

### Test Layer Distribution

Historical same-commit evidence reported 56 API tests, 17 web integration tests, and 1 Playwright test. This operator phase added no test files and executed no local test suite.

### Changed File Coverage

Coverage analysis skipped — no coverage tool/report is available for this read-only operator phase.

### Quality Metrics

Local lint/type/build metrics were not rerun because the verification gate is blocked by incomplete operator tasks. The prior report's unrelated lint warning remains historical context and is not converted into a production claim.

### Issues Found

**CRITICAL**:
1. O.1 is incomplete: no redacted Render BFF timeout/connection-policy approval evidence is available.
2. O.2 is incomplete: no redacted regional-routing approval evidence is available.
3. O.3 is incomplete: no safe hourly cron execution receipt with timestamp, run identity, and outcome is available.
4. O.4 is incomplete: authenticated ingest and a complete correlated production evidence bundle cannot be produced without an external safe authorization mechanism; the required apply-progress artifact is also unavailable for strict-TDD re-audit.

**WARNING**:
1. Render CLI/authentication was unavailable, so the control-plane auto-deployment event and cron configuration were not independently inspected.
2. INMET/SMN current `degraded` freshness is compatible with expected geo-blocking, but current provider-level 403 evidence was intentionally not requested.
3. The anonymous ingest page produced a non-sensitive favicon 404 in the browser console.

**SUGGESTION**:
1. Provide redacted Render control evidence and a safe external ingest authorization mechanism, then rerun the bounded smoke once.
2. Provide one cron-provider receipt and the correlated safe run identifier before rerunning final verification.
3. Resolve the favicon 404 separately; it is not a production stability blocker for the verified flow.

### Verdict

**FAIL / BLOCKED — deployment and read-only production paths pass, but final SDD verification cannot pass.** The live Render revision matches the requested main commit; health/readiness, municipalities/dashboard BFF reads, source freshness classification, and anonymous ingest-page gating pass. Final completion remains blocked by four unchecked operator tasks, absent Render/cron evidence, intentionally skipped authenticated ingest, and unavailable apply-progress context.

### Remediation

Obtain redacted Render approval for the finite BFF/connection policy and regional routing, capture one safe hourly cron receipt, use an externally approved authorization mechanism for the bounded ingest smoke without exposing credentials, preserve separate INMET/SMN outcomes, restore/retrieve the apply-progress artifact, then rerun independent sdd-verify with the full test/build commands.

### Modifications Made

Only the existing verification report was updated and the matching existing Engram artifact topic was upserted:

- `openspec/changes/ibera-alerta-production-stability-smoke/verify-report.md`
- Engram topic `sdd/ibera-alerta-production-stability-smoke/verify-report`

No application/source/configuration/test files, deployment settings, cron settings, provider data, staging, commits, pushes, review state, or secrets were modified or exposed.

## Scoped Final `/municipalities` GET-Only Parity Addendum — 2026-07-17

This addendum is limited to non-mutating parity verification requested for `/municipalities`; it does not change the overall blocked verdict above. Local API/web were launched with the ignored local environment, without printing environment values. The user-provided production-DB premise was honored. No POST, PUT, PATCH, DELETE, ingest, scheduler, cron, or control-plane operation was issued.

### Exact endpoint matrix

| Surface | Endpoint family | Result | Overview body hash | Cache-Control |
|---|---|---:|---|---|
| Local API | `http://127.0.0.1:3001/api/hydrology/municipalities*` | 18/18 dashboard GETs HTTP 200 | `sha256:303d1167b07fdcc79f34e178f2876facc443e03654f34ab07816d8c5b54b537c` | API omitted |
| Local web BFF | `http://127.0.0.1:3000/api/hydrology/municipalities*` | 18/18 dashboard GETs HTTP 200 | same | `no-store` |
| Production API | `https://agronauta.onrender.com/api/hydrology/municipalities*` | 18/18 dashboard GETs HTTP 200 | same | API omitted |
| Production web BFF | `https://www.agronauta.com.ar/api/hydrology/municipalities*` | 18/18 dashboard GETs HTTP 200 | same | `no-store` |

All four overview bodies have identical normalized content: contract `hydrology-government-municipalities-v1`, province `AR-W/Corrientes`, 18 municipalities, 20 telemetry rows, and the same sorted ID set:
`alvear, bella-vista, corrientes, empedrado, esquina, garruchos, goya, ita-ibate, itati, ituzaingo, la-cruz, monte-caseros, paso-de-la-patria, paso-de-los-libres, santo-tome, virasoro, yahape, yapeyu`.

### Dashboard payload parity

Each row below has the same normalized payload hash at all four surfaces (`local API`, `local BFF`, `production API`, `production BFF`); each had status `200`.

| Municipality | Normalized payload hash | Telemetry | INA forecasts | Alerts | Provenance |
|---|---|---:|---:|---:|---:|
| alvear | `sha256:6ea042cb1dfa28d0599e8dc4f83e57742c7656f4214615016567fcf0b9347f7f` | 1 | 0 | 0 | 4 |
| bella-vista | `sha256:7f3163dcc50d988c7f3cca98125f3d552f03df51f90f0eb550f23ff0503101c0` | 1 | 0 | 0 | 4 |
| corrientes | `sha256:7753f781b59ed8e1f1b64b59de2160f63c6a2f38ab1ea31e3bbf0d71ba917ebe` | 3 | 0 | 0 | 4 |
| empedrado | `sha256:79110d0378b280701fcf6144b9b776d7ca3ce0fe2890b8290c0420652d87152e` | 1 | 0 | 0 | 4 |
| esquina | `sha256:a5d3e89b6d05fced82f62fae77c3304b52c697bb0713e6dadea4ac4244f47f97` | 1 | 0 | 0 | 4 |
| garruchos | `sha256:531bae4101a647bae2c5c307505bba86a26b53e018cbabc987c0d694955db8ec` | 1 | 0 | 0 | 4 |
| goya | `sha256:527dfbdf48bedb6451da9974e8ce1bc58a89a34f402c281a9266b126233a2874` | 1 | 0 | 0 | 4 |
| ita-ibate | `sha256:a88812ee48fe979f39aaf03d9de2b63d53377fd7c2500ea73bbb11c92930ba08` | 1 | 0 | 0 | 4 |
| itati | `sha256:bc106c8f9811e1f17afc8458131ee86b79d61d4a3c3c776e31a876f158bd34e4` | 1 | 0 | 0 | 4 |
| ituzaingo | `sha256:64778cab51e8c0921b686eb05b838501adb4475c3caec483c06ee14e1d0227a4` | 1 | 0 | 0 | 4 |
| la-cruz | `sha256:354da491ed45140efa781a8e3fd73310652106d0b616a44df15691fb42c14b49` | 1 | 0 | 0 | 4 |
| monte-caseros | `sha256:046da0bbe21a5f059a323ed43a88b8e110e2539cabc16a93c457dd5ba31b8a61` | 1 | 0 | 0 | 4 |
| paso-de-la-patria | `sha256:58893b710c8c5f192d5439a82a7a81fbed99760268cea931c6244138ce5bc353` | 2 | 0 | 0 | 4 |
| paso-de-los-libres | `sha256:dd9709b959fc0d5c5184041550c184431ee176dc45c0fe11d3481103880ff644` | 1 | 0 | 0 | 4 |
| santo-tome | `sha256:239c6ac2cecf590f6ddb5f72099047fa4213ab06476672e5e9bcafe960acc538` | 1 | 0 | 0 | 4 |
| virasoro | `sha256:1aac8f0ccba2b78cef92aa9c1beacdadce684dbfe3d3c0a3d6e0c45b86b55cdf` | 1 | 0 | 0 | 4 |
| yahape | `sha256:85c5cf1bb9c9996c7d1963212c5a33b6a5a770e7ceea4ab9165a6f5a9b13099d` | 0 | 0 | 0 | 4 |
| yapeyu | `sha256:fc6d98184acb52677facef80d525f0b1275d6e4570ab343704e061dbcf3afaa8` | 1 | 0 | 0 | 4 |

### Freshness/source matrix

The overview and every dashboard preserved the same classifications: `PNA=fresh` with last-success metadata, `INA=fresh` with last-success metadata only where telemetry exists, and `INMET=degraded` / `SMN=degraded` with no last-success timestamp. `corrientes` additionally contains one fresh INA telemetry card; `yahape` has no telemetry and all four provenance entries are degraded. This is data/environmental degradation, not a parity or code-path mismatch.

### Browser/UI parity

Playwright rendered local and production `/municipalities` with the same title, heading, `18 localidades`, 18 municipality cards in the same content order, and visible source cards `PNA`, `INA`, `INMET`, `SMN` with matching labels. The Corrientes dashboard rendered identically at both surfaces: 3 telemetry cards, 4 provenance cards, 0 alerts, 0 INA forecast rows, and the expected degraded-source status text. Browser BFF requests were GET 200 at both web origins. Production and local each emitted only a non-sensitive `favicon.ico` 404 on the overview page; the Corrientes detail page emitted no console errors.

### BFF error parity

Read-only unknown-municipality dashboard GETs returned the same structured `404 INVALID_CONTRACT / Municipio no encontrado` at API and BFF surfaces. Unknown hydrology-route GETs returned the same structured `404 NOT_FOUND / Route not found`; BFF responses added `Cache-Control: no-store` and preserved the upstream status/body. No token or secret was used or printed.

### Scoped verdict

**PASS — `/municipalities` parity.** No root-cause defect was found in municipality IDs/count, source/freshness telemetry, dashboard payloads, BFF success/error behavior, or browser rendering. The only observed warning is the pre-existing favicon 404. No `sdd-apply` or `sdd-ff` follow-up is recommended for this scoped parity result.

## Current Local All-Provider Verification Addendum — 2026-07-17

This independent verify run used the current local working tree and the configured remote/production database. It made one bounded ingest attempt per source, performed no retry, deploy, commit, push, review, rollback, or token output, and preserved the existing overall report verdict.

| Source | Provider evidence | Local API | Configured DB correlation | Result |
|---|---|---|---|---|
| PNA | `contenidosweb.prefecturanaval.gob.ar/alturas/`, HTTP 200, 733 ms, timeout 25,000 ms, attempt 1 | completed | success row, 9 records | PASS |
| INA | `alerta.ina.gob.ar/a5/getObservaciones`, HTTP 200, 506 ms, timeout 15,000 ms, fixed CSV series, attempt 1 per series | completed | success row, 37 records | PASS |
| INMET | `apiprevmet3.inmet.gov.br/avisos/rss`, HTTP 200, 920 ms, timeout 15,000 ms, 37-byte response, attempt 1 | completed with source failure | failed row, 0 records | BLOCKED: parser failure |
| SMN | `ssl.smn.gob.ar/feeds/CAP/rss_alertaCAP_nuevo_2026.xml`, HTTP 200, 522 ms, timeout 15,000 ms, attempt 1 | completed | success row, 120 records | PASS |

Evidence: `artifacts/hydrology-local-real-current-20260717.json`; `proofRunId=proof-20260717T155928Z`; `databaseTarget=remote`; `oneShotPerSource=true`; `retries=0`. The matrix is intentionally `passed=false` because strict all-local-pass requires all four sources to succeed.

### Current `/municipalities` rendering

Playwright `apps/web/tests/e2e/hydrology-government.spec.js` passed `1/1` against `http://127.0.0.1:3000/municipalities` using the same proof ID. It rendered 18 municipality cards and visible PNA, INA, INMET, and SMN source headings. The configured-DB overview returned HTTP 200 with 22 mapped telemetry rows: PNA 19, INA 3, INMET 0, SMN 0; PNA/INA had fresh timestamps, while INMET/SMN were explicitly rendered unavailable/degraded. No `offline-fixture://` leakage was observed. Browser evidence: `artifacts/hydrology-municipalities-local-browser-evidence.json` and `artifacts/hydrology-municipalities-local.png`.

### SMN historical comparison

The current SMN URL and timeout are unchanged from the successful local proof: `ssl.smn.gob.ar/feeds/CAP/rss_alertaCAP_nuevo_2026.xml` with the shared 15,000 ms client timeout. The successful 2026-07-15 proof recorded HTTP 200 in 1,067 ms with the same path/timeout and 117 records; the current proof recorded HTTP 200 in 522 ms and 120 records. The current INA-only working-tree diff does not alter SMN code. The earlier timeout is therefore classified as transient provider/network variance, not an SMN code regression. Historical restoration is not justified.

### Verification commands

- Hydrology-engine focused tests: exit 0, 27/27 passed.
- API route/verifier focused tests: exit 0, 48/48 passed.
- Playwright local municipalities test: exit 0, 1/1 passed.
- `pnpm build`: exit 0, 4/4 build tasks passed; one pre-existing unused-`React` warning.

### Current verdict

**FAIL / BLOCKED for strict all-local-pass.** The exact current blocker is INMET: the official endpoint returned HTTP 200 but only a 37-byte payload that the current RSS parser rejected (`parse_failure`), yielding zero records and a failed correlated ingestion row. A targeted `sdd-apply` is justified for bounded INMET payload diagnosis/compatibility and regression coverage; no SMN restoration or INA rollback is justified.

## Current Combined INA CSV + INMET Compatibility Verification — 2026-07-17

This scoped verification covers the current unstaged INA CSV standardization and INMET no-alert compatibility changes only. It does not reopen or alter the earlier production-operator verdict above. No application source, configuration, deployment, review, commit, push, or database schema files were changed by verification; the existing runtime evidence artifacts and this existing verify report were the only report/evidence outputs refreshed.

### Strict Verification Envelope (Current Code Slice)

| Check | Result | Evidence |
|---|---|---|
| INA tasks | PASS | `ibera-alerta-ina-csv-standardization/tasks.md`: 12/12 complete; apply-progress and TDD evidence present |
| INMET compatibility | PASS | Exact no-alert, Unicode-normalized no-alert, and unexpected-HTTP-200 preservation tests pass; apply-progress TDD evidence present |
| Focused tests | PASS | `pnpm --dir packages/hydrology-engine exec node --import tsx --test src/clients/http-clients.test.ts`; exit 0; 12/12 passed; output hash `sha256:a65e9c82f3bd7ac7c060ed55489ff6a7eaaca8bba514044d01a85bb24981e252` |
| Full tests | PASS | `pnpm test`; exit 0; API 166/166 passed; Turborepo 6/6 successful; output hash `sha256:da1aad3ecf8d73d5662b7ccc62543498e503e9da57d5d9a5c0389d403cc0c26c` |
| Build | PASS | `pnpm build`; exit 0; Turborepo 4/4 successful; output hash `sha256:75b1a7b295df8acd9c7ce6e83c6dae425f33210f5a4cae28960ad501b6b5613b` |
| Local all-provider flow | PASS | `proof-20260717T203215Z`; one attempt/source, retries 0, configured remote DB; output hash `sha256:c2ac994f1acb39738baec3084250031c9008a6020c352e548712504e105b2b82` |
| Local browser flow | PASS | Existing Playwright test 1/1; current proof-bound output hash `sha256:a93c085ebf3089af4ef216ac3f875db54ffc90beb062ef70d72a536920a44263` |

### Bounded Local Provider and Database Proof

| Source | Provider | Attempts | Records | DB status | Result |
|---|---|---:|---:|---|---|
| PNA | HTTP 200 | 1 | 9 | one correlated row, `status=success` | PASS |
| INA | HTTP 200 | 1 per fixed series | 38 | one correlated row, `status=success` | PASS |
| INMET | HTTP 200 | 1 | 100 | one correlated row, `status=success` | PASS |
| SMN | HTTP 200 | 1 | 120 | one correlated row, `status=success` | PASS |

Proof file: `artifacts/hydrology-local-real-current-20260717.json`. It records `oneShotPerSource=true`, `retries=0`, `databaseTarget=remote`, and `passed=true`; no credentials or connection strings are present.

### `/municipalities` API, BFF, and Browser Evidence

Both local API and local web BFF returned HTTP 200 with 18 municipalities. API/BFF source ordering and state were identical: `PNA=fresh`, `INA=fresh`, `INMET=degraded`, `SMN=degraded`; the latter two correctly render `Fuente oficial no disponible`.

The current configured-DB payload mapped distinct live INA telemetry for all required municipalities:

| Municipality | INA station/series | Value | Observed at |
|---|---|---:|---|
| Corrientes | `6764` | `3.17 m` | `2026-07-17T18:00:00.000Z` |
| Paso de los Libres | `33988` | `1.55 m` | `2026-07-17T15:00:00.000Z` |
| Bella Vista | `38469` | `2.03 m` | `2026-07-17T15:00:00.000Z` |

The bounded Playwright browser proof rendered `Corrientes`, `Paso de los Libres`, and `Bella Vista`, the `INA ·` telemetry label, and all source headings `PNA`, `INA`, `INMET`, and `SMN`. It also verified source-state text and refreshed `artifacts/hydrology-municipalities-local-browser-evidence.json` with the current proof ID.

### Fixture and Secret-Leak Inspection

- INA fixtures contain only synthetic/headered or synthetic/headerless CSV rows for the three required series.
- Current runtime and browser evidence contains no `offline-fixture://` telemetry.
- No token, bearer credential, `DATABASE_URL` value, PostgreSQL connection string, or secret-bearing URL was found in current source/evidence outputs. The only `DATABASE_URL` matches are explanatory `not_run` text.
- `git diff --check` passed (exit 0).
- Coverage tooling was not configured; changed-file coverage is therefore not available.

### Scoped Verdict and Publish Readiness

**PASS — current combined INA CSV + INMET compatibility code slice.** Focused/full tests, build, one-shot all-provider runtime proof with correlated DB statuses, API/BFF parity, and browser rendering all passed. The code slice is publish-ready from a functional verification standpoint.

The earlier overall production-stability change remains **FAIL/BLOCKED** for its separate O.1–O.4 Render/cron/authenticated-production evidence and missing review transaction. This verification did not start review, deploy, commit, push, or publish any changes.
