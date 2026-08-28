# Apply Progress: Agronautas Canonical Risk/Job Runtime Contract

## Cumulative State

**Mode:** Strict TDD  
**Completed:** 1.1–1.3, 2.1–2.5, 3.1–3.2, 3.4  
**Remaining:** 3.3 — authorized no-Docker API→Redis→worker→Postgres restart harness; not attempted or claimed.

### Tasks

- [x] 1.1–1.3 Contract, boundary, compatibility, readiness, and telemetry RED coverage.
- [x] 2.1–2.5 v2 schema/factory, admission, durable repository, single Python outcome coordinator, and legacy adapters.
- [x] 3.1 Readiness and bounded telemetry integration, including the corrective runtime guards recorded below.
- [x] 3.2 Formula-envelope refactor and verification checks, including the corrective runtime guards recorded below.
- [ ] 3.3 Authorized live runtime acceptance harness.
- [x] 3.4 Rollback confirmation and exclusion preservation.

## Corrective Fixes Applied

1. PostgreSQL and Python claim paths require `retry_at IS NOT NULL AND retry_at <= now` for waiting jobs; queued and expired-lease paths remain separate.
2. PostgreSQL worker mutators enforce legal source states and exact lease ownership. Terminal writes cannot rewrite completed/DLQ rows, and legacy completed reads remain mapped without rewriting history.
3. `WORKER_POSTGRES_DSN` no longer falls back to localhost. Agronautas queue messages are rejected before handling and remain recoverable in the processing list when durable storage is unavailable; Redis-only results are not ACKed.
4. Durable repository transitions emit bounded complete transition telemetry with identity, state, attempt, worker/lease, result/provider status, latency, and safe reason fields.

## TDD Cycle Evidence

| Task | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|
| 2.3 | Ownership, terminal-state, and legacy-read regressions written first. | API repository suite passed. | Queued, leased/running, retry, DLQ, and historical-read cases covered. | Central legal guards retained; historical reads unchanged. |
| 2.4 | Coordinator, ACK ordering, v2 routing, and unavailable tests written first. | Python worker suite passed. | Retry, exhaustion, persistence failure, scheduled unavailable, v1, and v2 paths covered. | Consumer delegates failure ownership to coordinator. |
| 2.5 | Historical snapshot and undecided-engine tests written first. | Contract/Zod suites passed. | v1 and v2 compatibility cases covered. | No history rewrite or engine selection claim. |
| 3.1–3.2 corrective fixes | Waiting-without-retryAt, illegal mutator state, missing DSN ACK, and complete telemetry tests written first; RED captured before production edits. | API repository suite 15/15 and Python worker suite 65/65 passed. | Due retry, terminal/worker ownership, missing durable config, and persisted telemetry metadata cases covered. | Extracted bounded transition emission and removed implicit PostgreSQL fallback. |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | API runtime/readiness/telemetry/scheduler suites: `pnpm exec tsx --test ...` — 44 passed. Python: `python -m pytest apps/workflow-runtime-python/tests -q` — 65 passed. Contracts: 6 tests passed, 10 JSON schemas validated, Agronautas schema validated, Zod suite 51 passed. |
| Runtime harness command/scenario and exact result | N/A — no authorized API→Redis→worker→Postgres boundary was available. Task 3.3 remains unchecked; no live or production claim was made. |
| Build command and exact result | `pnpm build` — all 11 workspace packages successful. Existing unrelated web lint warning remains non-blocking. |
| Rollback boundary | Revert the PostgreSQL claim/mutator/telemetry changes, Python DSN/consumer guards, their regression tests, and this progress/task evidence; retain v1/v2 legacy adapters, historical rows, scheduler-disabled defaults, and excluded marketplace/management/Iberá/provider/economics surfaces. |

## Preservation and Exclusions

Both risk engines remain callable with undecided engine metadata; historical records and v1/v2 boundaries remain intact. Scheduler remains disabled by default. Marketplace, management/identity/ownership, Iberá-Alerta, provider qualification, economics, autonomy, accuracy, calibration, production readiness, and live task 3.3 remain outside this apply.
