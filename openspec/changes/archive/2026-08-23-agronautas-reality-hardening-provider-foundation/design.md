# Design: Agronautas Reality-Hardening Provider Foundation

## Technical Approach

Implement four incremental, strict-TDD slices while preserving the existing hexagonal API/BFF, shared Zod contracts, Redis dispatch, and Python worker. First close the status/chat boundary and remove unverified landing claims; then add a disabled-by-default source-window queue path; then normalize Georef 2.1, NASA POWER Daily, and Open-Meteo through one evidence contract; finally prove the real local and Render topology. Fixtures prove parsing only and never elevate `seam`, `mock`, or `unavailable` to `live`.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Route truth boundary | Add `requireRead` and field-existence middleware to status/chat; label UI metrics illustrative/unavailable. | Identity/tenant redesign. | Removes anonymous exposure without inventing ownership semantics. |
| Runtime topology | Scheduler window → Redis Bull-compatible queue → Python worker → Postgres result/DLQ; `AGRONAUTAS_SCHEDULER_ENABLED=false` by default and add a Render worker. | Log-only enqueue or topology rewrite. | Makes operational state observable while retaining tested ports and rollback. |
| Provider boundary | Define typed provider ports and adapters, with source/retrieval/observation/time-standard/units/freshness explicit. | Provider-specific route logic or direct worker calls. | Keeps domain/application independent and prevents timestamp or unit claims. |
| Evidence visibility | Persist versioned envelopes and render only verified modes/states. | Default mock or latest data presented as current. | Truthful degradation is safer than fabricated readiness. |

## Data Flow

```text
API scheduler ──window + runId──> Redis queue ──validated job──> Python worker
      │                                  │                         │
      └──lock/telemetry───────────────> retry/DLQ            provider adapter
                                                                  │
                                      Postgres evidence/job-run <─┘
                                                                  │
                                      API/BFF ──typed state──> dumb UI
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/presentation/routes/agronautas.ts` | Modify | Protect status/chat; preserve 404 field behavior and shared-token limitation. |
| `apps/web/src/components/landing/homepage.tsx` + test | Modify | Remove or explicitly mark unsupported precision, coverage, alerts, insurance, and roadmap claims. |
| `apps/api/src/infrastructure/jobs/agronautas-scheduler.ts` and `server.ts` | Modify | Replace log-only dispatch with a typed source-window producer, retaining disabled default. |
| `apps/api/src/infrastructure/queue/*`, `apps/workflow-runtime-python/src/worker/queue/*`, `runtime/*` | Modify | Validate source-window jobs; heartbeat, lease, retry, result, DLQ, and idempotency transitions. |
| `packages/zod-schemas/src/agronautas.ts`, worker JSON schemas | Modify | Add versioned evidence/job envelopes without breaking existing fields. |
| `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts`, `apps/workflow-runtime-python/src/worker/providers/*` | Create/modify | Ports plus Georef 2.1, NASA POWER Daily, and hardened Open-Meteo adapters. |
| `apps/api/src/infrastructure/config/*`, telemetry, `render.yaml` | Modify | Explicit env contract, provider terms state, telemetry, and Python Render worker service. |

## Interfaces / Contracts

```typescript
interface EvidenceEnvelope {
  contractVersion: string; evidenceId: string; provider: string; signalType: string;
  sourceUrl: string; providerMode: 'live' | 'seam' | 'mock' | 'unavailable';
  observedAt: string | null; retrievedAt: string; timeStandard?: string;
  units: Record<string, string>; freshness: 'fresh' | 'stale' | 'degraded' | 'missing';
  rawHash?: string; runId: string; requestId: string; httpStatus?: number;
  schemaStatus: 'valid' | 'invalid' | 'unavailable'; latencyMs?: number;
  degradationReasons: string[]; failureReason?: string;
}
interface ProviderPort { fetch(input: ProviderRequest): Promise<EvidenceEnvelope> }
```

Georef and POWER require no credential; Georef supplies names/codes/centroids, POWER Daily records requested `time-standard` (UTC or local solar). Open-Meteo needs no key but its commercial-use/license decision and attribution remain explicit; absent approval returns `unavailable`. Google Maps, soil, economics/market, official Iberá geometry, identity/tenant, marketplace/credit/insurance remain out of scope.

Required runtime contract: API `DATABASE_URL`, `REDIS_URL`, `AGRONAUTAS_RUNTIME_MODE`, `AGRONAUTAS_SCHEDULER_ENABLED`, timeout/max-attempt settings; worker `WORKER_POSTGRES_DSN`, `REDIS_URL`, `WORKER_CONTRACTS_ROOT`; Render worker uses the same Postgres/Redis bindings and `workflow-runtime-consumer`. No scheduler is enabled until worker completion is observed.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Route auth, envelope validation, timestamps/units, provider parsers, retry/DLQ | Write RED tests first; Node test runner and pytest fixtures only. |
| Integration | Redis queue movement, Postgres job/evidence persistence, worker heartbeat/idempotency | Real configured Postgres/Redis; failures and DLQ are asserted. |
| E2E/runtime | Browser truth, authenticated API/BFF, real provider requests, worker and Render wiring | Playwright with no provider stubs for the real suite; capture snapshots/screenshots/network/console separately from fixture tests. |

## Threat Matrix

| Boundary | Applicability / response / RED test |
|---|---|
| Documentation-like paths | N/A: no executable-file classification; no test. |
| Git repository selection | N/A: no VCS selection; no test. |
| Commit state | N/A: no commit automation; no test. |
| Push state | N/A: no push automation; no test. |
| PR commands | N/A: no PR automation; no test. |

Routing/process boundaries instead get RED tests for missing auth, malformed jobs, duplicate run IDs, timeouts, schema drift, retry exhaustion, worker absence, and disabled scheduler startup.

## Migration / Rollout

Use additive nullable evidence/job fields and contract versioning; retain existing route prefixes and clients. UI maps missing fields to `unavailable`. Roll back slices independently: disable scheduler, remove Render worker, retain adapters as unavailable/seam, and revert route/UI changes; do not delete dependent rows.

Local verification: install pnpm and Python dependencies without Docker; start API, web, and worker against authorized Postgres/Redis with scheduler disabled; run `pnpm test`, `pnpm build`, `pytest apps/workflow-runtime-python`, then enable one controlled window, verify Redis `PING`, queue movement, worker heartbeat/result/DLQ, Postgres evidence, and real Georef/POWER/Open-Meteo responses. Run Playwright against `PLAYWRIGHT_BASE_URL`, recording browser artifacts and console/network evidence. Render verification repeats one controlled window after deploy: inspect API/web/worker services, env bindings, logs, heartbeat, queue completion, provider semantics, and scheduler flag before any enablement.

## Open Questions

- [ ] Confirm Open-Meteo commercial-use/attribution approval and Render worker operational credentials.
- [ ] Confirm isolated runtime data authorization for real verification writes.
