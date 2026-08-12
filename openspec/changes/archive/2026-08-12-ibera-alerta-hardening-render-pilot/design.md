# Design: Iberá-Alerta Hardening and Institutional Render Pilot

## Technical Approach

Extend hydrology ports/adapters with an Iberá-specific PostgreSQL run ledger. It becomes the source of truth for admission, lifecycle, leases, results, diagnostics, expiry, and `statusPath`; PNA/INA/INMET/SMN adapters and telemetry deduplication remain unchanged. One fixed Render Cron command invokes the due-run entrypoint; API in-process schedulers remain disabled. UI consumes typed API state without inferring risk.

## Architecture Decisions

| Decision | Choice | Alternatives / rationale |
|---|---|---|
| Durable state | Add parent `ibera_ingest_runs` plus child linkage from `hydrology_ingestion_runs`; store lifecycle, sources, slot, lease, expiry, diagnostics, and provider results in PostgreSQL. | Redis splits audit/recovery state; a queue/worker is out of scope. |
| Ownership | Use unique `scheduled_slot` admission and an expiring DB lease for execution/recovery. | Process maps do not protect Render instances. Agronautas’ lock is only an infrastructure pattern, never Iberá state. |
| Recovery | A new owner CAS-claims an expired lease, resumes unfinished sources, and preserves completed results. Terminal runs are immutable except diagnostic enrichment. | Retrying the whole run could duplicate calls and misstate evidence. |
| Copilot evidence | Emit validated context citations with stable IDs and explicit `citationMode`; missing references are unverified, never fabricated. | Prompt-only grounding cannot prove citations; do not reuse Agronautas `citations[]`. |

## Data Flow

```text
Render Cron (fixed command) ─→ due-run service ─→ PostgreSQL slot/lease
                                      │                  │
                                      └→ provider adapters ─→ telemetry + source results
API POST/statusPath ────────────────────────────────────────┘
Web overview/detail/ingest ← typed API responses ← ledger + coverage manifest
Copilot ← allowed municipality context + citation registry → SSE metadata/tokens/done
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/migrations/<timestamp>_ibera_ingest_ledger/migration.sql` | Create | Add parent ledger, lease/slot indexes, child `run_id`/diagnostics; additive and rollback-isolatable. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Repository-backed admission/observation, stable slots, recovery status, coverage reconciliation, and safe Copilot SSE. |
| `packages/hydrology-engine/src/{repository,types}.ts` | Modify | Ledger/lease/prune queries, source results, bounded diagnostics, and coverage/citation projections. |
| `apps/api/src/infrastructure/jobs/{hydrology-ingestion-scheduler,hydrology-prune-job}.ts`, `apps/api/src/server.ts` | Modify | Route scheduled work through DB-owned due-run service; wire real prune; keep local scheduler disabled in Render. |
| `apps/api/src/scripts/run-hydrology-scheduler-once.ts`, `render.yaml` | Modify | Fixed Cron command; declare one owner and environment. |
| `packages/zod-schemas/src/agronautas.ts` | Modify | Version lifecycle, diagnostic, coverage, and Copilot citation contracts without changing Agronautas contracts. |
| `apps/web/src/{lib/visibility/polling.ts,components/government/{overview,detail,ingest-panel}.tsx}` | Modify | Render durable/recovered/expired states, coverage gaps, source links, forecast provenance, and citation states. |
| `apps/api/src/**/{hydrology-government,scheduler,prune}*.test.ts`, `packages/hydrology-engine/src/**/*test.ts`, `apps/web/src/components/government/detail.test.tsx` | Modify | Strict-TDD RED/GREEN coverage for contracts and UI states. |

## Interfaces / Contracts

```ts
type RunStatus = 'queued' | 'started' | 'completed' | 'partial' | 'failed'
type Citation = { id: string; source: HydrologySource; stationId?: string; observedAt: string; sourceUrl?: string; kind: 'observed' | 'forecast' | 'alert'; freshness: 'fresh' | 'stale' | 'degraded' }
type CopilotMetadata = { citationMode: 'validated-context' | 'context-only' | 'none'; citations: Citation[]; unverifiedClaims: boolean }
```

`POST /api/hydrology/ingest` remains `202` and returns `runId`, `proofRunId`, and validated `statusPath`. `GET` reads PostgreSQL after restart, returns `404` only for unknown/expired rows, and exposes safe recovery diagnostics. Cron failures exit non-zero and never claim success.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/contract | State transitions, statusPath, slots, lease CAS, prune bounds, diagnostics, coverage gaps, citations, adapter preservation. | Node `--test` with deterministic clocks/DB fakes; schemas reject unsupported values. |
| Integration | Two instances, restart-safe status, partial failure, resumed source, SQL prune, one Cron admission, and PostGIS coverage joins. | API/Prisma scripts against configured PostgreSQL; fixtures never become evidence. |
| E2E | Overview/detail/ingest loading, empty, degraded, recovered, expired, forecast, coverage-gap, retry, and citations. | Playwright at desktop/mobile with API contract responses. |
| Runtime evidence | Provider/database correlation and Render ownership. | Record local real-provider + configured-DB evidence separately from commit-correlated production/Cron evidence; history is context only. |

## Threat Matrix

Routing/process boundary is applicable: fixed route allowlists, authenticated ingest, no command interpolation, bounded timeouts, and sanitized logs. Matrix rows:

| Matrix row | Applicability |
|---|---|
| Documentation-like paths | N/A — no executable classification. |
| Git repository selection | N/A — no VCS automation. |
| Commit state | N/A — no commit command. |
| Push state | N/A — no push command. |
| PR commands | N/A — no PR automation. |

Route/lease/Cron failure tests are covered above.

## Migration / Rollout

Apply additive migration and versioned coverage seed; deploy API before enabling Cron. Verify local restart/recovery and real provider/database evidence, then enable one Render Cron. Roll back by disabling Cron, reverting wiring, and isolating ledger rows; retain telemetry and adapter data. Production readiness remains unclaimed without revision-correlated evidence.

## Open Questions

- [ ] Confirm pilot retention duration and Render Cron schedule/time zone.
- [ ] Confirm authoritative municipality geometry/source version for the 17-versus-18 locality discrepancy.
