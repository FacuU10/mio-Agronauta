# Apply Progress: ibera-alerta-inmet-payload-compatibility

## Status

- Mode: Strict TDD; hybrid OpenSpec + Engram.
- Scope: bounded native parser correction for INMET and INA only; all unrelated provider, database, schema, and deployment work remains out of scope.
- Planning record: `exploration.md` (no proposal/spec/design/tasks artifacts existed for this isolated verified fix).
- Existing INA CSV, PNA, SMN, database schema, deployment, and unrelated unstaged changes were preserved outside this bounded parser correction.

## Completed Work

- [x] Added regression coverage for the exact official no-alert text returning successful `[]`.
- [x] Added case and Unicode-normalization coverage for the same explicit no-alert sentence.
- [x] Added regression coverage proving unexpected HTTP-200 HTML remains `parse_failure`.
- [x] Added the minimal `InmetAdapter` explicit normalized-text classification.
- [x] Completed focused tests, full hydrology-engine tests, TypeScript build, real all-source local proof, and local `/municipalities` browser proof.
- [x] Corrected INMET matching to accept only the official Portuguese no-alert sentence with optional terminal period/whitespace and Unicode/case normalization; unrelated plain text remains a parse failure.
- [x] Corrected INA HTML cell extraction for nested markup while retaining station, height, and date validation.

## TDD Cycle Evidence

| Work unit | Test file | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| INMET payload classification | `packages/hydrology-engine/src/clients/http-clients.test.ts` | 9/9 focused tests passed before edits | 2 new no-alert tests failed (`10 pass, 2 fail`); unexpected-payload preservation test passed | 12/12 focused tests passed | Exact text, decomposed-accent uppercase text, and unexpected HTTP-200 HTML | Extracted a pure normalization helper; 12/12 remained green |
| Native parser correction | `packages/hydrology-engine/src/clients/http-clients.test.ts` | 12/12 focused tests passed before edits | Optional no-punctuation no-alert and nested INA markup tests failed (`12 pass, 2 fail`) | 14/14 focused tests passed | Official text with/without period, unrelated plain text, nested valid cells, and invalid nested row | Isolated official-text predicate and nested-cell text cleanup; 14/14 remained green |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir packages/hydrology-engine exec node --import tsx --test src/clients/http-clients.test.ts` — 14 tests passed, 0 failed |
| Full relevant test command and exact result | `pnpm --dir packages/hydrology-engine test` — 45 tests passed, 0 failed |
| Compile command and exact result | `pnpm --dir packages/hydrology-engine build` — `tsc` passed |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/api exec tsx src/scripts/verify-hydrology-local-real.ts --all-sources --allow-empty --out ../../artifacts/hydrology-local-real-inmet-fix-20260717.json` — proof `proof-20260717T162621Z`, one attempt/source, configured remote DB, PNA 9, INA 36, INMET 100, SMN 120; all four source rows passed |
| Browser runtime harness and exact result | Bounded Playwright Chromium check against `http://127.0.0.1:3000/municipalities` with local API `http://127.0.0.1:3001`: HTTP 200, 18 municipality cards, PNA/INA/INMET/SMN headings visible |
| Rollback boundary | Revert only the bounded parser edits in `packages/hydrology-engine/src/adapters/inmet-adapter.ts`, `packages/hydrology-engine/src/adapters/ina-adapter.ts`, the added regression tests in `packages/hydrology-engine/src/clients/http-clients.test.ts`, and this apply-progress artifact; do not revert existing CSV, PNA, SMN, or unrelated artifacts |
| Native validation/evidence boundary | Not created: the persisted native state proves lineage `review-727e9c1638675e3a`, generation `1`, and failed evidence revision `sha256:a809f3afbc14da0e9d195ea6c2d4502f5412c810cffa1b50479b0982ba8342f3`, but does not expose an exact mode-specific `fix_batch`; no value was fabricated |

## Runtime Matrix

Evidence file: `artifacts/hydrology-local-real-inmet-fix-20260717.json`.

| Source | Provider HTTP | Local API | Configured DB correlation | Records | Verdict |
|---|---|---|---|---:|---|
| PNA | 200 | completed | success | 9 | pass |
| INA | 200 | completed | success | 36 | pass |
| INMET | 200 | completed | success | 100 | pass |
| SMN | 200 | completed | success | 120 | pass |

The live INMET response in this run contained RSS alerts, so it exercised the existing non-empty path. The exact official no-alert payload is covered by the focused regression tests and is classified as valid empty rather than failure.

## Deviations and Risks

- No implementation deviation from the exploration recommendation: the adapter matches only the normalized explicit sentence `nao ha avisos meteorologicos ativos` with an optional terminal period.
- No generic parse-error suppression was introduced; other unexpected HTTP-200 payloads still produce `parse_failure`.
- No `tasks.md` existed for this isolated fix; completion is recorded here and in the hybrid Engram apply-progress artifact.
- Native transaction remains `correction_required`; validation/evidence JSON was intentionally not written because the exact mode-specific `fix_batch` could not be resolved safely from the persisted store.
