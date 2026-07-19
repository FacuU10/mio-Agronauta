# Tasks: Iberá Alerta Production Completion

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| Field | Value |
|-------|-------|
| Estimated changed lines | 450-550 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (A1) -> PR 2 (A2) -> PR 3 (B1) -> PR 4 (B2) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| A1 | Coverage migration/query | PR 1 | `npm run test packages/hydrology-engine` | Run test with PostgreSQL stub | Revert schema/query; disable coverage query |
| A2 | API/UI alerts | PR 2 | `npm run test apps/api` | Playwright local smoke tests | Revert UI/API alert rendering; disable endpoint projection |
| B1 | Local chat/cron harness | PR 3 | `npm run test apps/web` | Bounded ingest token execution | Revert Cron/proxy authorization; preserve previous telemetry |
| B2 | Render operator proof | PR 4 | `npm run test` (all) | Production operator receipt verification | Revert configuration files; disable cron schedule |

## Phase 1: A1 Coverage Migration/Query (TDD & Foundation)

- [x] 1.1 RED: Write falling test for coverage query in `packages/hydrology-engine/src/hydrology-engine.test.ts`.
- [x] 1.2 Create additive coverage migration in `apps/api/prisma/migrations/..._municipality_alert_coverage/migration.sql`.
- [x] 1.3 Create versioned, idempotent, reviewed coverage seed script in `apps/api/src/infrastructure/database/postgres/seed-municipality-alert-coverage.ts`.
- [x] 1.4 GREEN: Implement `municipality_alert_coverage` queries & join in `packages/hydrology-engine/src/repository.ts`.
- [x] 1.5 REFACTOR: Clean up query logic and verify seed idempotency/rollback paths.

## Phase 2: A2 API/UI Alerts (Core Experience)

- [x] 2.1 RED: Write falling route tests for canonical response and officialAlerts[] contract in `apps/api/src/presentation/routes/hydrology-government.test.ts`.
- [x] 2.2 GREEN: Update API route `apps/api/src/presentation/routes/hydrology-government.ts` to return canonical contract with joined `officialAlerts`.
- [x] 2.3 RED: Write accessibility/rendering tests for current/empty alerts in `apps/web/src/components/government/{overview,detail}.test.tsx`.
- [x] 2.4 GREEN: Update `overview.tsx` and `detail.tsx` in `apps/web/src/components/government/` to render alerts/provenance without policy logic.
- [x] 2.5 E2E: Create Playwright E2E alert matching/no-alert scenarios in `apps/web/tests/e2e/municipalities-alerts.spec.ts`.

## Phase 3: B1 Local Chat/Cron Harness (Operations)

- [x] 3.1 RED: Add token validation and partial failure tests in `apps/api/src/presentation/routes/hydrology-government.test.ts`.
- [x] 3.2 GREEN: Secure ingest endpoint `POST /api/hydrology/ingest` and implement token forwarding/partial source retention.
- [x] 3.3 Create local verification harness to simulate Cron ingest, regional proxy, and Groq streaming with degraded mock states.

## Phase 4: B2 Render Operator Proof (Handoff & Proofs)

- [x] 4.1 Update runbook `docs/runbooks/ibera-alerta-hydrology-ingest-scheduler.md` with exact secret names, Cron headers, regional Runner/BFF requirements, safe commands, and migration rollback sequence.
- [x] 4.2 Define and test `ibera-alerta-operator-v1` receipt schema for redacted inventory, request/proofRunId, source outcomes, `202` response shape, row correlation, and no secrets/raw chat.
- [x] 4.3 Remove the proven-unused temporary B1 harness, update stale mocked Playwright fixtures to the canonical contract, and verify the full build/test path; production operator execution remains a manual gate.

## Corrective Apply: Groq Integration Hardening

- [x] C.1 RED/GREEN/REFACTOR: Replace the hydrology Copilot stale model literal with explicit `GROQ_MODEL` configuration and the current default, preserving existing configuration compatibility.
- [x] C.2 RED/GREEN/REFACTOR: Add bounded `AbortController` timeouts to hydrology streaming and the generic Groq JSON client, with timeout tests.
- [x] C.3 RED/GREEN/REFACTOR: Ensure field and municipal Copilot SSE failures emit only stable safe reasons, never raw provider messages; preserve the deterministic missing-key fallback.
- [x] C.4 Verify affected package builds/tests without claiming real Groq or Render Cron execution.

## Operational Evidence Gate (not an implementation task)

- [ ] Future/non-blocking operator task: execute one API or regional BFF Cron request, correlate `proofRunId` to `hydrology_ingestion_runs`, and attach the external execution record plus a validated redacted receipt. Do not mark this gate complete from local tests or configured Render values alone.
