# Tasks: Agronautas–Iberá Current-Compatible Render Native Node Baseline

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120–220 authored lines across four files |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single focused change |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Port resolver plus two-service Render contract | PR 1 | `pnpm --dir apps/api test` | N/A — static manifest and controlled health/readiness tests; no deployment/provider/database runtime | Revert only `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, `apps/api/src/build-config.test.ts`, and `render.yaml`; preserve all refs and WIP states |

## Phase 1: Preservation and RED Contracts

- [x] 1.1 Record before-state with `git status --short --branch`, `git branch --list`, `git worktree list --porcelain`, and `git stash list`; use canonical `continuation/agronautas-ibera-unified-2026-08-04` only and do not merge/apply/delete any source state.
- [x] 1.2 **RED** — Extend `apps/api/src/server.test.ts` for valid `PORT > API_PORT > 3001`, blank values, whitespace, missing values, and deterministic rejection of non-positive/non-integer selected values before `listen`.
- [x] 1.3 **RED** — Add a controlled readiness regression in `apps/api/src/server.test.ts` proving `/health` stays 200 and `/ready` remains dependency-derived 200/503 with safe revision/configuration fields and no acquisition/provider/database calls.
- [x] 1.4 **RED** — Extend `apps/api/src/build-config.test.ts` to require exactly two Native Node services, exact script-valid build/start commands, fixed command text with no Docker or interpolation, API/web environment names, both scheduler flags `false`, and no Python worker; assert Agronautas/Iberá capability boundaries remain separate.
- [x] 1.5 **RED** — In `apps/api/src/build-config.test.ts`, assert canonical `apps/web/package.json` remains `next: ^15.0.0` and `pnpm-lock.yaml` resolves Next.js `15.5.19`; fail on package/lock replacement or downgrade from canonical.

## Phase 2: Minimal GREEN Implementation

- [x] 2.1 Update `apps/api/src/server.ts` with typed exported `resolveApiPort(env)`, trimming blank values, validating the selected positive integer, and resolving at `startServer()` without import-time environment capture; leave health, readiness, and scheduler wiring unchanged.
- [x] 2.2 Create `render.yaml` with exactly `agronautas-api` and `agronautas-web` Native Node web services, current workspace build/start scripts, non-secret environment declarations with `sync: false` for secrets, and disabled in-process schedulers; declare no worker, Docker, product-unifying route, or unsupported runtime claim.
- [x] 2.3 Keep the implementation diff limited to `server.ts`, `server.test.ts`, `build-config.test.ts`, and `render.yaml`; do not modify `apps/web/package.json`, `pnpm-lock.yaml`, branches, worktrees, stashes, or historical evidence.

## Phase 3: Verification and Evidence

- [x] 3.1 Run `pnpm --dir apps/api test`; capture RED-to-GREEN evidence for every port, readiness, manifest, scheduler/worker, command-safety, and Next 15.5.19 lock assertion.
- [x] 3.2 Run `pnpm test`, `pnpm build`, and `git diff --check`; record exit codes and distinguish local controlled-test/build evidence from any prohibited deployment/provider/database/production claim.
- [x] 3.3 Re-run the preservation commands from 1.1 and `git diff --name-only`; confirm only the four allowed files changed and all original branches, worktrees, and stashes remain present and untouched.
