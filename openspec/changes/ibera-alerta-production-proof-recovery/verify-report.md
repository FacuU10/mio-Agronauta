schema: gentle-ai.verify-result/v1
verdict: fail
status: BLOCKED
requirements: 1/3
scenarios: 4/6
tasks: 15/20 complete
strict_tdd: true
authority_only_failure: false
substantive_failure: true
command_failed: false
test_command: pnpm test
test_exit_code: 0
test_output_hash: sha256:f1ab6bee9a1063caadf0cca97c50f6baa50cb30da41e548b82b696b240136613
build_command: pnpm build
build_exit_code: 0
build_output_hash: sha256:172fe0c0738c002f4be31949a2ed27bb4ea75926ede7628315904b87328b8d56
persistence: hybrid

# Verification Report — Iberá-Alerta Production Proof Recovery

**Verified:** 2026-07-15, fresh independent local runtime evidence plus bounded post-deploy production smoke.
**Scope:** Current apply-progress/spec/task boundary. Auth remained untouched.

## Verdict

**FAIL / BLOCKED.** Local proof passes. Post-deploy production proof is absent, so this change is not ready, production-ready, or archivable.

## Exact local evidence

| Layer | Result | Exact evidence |
|---|---|---|
| Provider/API/DB matrix | PASS | `artifacts/hydrology-local-real-matrix.json`; `proofRunId=proof-20260715T072127Z`; started `2026-07-15T07:21:30.932Z`, finished `2026-07-15T07:22:20.443Z`; `databaseTarget=remote`; `oneShotPerSource=true`; `retries=0`. |
| PNA | PASS | HTTP `200` `contenidosweb.prefecturanaval.gob.ar/alturas/`, attempt `1`, 9 records; DB row `a7c43e26-3d9f-4693-96cc-a6f51842213f`, proof-correlated; local API `202`. |
| INA | PASS | HTTP `200` `alerta.ina.gob.ar/a5/obs/puntual/series/38469`, attempt `1`, 3 records; DB row `6241f9d1-588e-46b4-b26c-8e227892bc6d`, proof-correlated; local API `202`. |
| INMET | PASS | HTTP `200` `apiprevmet3.inmet.gov.br/avisos/rss`, attempt `1`, 93 records; DB row `7beabd64-1d89-4df6-865a-532ec767d7cd`, proof-correlated; local API `202`. |
| SMN | PASS | HTTP `200` `ssl.smn.gob.ar/feeds/CAP/rss_alertaCAP_nuevo_2026.xml`, attempt `1`, 94 records; DB row `73687565-de8d-40db-b3fb-397de50e1195`, proof-correlated; local API `202`. |
| Local browser | PASS | `artifacts/hydrology-municipalities-local-browser-evidence.json`; same `proofRunId=proof-20260715T072127Z`; `http://127.0.0.1:3000/municipalities`; 18 municipalities; visible PNA/INA/INMET/SMN; screenshot `artifacts/hydrology-municipalities-local.png`; E2E `1/1`. |
| Fixture leakage | PASS | Fresh Playwright/API assertions found no `offline-fixture://`. |

## Direct ingest and scheduler proof

- Direct ingest was exercised by `pnpm verify-local` with no authorization header, one POST per source, four HTTP `202` responses, shared `proofRunId=proof-20260715T072127Z`, and zero retries. Output hash: `sha256:4ded04f3d4ca2f8068773d7ea0e354693720e083e827b822f67d94ffe5d30f18`.
- Route tests passed for request-ID precedence, unauthenticated contract behavior, overlap rejection (`429`), source independence, and safe failure diagnostics. Focused command exit `0`, output hash `sha256:d94cbd4bd4c6efcf818bef68f2ebf566e0fa57fe14693323c1d4c700b4207cbc` (`38/38`).
- Fresh scheduler receipt: `artifacts/hydrology-scheduler-local-receipt.json`; `proofRunId=scheduler-proof-20260715T080420Z`; the same `createGovernmentIngestionRunner` workflow invoked PNA/INA/INMET/SMN exactly once with `attempt=0`, `retry=null`, `skipped=false`, and inserted `9/4/93/94` records. Command exit `0`, output hash `sha256:2ad563814e68c5f9f2bde44cfa0169f3388216900cdab3cf5045bbae42bb47e6`.
- Scheduler focused tests passed overlap serialization and no-retry behavior (`HydrologyIngestionScheduler` tests), including an overlapping call returning `{ retry: null, skipped: true }` without a second runner call.

## INMET/SMN semantics

Fresh one-shot official RSS observations (`sha256:47cfd4bef3393ce5276f935702b408873747f97ae1944b407281bb75351d5c09`) showed INMET alert items such as “Aviso de Baixa Umidade” with severity and SMN CAP alert items such as “Lluvias” with alert descriptions. They are not municipality-specific rainfall observations. The adapters persist both as `metric=storm_alert`, `unit=alert`, `value=null`; the municipality overview excludes storm-alert telemetry from rainfall cards. The fresh local municipality API had no INMET/SMN municipality telemetry and no fixture URL; INA remained the numeric hydrometric source.

## Production gate

The bounded post-deploy smoke is recorded in `artifacts/hydrology-production-post-deploy-20260715.json` and remains **BLOCKED**:

- Production responded after a 15-second wait, but no response header exposed a commit; the live revision is not correlated to `4c5f4e4`.
- `GET /api/hydrology/municipalities` returned HTTP `200`, 18 municipalities, 20 telemetry rows, no fixture URLs, fresh PNA/INA, and degraded INMET/SMN with zero telemetry rows.
- Exactly one unauthenticated `POST /api/hydrology/ingest` was sent with `proofRunId=proof-20260715T141011Z`. It returned HTTP `503 HYDROLOGY_BFF_UPSTREAM_UNAVAILABLE` because `https://agronauta.onrender.com/api/hydrology/ingest` exceeded the 12,000 ms timeout. The response did not echo the proofRunId.
- A read-only remote DB query correlated one row per source to that proofRunId, with only counts and IDs recorded. This does not override the failed HTTP ingest gate.
- Real browser evidence passed at `/municipalities` (HTTP `200`, 18 cards); PNA/INA rendered `ACTUALIZADA`, while INMET/SMN rendered `NO DISPONIBLE` / `Fuente oficial no disponible`. Screenshot: `artifacts/hydrology-municipalities-production-post-deploy.png`.
- No production cron receipt or log existed; the existing local scheduler receipt was not counted as production evidence.

Production proof therefore exists as failure evidence, not acceptance evidence. This is a blocker, not a pass.

## Supplemental checks

| Command | Exit | Output hash |
|---|---:|---|
| `pnpm test` | 0 | `sha256:f1ab6bee9a1063caadf0cca97c50f6baa50cb30da41e548b82b696b240136613` |
| `pnpm build` | 0 | `sha256:172fe0c0738c002f4be31949a2ed27bb4ea75926ede7628315904b87328b8d56` |
| `pnpm --dir apps/api exec tsc --noEmit --pretty false` | 0 | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `pnpm --dir apps/web test:e2e -- tests/e2e/hydrology-government.spec.js` | 0 | `sha256:1fe67e50c86c7be89529bc104dd126c30ac57fd95455490db9945690edaa4c82` |

## Spec compliance matrix

| Requirement/scenario | Result | Evidence |
|---|---|---|
| Strict all-provider runtime proof | FAIL | All local source rows pass, but production API/DB/browser proof is absent. |
| All providers pass with correlated proof | FAIL | Local `proof-20260715T072127Z` is complete; production cells are `not_run`. |
| Missing/degraded proof blocks completion | PASS | Report remains `BLOCKED`; no readiness/archive claim made. |
| Bounded independent ingest and BFF recovery | FAIL | Local ingest/BFF/browser pass; no post-deploy production ingest proof exists. |
| Production timeout is observable | BLOCKED | No authorized post-deploy production ingest was run. |
| Local BFF 503 repaired | PASS | Local API/browser E2E passed with contract HTTP 200 and no fixture leakage. |
| Safe evidence handling/archive prohibition | PASS | One attempt/source, retries `0`, redacted summaries, read-only correlated DB evidence; archive remains prohibited. |
| Remote DB verification safe/current | PASS locally | Matrix records source-scoped proofRunId rows, row IDs/counts, and remote target without secrets. |
| Archive blocked until post-main proof | PASS | Production proof is explicitly absent and tasks `4.2`/`4.3` remain unchecked. |

## Task completeness

`15/20` task checkboxes are complete. Blocking prerequisites `0.1`/`0.2`, PR approval `4.2`, production deploy/smoke `4.3`, and rollback `4.4` remain incomplete. Auth files are absent from the changed-path set (`AUTH_PATHS=none`).

## Final status

```json
{
  "status": "fail",
  "checks": [
    { "criterion": "Fresh local PNA/INA/INMET/SMN provider, API, configured-remote-DB, and browser proof", "result": "pass", "evidence": "proof-20260715T072127Z; artifacts/hydrology-local-real-matrix.json" },
    { "criterion": "Bounded unauthenticated ingest and serialized no-retry scheduler", "result": "pass", "evidence": "focused API 38/38; scheduler-proof-20260715T080420Z; artifacts/hydrology-scheduler-local-receipt.json" },
    { "criterion": "INMET/SMN alert semantics are not represented as municipality rainfall", "result": "pass", "evidence": "fresh RSS observation plus metric=storm_alert/value=null and no municipality INMET/SMN telemetry" },
    { "criterion": "Post-deploy production proof exists", "result": "fail", "evidence": "proof-20260715T141011Z correlated in DB, but production ingest returned 503 upstream timeout and INMET/SMN rendered unavailable; artifact: artifacts/hydrology-production-post-deploy-20260715.json" },
    { "criterion": "Readiness/archive prohibition", "result": "pass", "evidence": "BLOCKED verdict; production tasks remain incomplete" }
  ],
  "next": "fixes-required"
}
```

## Correction Evidence — review-65761c6de5ad5b6e

The bounded correction addressed only frozen introduced findings. Proxy bearer privilege injection was removed without reintroducing bearer authorization; direct ingest remains tokenless but is capped at four requests per client per 60 seconds, one in-flight request per API instance, the four-value source enum, and one provider attempt per source. Runner seeding is memoized and SQL-idempotent. Repository writes now preserve a failed ingestion-run row after partial telemetry failure when the database still accepts writes. INA uses a rolling 24-hour window and isolates its three fixed series. INMET/SMN RSS extraction is bounded and namespace-safe. Municipal Copilot contexts are now schema-valid for supported zones and empty/degraded outside them.

| Correction | Evidence | Result |
|---|---|---|
| Tokenless ingest / proxy privilege | `apps/web/src/app/api/hydrology/[...path]/route.ts`, `apps/api/src/presentation/routes/hydrology-government.ts` | Bearer injection absent; direct route admission and overlap tests remain green. |
| Partial DB observability | `packages/hydrology-engine/src/repository.ts` | Failed run is attempted with partial inserted count before the original error is rethrown. |
| RSS safety | `packages/hydrology-engine/src/adapters/rss-parser.ts`, INMET/SMN adapters | Fixed scanners replace dynamic per-tag regexes; item counts stay capped. |
| INA resilience | `packages/hydrology-engine/src/clients/http-clients.ts` | Rolling window and continue-on-series-failure behavior are bounded to three official series. |
| Municipal Copilot context | route contract test and `hydrologyDenseContextV1Schema` | Mercedes context parses; unsupported municipality data is not attached to `zone: null`. |

**Correction delta:** 180 changed lines, budget `200`, remaining `20`. No secrets, auth implementation, deploy, commit, push, fixtures, or provider semantics were changed. Production cells remain `not_run`; this correction does not alter the existing `BLOCKED` verdict.

**Transaction mapping:** `lineage_id=review-65761c6de5ad5b6e`; `generation=1`; `fix_batch=frozen-introduced-concerns-1`; `failed_evidence_revision=review-resilience-risk-20260715`.

**Artifacts:** this report, `openspec/changes/ibera-alerta-production-proof-recovery/apply-progress.md`, and the source files listed in the apply-progress correction record. Full safety net: `pnpm test` passed 6/6 workspace tasks (API 143/143, web 31/31). **Risks:** process-local admission is not cross-node coordination; failed-run observability is best effort during total DB outage. **skill_resolution:** sdd-apply, global-mindset, typescript loaded from the exact paths recorded in apply-progress.
