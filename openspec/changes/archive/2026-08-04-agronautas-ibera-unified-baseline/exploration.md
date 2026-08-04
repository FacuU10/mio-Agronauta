# Exploration: Agronautas–Iberá unified integration baseline

**Change:** `agronautas-ibera-unified-baseline`  
**Project:** `monorepo-js-baseline`  
**Artifact mode:** hybrid (OpenSpec + Engram)  
**Canonical baseline:** `continuation/agronautas-ibera-unified-2026-08-04` at `76ecb41`  
**Scope:** read-only integration investigation; application code was not modified.

## Current State

The canonical worktree is clean and contains the local data-first Agronautas/Iberá-Alerta continuation plus the current OpenSpec artifacts. `main` is at `7a3007a`; the canonical branch is one commit ahead through `76ecb41`, which adds the data-first evidence-state work and its acceptance artifacts. The canonical line already contains the earlier `pre-cambios` and integration-line implementation history, including current hydrology ingestion hardening, Groq handling, municipality alert coverage, and the applied Agronautas/Iberá UI work.

The two products remain distinct:

- **Agronautas:** field intake, field/risk/alert dashboards, recompute/runtime boundaries, Agronautas Copilot, and the data-first evidence-state UI under `apps/web/src/components/agronautas` and `apps/api/src/presentation/routes/agronautas.ts`.
- **Iberá-Alerta:** Corrientes municipality telemetry, PNA/INA/INMET/SMN ingestion, municipal alerts, hydrology Copilot, and protected ingest under `apps/web/src/components/government` and `apps/api/src/presentation/routes/hydrology-government.ts`.

The current canonical hydrology path is materially newer than the old `merge-total` snapshot: `PnaHttpClient` has bounded request/total timeouts, two-attempt retry behavior and attempt diagnostics; official response bodies are size-bounded; the government route derives freshness from persisted ingestion runs, sanitizes official alert text, records source attempts, and maps Groq timeout/disconnect behavior to safe SSE outcomes. The current hydrology Copilot also treats a missing `GROQ_API_KEY` as unavailable and propagates disconnect aborts.

The current canonical line does **not** contain `render.yaml` or the active Render deployment spec. It does contain the runtime/config/test foundations needed to evaluate a Render Native Node manifest, but `apps/api/src/server.ts` currently resolves the port from `API_PORT` with a local fallback rather than exporting a `PORT`-first resolver. That is a real candidate gap, not evidence that a Render deployment is working.

The current OpenSpec evidence is concentrated in `agronautas-ibera-data-first-ux-ondemand`, Agronautas production-readiness/ingestion changes, Iberá hydrology changes, and archived Iberá completion material. The data-first verification artifact explicitly records a build pass but non-zero root/API and Agronautas smoke baselines; these are historical repository observations, not new runtime results from this exploration.

## Source-by-source integration matrix

| Source | Actual content inspected | Classification against canonical | Preservation / integration decision |
|---|---|---|---|
| `main` (`7a3007a`) | Public Agronautas demo-field contract and tests from `7a3007a`; prior current UI and API history. | Already present in canonical; canonical adds `76ecb41`. | Use canonical as the base. Do not merge `main` separately. |
| `post-cambios` (`006e3c5`) | `docs/runbooks/agronautas-release.md`, `artifacts/agronautas-post-cambios-launch-evidence.json`, and a task-file edit. The evidence names revision `c1bfe7a` and records MongoDB as optional/degraded. | Divergent older release snapshot. It also deletes/reverts many newer UI, evidence, and OpenSpec files relative to canonical. The runbook/evidence are documentation/evidence only and contain claims tied to an older revision. | Preserve as historical source material only. Do not merge the branch or promote its production evidence. Revalidate any useful runbook text against current code before reuse. |
| `agronauta-features` (`006e3c5`) | Same tip and same release runbook/evidence as `post-cambios`. | Same divergent older snapshot; no unique application advance beyond that documentation/evidence commit. | Same: no branch merge; retain only as historical context. |
| `pre-cambios` (`3d1f400`) | Provider-ingestion implementation, INA/INMET fixtures/adapters, hydrology tests, municipal alert coverage lineage, and earlier OpenSpec artifacts. | Ancestor of canonical. Its substantive implementation is already in canonical, with later fixes on top. | Do not cherry-pick. Preserve the current canonical descendants and archived OpenSpec trail. |
| `integration/merge-total-ibera-agronautas-20260727` (`24308ef`) | Branch is an ancestor of canonical. Its committed change disables unused MongoDB readiness by default and adds explicit sentinel handling/tests. Its active worktree has uncommitted Render/API edits listed below. | Committed work already present in canonical. Uncommitted work is not part of the branch commit and must be considered separately. | Preserve canonical MongoDB readiness behavior. Evaluate only the uncommitted Render/API slice; do not treat the dirty worktree as a finished branch. |
| `merge-total` (`b2b6ffc`) | Divergent Render Native Node manifest/spec, API port/readiness changes, package-lock changes, plus earlier Groq/hydrology hardening and local evidence. | Mixed: Render manifest/spec are absent from canonical; Groq and hydrology behavior are represented in the newer canonical line but not byte-for-byte identical throughout. `merge-total` also carries an older dependency state (`next` 15.5.19 in its lockfile versus canonical 15.5.20). | Selectively recover only Render requirements that remain valid after current-symbol comparison. Do not merge the branch wholesale or downgrade dependencies. Retain its archived Render OpenSpec as historical evidence only. |
| Integration worktree `C:\Users\mmmau\Agronautas\monorepo-js-baseline-worktrees\merge-total-ibera-agronautas-20260727` | HEAD is `24308ef`; tracked edits in `apps/api/src/build-config.test.ts`, `apps/api/src/infrastructure/database/redis/scheduler-lock.test.ts`, `apps/api/src/server.test.ts`, `apps/api/src/server.ts`, `apps/web/package.json`, and `pnpm-lock.yaml`; untracked `render.yaml`. | Uncommitted candidate slice, not a validated source branch. The server edit introduces `PORT`-first resolution; the test edit checks the proposed Render manifest; the lock/package edits change dependency declarations. | Keep read-only. If a later change adopts Render Native Node, extract the smallest current-compatible patch and test it against canonical contracts. Never merge untracked `render.yaml` without a new artifact and current verification. |
| Readiness worktree `C:\Users\mmmau\AppData\Local\Temp\opencode\agronautas-readiness-worktree` | Branch `merge-total` at `b2b6ffc`, 516 tracked deletions reported, and untracked `node_modules`. | Recovery-only damaged/temporary state. It is not a merge source. | Exclude entirely from integration. Use only to understand why recovery is unsafe. |
| `stash@{0}` | 10-file WIP: municipality alert coverage migration/seed/test additions, hydrology repository/test changes, active `ibera-alerta-production-completion` proposal/design/spec/tasks, and a stability-smoke evidence edit; 762 insertions and 308 deletions. | The migration and seed files are already present in canonical. The stash repository/test patch is not equivalent to current canonical and would replace newer logic. Active completion artifacts are absent because the completion change is archived on canonical. | Do not apply or delete. Treat implementation portions as superseded/unsafe to transplant; treat active completion documents as historical WIP that requires a fresh scope decision. |
| `stash@{1}` | Six-file snapshot: generated `tsbuildinfo`, `errores totales.txt`, zod package-config tests, and `turbo.json`; 56 insertions and 93 deletions. | Recovery/build-state WIP. Comparing it to canonical shows it removes newer build/package assertions and Turbo build dependencies. | Do not apply or delete. Ignore generated files and preserve current canonical build/test configuration. |

## Render, Groq, and hydrology reconciliation

### Render

`merge-total` and the dirty integration worktree both contain the same basic Render direction: two Native Node web services, API/web build and start commands, named non-secret environment variables, no Python worker declaration, and both in-process schedulers disabled. The corresponding `render.yaml` is absent from canonical, while the Render OpenSpec exists only in the `merge-total` history and is archived there.

The Render candidate is not a drop-in merge because current canonical `server.ts` uses `API_PORT || 3001`, while the worktree patch adds an exported `resolveApiPort()` with `PORT || API_PORT || 3001`. The patch also changes `apps/web/package.json` and `pnpm-lock.yaml`; the old `merge-total` lock state would downgrade Next from the canonical 15.5.20 line. The future change must therefore decide the port contract and dependency state independently, then add only a current-compatible manifest/test slice.

### Groq

The API wrapper `apps/api/src/infrastructure/integrations/groq/client.ts` is present on the canonical line with JSON-only prompts, untrusted-user-data sanitization, configurable model/base URL, and bounded abort timeout behavior. The hydrology Copilot is also current on canonical with `GroqUnavailableError`, a 30-second timeout default, caller abort propagation, and safe timeout classification in the government SSE route.

`c5e0098` is therefore not a missing feature to copy wholesale. Its Groq-related files are partly represented by the current line, while the current package-level Copilot and hydrology route contain later/different behavior. Preserve canonical implementations and compare any future Groq patch at symbol/test level only.

### Hydrology

The canonical source contains the municipality alert coverage migration and seed, bounded official HTTP clients, PNA retry/total-budget logic, INA/INMET/SMN parsing and fixtures, repository freshness support, source attempt diagnostics, sanitized alerts, and tests for those boundaries. The old `merge-total` version has an earlier form of those changes and differs in timeout, retry, freshness, and route-observability details. The current canonical implementation is the preservation target; importing `merge-total` hydrology files would risk reverting current evidence semantics and provider safety behavior.

No provider result, database result, production result, or deployment result was produced by this exploration.

## Preservation plan

1. Treat `76ecb41` and its parent `7a3007a` as the single application baseline. Preserve the current data-first WIP, its explicit on-demand/non-goal boundary, and all current active/archived OpenSpec artifacts.
2. Keep Agronautas and Iberá-Alerta as separate capability areas. A unified baseline means one coherent repository lineage and evidence vocabulary, not one merged domain model or one UI shell.
3. Retain canonical hydrology/Groq/provider code and tests. Do not transplant `merge-total` application files, `c5e0098`, or stash repository patches without a new symbol-level comparison and focused tests.
4. Treat Render as the only clearly missing integration candidate: decide `PORT` precedence, validate the current package/lock versions, define the manifest from current scripts, and keep the Python worker excluded until a separate worker contract exists.
5. Treat `post-cambios`/`agronauta-features` launch evidence, `merge-total` Render evidence, and both stashes as historical inputs. Their claims must not be used as current runtime proof.
6. Exclude the temporary readiness worktree entirely. The active integration worktree is also not a source of truth because it is dirty; only its named uncommitted files may inform a later narrowly scoped change.

## Candidate file list

### Canonical files to preserve and use as comparison anchors

- `apps/api/src/server.ts`, `apps/api/src/server.test.ts`
- `apps/api/src/infrastructure/config/agronautas-runtime.ts`, `agronautas-runtime.test.ts`
- `apps/api/src/infrastructure/config/provider-matrix.ts`, `validator.ts`
- `apps/api/src/presentation/routes/health.ts`, `health.test.ts`
- `apps/api/src/infrastructure/integrations/groq/client.ts`, `client.test.ts`
- `apps/api/src/presentation/routes/agronautas.ts`
- `apps/api/src/presentation/routes/hydrology-government.ts`, its tests
- `packages/hydrology-engine/src/clients/http-clients.ts`, tests, and provider adapters
- `packages/hydrology-engine/src/services/hydrology-copilot-service.ts`, tests
- `packages/hydrology-engine/src/repository.ts`, hydrology tests
- `apps/web/src/components/agronautas/*`, `apps/web/src/components/government/*`, and `apps/web/src/lib/visibility/*`
- `apps/api/src/infrastructure/database/postgres/seed-municipality-alert-coverage.ts`, its test, and the municipality alert coverage migration
- `openspec/changes/agronautas-ibera-data-first-ux-ondemand/*`
- `openspec/changes/archive/2026-07-19-ibera-alerta-production-completion/*`

### Files requiring a future Render-specific decision

- `render.yaml` — untracked in the active integration worktree and tracked only on `merge-total`; not present in canonical.
- `apps/api/src/server.ts` and `apps/api/src/server.test.ts` — current `API_PORT` behavior versus proposed `PORT` precedence.
- `apps/api/src/build-config.test.ts` — uncommitted manifest/environment assertions.
- `apps/web/package.json` and `pnpm-lock.yaml` — uncommitted dependency declaration/lock changes; compare with canonical before retaining.
- `apps/api/src/infrastructure/database/redis/scheduler-lock.test.ts` — uncommitted assertion-shape cleanup only; no product behavior advance established.
- `openspec/changes/archive/2026-07-19-render-native-merge-total-integration/*` — historical Render evidence in `merge-total`, not current authority.

## Exact read-only evidence and commands

All commands below were used only for inspection; neither stash was applied or deleted, and no worktree was changed.

```powershell
git status --short --branch
git log -1 --oneline
git branch --list
git worktree list --porcelain
git stash list

$canonical = 'continuation/agronautas-ibera-unified-2026-08-04'
$branches = @('main','post-cambios','agronauta-features','pre-cambios','merge-total','integration/merge-total-ibera-agronautas-20260727')
foreach ($b in $branches) {
  git log --oneline --no-merges "${canonical}..${b}"
  git log --oneline --no-merges "${b}..${canonical}"
  git diff --stat "${b}..${canonical}"
  git diff --name-status "${b}..${canonical}"
}

git show --stat --oneline 006e3c5
git show --stat --oneline c5e0098
git show --stat --oneline fe30835
git show --stat --oneline 14b3d0d
git show --stat --oneline b2b6ffc

git -C C:\Users\mmmau\Agronautas\monorepo-js-baseline-worktrees\merge-total-ibera-agronautas-20260727 status --short --branch
git -C C:\Users\mmmau\Agronautas\monorepo-js-baseline-worktrees\merge-total-ibera-agronautas-20260727 diff --stat
git -C C:\Users\mmmau\Agronautas\monorepo-js-baseline-worktrees\merge-total-ibera-agronautas-20260727 diff --name-status
git -C C:\Users\mmmau\Agronautas\monorepo-js-baseline-worktrees\merge-total-ibera-agronautas-20260727 ls-files --others --exclude-standard

git -C C:\Users\mmmau\AppData\Local\Temp\opencode\agronautas-readiness-worktree status --short
git -C C:\Users\mmmau\AppData\Local\Temp\opencode\agronautas-readiness-worktree ls-files --others --exclude-standard

git stash show --stat 'stash@{0}'
git stash show --name-status 'stash@{0}'
git stash show --patch --no-ext-diff 'stash@{0}'
git stash show --stat 'stash@{1}'
git stash show --name-status 'stash@{1}'
git stash show --patch --no-ext-diff 'stash@{1}'

git diff --unified=3 merge-total..$canonical -- `
  apps/api/src/infrastructure/integrations/groq/client.ts `
  packages/hydrology-engine/src/services/hydrology-copilot-service.ts `
  packages/hydrology-engine/src/clients/http-clients.ts `
  apps/api/src/presentation/routes/hydrology-government.ts `
  apps/api/src/server.ts render.yaml pnpm-lock.yaml
```

CodeGraph read-only queries used against the canonical `.codegraph` index:

- `createServer server readiness providerMatrix GroqClient HydrologyHttpClient GovernmentIngestionRunner`
- `GroqClient createGroqClient stream chat timeout fallback hydrology copilot`
- `HydrologyHttpClient PnaHttpClient fetchText retry timeout httpSummary HydrologyRepository saveTelemetryDeduped`
- `createServer startHydrologySchedulerFromEnv startAgronautasSchedulerFromEnv health ready render revision`
- `seedGovernmentMunicipalitiesIfEmpty municipality alert coverage HydrologyRepository getSourceFreshness findUnmappedAlertCoverageKeys`

## Risks

- The Render candidate changes API port semantics and has no current manifest in canonical; choosing `PORT` precedence without current tests could break local/API assumptions.
- The dirty integration worktree contains untracked deployment configuration and dependency changes; its state is not a coherent commit.
- `merge-total` carries older Groq/hydrology variants and an older Next lock state; wholesale integration can silently revert safety and evidence behavior.
- The post-cambios launch artifact reports an older revision and optional Mongo behavior that no longer describes canonical configuration; it is not current proof.
- Stash patches include a repository/test replacement that differs materially from canonical and active completion documents that are already archived in canonical.
- The temporary readiness worktree has mass deletions and untracked dependencies; treating it as a source could destroy current application/OpenSpec content.
- Existing OpenSpec verification artifacts record known non-zero baseline tests and unavailable live-provider prerequisites. This exploration does not reclassify those observations or claim new runtime results.

## Recommendation

Use canonical `76ecb41` as the sole application and evidence baseline. Start the next proposal around a **selective Render Native Node integration decision** only if Render configuration is still required: settle port precedence, manifest authority, dependency lock state, service/environment boundaries, and scheduler/worker policy from current files. Preserve current Agronautas and Iberá-Alerta implementations; do not merge old branches, the recovery worktree, stashes, or `merge-total` hydrology/Groq code wholesale.

## Ready for Proposal

**Yes, conditionally.** The integration baseline is sufficiently mapped for a proposal, but the proposal should be narrowly framed around current-compatible Render/deployment integration and explicit preservation of the existing Agronautas/Iberá-Alerta data-first line. It should not claim that any deployment, provider, database, or production behavior was observed here.
