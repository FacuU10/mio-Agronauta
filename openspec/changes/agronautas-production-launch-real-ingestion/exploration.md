# Exploration: agronautas-production-launch-real-ingestion

## Current State

Agronautas has a usable production-oriented skeleton, but the product surface is still narrower than the intended MVP. The repository already contains Next.js dashboard UI, Express `/agronautas` APIs, Postgres/PostGIS repositories, Redis dispatching, Python worker recompute, Zod/JSON Schema contracts, stale/degraded states, risk snapshots, alert snapshots, timelines, hydrology cards, and a grounded copilot. The current live seam is strongest around field intake → risk snapshot → alerts → dashboard presentation.

Key verified seams:

- `packages/zod-schemas/src/agronautas.ts` still constrains `fieldIntake.crop` and `copilotContext.crop` to literal `rice`; growth stages are rice-specific.
- `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.ts` resolves only `zone.scope = 'corrientes_rice'` and returns `outside_corrientes_rice_zone`.
- `apps/api/src/presentation/routes/agronautas.ts` still returns Spanish copy/errors for “Corrientes arroz” and demo responses; it does expose useful current endpoints: field overview, risk current/timeline, alerts current/timeline, status, weather timeline, hydrology dashboard/alerts, recompute, and chat.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` performs a real Open-Meteo call for forecast daily temperature/precipitation, persists `signal_ingestion_runs` and `risk_snapshots`, and records failures, but the model is basic and climate-only.
- `apps/api/src/infrastructure/jobs/agronautas-signal-ingestion-job.ts` defines TS-side climate/satellite ingestion jobs with fallback-to-latest semantics, but no verified scheduler/cron trigger was found in inspected code.
- `apps/api/src/infrastructure/adapters/agronautas-climate-adapter.ts` and `agronautas-satellite-adapter.ts` are ports/mappers, not complete real provider clients.
- `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts` pushes JSON jobs to `bull:agronautas-runtime:wait`, but it is a low-level Redis queue seam rather than a full BullMQ scheduling/retry/DLQ implementation.
- `apps/web/src/components/agronautas/workspace.tsx` is already dashboard-first and explicitly says chat never replaces dashboard, but visible branding/copy is still Iberá-Alerta/rice/flood-heavy.
- `apps/web/tests/e2e/agronautas-production.spec.js` uses network stubs; it is a UI smoke, not proof of real ingestion.
- `apps/api/src/presentation/middleware/agronautas-auth.ts` is static bearer-token role gating. Per user feedback, auth is out of scope for this MVP and should be treated only as future work with the planned `auth security` library.

## Current Gaps

1. **Scope mismatch**: Product intent is Argentina agriculture broadly, starting Corrientes; contracts, validation, copy, boundaries, and demo fallbacks still say Corrientes rice.
2. **Real ingestion incomplete**: Open-Meteo forecast is real but limited; satellite, fire, storm/hail/frost, soil/hydric stress, and biomass are not proven as real scheduled pipelines.
3. **No reliable scheduled strategy identified**: stale snapshots can request recompute, but production MVP needs automatic refresh every X hours with idempotency, overlap prevention, run status, retries, and alerts on failures.
4. **Dashboard identity drift**: UI contains strong Iberá-Alerta identity and hydrology/flood copy; Agronautas must be separate from Iberá-Alerta as a product, while reusing shared infra/data capabilities.
5. **PDF export missing as support feature**: Presentation is dashboard-first, but there is no verified PDF export pipeline for executive/client sharing.
6. **Provider contracts too narrow**: Weather timeline only carries temperature/rain/humidity; risk drivers lack typed domains for fire, frost, hail/storms, soil/hydric stress, biomass, NDVI/NDWI/EVI, and provider freshness.
7. **TDD gates need real-ingestion tests**: Current tests validate contracts, stubs, and some Open-Meteo worker behavior, but not scheduled end-to-end ingestion reliability or source-specific degradation behavior.

## Production MVP Boundary

The MVP should be defined as **Risk Engine first, SaaS Agro second**:

- In scope:
  - Corrientes-first, Argentina-compatible field intake for multiple agricultural activities/crops/categories, not just rice.
  - Real scheduled ingestion and normalized persistence for priority signals.
  - Dashboard-first risk intelligence: current status, risk score, signal freshness, drivers, alerts, timelines, evidence/provenance, and manual/automatic recompute status.
  - PDF export as a supporting share/report artifact generated from persisted dashboard state, not as the primary UX.
  - Degraded-mode behavior when a provider fails: show last successful value, freshness, confidence penalty, and failure reason.
  - Contract-first TS/Python schemas and strict TDD.
- Out of scope now:
  - Auth replacement, accounts, tenant billing, RBAC beyond existing static token guard. Future work: integrate own `auth security` library.
  - Full national coverage on day one.
  - Autonomous physical actions such as irrigation/fertilization control.
  - Legal certification of ESG/carbon claims.
  - Iberá-Alerta as a product identity; only shared hydrology infra/data can be reused.

## Real Ingestion Strategy

Recommended MVP ingestion model: **scheduled multi-signal snapshots with source-specific adapters, persisted raw evidence, normalized summaries, and deterministic risk recompute**.

Priority signals:

1. **Weather baseline**
   - Keep Open-Meteo as a low-friction baseline provider; extend from current forecast-only fields to include recent precipitation, min/max temperature, humidity where available, wind, and forecast horizon.
   - Persist raw payload in `signal_ingestion_runs`, normalized summary in signal summary/timeline tables, and evidence refs in snapshots.
2. **Storms, hail, frost, heat**
   - Add provider adapter(s) for SMN/alert feeds or a selected weather-alert provider.
   - Normalize alerts as typed events: `storm`, `hail`, `frost`, `heat`, `wind`, with severity, valid window, geometry/region, confidence, and source URL.
3. **Satellite / biomass / vegetation**
   - Implement asynchronous satellite observation ingestion for NDVI/NDWI/EVI and biomass proxy, initially field-centroid or field-polygon based.
   - Persist cloud/quality metadata and avoid false confidence when imagery is stale/cloudy.
4. **Fire risk / active fire proximity**
   - Add active fire/hotspot proximity ingestion and regional fire weather risk if available.
   - Drivers should distinguish field-local observation vs nearby/regional hazard.
5. **Soil and hydric stress**
   - Start with modeled soil/hydric stress using rainfall deficit/excess, evapotranspiration proxy, temperature, soil/crop profile defaults, and hydrology where applicable.
   - Later extend to IoT soil moisture when real devices exist.
6. **Hydrology reuse**
   - Reuse PNA/INA/INMET/SMN hydrology infrastructure as a Corrientes signal, but present it as Agronautas hydric/logistics risk, not Iberá-Alerta product branding.

Risk model MVP should be deterministic and explainable: each snapshot must contain signal freshness, confidence, rule version, drivers, weights, evidence refs, and degradation reasons. Do not let LLM/copilot invent risk.

## Dashboard + PDF Presentation Strategy

- Dashboard is the primary product surface. It should show: field/region/crop context, overall risk, signal cards, active alerts, trend/timeline, freshness, evidence/provenance, and recompute/scheduler status.
- PDF export should be generated from the same persisted dashboard state, ideally server-side or via a controlled web route, with clear timestamp, provider provenance, confidence, and “not legal/certification advice” disclaimers.
- PDF should support sharing with producers/advisors, but should not become the data-consumption bottleneck.
- UI should be dumb: no scoring, provider interpretation, or PDF-only logic in React components.
- Rename/copy pass is required: Agronautas-wide agriculture scope first; Iberá-Alerta references either removed from product UI or reframed as internal/shared hydrology capability.

## Scheduling / Cron Strategy

Recommended strategy for MVP: a **single scheduler entrypoint** that enqueues idempotent ingestion jobs every X hours, with Redis/Postgres locks and run status persistence.

Minimum requirements:

- Configurable cadence: `AGRONAUTAS_INGESTION_INTERVAL_HOURS` and per-signal overrides if needed.
- Trigger choices: platform cron (Render cron job, GitHub Actions scheduled workflow, or Vercel Cron for an API trigger) should call an internal scheduler endpoint or worker command; the worker should enqueue jobs, not perform long work inside the HTTP request.
- Idempotency key: `{signal}:{fieldId}:{windowStart}` or `{signal}:{region}:{windowStart}`.
- Locking: prevent overlapping runs per signal/field/region.
- Retries and DLQ: provider failures should retry with backoff, then mark degraded/failed without corrupting latest good data.
- Freshness SLA: dashboards must know last successful observedAt/ingestedAt and when the next run is expected.
- Backfill path: manual/admin command to replay a date range for providers without duplicating snapshots.

The existing Redis dispatch seam can be reused, but production reliability likely needs a clearer BullMQ-compatible queue abstraction or explicit scheduler worker with persisted job runs.

## TDD / Verification Implications

Strict TDD should shape the next phases:

- Contract tests first for multi-crop/categories, signal observation schemas, scheduler jobs, and dashboard/PDF payloads.
- Adapter tests with recorded fixtures for each provider: success, timeout, malformed response, stale data, no data, quota/rate-limit.
- Repository tests for idempotent `signal_ingestion_runs`, latest summaries, timeline ordering, and stale fallback.
- Worker tests proving scheduled jobs enqueue expected field/signal windows and do not overlap.
- API tests proving dashboard endpoints expose real persisted data and never silently replace missing real data with demo fixtures in `real` mode.
- E2E tests should add a real-ingestion gate using seeded provider fixtures or local fake provider server, not only Playwright route stubs.
- PDF tests should verify generated content includes timestamp, risk level, drivers, evidence refs, and degradation disclaimers.

## Approaches

1. **Minimal patch on current rice MVP** — Keep current contracts and add a cron to recompute rice fields only.
   - Pros: fastest, low code churn.
   - Cons: violates user direction; keeps product too narrow; real ingestion remains partial.
   - Effort: Low.

2. **Production MVP real-ingestion slice (recommended)** — Expand contracts from rice-only to Corrientes-first agricultural scope, implement scheduled multi-signal ingestion, dashboard-first presentation, and PDF export from persisted state.
   - Pros: aligns with launch need; creates durable foundation; testable; keeps scope bounded.
   - Cons: requires schema/contract migration and provider selection discipline.
   - Effort: Medium/High.

3. **Full strategic platform expansion now** — Implement IoT, VLM satellite, ESG, silo-bag, RAG, multi-tenant auth, national coverage.
   - Pros: matches long-term vision.
   - Cons: too broad for MVP; high failure risk; delays launch.
   - Effort: Very High.

## Recommendation

Proceed with Approach 2. The next SDD proposal should define a launchable MVP around **real scheduled ingestion and dashboard-first risk intelligence for Argentina agriculture starting Corrientes**, not around auth or an Iberá-Alerta-branded/rice-only flow.

Implementation should be sequenced test-first:

1. Contract/schema expansion for field scope and signal observations.
2. Scheduler/job-run model with idempotency and failure semantics.
3. Real weather + alert + satellite/fire/biomass/hydric adapters in priority order.
4. Risk recompute consuming persisted normalized signals.
5. Dashboard copy/layout update and PDF export from persisted dashboard state.
6. Production verification gates and runbook.

## Big-picture Future Roadmap

- **MVP launch**: Corrientes-first real ingestion, dashboard, alerts, PDF, strict freshness/degradation.
- **Argentina expansion**: province/crop/category boundary packs, more provider redundancy, regional risk maps.
- **Advanced intelligence**: calibrated crop-specific models, satellite anomaly detection, biomass trend, disease/pest risk, yield-risk proxies.
- **Operational platform**: tenant/auth via future `auth security` library, billing, roles, advisor workflows, notification channels.
- **IoT/edge**: soil sensors, weather stations, machinery telemetry, offline/mobile capture.
- **RAG/copilot maturity**: cited agronomic documents, tool traces, advisory workflows, but always grounded in persisted data.
- **Post-harvest/ESG**: silo-bag monitoring, logistics risk, evidence ledger, preliminary ESG/carbon reports.

## Affected Areas

- `packages/zod-schemas/src/agronautas.ts` — contracts are currently rice-specific and need multi-signal/multi-scope expansion.
- `packages/contracts/schemas/*agronautas*` — canonical TS/Python schema bridge must be regenerated/validated.
- `apps/api/src/presentation/routes/agronautas.ts` — API copy, boundaries, dashboard endpoints, recompute behavior, and possible PDF endpoint.
- `apps/api/src/infrastructure/database/postgres/agronautas-field-repository.ts` — currently `corrientes_rice`; needs Corrientes/Argentina agricultural coverage model.
- `apps/api/src/infrastructure/jobs/agronautas-signal-ingestion-job.ts` — existing fallback pattern can be extended to multi-signal production jobs.
- `apps/api/src/infrastructure/adapters/agronautas-*.ts` — ports exist, real provider clients and tests are missing.
- `apps/api/src/infrastructure/queue/agronautas-runtime-dispatcher.ts` — Redis dispatch seam exists; scheduling/retry/DLQ/job semantics need hardening.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` — has real Open-Meteo climate recompute but must evolve into scheduled multi-signal ingestion/recompute.
- `apps/web/src/components/agronautas/workspace.tsx` — dashboard-first pattern exists, but branding/copy/signal cards/PDF export need alignment.
- `apps/web/tests/e2e/agronautas-production.spec.js` — current stubbed smoke should be supplemented with ingestion-backed verification.
- `docs/runbooks/agronautas-production-hardening.md` — should document scheduler/provider/SLA/runbook operations.

## Risks

- Provider instability or quota limits can break MVP if no fallback/degraded mode is enforced.
- Product scope can balloon into full platform; keep MVP to real ingestion + dashboard + PDF.
- Contract migrations from rice-only to broad agriculture can break UI/API/Python unless versioned and tested first.
- Scheduled jobs can duplicate or overlap without idempotency/locks.
- Satellite/biomass quality can mislead users if cloud/staleness/confidence are not explicit.
- PDF export can become misleading if it omits timestamps/evidence/degradation.
- Auth must not be pulled into this MVP despite existing static auth middleware and old roadmap notes.

## Ready for Proposal

Yes. The next phase should be `sdd-propose` for `agronautas-production-launch-real-ingestion`, explicitly skipping iron-sdd gates per user instruction and preserving strict TDD.
