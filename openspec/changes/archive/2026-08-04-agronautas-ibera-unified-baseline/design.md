# Design: Agronautas–Iberá Current-Compatible Render Native Node Baseline

## Technical Approach

Implement the missing Render slice directly on canonical `76ecb41` without importing branch, worktree, stash, or historical lockfile state. Strict TDD adds RED contract tests first, then a minimal `render.yaml` and an injectable API port resolver. Existing application, health, readiness, scheduler, dependency, and product boundaries remain authoritative.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| API port | Export `resolveApiPort(env)` from `apps/api/src/server.ts`; select non-blank `PORT`, then `API_PORT`, then numeric `3001`; reject non-positive/non-integer selected values before `listen`. | Render supplies `PORT`; `API_PORT` remains the local-compatible fallback when `PORT` is absent. Resolving at `startServer()` avoids import-time environment capture. |
| Render topology | Exactly two Native Node web services, `agronautas-api` and `agronautas-web`; no Python worker. | Matches current package scripts and preserves API/web and Agronautas/Iberá-Alerta boundaries. A worker requires a separate contract and is explicitly out of scope. |
| Dependency state | Do not modify `apps/web/package.json` or `pnpm-lock.yaml` unless a current script validation proves it necessary; never copy `merge-total` state. | Direct inspection of canonical `continuation/agronautas-ibera-unified-2026-08-04` at `76ecb41` shows `apps/web/package.json` declares `next: ^15.0.0` and `pnpm-lock.yaml` resolves Next.js to 15.5.19. Historical `merge-total` (`b2b6ffc`) declares/resolves 15.5.20; it is not authoritative. Conflicting canonical/old-merge version wording in exploration/spec is stale historical context, so tests must protect the actual canonical lock state. |
| Readiness | Keep `/health` liveness 200 and `/ready` dependency-derived 200/503 with safe revision/configuration metadata. | Render configuration must not turn controlled readiness tests into deployment, provider, database, or production evidence. |

## Data Flow

```text
Render PORT/API_PORT -> resolveApiPort -> API listen
Render API service -> /health, /ready, /api/hydrology, /agronautas routes
Web service -> AGRONAUTAS_API_INTERNAL_URL -> API BFF proxies
API env -> existing runtime config / scheduler flags / provider adapters
```

`render.yaml` uses current commands: API builds `zod-schemas`, `hydrology-engine`, then `apps/api`; web uses its existing `apps/web` build script. Both start through their package scripts. API declares current connection, ingest, Groq, trust-proxy, revision/runtime, and scheduler variables; secrets use `sync: false`. Web declares `PORT`, `AGRONAUTAS_API_INTERNAL_URL`, and existing BFF variables. Both scheduler flags are literal `false`; no Python service or worker command is declared.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/src/server.ts` | Modify | Add typed, testable port resolution and use it at startup. |
| `apps/api/src/server.test.ts` | Modify | RED/GREEN tests for precedence, fallback, blank values, and malformed ports. |
| `apps/api/src/build-config.test.ts` | Modify | Assert manifest service count/runtime, exact script-valid commands, env names, disabled schedulers, no worker/Docker, and canonical dependency/lock preservation. |
| `render.yaml` | Create | Minimal two-service Native Node manifest derived from current scripts. |
| `apps/web/package.json`, `pnpm-lock.yaml` | Preserve | No historical dependency or lockfile replacement. |

## Interfaces / Contracts

```ts
export function resolveApiPort(env: NodeJS.ProcessEnv = process.env): number
// PORT > API_PORT > 3001; malformed selected values throw deterministically.
```

Health tests remain controlled by injected dependency checks. `/ready` must not acquire data or expose secrets; existing route-prefix mounts and separate `/api/hydrology` and `/agronautas` capability areas remain unchanged.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Port precedence and failure behavior | `server.test.ts`, RED before implementation. |
| Contract/integration | Manifest commands, env policy, service topology, scheduler/worker exclusions, package/lock invariants | Extend `build-config.test.ts` using current text/package readers; no new YAML dependency. Run API tests and `pnpm test`. |
| Health contract | Liveness/readiness status and safe fields | Existing controlled `health.test.ts`; no live provider/database calls. |
| Build | Workspace build order and package scripts | `pnpm build`; no Docker. |

## Threat Matrix

The change has shell/process integration through fixed Render build/start commands; command safety is covered by exact script assertions and no user-controlled interpolation. The reference matrix rows are explicitly not applicable:

| Boundary | Applicability | Expected behavior / RED test |
|---|---|---|
| Documentation-like paths | N/A — no executable documentation classification | No test. |
| Git repository selection | N/A — no Git command automation | No test; branches/worktrees remain untouched. |
| Commit state | N/A — no commit automation | No test. |
| Push state | N/A — no push automation | No test. |
| PR commands | N/A — no PR automation | No test. |

## Migration / Rollout

No migration required. Apply as a focused Render/API/test change; rollback by reverting only those files. Do not delete or mutate old branches, worktrees, stashes, or archives. Evidence is limited to static contracts, controlled tests, and local build results; no deployment or production runtime claim is permitted.

## Open Questions

None. Direct canonical inspection resolved the version conflict: preserve canonical Next.js 15.5.19; treat contrary 15.5.20 claims in exploration/spec and historical branch material as stale historical text.
