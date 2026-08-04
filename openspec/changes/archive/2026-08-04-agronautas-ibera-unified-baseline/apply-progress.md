# Apply Progress: Agronautas–Iberá Current-Compatible Render Native Node Baseline

**Change:** `agronautas-ibera-unified-baseline`  
**Project:** `monorepo-js-baseline`  
**Mode:** Strict TDD  
**Canonical baseline:** `continuation/agronautas-ibera-unified-2026-08-04` at `76ecb41`  
**Delivery:** single focused work unit; workload forecast low; no chain required  
**Scope boundary:** only `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, `apps/api/src/build-config.test.ts`, and `render.yaml` were implementation files; OpenSpec progress is tracked separately.

## Completed Tasks

### Phase 1 — Preservation and RED Contracts

- [x] 1.1 Preservation state recorded before implementation. The canonical worktree remained on `continuation/agronautas-ibera-unified-2026-08-04` at `76ecb41`; no branch, worktree, stash, or source state was merged, applied, deleted, or modified.
- [x] 1.2 RED port tests added for precedence, blanks, fallback, and deterministic invalid selected values.
- [x] 1.3 RED controlled health/readiness regression added with injected dependency outcomes and acquisition counters.
- [x] 1.4 RED Render topology, command, environment, scheduler, worker, Docker/interpolation, and separated-route assertions added.
- [x] 1.5 RED canonical package/lock assertions added for `apps/web/package.json` `next: ^15.0.0` and `pnpm-lock.yaml` `next@15.5.19`; no `15.5.20` lock resolution is accepted.

### Phase 2 — Minimal GREEN Implementation

- [x] 2.1 Added exported `resolveApiPort(env): number`; it trims blanks, selects `PORT` then `API_PORT` then `3001`, rejects malformed/non-positive/unsafe selected values, and is called inside `startServer()` rather than captured at import time.
- [x] 2.2 Added a minimal two-service Native Node `render.yaml` using current workspace build/start scripts, named environment variables, secret `sync: false` entries, and both scheduler flags set to literal `false`.
- [x] 2.3 Confirmed implementation paths contain no changes to `apps/web/package.json`, `pnpm-lock.yaml`, branches, worktrees, stashes, or historical evidence.

### Phase 3 — Verification and Evidence

- [x] 3.1 Focused API contract tests pass after GREEN: 18 tests, 18 passed, 0 failed; the restored pre-existing build-config coverage is preserved.
- [x] 3.2 Root test/build/diff checks executed. `pnpm build` passed; `git diff --check` passed. The final full API run has 202 tests, 201 passed, 1 unrelated pre-existing failure in `apps/api/src/presentation/routes/agronautas.test.ts` (`POST /fields/:id/chat cae a modo degradado cuando Groq no está disponible`, expected `true`, actual `false`); no unrelated failure was fixed.
- [x] 3.3 Preservation state rechecked: canonical branch, all three worktrees, and both stashes remained present; implementation diff names only the three tracked API files plus untracked `render.yaml`.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.2 / 2.1 | `apps/api/src/server.test.ts` | Unit | ✅ Existing server tests 3/3 passed | ✅ Initial run failed because `resolveApiPort` did not exist | ✅ Focused run passed 18/18 | ✅ Precedence, blanks, fallback, zero, decimal, text, and both selected variables | ✅ Startup resolution moved to `startServer()`; focused run remained 18/18 |
| 1.3 | `apps/api/src/server.test.ts` | Controlled integration | ✅ Existing server tests 3/3 passed | ✅ Test added before implementation; controlled health/readiness regression exercised current route | ✅ Health 200/readiness 503 assertion passed | ✅ Both liveness and dependency-derived failure paths; Mongo/worker acquisition counters remained 0 | ➖ None needed; existing injected route seam was retained |
| 1.4 / 1.5 / 2.2 | `apps/api/src/build-config.test.ts` | Contract/unit | ⚠️ Pre-edit baseline was not isolated; original tests were restored and final 12/12 build-config tests passed | ✅ Initial run failed because `render.yaml` did not exist | ✅ Manifest/package/lock assertions passed; focused run 18/18 | ✅ Separate topology, commands/routes, env/schedulers/secrets, and Next 15.5.19 cases | ✅ Bracket notation and regex helper fixed strict TypeScript/test issues; focused run remained 18/18 |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/api exec node --import tsx --test src/server.test.ts src/build-config.test.ts` → exit 0; TAP `1..18`, `# tests 18`, `# pass 18`, `# fail 0`. |
| Runtime harness command/scenario and exact result | N/A — this work unit has only static Render manifest assertions and controlled in-process health/readiness tests. Docker, deployment, provider, database, and production runtime acquisition were explicitly not run or claimed. |
| Rollback boundary | Revert only `apps/api/src/server.ts`, `apps/api/src/server.test.ts`, `apps/api/src/build-config.test.ts`, and `render.yaml`; preserve all branches, worktrees, stashes, historical evidence, and product UI. |

## Additional Verification

| Command | Exit/result | Evidence boundary |
|---|---|---|
| `pnpm --dir apps/api test` | Exit 1; 202 tests, 201 passed, 1 failed at the pre-existing Agronautas Groq-degraded route assertion | Local API suite only; failure is outside this change's four-file boundary |
| `pnpm test` | Exit 1; final API task reports 202 tests, 201 passed, 1 failed; web tests completed successfully | Local monorepo tests only; no provider/database/deployment result claimed |
| `pnpm build` | Exit 0; Turbo 4/4 build tasks successful; Next.js 15.5.19 build compiled and generated routes | Local build/type-check evidence only; one pre-existing unused-React warning in `apps/web/src/app/municipalities/ingest/page.test.tsx` |
| `git diff --check` | Exit 0; only line-ending normalization warnings from Git | Diff hygiene only |

## Deviations and Issues

- The design/spec history contains stale prose mentioning Next.js `15.5.20`; current canonical inspection and the executable lock assertion use the actual canonical resolution `15.5.19` as required by the implementation brief.
- Full API/root test commands remain non-zero because of the unrelated existing Groq-degraded Agronautas route assertion. The focused Render/API tests and build pass.
- No deployment, provider, database, Docker, Python worker, or production result is claimed.

## Status

All 11 implementation and verification tasks are marked complete in `tasks.md`. The focused work unit is ready for `sdd-verify`, with the unrelated pre-existing full-suite regression and the missed isolated build-config safety-net capture reported above.
