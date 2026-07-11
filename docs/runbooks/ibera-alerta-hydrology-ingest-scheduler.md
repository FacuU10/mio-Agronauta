# Iberá-Alerta Hydrology Ingest Scheduler Runbook

## Render Free strategy

Render Free web services sleep, so keep the in-process scheduler disabled and use one external cron call instead.

Required envs:

- `HYDROLOGY_SCHEDULER_ENABLED=false`
- `HYDROLOGY_INGEST_TOKEN=<secret>`
- Optional provider overrides: `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`

External cron:

- Cadence: hourly or slower (`0 * * * *`). Do not schedule PNA below 1 hour.
- Method: `POST`
- URL: `https://<api-host>/api/hydrology/ingest`
- Headers: `Content-Type: application/json`, `Authorization: Bearer ${HYDROLOGY_INGEST_TOKEN}`
- Body: `{ "contractVersion": "1.0.0", "reason": "external-cron-hourly" }`

## Always-on environments

Set `HYDROLOGY_SCHEDULER_ENABLED=true` only where the API process stays awake. Startup creates timers only; it does not run an ingest immediately at boot.

## Bounded verification

Local smoke: perform exactly one all-source POST with the bearer token and inspect the single structured `202` response. Do not retry, poll, or loop.

Production smoke after deploy: perform exactly one POST with the same body and header. `partial` or safe source diagnostics are acceptable when providers are degraded.
