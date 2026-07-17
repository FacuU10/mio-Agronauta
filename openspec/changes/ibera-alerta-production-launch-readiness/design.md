# Design: Iberá-Alerta Production Launch Readiness

## Technical Approach

Make only the corroborated R2-001/R3-001 corrections, retaining the existing Express coordinator, repository, Next BFF, and presentational municipality UI. Reuse the one-shot verifier’s `proofRunId` matrix for local and post-Render evidence. A release passes only when each source has one POST, one terminal observation, DB correlation, API/BFF evidence, and browser evidence at `https://www.agronauta.com.ar/municipalities` after the expected cold start.

## Architecture Decisions

| Decision | Options / tradeoff | Choice and rationale |
|---|---|---|
| Unsupported Copilot zone | Invent a nearest zone; reject with validated empty context | Preserve `zone: null`, empty sources/stations/telemetry, and the existing official-data recommendation. It is valid schema context and prevents fabricated geography/data (R2-001). |
| Source execution | One shared/all-source run; per-source coordinator admission | Keep `HydrologyIngestionCoordinator` with per-source requests and source-local result persistence. A failure/skip/empty state is reported for that source without preventing independent sources (R3-001). |
| Evidence | Tests/build; correlated one-shot matrix | Extend the existing verifier’s typed evidence cells and `proofRunId`. It is bounded (no retries/polling) and relates every claim to an execution. |
| Source semantics | Normalize alerts as rain; preserve metric | PNA/INA remain numeric hydrology. INMET/SMN remain `storm_alert`, `value: null`, and province-alert UI only; municipality cards continue to derive risk from PNA/INA. |
| Deployment rollback | Edit data or broad rollback; revert slice | Revert only the failing stacked slice, redeploy the prior main revision, and retain sanitized evidence. No migration or telemetry rollback. |

## Data Flow

    source POST (PNA | INA | INMET | SMN)
      -> Express coordinator / source client -> repository + ingestion-run row
      -> terminal status GET -> verifier proofRunId DB query
      -> /api/hydrology BFF -> /municipalities browser assertion

The verifier records request/status correlation, source result, provider HTTP summary, read-only DB row, BFF response, and browser state in one redacted matrix. Any non-terminal, missing, failed, empty (unless explicitly permitted by the existing verifier), missing DB/BFF/UI cell, or wrong canonical host blocks launch.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/presentation/routes/hydrology-government.ts` | Modify | Bound Copilot context handling and independent source coordination/status behavior. |
| `apps/api/src/presentation/routes/hydrology-government.test.ts` | Modify | RED-first regressions for R2-001/R3-001 and terminal observation. |
| `packages/hydrology-engine/src/repository.ts` | Modify | Preserve correlated run persistence and alert station/metric semantics if the correction requires it. |
| `packages/hydrology-engine/src/hydrology-engine.test.ts` | Modify | RED-first persistence/semantic regression coverage. |
| `apps/api/src/scripts/verify-hydrology-local-real.ts` | Modify | Produce redacted per-source local/production evidence cells without retries or polling. |
| `apps/api/src/scripts/verify-hydrology-local-real.test.ts` | Modify | RED-first one-POST/one-GET, correlation, and release-block rules. |
| `apps/web/src/app/api/hydrology/[...path]/route.test.ts` | Modify | Cover canonical BFF forwarding and safe upstream failure evidence. |

## Interfaces / Contracts

No public contract expansion. Existing contracts remain authoritative:

```ts
type EvidenceCell = { status: 'pass' | 'blocked' | 'not_run'; detail: string; evidence?: Record<string, unknown> }
type SourceMatrixRow = { source: HydrologySource; localApi: EvidenceCell; providerHttp: EvidenceCell; localDb: EvidenceCell; prodApi: EvidenceCell; prodDb: EvidenceCell; browser: EvidenceCell; status: 'pass' | 'blocked' }
```

`HydrologyIngestionResponse` retains `runId`, `proofRunId`, `statusPath`, terminal status, and source results. Secrets, tokens, raw DB connection data, and unredacted provider payloads are excluded from artifacts.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | R2 empty unsupported-zone context; R3 source isolation; `storm_alert` null value | Write failing Node tests first, implement minimum change, refactor only after green. |
| Integration | POST then one terminal GET, run-row correlation, BFF config/failure propagation | Red tests against route/verifier fakes; run focused package/API tests and `pnpm test`. |
| E2E / smoke | Canonical Render cold start, BFF and `/municipalities` source states | After commit-correlated deployment wait ~2 minutes; one request/terminal observation per source, read-only DB matrix, then Playwright snapshot/assertion using observed accessible content. No polling/retries. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable-file classification | None | None |
| Git repository selection | N/A — no VCS command execution | None | None |
| Commit state | N/A — no commit operation | None | None |
| Push state | N/A — no push operation | None | None |
| PR commands | N/A — no PR automation | None | None |

## Migration / Rollout

No migration required. Deliver stacked slices: correction/tests, verifier/evidence, then main/Render smoke. Stop release on any blocked evidence cell; rollback the affected slice and redeploy the prior main revision.

## Next Phase

The immediate next phase is `sdd-tasks`. It will turn this design into reviewable, one-session implementation slices: correction/tests, verifier/evidence, then main/Render smoke. No delivery slice is authorized directly from this design; task planning must first define sequencing, strict TDD evidence, verification commands, rollback boundaries, and the review-workload forecast.

## Open Questions

- [ ] Confirm deployment authority and read-only production DB access before the Render smoke slice.
