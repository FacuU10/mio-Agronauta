# Exploration: agronautas-stabilization-next-features

## Current State

The repo is in a large, uncommitted post-implementation state from `agronautas-production-launch-real-ingestion`: `git status --short` shows 45 tracked files changed plus many untracked files across API, web, Python worker, contracts, migrations, runbook, Turbo config, and OpenSpec artifacts. This is not safe to keep extending as-is. The previous verify artifact explicitly says **FAIL / NO-GO**: API tests, clean web production build, Playwright, and root `pnpm test` were failing. Since then, code appears partially advanced again (`apps/api/src/build-config.test.ts`, `turbo.json`, `packages/zod-schemas/package.json`, scheduler/runtime files), but there is no fresh trusted green gate.

The best path is **salvage by slices, not reset blindly and not keep piling features**. Keep the broad working tree as a candidate patch set, but first create a stabilization SDD that classifies every changed/untracked/generated file into: (a) core domain/contracts to keep, (b) build/test hygiene fixes, (c) generated/cache artifacts to discard, (d) feature work to postpone. Generated artifacts are already polluting the diff (`*.tsbuildinfo`, Python `__pycache__`, Playwright `test-results` deletions), so the first release gate must include a clean-tree/generated-artifact policy.

Why the previous loop became unstable:
- **Web build flake / Next artifacts**: verify failed after clean web build because `.next/types/app/api/agronautas/[...path]/route.ts` was missing, while Turbo/Next generated outputs were being changed and replayed.
- **Turbo cache / package artifact ambiguity**: `turbo.json` now disables cache for `@repo/zod-schemas#build` and `web#build`, and `apps/web` calls `pnpm --dir ../../packages/zod-schemas build:ensure`, indicating earlier stale `dist` artifacts and cache replay caused false confidence.
- **Generated artifacts in source control surface**: current status includes `.tsbuildinfo`, `__pycache__`, and Playwright `test-results`, creating noisy diffs and unstable review/verify signals.
- **Provider claims ahead of verified reality**: `agronautas-provider-adapters.ts` contains `PlaceholderRealProviderAdapter` plus partial Open-Meteo/SMN/NASA/Sentinel adapter factories; some require env/API keys or assume response shapes. These should not be marketed as fully real providers until integration gates prove them.
- **Scheduler claims need source-of-truth verification**: `agronautas-scheduler.ts` has hourly base runtime and per-source due windows, but release requires proving runtime wiring uses persisted cadence/last-success state and does not fall back to static/empty maps in production.
- **Dashboard/PDF parity is only partly evidenced**: UI links PDF from `/api/agronautas/v1/fields/${selectedFieldId}/dashboard.pdf` and route/design claim shared persisted payloads, but previous gate says Playwright failed and clean web build failed, so parity cannot be accepted yet.
- **Test command ambiguity**: runbook lists both “minimum validation” and “final gate”; previous reports alternated scoped tests, root `pnpm test`, package tests, Playwright from `apps/web`, and direct non-cached builds. The next SDD must define one canonical release gate with exact working directories and cache flags.

## Affected Areas

- `turbo.json` — cache policy for web and schema builds is central to avoiding stale generated artifacts.
- `packages/zod-schemas/package.json`, `packages/zod-schemas/src/index.ts`, `packages/zod-schemas/scripts/ensure-build-output.mjs` — schema package build/export behavior previously caused web/API failures around `dist/index.js` and `./example.js`.
- `apps/api/src/build-config.test.ts` — previous verify failed because this test expected the old schema export map.
- `apps/api/src/infrastructure/jobs/agronautas-scheduler.ts` — base hourly tick, cadence filtering, persisted cadence inputs, and last-success behavior need hardening before more features.
- `apps/api/src/infrastructure/adapters/agronautas-provider-adapters.ts` — provider adapters need a truth-in-claims pass: fixture seam vs real HTTP vs credentials/rate-limit behavior.
- `apps/api/src/presentation/routes/agronautas.ts` — still contains demo-mode Corrientes rice copy in error messages while product decisions say Argentina agriculture-wide starting Corrientes, not rice-only.
- `apps/web/src/components/agronautas/workspace.tsx` — dashboard is primary and UI is mostly dumb, but intake defaults remain rice and PDF route/build behavior must be verified.
- `apps/web/tests/e2e/*.spec.js` and `apps/web/test-results/` — Playwright must become a trusted pessimistic release gate, not a stale artifact source.
- `apps/workflow-runtime-python/src/worker/runtime/agronautas_jobs.py` and tests — worker integration is part of release scope but current pycache files are polluting the working tree.
- `docs/runbooks/agronautas-production-hardening.md` — contains important decisions and final gate expectations, but must be reconciled with actual package scripts and CI commands.
- `openspec/changes/agronautas-production-launch-real-ingestion/*` — prior artifacts are useful evidence but should not be archived; they are a noisy failed implementation record.

## Approaches

1. **Reset and reapply from specs** — discard the current working tree and rebuild from the prior SDD artifacts.
   - Pros: clean diff, removes generated noise quickly, avoids inheriting unknown broken fixes.
   - Cons: high risk of losing valid domain/contracts/scheduler work; slower; prior artifacts themselves include unstable assumptions.
   - Effort: High

2. **Salvage into stabilization slices** — treat the current diff as a candidate patch set, split it into reviewable stabilization work units, discard generated artifacts, and verify each slice with canonical gates before adding features.
   - Pros: preserves useful work, directly addresses instability root causes, supports grouped subagents/reviewable slices.
   - Cons: requires disciplined triage before implementation; some files may still need revert/rewrite.
   - Effort: Medium

3. **Continue incremental fixes on the current change** — keep patching the current `agronautas-production-launch-real-ingestion` branch/artifacts.
   - Pros: fastest apparent path.
   - Cons: repeats the unstable loop; mixes stabilization, launch, and next features; high risk of false green builds.
   - Effort: Low initially, high total risk

## Recommendation

Choose **Approach 2: Salvage into stabilization slices**. The next SDD path should start with a proposal/spec/design for `agronautas-stabilization-next-features`, then split implementation into strict gates:

1. **Slice A — Repo/build hygiene and canonical gates**: remove generated artifacts from the candidate patch set, confirm `.gitignore`/clean scripts, define exact commands and working directories, prove non-cached clean builds.
2. **Slice B — Schema/package/Turbo stabilization**: make `@repo/zod-schemas` export/build behavior deterministic for API and web; verify direct `pnpm --filter web clean; pnpm --filter web build`, package tests, and root tests without stale cache.
3. **Slice C — Agronautas domain/scope correctness**: preserve Argentina agriculture-wide starting Corrientes; remove rice-only product copy/invariants except where rice is one supported crop; keep auth out of scope.
4. **Slice D — Scheduler/provider truth**: verify hourly base tick + persisted per-source cadence + last-success state; label placeholder/fixture providers honestly; require credentials/rate-limit/freshness evidence before “real provider” claims.
5. **Slice E — Dashboard/PDF parity**: dashboard remains primary; PDF must reuse persisted dashboard payload; UI remains dumb and backend-owned freshness/confidence/degradation is displayed.
6. **Slice F — Next features after green stabilization only**: expand provider governance and operational dashboard, PDF branding/signed exports/audit history, additional Corrientes crops/calibrations, hydrology/satellite refinements. Auth remains explicitly deferred to the future `auth security` library.

Release gates for stabilization must be stricter than the previous loop: `git status` artifact hygiene, schema/contracts validation, `TURBO_FORCE=true pnpm --filter api test`, `TURBO_FORCE=true pnpm --filter api build`, `pnpm --filter web clean; pnpm --filter web build`, `TURBO_FORCE=true pnpm --filter web test`, Playwright from `apps/web`, `python -m pytest apps/workflow-runtime-python`, root `TURBO_FORCE=true pnpm test`, and a fresh-context pessimistic review of claims/diff/Playwright evidence. No archive and no implementation during this exploration.

## Risks

- The current diff is large and mixed; without triage it can hide regressions behind green scoped tests.
- Generated artifacts may be accidentally committed or used as evidence.
- Provider adapters may overclaim “real ingestion” without credentials, rate-limit handling, and response-shape validation.
- Next/Turbo build behavior can still produce false positives if cache is not forcibly bypassed in release gates.
- Dashboard/PDF parity can drift if PDF routes calculate independently or if Playwright only tests stubs.
- Adding next features before stabilization will recreate the noisy loop.

## Ready for Proposal

Yes. The proposal should preserve the product decisions from the prior change, explicitly supersede the failed/noisy implementation loop for planning purposes, and authorize only stabilization-first slices before next-feature implementation. It should also state that the existing working tree is a salvage candidate, not an accepted implementation.
