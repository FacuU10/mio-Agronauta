# Iberá-Alerta Hydrology Ingest Scheduler Runbook

## Render Free strategy

Render Free web services sleep, so keep the in-process scheduler disabled and use one external cron call instead.

Required envs:

- `HYDROLOGY_SCHEDULER_ENABLED=false`
- `HYDROLOGY_INGEST_TOKEN=<secret>`
- Optional provider overrides: `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, `HYDROLOGY_SMN_URL`

Provider overrides must point to machine-readable official feeds when available. If an override or default endpoint returns HTML, `403`, times out, or cannot be parsed, the ingest contract must preserve the run as a structured source-level `failed` or `empty` diagnostic with `attempts: 1`; do not replace it with fixtures in production.

External cron:

- Cadence: hourly or slower (`0 * * * *`). Do not schedule PNA below 1 hour.
- Method: `POST`
- URL: `https://<api-host>/api/hydrology/ingest`
- Headers: `Content-Type: application/json`, `Authorization: Bearer ${HYDROLOGY_INGEST_TOKEN}`
- Body: `{ "contractVersion": "1.0.0", "reason": "external-cron-hourly" }`

## Always-on environments

Set `HYDROLOGY_SCHEDULER_ENABLED=true` only where the API process stays awake. Startup creates timers only; it does not run an ingest immediately at boot.

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

Production smoke after deploy: perform exactly one POST with the same body and header, plus one `GET /api/hydrology/municipalities`. `partial`, `failed`, or safe source diagnostics are acceptable when providers are degraded; repeated POSTs are not.
