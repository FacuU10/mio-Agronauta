# Proposal: Agronautas–Iberá selective Render baseline

## Intent

Use `continuation/agronautas-ibera-unified-2026-08-04` at `76ecb41` as the sole baseline and recover only validated Render Native Node integration. Preserve all branches, worktrees, stashes, and canonical WIP.

## Scope

### In Scope
- Classify sources and define preservation rules.
- Resolve `PORT`; create a manifest from current scripts; preserve versions and API/web, scheduler, and worker boundaries.
- Add strict TDD coverage; no Docker.

### Out of Scope
- Wholesale merges/cherry-picks from old branches, dirty worktrees, or stashes.
- Provider/database/deployment/production claims; Python worker enablement; domain/UI unification.

## Capabilities

### New Capabilities
- `render-native-node-baseline`: Render manifest, port contract, boundaries, and tests.

### Modified Capabilities
- None. Agronautas and Iberá-Alerta requirements remain separate and unchanged.

## Source Classification

| Sources | Classification / decision |
|---|---|
| `main`, `pre-cambios`, committed integration history | **Already present**; canonical descendants are authoritative. |
| Render slice in `merge-total` and dirty integration worktree | **True missing advance**; re-derive from current symbols/scripts under tests. |
| `post-cambios`, `agronauta-features`, release/Render evidence | **Historical-only**; preserve context, never current proof. |
| Old `merge-total` Groq/hydrology/lock state; stash implementation patches | **Superseded**; retain canonical behavior and versions. |
| Readiness worktree; recovery/build-state stash material | **Unsafe recovery state**; exclude; do not apply/delete. |

## Approach

Use canonical only. RED tests establish `PORT > API_PORT > local fallback`, manifest/environment, disabled schedulers, absent Python worker, and lock versions; GREEN adds minimal `render.yaml`; REFACTOR preserves boundaries. Render is not deployment evidence.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/server.ts`, tests | Modified | Port contract. |
| `render.yaml`, `apps/api/src/build-config.test.ts` | New | Services and assertions. |
| `apps/web/package.json`, `pnpm-lock.yaml` | Preserve | Change only if required. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Port/lockfile drift breaks contracts | Med | RED tests and version assertions. |
| Historical evidence becomes runtime proof | High | Label evidence historical; make no live claims. |

## Rollback Plan

Revert the focused Render/API test and manifest commit(s). Never delete or mutate branches, worktrees, stashes, or archives.

## Dependencies

- Canonical scripts/configuration, pnpm 9/Turborepo, and Render Native Node; Docker prohibited.

## Success Criteria

- [ ] Strict TDD proves port, manifest, boundaries, and versions.
- [ ] Only validated Render contracts are added; both products remain unchanged and separate.
- [ ] No deployment, provider, database, or production result is claimed.

## Proposal question round

Recorded for later product review; assumptions: Render only, no product merge, immutable history.
- Confirm `PORT > API_PORT > 3001` and current environment names.
- Confirm Python worker deployment waits for a separate contract.
