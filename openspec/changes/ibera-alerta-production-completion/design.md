# Design: Iberá Alerta Production Completion

## Technical Approach

Deliver four independently releasable slices. A1 stores reviewed, versioned municipality-to-provider coverage keys; A2 projects current matching alerts through the existing overview/dashboard routes and renders them without changing telemetry semantics. B1 hardens the existing authenticated ingest BFF as the sole Cron entry point. B2 records bounded, redacted proof for deployed proxy/runner and Groq streaming. Historical timelines and long-range detail remain future-only.

## Architecture Decisions

| Decision | Options / tradeoff | Choice and rationale |
|---|---|---|
| Alert association | Dynamic `alert-*` station IDs are unstable; geometry inference is unreviewable | Persist `municipality_alert_coverage(municipality_id, source, official_coverage_key, active, seed_version)` with a unique active key. A versioned idempotent seed makes regional coverage reviewable and stable across alert instances. |
| Projection boundary | UI filtering repeats policy; add alerts to generic telemetry | `HydrologyRepository` joins current `storm_alert` rows to active coverage and returns a distinct `officialAlerts[]` with source, coverage key, text/raw-derived message, observed/freshness timestamps, and provenance URL. UI remains presentational. |
| Operations | In-process scheduler duplicates across Render instances | Keep the existing protected `POST /api/hydrology/ingest` BFF path and forward its token only for ingest/verify. Configure one external Render Cron; do not introduce a worker scheduler. |
| Proof | Secrets/full payloads or repeated live probes leak risk/cost | One bounded receipt per B path: redacted revision/config inventory, request ID, source/status, response shape, timestamp; never credentials, token values, raw chat, or repeated probes. |

## Data Flow

    versioned coverage seed -> municipality_alert_coverage
    SMN/INMET ingest -> hydrology_telemetry(storm_alert)
    repository current-coverage join -> API overview/dashboard officialAlerts[]
    Next BFF -> GovernmentOverview / GovernmentDetail

The API retains `latestTelemetry`, `provinceAlerts`, provenance, and no-data behavior. Only current alerts are projected; no timeline/history endpoint or forecast expansion is added.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/migrations/<timestamp>_municipality_alert_coverage/migration.sql` | Create | Add additive coverage table, FK/index/unique constraint. |
| `apps/api/src/infrastructure/database/postgres/seed-municipality-alert-coverage.ts` | Create | Versioned idempotent reviewed coverage seed. |
| `packages/hydrology-engine/src/repository.ts` | Modify | Query and type current coverage-matched alerts for overview/dashboard. |
| `packages/hydrology-engine/src/hydrology-engine.test.ts` | Modify | RED/GREEN projection, isolation, idempotency, and rollback-path tests. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Expose canonical alert contract and preserve coordinated all-source ingest results. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modify | API and Cron authorization/independent-source contract tests. |
| `apps/web/src/components/government/{overview,detail}.tsx` | Modify | Render empty/current official alerts and provenance; no policy logic. |
| `apps/web/src/components/government/{overview,detail}.test.tsx` | Modify | Empty/current alert accessibility/rendering tests. |
| `apps/web/tests/e2e/municipalities-alerts.spec.ts` | Create | Playwright overview/detail matching and unrelated-municipality coverage tests. |
| `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` | Modify | Render Cron, proxy/runner, AI and receipt-safe operator checklist. |

## Interfaces / Contracts

```ts
type OfficialAlert = {
  source: 'SMN' | 'INMET'; coverageKey: string; message: string
  observedAt: string; lastSuccessfulObservedAt: string
  freshness: 'fresh' | 'degraded'; sourceUrl?: string
}
// Municipality overview/dashboard adds: officialAlerts: OfficialAlert[]
```

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Coverage join, active/versioned seed, no unrelated alert, rollback disablement | RED first in hydrology-engine tests; GREEN with repository SQL stubs. |
| Integration | Migration/seed idempotency; API contract; protected Cron forwarding; partial source result | PostgreSQL/API tests; assert token never appears in logs/receipt. |
| E2E | Empty/current overview and detail; chat/proxy degraded state | Playwright fixtures, then one bounded authorized local and production smoke per B path. |

## Threat Matrix

| Boundary | Applicability | Design response / RED tests |
|---|---|---|
| Documentation-like paths | N/A — no executable-file classification | None. |
| Git repository selection | N/A — no VCS automation | None. |
| Commit state | N/A — no commit automation | None. |
| Push state | N/A — no push automation | None. |
| PR commands | N/A — no PR automation | None. |

Routing/process integration is applicable only to HTTP proxy/Cron handling: missing/invalid ingest token safely returns existing 401 without forwarding; upstream timeout/configuration returns redacted 502/503 with request ID. RED route tests cover both and prove only protected ingest paths forward the token.

## Migration / Rollout

Apply migration then seed in A1; verify active coverage and query results before A2. Roll back by disabling coverage rows/query projection, then UI/API release; retain telemetry and additive table. Reverse migration only after the projection is disabled. Enable one Cron only after B1 tests and retain last-known data on source/AI/proxy degradation.

## Open Questions

- [ ] Operators must approve the reviewed SMN/INMET coverage-key seed and provide redacted Render Cron/proxy/Groq inventory before B2 proof.
