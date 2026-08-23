# Agronautas Playwright verification

- Materialize workspace dependencies with `pnpm install`.
- Install the browser once with `pnpm --filter web exec playwright install chromium`.
- Run the smoke verify with `pnpm --filter web test:e2e`.
- For an external verify target, build/start API and web separately and set `PLAYWRIGHT_BASE_URL`; the default config uses a managed development harness, not a production topology.
- The smoke specs remain supplemental and still use network stubs; the release gate for Slice 3 is the API/readiness coverage plus the reproducible Compose stack, not stub-only browser traffic.

## Real Agronautas runtime suite

The separately named `agronautas-reality-runtime.spec.ts` suite uses real browser traffic and the real same-origin BFF. It does not register route stubs. It always writes a screenshot, HTML snapshot, console log, network log, and JSON manifest under Playwright's ignored `test-results` directory. If API/web services are unavailable, the manifest records `blocked` and does not claim production.

When Playwright starts its default managed harness, the manifest labels the run
`managed-playwright-harness`: it starts only temporary API/web processes. This is
separate from full DB/Redis/worker/cron/Render topology evidence. A BFF HTTP 200
or real provider response is preserved as local evidence, while missing worker,
queue, cron, hydrology, or Render prerequisites remain `blocked`, `unavailable`,
or `not_run`. The console file is authoritative; a captured React hydration
mismatch is a runtime warning and must not be described as a clean console.

```bash
# Start the real local services in separate terminals when available.
pnpm --dir apps/api dev
pnpm --dir apps/web dev

# Reproducible worker package/test lane (does not claim a live worker).
pnpm worker:install
pnpm worker:test

# Optional worker process (requires authorized Postgres/Redis).
pnpm worker:run

# Browser evidence against the active web/API services.
pnpm verify:agronautas:browser
```

## Real API/runtime harness

The read-only default harness is discoverable from the root and API packages:

```bash
pnpm verify:agronautas:runtime
pnpm --dir apps/api verify:agronautas:runtime
```

Safe defaults use `http://127.0.0.1:3001` for the API and `http://127.0.0.1:3000` for the web. `DATABASE_URL` and `REDIS_URL` are required only for their respective real checks; the harness records missing services as blocked. `AGRONAUTAS_RUNTIME_FIELD_ID` and a reader/operator token enable authenticated field/BFF checks. Open-Meteo remains unavailable unless `AGRONAUTAS_OPEN_METEO_COMMERCIAL_APPROVED=true` is explicitly supplied.

Queue proof and hydrology ingestion are writes and are disabled unless explicitly enabled with `AGRONAUTAS_RUNTIME_QUEUE_PROOF=true` or `AGRONAUTAS_RUNTIME_HYDROLOGY_WRITE=true`. Hydrology writes additionally require the existing `HYDROLOGY_INGEST_TOKEN` and `HYDROLOGY_CRON_OWNER_ID`; there is no invented dry-run mode. Render service/deploy/log evidence remains unavailable unless `RENDER_SERVICE_ID` and `RENDER_API_TOKEN` are supplied, and static `render.yaml` wiring is reported separately from production proof.
