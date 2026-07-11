# Exploration: Hydrology Ingestion Scheduler

Run SDD-FF phase explore for change `ibera-alerta-hydrology-ingest-scheduler`.

## Current State

The monorepo contains a fully defined manual ingestion workflow and an in-process scheduler, but they are not integrated into the main server lifecycle.

- **Manual Endpoint**: `POST /api/hydrology/ingest` in `apps/api/src/presentation/routes/hydrology-government.ts` validates the payload and invokes `ingestionRunner`.
- **Ingestion Runner**: Created by `createGovernmentIngestionRunner` in `apps/api/src/presentation/routes/hydrology-government.ts`. It fetches telemetry from PNA, INA, INMET, and SMN, and writes them to the database.
- **HTTP Clients**: Implemented in `packages/hydrology-engine/src/clients/http-clients.ts`. Overridable with environment variables (`HYDROLOGY_*_URL`, etc.).
- **Scheduler**: `HydrologyIngestionScheduler` in `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` handles interval and daily cadence schedule management, timeout pruning, and delayed retries on unchanged telemetry.
- **Wiring Blocker**: The scheduler is tested but never imported or started in `apps/api/src/server.ts` or `apps/api/src/index.ts`.

## Affected Areas

- `apps/api/src/server.ts` — needs a new startup function `startHydrologySchedulerFromEnv` to instantiate and start `HydrologyIngestionScheduler` under control of an environment flag.
- `apps/api/src/infrastructure/jobs/hydrology-ingestion-scheduler.ts` — scheduler itself is correct and well-tested, but needs to be imported and executed.
- `apps/api/src/presentation/routes/hydrology-government.ts` — manual ingestion endpoint must remain available.

## Approaches

### 1. In-Process Scheduler Only
Run `HydrologyIngestionScheduler` inside the Express process upon server startup.
- **Pros**: Fully self-contained inside the repository code; no external dependencies or external configurations required.
- **Cons**: Render Free Tier will put the app to sleep after 15 minutes of HTTP inactivity, halting all in-process interval/timeout tasks completely. Requires a third-party keep-awake pinging tool to keep the server awake, which depletes Render's free usage hours allocation.
- **Effort**: Low.

### 2. External Cron / Render Cron Job hitting Manual Endpoint
Disable in-process scheduler and rely strictly on external cron triggers hitting the manual endpoint `POST /api/hydrology/ingest`.
- **Pros**: Wakes up the sleeping Render instance automatically on each cron tick. Does not require keeping the server awake continuously, saving valuable Render Free Tier usage hours. Completely eliminates background timer-based memory leaks.
- **Cons**: Requires setting up an external cron system (e.g. Render Cron Job, GitHub Actions, or cron-job.org).
- **Effort**: Low (no code changes needed, manual endpoint already exists).

### 3. Hybrid Configurable Approach (Recommended)
Wire `HydrologyIngestionScheduler` into `apps/api/src/server.ts` startup, but control its execution with a new environment variable `HYDROLOGY_SCHEDULER_ENABLED` (defaulting to `false`).
- **Pros**: Best of both worlds. The in-process scheduler is ready and wired up for production-grade dedicated hosting. For Render Free Tier, the user can set `HYDROLOGY_SCHEDULER_ENABLED=false` and use an external Cron service hitting the manual endpoint safely.
- **Cons**: None.
- **Effort**: Low/Medium.

## Verification & Local Testing Diagnostics

Real live local client requests return:
- **PNA**: Times out after 10000ms. Production logs and local checks indicate PNA website is slow or blocks Render IP ranges.
- **SMN**: Returns HTTP 403 Forbidden. Cloudflare/anti-bot protection blocks generic or Node-based client requests.
- **INMET & INA**: Return `unexpected content-type text/html` because their default URLs are public landing/portal HTML pages (`https://portal.inmet.gov.br/...` and `https://www.ina.gob.ar/...`) rather than actual machine-readable JSON endpoints.

**Blocker conclusion**: The public default URLs are not stable machine-readable API endpoints. For reliable production ingestion, the environment variables `HYDROLOGY_PNA_URL`, `HYDROLOGY_INA_URL`, `HYDROLOGY_INMET_URL`, and `HYDROLOGY_SMN_URL` must point to actual machine-readable JSON feeds / proxies.

### Safe Manual Ingestion Playloads

To trigger all sources:
```http
POST /api/hydrology/ingest
Content-Type: application/json

{
  "contractVersion": "1.0.0"
}
```

To trigger single source (e.g. SMN):
```http
POST /api/hydrology/ingest
Content-Type: application/json

{
  "contractVersion": "1.0.0",
  "source": "SMN"
}
```

## Recommendation

Implement **Approach 3 (Hybrid)**. Expose `HYDROLOGY_SCHEDULER_ENABLED=true|false` as a startup flag. Wire `HydrologyIngestionScheduler` in `apps/api/src/server.ts` and verify it starts cleanly under test. For the Render Free Tier deployment, recommend setting `HYDROLOGY_SCHEDULER_ENABLED=false` and scheduling an external hourly cron trigger to call the POST endpoint, protecting resources and ensuring wake-ups.

## Risks

- **DDoS/Upstream overload**: If the scheduler retries aggressively, it may get blocked. Limit retries (already capped at 1 delayed attempt for PNA/INA, and 0 for others). Keep polling frequency low.
- **Render Sleep**: Failing to configure external cron triggers or keep-awake on the free tier when using the in-process option will result in silent ingestion failures.

## Ready for Proposal
Yes. The next recommended step is to write the SDD change proposal.
