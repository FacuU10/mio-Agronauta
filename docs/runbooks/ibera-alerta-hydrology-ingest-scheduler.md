# Iberá-Alerta Hydrology Ingest and Operator Proof Runbook

This runbook operates the owner-selected direct Render `scheduler:once` hydrology path, preserves source-level degradation, and produces one bounded redacted receipt. It does not replace a Render execution record or invent production evidence.

## Quick path

1. Confirm health and readiness through the path being operated before touching ingest. For the public web origin, use `GET /api/agronautas/health` and `GET /api/agronautas/ready`; bare `/health` and `/ready` are not public web routes.
2. Let Render run exactly the authoritative command `pnpm --dir apps/api scheduler:once -- --render-cron`; do not substitute an HTTP POST.
3. Correlate the Render execution record and direct-run `proofRunId`/`runId` values to `hydrology_ingestion_runs` with one read-only query after terminal completion.
4. Save only the redacted operator receipt described below; never save a token, secret value, raw chat, or repeated probe output.

## Current production status

**Status: `blocked` for live proof.** The owner selected the direct `scheduler:once` model. The checked-in `render.yaml` command is authoritative and resolves to the existing API package script, but no Render execution, deployment revision, provider authorization, identity, or read-only production DB correlation is available. No production execution is claimed; the execution cell is `not_run` and the release remains blocked.

Local evidence and production evidence MUST remain separate. Missing capabilities are reported as `blocked` or `not_run`, never as inferred success.

## Local command boundary

Before API/web proof, the operator must supply API, Postgres/PostGIS, Redis, and worker endpoints/processes through environment variables or a process manager. There is no hidden infrastructure launcher. Readiness and real service calls determine the result; missing or unreachable services stop dependent checks and remain `blocked` or `not_run`.

When starting the thin package delegates separately, use these exact commands:

```bash
cd backend && pnpm run dev
cd frontend && pnpm run dev
```

Run additive migrations and verify `/health` versus `/ready` before any proof step. The API and web commands do not create, own, or bypass the required env-backed services.

## Render configuration contract

The manifest makes the following production boundaries explicit without embedding secret values:

| Boundary | Required Render configuration | Failure meaning |
|---|---|---|
| API liveness/readiness | `healthCheckPath: /health`; operator gate `/ready`; `AGRONAUTAS_RUNTIME_REQUIRED=true`; `AGRONAUTAS_READINESS_DEPENDENCY_TIMEOUT_MS=5000`; `AGRONAUTAS_WORKER_HEARTBEAT_MAX_AGE_SECONDS=180` | `/health` proves process liveness only. `/ready` must fail closed when Postgres, Redis, migrations/PostGIS, or the worker heartbeat is unavailable/stale. |
| API authentication | `AGRONAUTAS_AUTH_ENABLED=true`; `HYDROLOGY_INGEST_TOKEN` and provider credentials supplied by named references | Missing/invalid auth is `blocked`; no token value may appear in a receipt or log. |
| Proxy trust | `TRUST_PROXY=1` and `RENDER=true` for the known Render hop | Do not trust arbitrary forwarded headers or use `TRUST_PROXY=false` in production. |
| API origin/CORS | `CORS_ORIGINS` supplied by named environment reference and limited to approved exact origins | Localhost or an invalid origin blocks production composition. |
| Web internal proxy | `AGRONAUTAS_API_INTERNAL_URL` supplied by named reference and non-local; `AGRONAUTAS_BFF_BEARER_TOKEN` remains server-only | Missing, invalid, or localhost upstream is `blocked`; browser requests never receive the bearer token. |
| Request timeouts | `AGRONAUTAS_BFF_TIMEOUT_MS=60000`; readiness timeout remains bounded at 5000 ms; provider/runner timeouts remain bounded by their existing contracts | Timeout is an explicit `blocked`/retryable outcome, not an implicit infinite wait. |
| In-process schedulers | `HYDROLOGY_SCHEDULER_ENABLED=false`; `AGRONAUTAS_SCHEDULER_ENABLED=false` | Render Free must have one external scheduler decision, not multiple competing schedulers. |
| Environment boundary | `NODE_ENV=production`, `AGRONAUTAS_RUNTIME_MODE=real`, `AGRONAUTAS_FORCE_ENV_VALIDATION=true` | Local defaults, demo mode, or missing production variables cannot silently pass launch review. |

Every secret remains a named `sync: false` environment reference in `render.yaml`. Never replace a reference with a literal token, credential, credentialed URL, database string, or provider payload.

## Render Cron decision gate

The owner-selected model is **direct `scheduler:once`**. The HTTP POST model below remains a rejected, unselected alternative and is `not_run`; it is not equivalent evidence. Static selection is not live execution proof.

### Authoritative direct `scheduler:once` contract

| Contract field | Required owner decision and evidence |
|---|---|
| Schedule | One Render Cron schedule, declared as `0 * * * *`; both in-process schedulers remain disabled and duplicate Cron schedules must be disabled before enablement. |
| Auth/permission boundary | The Cron process uses the fixed `HYDROLOGY_CRON_OWNER_ID` and named runtime secret references, including `HYDROLOGY_INGEST_TOKEN` required by the existing runner configuration. It invokes the runner directly: no HTTP POST and no `x-hydrology-ingest-token` header is sent to the API or worker. Values never enter docs, history, logs, or receipts. |
| Idempotency key | Existing scheduler metadata derives `scheduledSlot` per source; the effective replay key is `ownerId + scheduledSlot`, with `runId=scheduled-${scheduledSlot}` and one shared `proofRunId`. Repeated execution must not create duplicate terminal rows. |
| Timeout | Existing runner/provider bounds are mandatory and must remain bounded. Timeout is recorded as `failed`/`blocked` and never becomes success on process exit. |
| ID propagation | Preserve the Render `executionId`, generated safe `proofRunId`, per-source `runId`, and any emitted `requestId`/`jobId`. This direct path has no HTTP request or worker queue job; absent `requestId`/`jobId` are explicitly `not_run`/not applicable, never invented. |
| Completion | The runner reaches terminal per-source outcomes (`completed`, `partial`, or `failed`) and durable completion is checked once. This path has no HTTP `202`; a successful process exit without durable completion is not success. |
| DB correlation | One read-only query must find exactly one expected row per source by `proofRunId`/`runId`, source, terminal status, and counts; store safe row identifiers only. |
| Failure/rollback | Provider/auth/timeout/duplicate/worker/migration/DB failure keeps evidence `failed`, `blocked`, or `not_run`; disable the Cron before retrying and revert only this configuration/runbook slice, never reset or delete database/audit data. |
| Evidence | `pass` means only a validated static contract or completed redacted boundary. Missing Render/deployment/provider/identity/DB access is `blocked` or `not_run`. Tokens, DSNs, credentialed URLs, raw payloads/chat, and stack traces are forbidden. |

### Rejected authenticated HTTP POST alternative (not selected)

| Contract field | Required owner decision and evidence |
|---|---|
| Schedule | Not active; one approved scheduler would invoke the canonical path once per window. |
| Auth | Rejected for this deployment. The request would send `x-hydrology-ingest-token` from a named reference to `POST /api/hydrology/ingest`; no browser token or literal value is used. |
| Idempotency | `proofRunId` and the API coordinator/lease prevent duplicate terminal ingestion for the same scheduled window. |
| Timeout | The request and one bounded `statusPath` observation have explicit limits; `202` without terminal completion remains blocked. |
| IDs | Receipt records scheduler execution ID, API `requestId`, `proofRunId`, run/job IDs when returned, and deployment revision. |
| Completion | Rejected alternative only. Its `202` acknowledgement would require one terminal `statusPath` observation; that evidence cannot substitute for direct-run completion. |
| DB correlation | Read-only query finds exactly the rows for the proof/run ID and matching source/count outcomes; store safe row identifiers only. |

No document may silently convert the rejected HTTP POST alternative into an active path. The direct model is selected, but release readiness remains `blocked` until its exact Render execution and receipt are live-proven.

## Boundary matrix and reporting

`pass` below means the static contract or an explicitly completed evidence step passed. It never means that an unavailable runtime was inferred to be healthy.

### Local evidence (separate bundle)

| Boundary | Status | Reason/evidence to retain |
|---|---|---|
| Exact command/config contract | `pass` | The required local command names, service ownership, and secret-free configuration rules are statically validated. |
| Postgres/PostGIS, Redis, worker heartbeat | `blocked` | Env-backed service endpoints/processes or a live worker heartbeat were unavailable; downstream checks stop. |
| API liveness/readiness and migrations | `not_run` | Run only after the required dependency cell is `pass`. |
| Real BFF/browser route matrix | `not_run` | Capture route, viewport, request/revision IDs, console/network, and screenshots only in the local bundle. |
| Providers, auth, tenant, lead, authorized ingest | `blocked` | Requires real approvals, credentials, identities, and durable correlation. |

### Production evidence (separate bundle)

| Boundary | Status | Reason/evidence to retain |
|---|---|---|
| Render static manifest | `pass` | Required health paths, auth/readiness/proxy/origin/timeout settings, and named secret references are present; no live claim follows. |
| Deployed revision and API/web readiness | `not_run` | Requires authorized Render access, revision identity, and direct/BFF probes. |
| Worker/Redis/Postgres/migration completion | `not_run` | Requires a live worker transition and read-only database correlation. |
| Provider/auth/tenant/lead/ingest | `blocked` | Owner credentials, identities, approvals, and write authorization are not available in this documentation slice. |
| Cron model/configuration | `pass` | Direct `scheduler:once` is selected and the manifest command resolves to the existing API package script; static evidence only. |
| Cron execution/completion/DB correlation | `not_run` | No Render execution ID, deployment revision, provider/identity authorization, worker proof, or read-only production DB access exists. |

Do not merge or relabel these bundles. A `pass` in one scope cannot upgrade `blocked` or `not_run` in the other scope.

## Authenticated HTTP POST candidate contract (rejected and not selected)

Render Free web services sleep. Keep the in-process scheduler disabled. Do not configure this rejected HTTP path; the active Cron invocation is the direct command in `render.yaml`.

| Setting | Required value or rule |
|---|---|
| `HYDROLOGY_SCHEDULER_ENABLED` | `false` on Render; no application worker scheduler |
| Schedule | `0 * * * *` or slower; never more often than hourly |
| Method | `POST` |
| Canonical path | `/api/hydrology/ingest` |
| Body | `{ "contractVersion": "1.0.0", "reason": "external-cron-hourly", "proofRunId": "<operator-generated-id>" }` |
| Required headers | `Content-Type: application/json`, `x-hydrology-ingest-token: <secret-manager reference>` |
| Cron count | One active schedule only; disable duplicates before enabling a replacement |

The Cron provider must store the token by secret reference, not as a pasted value in a document, command history, screenshot, or receipt. A configured schedule is not evidence that Cron ran.

## Secret and configuration inventory

Record names only. Values belong exclusively in the deployment secret manager.

| Name | Owner | Receipt treatment |
|---|---|---|
| `HYDROLOGY_INGEST_TOKEN` | API + direct Cron runner configuration | Record the name only; never the value or an HTTP header |
| `GROQ_API_KEY` | API Copilot | Record configured/unconfigured and `groq`/`degraded-fallback`; never the value |
| `DATABASE_URL` | API/PostgreSQL operator | Use only for migration/read-only row correlation; never record the value |
| `AGRONAUTAS_API_INTERNAL_URL` | Web BFF | Record origin/revision only; production must not point to localhost |
| `AGRONAUTAS_BFF_TIMEOUT_MS` | Web BFF | Record configured bounded value or default; maximum is 60 seconds |
| `HYDROLOGY_SCHEDULER_ENABLED` | API | Must be `false` for Render Cron operation |
| `TRUST_PROXY` / `RENDER` | API runtime | Configure only for the known proxy hop; do not trust arbitrary forwarded headers |

Provider overrides (`HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`) are optional. They must point to machine-readable official feeds. HTML, `403`, timeout, parse failure, or empty data remains a structured `failed` or `empty` source outcome; production never substitutes fixtures.

## Regional runner and BFF requirements

The regional runner/proxy must:

- Egress only to the configured API origin and the approved provider hosts.
- Allow the canonical `POST /api/hydrology/ingest` path and the read-only completion path returned as `statusPath`.
- Forward `Content-Type`, `Accept`, and `x-request-id`.
- Forward `x-hydrology-ingest-token` only for the protected ingest and `/ingest/verify` POST paths.
- Never forward or log the token on municipality, health, ready, dashboard, or Copilot requests.
- Preserve the API `202` response, `x-request-id`, `proofRunId`, `statusPath`, and per-source result shape.
- Use `AGRONAUTAS_API_INTERNAL_URL` as a non-local origin in production. The production BFF rejects missing, invalid, or localhost upstream configuration.
- Treat BFF `401` as authorization failure and `502`/`503` as explicit upstream degradation; do not retry automatically during proof capture.

The web BFF path is `/api/hydrology/*`. The UI path is `/municipalities`; the BFF municipality request must remain usable without an ingest token. Copilot may report explicit degraded fallback when `GROQ_API_KEY` is unavailable; that is not production Groq proof.

## Safe one-shot operator commands

Run with shell tracing disabled. Replace placeholders with deployment values without writing those values into this repository.

```bash
set +x
export API_ORIGIN='https://<api-host>'
export WEB_ORIGIN='https://<web-host>'
export REQUEST_ID="ibera-operator-$(date -u +%Y%m%dT%H%M%SZ)"
export PROOF_RUN_ID="ibera-proof-$(date -u +%Y%m%dT%H%M%SZ)"
```

### Health, readiness, BFF, UI

For a known direct API origin, use its root `/health` and `/ready` routes. When only the public web origin is available, the canonical GET-only health and readiness probes are the Agronautas BFF routes below; do not infer a direct API host from a `404` at the web origin's bare `/health` or `/ready`.

```bash
curl --fail-with-body --silent --show-error "$API_ORIGIN/health"
curl --fail-with-body --silent --show-error "$API_ORIGIN/ready"
curl --fail-with-body --silent --show-error "$WEB_ORIGIN/api/agronautas/health"
curl --fail-with-body --silent --show-error "$WEB_ORIGIN/api/agronautas/ready"
curl --fail-with-body --silent --show-error \
  -H "x-request-id: $REQUEST_ID" \
  "$WEB_ORIGIN/api/hydrology/municipalities"
curl --fail-with-body --silent --show-error "$WEB_ORIGIN/municipalities"
```

Expected: health `200`; ready `200` with required checks healthy (optional Mongo degradation is acceptable); BFF and UI return the canonical municipality view. Do not treat a later page load as ingest proof.

### Rejected HTTP POST candidate through the API — do not run for the selected contract

`HYDROLOGY_INGEST_TOKEN` must already be injected by the operator environment or Cron secret manager. The command below makes one request and does not print the token.

```bash
ACK_JSON="$(curl --fail-with-body --silent --show-error \
  --request POST "$API_ORIGIN/api/hydrology/ingest" \
  -H 'Content-Type: application/json' \
  -H "x-request-id: $REQUEST_ID" \
  -H "x-hydrology-ingest-token: $HYDROLOGY_INGEST_TOKEN" \
  --data "{\"contractVersion\":\"1.0.0\",\"reason\":\"external-cron-hourly\",\"proofRunId\":\"$PROOF_RUN_ID\"}")"
printf '%s\n' "$ACK_JSON" | jq '{contractVersion,status,proofRunId,statusPath,requestedSources}'
STATUS_PATH="$(printf '%s' "$ACK_JSON" | jq -r '.statusPath // empty')"
test -n "$STATUS_PATH"
curl --fail-with-body --silent --show-error \
  -H "x-request-id: $REQUEST_ID" \
  "$API_ORIGIN$STATUS_PATH?waitMs=60000" \
  | jq '{contractVersion,status,proofRunId,results:[.results[] | {source,status,recordsIngested,diagnostic}]}'
```

Expected acknowledgement: HTTP `202`, `contractVersion: hydrology-government-ingest-v1`, matching `proofRunId`, and a valid `statusPath`. The completion may be `completed`, `partial`, or `failed` when provider degradation is real; each source must remain independently represented.

### Rejected HTTP POST candidate through the regional BFF — do not run for the selected contract

Use this instead of the API-origin command when the regional runner is the path under proof. Do not run both as production proof.

```bash
ACK_JSON="$(curl --fail-with-body --silent --show-error \
  --request POST "$WEB_ORIGIN/api/hydrology/ingest" \
  -H 'Content-Type: application/json' \
  -H "x-request-id: $REQUEST_ID" \
  -H "x-hydrology-ingest-token: $HYDROLOGY_INGEST_TOKEN" \
  --data "{\"contractVersion\":\"1.0.0\",\"reason\":\"regional-runner-hourly\",\"proofRunId\":\"$PROOF_RUN_ID\"}")"
printf '%s\n' "$ACK_JSON" | jq '{contractVersion,status,proofRunId,statusPath,requestedSources}'
```

Expected: HTTP `202` from the BFF, the same safe response shape, and an API-side request log containing only the request ID, upstream origin/path, and forwarded-header names. A BFF `401` must not start ingestion.

### Read-only row correlation

Run once after the completion observation. The command reads only the rows for the chosen proof ID and does not print `DATABASE_URL`.

```bash
psql "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -v proof_run_id="$PROOF_RUN_ID" \
  -c 'SELECT id::text, proof_run_id, source, status, records_ingested, started_at, finished_at
        FROM hydrology_ingestion_runs
       WHERE proof_run_id = :'"'"'proof_run_id'"'"'
       ORDER BY started_at DESC;'
```

The row correlation is valid only when each selected row has the requested `proofRunId`, its source matches the response, and `records_ingested` matches the response result. Store row IDs and statuses only.

## Redacted operator receipt contract

The executable contract is `hydrologyOperatorReceiptSchema` in `packages/zod-schemas/src/agronautas.ts`, versioned as `ibera-alerta-operator-v1`. It is strict: unknown fields such as token values, `DATABASE_URL`, `GROQ_API_KEY`, stack traces, raw chat, or request bodies cause validation failure.

```json
{
  "verifier": "ibera-alerta-operator-v1",
  "evidenceScope": "local | production",
  "capturedAt": "ISO-8601",
  "runtime": {
    "service": "agronautas-api",
    "revision": "redacted revision identifier",
    "config": {
      "schedulerEnabled": false,
      "secretNames": ["HYDROLOGY_INGEST_TOKEN", "GROQ_API_KEY", "DATABASE_URL"],
      "regionalRunner": { "mode": "direct | proxy", "allowlisted": true }
    }
  },
  "request": {
    "requestId": "safe request ID",
    "method": "POST",
    "path": "/api/hydrology/ingest",
    "acknowledgementStatus": 202,
    "responseShape": {
      "contractVersion": "hydrology-government-ingest-v1",
      "status": "completed | partial | failed",
      "proofRunId": "safe proof ID",
      "hasStatusPath": true,
      "resultCount": 4
    }
  },
  "sourceOutcomes": [{ "source": "PNA", "status": "success", "recordsIngested": 1, "attempts": 1 }],
  "rowCorrelation": [{ "rowId": "redacted-or-approved-row-id", "source": "PNA", "proofRunId": "safe proof ID", "status": "success", "recordsIngested": 1, "correlated": true }],
  "chat": { "mode": "groq | degraded-fallback | not_run", "status": "completed | degraded | not_run", "eventTypes": ["metadata", "token", "done"], "rawContentIncluded": false },
  "passed": true
}
```

Production and local receipts are separate. A local receipt must never be relabeled as production. `groq` is valid only when the operator actually ran one bounded real stream with configured access; otherwise use `degraded-fallback` or `not_run`.

## Migration and rollback evidence

The A1 migration is additive and must be applied before the coverage seed. Run these commands in the target environment with `DATABASE_URL` injected by the operator:

```bash
pnpm --dir apps/api exec prisma migrate status
pnpm --dir apps/api exec prisma migrate deploy
pnpm --dir apps/api exec tsx src/infrastructure/database/postgres/seed-municipality-alert-coverage.ts
```

Verify the seed is repeatable by running the seed command once per approved operator window and recording only inserted/updated counts. Never use `prisma migrate reset` against a shared or production database.

Rollback preserves telemetry: first disable the projection release, then deactivate only the coverage rows with the approved seed version.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "UPDATE municipality_alert_coverage
          SET active = false, updated_at = now()
        WHERE seed_version = 'municipality-alert-coverage-v1'
          AND active = true;"
```

After the update, one municipality response must show `officialAlerts: []` while PNA/INA telemetry remains available. Do not drop the additive table until the API/UI projection has been disabled and a database backup/rollback owner has approved the destructive step.

## Local evidence

Local evidence is not production evidence. With a local API and the approved local/remote-like database configuration, run exactly one bounded all-source matrix:

```bash
pnpm --dir apps/api exec tsx src/scripts/verify-hydrology-local-real.ts \
  --all-sources --allow-empty \
  --out ../../artifacts/hydrology-local-real-b2.json
```

The matrix must retain `oneShotPerSource: true`, `retries: 0`, safe provider HTTP summaries, local `202`/completion correlation, and read-only row evidence when `DATABASE_URL` is available. Production cells remain `not_run` unless a separately authorized operator executes the production commands above.

### Real database-backed browser proof is opt-in

The Playwright suite skips the real hydrology page test unless `HYDROLOGY_REAL_E2E=true`. This prevents a normal local test run from silently reading a configured external database or treating a pending migration as a product failure. The current database status must be checked first; the coverage migration must be applied before enabling this test.

```bash
pnpm --dir apps/api exec prisma migrate status
HYDROLOGY_REAL_E2E=true pnpm --dir apps/web exec playwright test --workers=1 tests/e2e/hydrology-government.spec.js
```

When running the complete opt-in suite against the shared configured database, use `--workers=1` to avoid concurrent local server/database races. The opt-in command is not production evidence. It may run only with an authorized runtime and read-only proof access; otherwise leave the test skipped and use the manual operator receipt path.

## Production blocker and handoff

If any of the following is unavailable, stop before production calls and mark the corresponding receipt fields `not_run`: Render Cron execution record, deployment revision, provider/identity authorization, read-only `DATABASE_URL`, worker completion, or configured direct-run dependencies. Mark the release `blocked`; do not claim production execution.

The operator action is: capture one Render `executionId`, run the exact direct command selected in `render.yaml`, preserve its safe `proofRunId`/`runId` values and any available `requestId`/`jobId`, verify terminal durable completion once, run the read-only row query, and validate only the redacted JSON with the applicable receipt schema. Until those inputs exist, retain `pass` for static contract only and `blocked`/`not_run` for unavailable runtime cells.
