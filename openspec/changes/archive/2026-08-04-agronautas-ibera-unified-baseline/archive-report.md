# Archive Report: Agronautas–Iberá Selective Render Native Node Baseline

## Outcome

**Status:** archived with warnings  
**Change:** `agronautas-ibera-unified-baseline`  
**Project:** `monorepo-js-baseline`  
**Artifact mode:** hybrid (OpenSpec + Engram)  
**Archived:** 2026-08-04

The change is archived truthfully as a selective Render Native Node baseline. It does not represent a full green monorepo, deployment validation, provider/database validation, or production evidence.

## Scope preserved

- Canonical baseline: `continuation/agronautas-ibera-unified-2026-08-04` at `76ecb416e92e96cad099f1183e6e159642ed3a8d`.
- Only the current-compatible Render slice was integrated: API `PORT > API_PORT > 3001` resolution, two Native Node services, current script/environment contracts, disabled schedulers, and no Python worker.
- Agronautas and Iberá-Alerta remain separate capability areas and domain boundaries.
- Original branches, worktrees, stashes, canonical WIP, historical evidence, and old integration sources were preserved and were not merged, deleted, applied, or overwritten.
- No Docker, deployment, provider, database, production, review, receipt, hash/freeze, or Judgment Day flow was used.

## Verification basis

- Focused contract tests: 18 passed, 0 failed.
- Build: `pnpm build`, 4/4 successful.
- Changed-file lint and `git diff --check`: passed.
- Tasks: 11/11 complete; no unchecked implementation tasks remain in the archived task artifact.
- Spec compliance: 7/7 requirements, 9/10 scenarios fully covered.
- Verdict: **PASS WITH WARNINGS**; zero blockers and zero critical findings.

## Warnings and follow-up

1. Full API and root test commands remain non-zero because of the known pre-existing Groq-degraded Agronautas route assertion in unchanged `apps/api/src/presentation/routes/agronautas.test.ts` (`expected true, actual false`). This is retained as historical baseline evidence and is not claimed as a change defect or fixed here.
2. The negative missing/stale command scenario is not fully exercised: tests validate the positive command set but do not mutate a manifest command and prove the validator fails. Add that focused negative test in a future change.
3. Focused `server.ts` coverage is 55.63% lines; no project threshold is configured. Broader startup coverage is follow-up work.
4. The pre-edit build-config safety-net run was not isolated; the final restored build-config tests passed 12/12, and the limitation remains recorded.
5. The specification's historical Next.js wording was corrected during archive to the verified canonical `15.5.19` lock resolution; no dependency or application code was changed.

## Artifact traceability

### OpenSpec artifacts

- `exploration.md` — preserved
- `proposal.md` — preserved
- `specs/render-native-node-baseline/spec.md` — preserved and synchronized as the canonical dependency wording
- `design.md` — preserved
- `tasks.md` — preserved; 11/11 complete
- `apply-progress.md` — preserved
- `verify-report.md` — preserved
- `archive-report.md` — this report

### Engram observations

| Artifact | Observation ID |
|---|---:|
| explore | 6390 |
| proposal | 6395 |
| spec | 6397 |
| design | 6402 |
| tasks | 6406 |
| apply-progress | 6417 |
| verify-report | 6423 |

## Source-of-truth result

The Render Native Node capability is now recorded in the archived change and its synchronized main spec. The archive is an audit trail only; it does not promote historical branch evidence or imply deployment readiness.

## Next step

Create a separate focused follow-up for mutation-based negative manifest-command validation and, if useful, broader API startup coverage. Keep the known Groq baseline failure separately tracked; do not widen this archived change into deployment/provider/database/production validation.
