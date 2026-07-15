# Iberá-Alerta Hydrology Ingest Scheduler Runbook

## Render Free strategy

Render Free web services sleep, so keep the in-process scheduler disabled and use one external cron call instead.

Required envs:

- `HYDROLOGY_SCHEDULER_ENABLED=false`
- Optional provider overrides: `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`

Default current official feeds are PNA `https://contenidosweb.prefecturanaval.gob.ar/alturas/`, INA structured series, INMET `https://apiprevmet3.inmet.gov.br/avisos/rss`, and SMN CAP RSS `https://ssl.smn.gob.ar/feeds/CAP/rss_alertaCAP_nuevo_2026.xml`. Provider overrides must point to machine-readable official feeds when available. If an override or default endpoint returns HTML, `403`, times out, or cannot be parsed, the ingest contract must preserve the run as a structured source-level `failed` or `empty` diagnostic with `attempts: 1`; do not replace it with fixtures in production.

External cron:

- Cadence: hourly or slower (`0 * * * *`). Do not schedule PNA below 1 hour.
- Method: `POST`
- URL: `https://<api-host>/api/hydrology/ingest`
- Headers: `Content-Type: application/json`
- Body: `{ "contractVersion": "1.0.0", "reason": "external-cron-hourly" }`

Render's external cron is an invocation contract, not proof that a production cron fired. A production receipt requires the cron provider's execution record plus the returned `proofRunId` and the correlated `hydrology_ingestion_runs` row. Do not infer a successful cron execution from deployment logs, a configured schedule, or a later municipality response.

## Always-on environments

Set `HYDROLOGY_SCHEDULER_ENABLED=true` only where the API process stays awake. Startup creates timers only; it does not run an ingest immediately at boot.

The in-process scheduler is observable through its per-source run-result log: source, scheduled time, inserted/unchanged counts, and `skipped: true` for a same-source overlap. It has no retry or polling loop. This is operational visibility only; it does not substitute for an external-cron receipt on Render Free.

To capture a real local scheduler receipt through the same ingestion runner and configured production database, run once (no retry):

```bash
pnpm --dir apps/api scheduler:once --out ../../artifacts/hydrology-scheduler-local-receipt.json
```

The receipt contains a shared `proofRunId`, one event per source, provider result counts, and `retries: 0`. It is local evidence only; a hosted cron provider must supply its own execution receipt.

## Bounded verification

Local-real smoke against remote/prod-like DB: run exactly one all-source API call through local code and inspect the single structured response. Do not retry, poll, loop, or use mocks as proof.

```bash
pnpm --dir apps/api exec tsx src/scripts/verify-hydrology-local-real.ts --mode api --all-sources --out ../../artifacts/hydrology-local-real.json
```

Expected local-real evidence:

- `httpStatus` is `202` when the runner starts and providers fail/degrade per source.
- `response.results[]` includes PNA, INA, INMET, and SMN outcomes with safe diagnostics.
- `oneShot: true` and `repeatedCalls: false` are present in the saved JSON.
- `503` is acceptable only for true startup/config/database failure before source execution.

Production smoke after deploy: perform exactly one POST with the same body, plus one `GET /api/hydrology/municipalities`. `partial`, `failed`, or safe source diagnostics are acceptable when providers are degraded; repeated POSTs are not.
