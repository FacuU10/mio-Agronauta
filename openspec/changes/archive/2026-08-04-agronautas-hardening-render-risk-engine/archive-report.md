# Archive Report: Agronautas Render and Risk-Engine Hardening

schema: gentle-ai.archive-report/v1
change: agronautas-hardening-render-risk-engine
project: monorepo-js-baseline
branch: continuation/agronautas-ibera-unified-2026-08-04
archive_date: 2026-08-04
mode: hybrid
status: intentional-with-warnings
verdict: incomplete

## Closure decision

The change is archived truthfully as incomplete/with warnings. All 16 persisted implementation tasks are checked complete, and the focused API, Python worker, contracts, web, Playwright, Prisma, and sequential build evidence passed. A prior bounded configured-service run also reached durable worker completion with risk lineage and was cleaned up.

This is not a full pass. The final verification report is `FAIL / BLOCKED`: the full API suite still has the unrelated Groq degraded-chat failure, the root and isolated hydrology suites still have the unrelated finite-retry failure, and fresh non-receipt read-back, alert transaction, retry/DLQ, and readiness-heartbeat evidence is unavailable. The worker result intentionally carries no alert snapshot IDs. No critical issue was silently overridden.

## Artifact review

| Artifact | Result |
|---|---|
| proposal.md | Present and reviewed |
| specs/agronautas-hardening/spec.md | Present and reviewed |
| design.md | Present and reviewed |
| tasks.md | Present; 16/16 implementation tasks checked |
| apply-progress.md | Present; corrective slice complete with explicit evidence limits |
| verify-report.md | Present; final verdict FAIL / BLOCKED, 3 critical findings |
| Engram artifacts | Proposal, spec, design, tasks, apply-progress, and verify-report found; no review receipt topics found |

## Spec sync

No main Agronautas spec existed under `openspec/specs/`. The delta is therefore retained as the complete archived capability spec; no unrelated `ibera-alerta` main spec was modified. Iberá-Alerta remains separate and its existing source-of-truth spec is preserved unchanged.

## Evidence and warnings

- Focused evidence passed: API Agronautas 61/61, Python worker 35/35, Python focused 29/29, contracts 5 tests and 8 schemas, web 92/92, mocked Iberá Playwright 2/2, Prisma validation/status, and sequential build 4/4.
- Previous bounded real run established API admission, Redis envelope, worker claim/heartbeat, PostgreSQL completed state, attempt 1, Open-Meteo lineage, and cleanup. It does not substitute for fresh archive-time evidence.
- Full verification remains failed by the known Groq test and hydrology retry test. These are outside this change but remain recorded rather than relabeled.
- No fresh non-receipt field-to-source-to-job-to-snapshot-to-alert read-back was available. Live retry, restart, exhausted DLQ, and readiness heartbeat transitions were not exercised.
- `risk-v0` and `open-meteo-basic-v1` remain divergent; the canonical risk-engine gate remains `{ status: "undecided", engineId: null }`.
- Render remains exactly the two Native Node services. No Python Render service or Docker runtime was added.
- Iberá-Alerta evidence and source remain excluded from Agronautas correctness claims.
- Branch, worktrees, and stashes were preserved. No branch/worktree/stash was created, switched, deleted, or modified.

## Archive contents

This folder contains the complete change audit trail: proposal, exploration, design, delta specs, tasks, apply progress, verify report, and this archive report. The archived task artifact has no unchecked implementation tasks.

## Follow-up before any full-pass claim

Provide a safe non-receipt recompute harness with canonical camelCase read-back and live alert-generation assertion; add live retry/DLQ and readiness-heartbeat probes; and resolve the unrelated Groq and hydrology failures.
