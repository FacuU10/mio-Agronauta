# Iberá-Alerta Hydrology Ingest and Operator Proof Runbook

This runbook operates one authenticated hydrology ingest path, preserves source-level degradation, and produces one bounded redacted receipt. It does not replace a Render execution record or invent production evidence.

## Quick path

1. Confirm health and readiness through the path being operated before touching ingest. For the public web origin, use `GET /api/agronautas/health` and `GET /api/agronautas/ready`; bare `/health` and `/ready` are not public web routes.
2. Run exactly one authenticated `POST /api/hydrology/ingest` through the canonical API or regional BFF path.
3. Observe the returned `statusPath` once and correlate the returned `proofRunId` to `hydrology_ingestion_runs`.
4. Save only the redacted operator receipt described below; never save a token, secret value, raw chat, or repeated probe output.

## Render Free operating contract

Render Free web services sleep. Keep the in-process scheduler disabled and configure exactly one external Cron invocation.

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
| `HYDROLOGY_INGEST_TOKEN` | API + external Cron | Record the name only; never the value |
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

### One authenticated Cron call through the API

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

### One authenticated Cron call through the regional BFF

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

If any of the following is unavailable, stop before production calls and mark the corresponding receipt fields `not_run`: API/web origins, Render Cron execution record, deployment revision, read-only `DATABASE_URL`, regional allowlist confirmation, or configured Groq access.

The operator action is: execute one command path from this runbook, capture the external Cron execution ID plus the API `requestId`/`proofRunId`, observe completion once, run the read-only row query, and validate the redacted JSON with `hydrologyOperatorReceiptSchema`. Attach the redacted receipt and provider execution record to the final review/freeze/gates cycle.
