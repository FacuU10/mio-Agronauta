# Design: Iberá-Alerta Production Proof Recovery

## Technical Approach

Convert readiness proof into a typed, source-scoped evidence path. Keep UI dumb: backend/API owns ingest, diagnostics, DB correlation, and redaction; web pages only render existing hydrology contracts. To avoid the observed production POST timeout/no-body, verification performs **one bounded POST per source** (`PNA`, `INA`, `INMET`, `SMN`) with a shared `proofRunId`, not one long all-source request. Tests/build/lint remain required TDD evidence, but only real local + `https://www.agronauta.com.ar` runtime proof can close the gate.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Proof correlation | Add `proofRunId` request/response field and persist it on `hydrology_ingestion_runs` via Prisma/SQL migration. | Infer by timestamp only. | Current table has no run ID column; source+time is useful fallback but not strict correlation. |
| Timeout recovery | Evidence script calls `POST /api/hydrology/ingest` once per source with no retries/polling. | Single all-source POST; background job polling. | One source cannot consume the whole platform timeout, and each provider remains independently classified. |
| Async completion observation | The bounded POST returns a relative `statusPath`; the verifier performs one GET with a server-side wait capped at 60 seconds and accepts only a terminal, proof-correlated response. | Treat the immediate `202 queued` body as provider evidence; client polling. | Background work must be observable without extending the POST timeout or introducing polling/retries. |
| Provider diagnostics | Extend hydrology clients to return safe success/failure HTTP summaries: host, path, status, elapsed, timeout, attempts=1, response bytes/chars where bounded. | Raw body capture; mocks/fixtures. | Specs require real upstream proof without secrets or credential leakage. |
| DB proof | Add a read-only evidence query module/script that accepts DB URL from env, redacts target, and returns row IDs/counts per `proofRunId`+source. | Print connection strings; mutate DB for proof. | Remote production DB evidence must be safe, current, and non-destructive. |

## Data Flow

```text
verify script ── proofRunId ──→ BFF/API POST /api/hydrology/ingest {source}
  └─ per source once             └─ client fetch official feed once
  verify script ── one bounded GET /api/hydrology/ingest/{runId}?waitMs=60000 ──→ terminal result
                                  └─ repository saves telemetry + ingestion_run(proofRunId)
                                  └─ 202 result with safe diagnostics
verify script ── read-only SQL ──→ hydrology_ingestion_runs / hydrology_telemetry
verify script ── browser ───────→ /municipalities and /municipalities/{id}
```

## File Changes

| File | Action | Description |
|---|---|---|
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add `proofRunId`, source-run timestamps, and `httpSummary` to ingest contracts; keep diagnostics strict/redacted. |
| `apps/api/prisma/schema.prisma` + migration | Modify/Create | Add nullable indexed `proof_run_id` to `HydrologyIngestionRun`; no destructive migration. |
| `packages/hydrology-engine/src/types.ts` | Modify | Add `proofRunId` to `IngestionRunInput`. |
| `packages/hydrology-engine/src/repository.ts` | Modify | Persist `proof_run_id`; add read-only correlation query helper or repository method. |
| `packages/hydrology-engine/src/clients/http-clients.ts` | Modify | Return success/failure HTTP summaries for PNA/INA/INMET/SMN with bounded response metadata; no raw bodies. |
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Propagate `proofRunId`, keep source failures as 202 results, classify startup/BFF failures safely, and never use fixture fallback outside tests. |
| `apps/api/src/scripts/verify-hydrology-local-real.ts` | Replace/extend | Produce matrix JSON: local API, remote DB read-only rows, production API, browser evidence references; exactly one request per source/environment. |
| `apps/web/src/app/api/hydrology/[...path]/route.ts` | Modify | Add bounded upstream timeout + classified 502/503 details without secrets to repair local BFF 503 proofability. |
| `apps/web/tests/e2e/hydrology-government.spec.ts` | Create | Playwright role/text/test-id proof for local and production base URLs. |
| `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` | Modify | Document one-shot proof commands, required envs, redaction, deploy, and rollback. |

## Interfaces / Contracts

`POST /api/hydrology/ingest` accepts `{ contractVersion: "1.0.0", source: HydrologySource, reason, proofRunId }`. The queued `hydrology-government-ingest-v1` response returns `runId`, `proofRunId`, and a relative `statusPath`; one bounded GET on that path returns the terminal `results[].httpSummary`, `results[].diagnostic`, and timestamps. A queued response is never provider evidence. Evidence JSON shape: `{ proofRunId, sourceMatrix: [{ source, localApi, localDb, prodApi, prodDb, browser, status }] }`.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| RED unit/contract | `proofRunId`, safe `httpSummary`, one attempt, redaction | Node tests in zod, API route, repository, clients. |
| GREEN runtime | Real PNA/INA/INMET/SMN local code + remote DB | `verify-hydrology-local-real.ts`; one POST per source; no mocks/retries. |
| E2E/browser | `/municipalities` + detail render all source states | Playwright role/text/test-id selectors locally and with `PLAYWRIGHT_BASE_URL=https://www.agronauta.com.ar`. |

## Migration / Rollout

After explicit apply approval: pre-cambios backup, implement TDD slices, deploy migration + API + web to main/deployment branch, run one local proof matrix, deploy, run one production matrix, then commit post-cambios. Rollback by reverting deploy commit(s) and migration if unused; keep audit artifacts.

## Open Questions

- [ ] BLOCKER before verify/archive: deployment access and post-deployment production proof authority remain required; the direct ingest endpoint intentionally has no bearer-token dependency and retains rate limiting, one-at-a-time overlap protection, and bounded source execution.
