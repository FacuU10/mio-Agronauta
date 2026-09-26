# Apply Progress: Agronautas Product Flows Completion

## Slice

- Change: `agronautas-product-flows-completion`
- Work unit: `B0–S7 acceptance scope amendment`
- Delivery: approved single-PR `size-exception`, budget `99999`, sequential slices
- Mode: Strict TDD
- Scope: B0–S7, including management workflows and marketplace discovery/RFQ; Gate G evidence is retained as a deferred follow-up

## Completed Tasks

- [x] B0 boundaries/open decisions
- [x] S1 location lineage
- [x] S2 signals/runtime — implementation complete with truthful local persistence/lease/recovery evidence; provider/auth-token/complete heartbeat-queue external matrix remains deferred to G
- [x] S3 evidence UI/recovery — canonical source cards, lineage/freshness metadata, ingestion/readiness states, empty/unavailable handling, HTTP 503 retry recovery, and malformed-response protection completed; no demo replacement in real mode
- [x] S4 Agronautas Copilot — authorized scope checks, approved-source filtering, freshness/readiness gating, citation lineage, provider/run metadata, unsupported-question refusal, worker filtering, SSE propagation, and truthful web states completed
- [x] S5 Iberá readiness/geometry — geometry state aggregation from reviewed registry, additive migration support for `partial` geometry and terminal ingest states, official-source Copilot boundary protection, and maintenance/unavailable retry rendering completed
- [x] S6 management — additive durable entities, transactional create/transition/audit persistence, workspace/field authorization, duplicate/revision conflict handling, rejected-mutation audit records, retryable storage failures, and protected management UI completed
- [x] S7 local catalog/RFQ — additive contracts, scoped PostgreSQL repository/routes, review-only RFQ lifecycle, audit persistence, and responsive truthful catalog UI completed

Active task summary: 7 active implementation tasks; 7 complete; 0 pending. This summary excludes the deferred G follow-up.

## Deferred Follow-Up (Excluded from Active Task Count)

- **Gate G real-service gate — deferred, not complete.** The fail-closed real-service evidence classification, prerequisite/provider/scope matrix, queue acknowledgement boundary, browser viewport evidence, and separate local/production proof remain retained below as G rationale and evidence.
- G will be handled by a later change after external provider/production prerequisites are supplied, including external provider credentials/approval, authorized production field fixtures, and Render/worker/cron evidence. No production readiness is claimed.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| B0 | `packages/zod-schemas/src/agronautas-product-flows.test.ts` | Unit/contract | ✅ Existing package suite: 56/56 passed before B0 edits | ✅ Initial focused run failed because the new module did not yet exist | ✅ Focused B0 suite: 6/6 passed; package suite: 62/62 passed | ✅ Version, geometry/scope, resolution, evidence, readiness, and payment-forbidden cases | ✅ Schema build, API build, ESLint, and root build passed |
| B0 API ports | `apps/api/src/domain/entities/agronautas-product-flows.test.ts` | Unit | ➖ N/A (new files) | ✅ Test referenced the missing domain helper first | ✅ Focused API test: 1/1 passed | ➖ Structural port aliases; no branching beyond scope match | ✅ API TypeScript build and ESLint passed |
| S1 contracts | `packages/zod-schemas/src/agronautas-product-flows.test.ts` | Unit/contract | ✅ Package contract suite: 51/51 passed | ✅ Selection tests were written before the S1 selection schema implementation | ✅ S1 contract assertions passed in the package suite | ✅ Point-only fallback and polygon selection reject fabricated provider/coverage claims | ✅ Shared package build passed |
| S1 API lineage | `apps/api/src/application/usecases/agronautas-location.test.ts`, `apps/api/src/presentation/routes/agronautas.test.ts` | Unit + route | ✅ Focused route/use-case suite: 56/56 passed | ✅ Use-case and route tests initially referenced the missing resolver/endpoint behavior | ✅ Point, polygon, invalid, and out-of-scope cases passed | ✅ Authorized Express route exercised point/polygon responses and prevented coverage lookup for an unauthorized field | ✅ API TypeScript build passed |
| S1 web selection | `apps/web/src/lib/agronautas/intake-map.test.ts`, `apps/web/src/lib/query-client.test.ts`, `apps/web/src/components/agronautas/field-geometry-editor.test.tsx` | Unit + component | ✅ Focused web suite: 12/12 passed | ✅ Fallback, key-isolation, and downstream polygon-selection tests were written before the implementation | ✅ Selection lineage and geometry-editor assertions passed | ✅ Point fallback remains provider/coverage-free and saved polygons invoke explicit selection | ✅ Web TypeScript build passed |
| S2 provider/runtime | `apps/api/src/infrastructure/adapters/agronautas-signal-provider.test.ts`, `apps/api/src/infrastructure/database/postgres/agronautas-provider-evidence-repository.test.ts`, `apps/workflow-runtime-python/tests/test_agronautas_signal_evidence.py`, `tests/test_agronautas_jobs.py`, `tests/test_queue_consumer.py` | Unit + persistence seam + worker runtime | ✅ Root/API safety nets and worker suite passed after implementation | ✅ S2 provider, satellite-proof, lease/retry/DLQ, and persistence-boundary tests cover the missing behavior before implementation | ✅ API suite: 391/391; worker suite: 77/77; focused worker S2 suite: 61/61 | ✅ Direct Open-Meteo normalization smoke preserved `providerMode=live`, `status=fresh`, and `schemaStatus=valid`; unavailable external attempts remained explicitly unavailable | ✅ API/root builds, focused mypy, and Ruff source checks passed; local persistence/readback, lease/restart, durable unavailable, and recovery evidence passed |
| S3 evidence UI/recovery | `apps/web/src/components/agronautas/page-client.test.tsx`, `apps/web/src/lib/agronautas/ingestion-status.test.ts`, `apps/web/src/lib/agronautas/service.test.ts` | Unit + component + service contract | ✅ Focused S3 suite: 37/37 passed; web production build passed | ✅ 503 recovery, malformed response, canonical normalization, empty-source, and BFF contract tests were written before the corresponding implementation | ✅ Focused S3 suite: 37/37; browser runtime harness: desktop/mobile 2/2 | ✅ Evidence 503 was initially incorrectly promoted to the global auth boundary; scoped boundary filtering now keeps the evidence retry state visible. TypeScript fixes preserve string signal-type compatibility without changing runtime behavior | ✅ `pnpm --dir apps/web build` exit 0; only existing non-blocking lint warnings remained |
| S4 Agronautas Copilot | `apps/api/src/application/usecases/grounded-chat-usecase.test.ts`, `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/web/src/lib/visibility/chat.test.ts`, `apps/web/src/components/agronautas/intelligence-panel.test.tsx`, `apps/workflow-runtime-python/tests/test_agronautas_copilot.py` | Unit + route + component + worker + browser | ✅ API focused S4 tests: 6/6; API route regression suite: 60/60; web S4 suites: 13/13; worker S4 tests: 5/5 | ✅ Missing/stale evidence, mixed-source lineage, location boundary, unsafe-question, SSE metadata, and truthful UI tests were written before the corresponding implementation | ✅ Authorized API route and local browser harness passed; browser desktop/mobile runtime evidence: 2/2 | ✅ Mixed degraded evidence is non-actionable; in-memory location binding prevents unverified location crossover; stream normalizer preserves metadata and token actionability | ✅ API build, web build, zod build, API TypeScript, targeted mypy/Ruff, and `git diff --check` passed; existing web lint warnings remained non-blocking |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/api test`: exit 0, 391/391 passed; worker implementation tests: 77/77 passed; focused worker S2 tests: 61/61 passed; root tests/build and focused mypy/Ruff checks passed |
| Local runtime evidence and exact result | API health/readiness passed; PostgreSQL/Redis persistence checks passed; worker runtime slice covered 56 focused tests and observed DB/Redis heartbeat, lease claim/release, duplicate-claim rejection, queue result before ACK, durable `unavailable`, and clean shutdown; verifier persistence/readback and leases/restart passed |
| Deferred external runtime evidence | The current external provider attempt was unavailable, protected API readback lacked an access token, and the verifier invocation reported worker heartbeat/queue unavailable; no production evidence exists. A valid external provider response, access token, and complete heartbeat/queue matrix remain prerequisites for G |
| Rollback boundary | Revert only S2 provider adapters/tests, signal ingestion and scheduler/dispatcher changes, provider evidence repository and additive migration/schema, Python evidence/runtime/queue changes, and their S2 tests; preserve B0/S1 contracts, auth isolation, and unrelated dirty files |
| S3 focused test command and exact result | `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/page-client.test.tsx src/lib/agronautas/ingestion-status.test.ts src/lib/agronautas/service.test.ts`: exit 0, 37/37 passed |
| S3 runtime harness command and exact result | `pnpm verify:agronautas:browser`: exit 0, managed Playwright real-runtime evidence passed desktop and mobile, 2/2; no production readiness claimed |
| S3 rollback boundary | Revert only S3 web/BFF evidence normalization, service/dashboard contract, evidence panel/page wiring, scoped auth-boundary adjustment, and S3 tests; preserve B0–S2 contracts/runtime, auth isolation, and unrelated dirty files |
| S4 focused test command and exact result | `pnpm --dir apps/api exec node --import tsx --test src/application/usecases/grounded-chat-usecase.test.ts src/presentation/routes/agronautas.test.ts`: exit 0, 60/60 passed; `pnpm --dir apps/web exec node --import tsx --test src/lib/visibility/chat.test.ts src/components/agronautas/intelligence-panel.test.tsx`: exit 0, 13/13 passed; `python -m pytest apps/workflow-runtime-python/tests/test_agronautas_copilot.py -q`: exit 0, 5 passed |
| S4 runtime harness command and exact result | `pnpm verify:agronautas:browser`: exit 0, Playwright desktop/mobile real-runtime evidence passed 2/2; no production readiness claimed |
| S4 rollback boundary | Revert only S4 grounded-chat use case/tests, Copilot route location binding/SSE metadata changes, web Copilot stream/view-model/UI tests, worker Copilot filtering/tests, and additive grounded-chat schema fields; preserve B0–S3 contracts, auth isolation, unrelated dirty files, and S5–S7/G |

## Verification

- `TURBO_CONCURRENCY=1 pnpm test` at repository root: exit 0, 8 tasks successful; API 400/400 passed and package/web suites passed.
- An unconstrained root `pnpm test` run hit Windows Node resource limits (`ERR_WORKER_INIT_FAILED`, `spawn UNKNOWN`, and heap/CSPRNG failures); the serialized `TURBO_CONCURRENCY=1` rerun completed green without source changes.
- `pnpm build` at repository root: exit 0, 6 tasks successful; API, Web, and shared packages compiled. Web emitted existing non-blocking lint warnings.
- `pnpm --dir apps/web build`: exit 0; Web compiled and generated all routes. Existing non-blocking lint warnings remained in unrelated test code and existing hooks/constants.
- `pnpm verify:agronautas:browser`: exit 0; managed desktop/mobile real-runtime harness passed 2/2 with browser/BFF/screenshot/snapshot/network/console evidence. This is local harness evidence only; production remains unproven.
- Package/API ESLint: exit 0.
- Diff checks: no whitespace errors in changed tracked files; no secrets or runtime data added.
- S1 package/API/Web TypeScript checks: exit 0 after building `@repo/zod-schemas`.
- S1/S2 API safety-net: `pnpm --dir apps/api test` exit 0, 396/396 passed in the serialized root run.
- S2 worker safety-net: `python -m pytest apps/workflow-runtime-python/tests -q` exit 0, 77/77 passed; focused worker S2 suite exit 0, 61/61 passed.
- S2 source quality: focused mypy and Ruff commands exit 0.
- S2 local runtime verification is truthful implementation evidence, not production proof: health/readiness, persistence/readback, lease/restart, durable-unavailable, and recovery checks passed where exercised; external provider/auth-token and verifier-level worker heartbeat/queue availability remained unavailable. Readiness was not upgraded.
- S1 full Web safety-net run: 264/265 passed; one unrelated existing GovernmentDetail test hit `Array buffer allocation failed` under the full-suite resource load, while its isolated file passed 16/16.

## Decisions and Open Decisions

- Added no map/geocoder provider, Sentinel/STAC license, official Iberá geometry registry, or production worker/cron owner values.
- Preserved v1 Agronautas schemas and auth boundary; v2 contracts are additive and separately exported.
- Financial actions are excluded at the B0 boundary; no payment, payout, checkout, settlement, escrow, custody, or guarantee behavior was implemented.

## Remaining Work

S2 is complete for implementation plus truthful local persistence/lease/recovery evidence because the specification permits explicit unavailable/degraded provider outcomes. S3 is complete for the web evidence/recovery slice with 37/37 focused tests, a successful production build, and 2/2 desktop/mobile browser harness runs. S4 is complete for the authorized Copilot slice with focused API/web/worker coverage, passing builds, and 2/2 browser runtime evidence. S5 is implemented and locally contract-tested, but its provider/database mutation harness was not run during apply; verify must run or explicitly disposition that runtime evidence. S6 is complete for durable management implementation and local route/component evidence. S7 is complete for scoped catalog/RFQ with 67/67 package, 3/3 API, and 11/11 web focused tests, a passing web build, Prisma validation, and 2/2 desktop/mobile real-runtime browser evidence. External provider success, protected API readback with an access token, and the complete heartbeat/queue matrix remain deferred prerequisites for G; no production readiness is claimed. G remains intentionally pending.

## S5 TDD Cycle Evidence

| Task | Test file | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| Geometry/readiness contracts | `packages/zod-schemas/src/agronautas.test.ts`, `packages/hydrology-engine/src/hydrology-engine.test.ts` | Unit/contract | ✅ Missing `partial` geometry and `getIberaGeometryStatus` failed first | ✅ Zod 38/38 and hydrology engine 35/35 passed | ✅ Registry aggregation preserves unavailable/unverified/partial/verified truth | ✅ Package builds passed |
| Dashboard/source boundary | `apps/api/src/presentation/routes/hydrology-government.test.ts` | API route | ✅ Missing `resolveIberaGeometryStatus` and hard-coded dashboard geometry failed first | ✅ API hydrology route 60/60 passed | ✅ Dashboard uses reviewed registry only; Agronautas/marketplace Copilot context is refused | ✅ API TypeScript/build passed |
| Recovery rendering | `apps/web/src/components/government/detail.test.tsx`, `apps/web/src/components/government/ingest-panel.test.tsx` | Component | ✅ Geometry labels and terminal maintenance/unavailable states failed first | ✅ Focused government web tests passed | ✅ Maintenance/unavailable states remain non-ready and retryable | ✅ Web TypeScript/build passed |

## S6 TDD Cycle Evidence

| Task | Test file | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| Management contracts | `packages/zod-schemas/src/agronautas-product-flows.test.ts` | Unit/contract | ✅ Management v2 schema assertions were added before the implementation | ✅ Focused contract suite: 8/8 passed | ✅ Responses preserve `assumption_only`, revision, scope, and audit shapes | ✅ Shared package build passed |
| Management authorization/idempotency/revision | `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/api/src/application/usecases/agronautas-management-v2.test.ts` | Unit + route | ✅ 401/403, duplicate, stale revision, timeout, and forbidden-audit cases were written before the route behavior | ✅ API route suite: 56/56; management use-case/repository suite: 6/6 | ✅ Authorized create, transition, reload, duplicate, conflict, rejected mutation audit, and retryable storage behavior passed | ✅ API build and TypeScript checks passed |
| Durable repository | `apps/api/src/infrastructure/database/postgres/agronautas-management-repository.test.ts` | Persistence seam | ✅ Transactional persistence/idempotency/revision cases preceded repository implementation | ✅ Management repository/use-case focused suite passed: 6/6 | ✅ Additive Prisma schema/migration validated; audit rows are returned after reload | ✅ Prisma validation passed |
| Management UI | `apps/web/src/components/agronautas/management-panel.test.tsx` | Component/service | ✅ Loading, empty, error/retry, and create-state cases preceded panel implementation | ✅ Focused web suite: 2/2 | ✅ Selected-field create path and retryable storage error rendered without fabricated data | ✅ Web production build passed |

## S6 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/api exec node --import tsx --test src/presentation/routes/agronautas.test.ts`: exit 0, 56/56 passed; management use-case/repository suite: exit 0, 6/6 passed; `pnpm --dir apps/web exec node --import tsx --test src/components/agronautas/management-panel.test.tsx`: exit 0, 2/2 passed |
| Runtime harness command/scenario and exact result | Authorized route/component harnesses exercised create, duplicate retry, stale revision, reload/audit, rejected mutation audit, timeout recovery, selected-field UI creation, loading, empty, and retryable error states. No external provider is required for S6; production smoke remains deferred to G |
| Rollback boundary | Revert only the S6 management migration/schema additions, management repository/domain/use-case/view-model/route changes, management service/UI modules, and their focused tests; preserve B0–S5, auth isolation, S7/G, and unrelated dirty files |

## S6 Verification

- `TURBO_CONCURRENCY=1 pnpm test`: exit 0, 8 tasks successful; API 400/400 passed and package/web suites passed.
- `TURBO_CONCURRENCY=1 pnpm build`: exit 0, 6 tasks successful; API, Web, and shared packages compiled. Existing non-blocking Web lint warnings remained.
- `pnpm --dir apps/api exec prisma validate --schema prisma/schema.prisma`: exit 0.
- `git diff --check`: exit 0; only existing line-ending warnings were emitted by Git.
- Full root `pnpm lint`: blocked by pre-existing unrelated errors in `packages/zod-schemas/src/agronautas.ts:593` (`intelligenceStateSchema` unused) and existing API route/test lint errors; S6 targeted TypeScript passed. This was not fixed because it is outside S6 and would modify unrelated work.

## S5 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Zod: exit 0, 38/38; hydrology engine: exit 0, 35/35; API hydrology route: exit 0, 60/60; focused web geometry/ingest tests: exit 0 after implementation |
| Runtime harness command/scenario and exact result | `pnpm --dir apps/api verify-local` and `pnpm --dir apps/api scheduler:once` not run in apply because they can write hydrology ingestion/runtime data and require live provider/database credentials; no runtime success or production readiness is claimed |
| Rollback boundary | Revert only S5 geometry-status schema/types/repository projection, hydrology dashboard/source-boundary changes, terminal ingest status contracts/UI, and additive readiness migration; preserve B0–S4, auth isolation, unrelated dirty files, and S6–S7/G |

## S7 TDD Cycle Evidence

| Task | Test file | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|
| Marketplace contracts | `packages/zod-schemas/src/agronautas-marketplace.test.ts` | Unit/contract | ✅ Contract assertions preceded the marketplace implementation | ✅ Package suite: 67/67 passed | ✅ Scope, freshness, unknown-state, review-only, and forbidden-action cases passed | ✅ Shared package build and export-map checks passed |
| Discovery/RFQ use cases | `apps/api/src/application/usecases/agronautas-marketplace.test.ts` | Unit | ✅ Scope, stale, idempotency, review, and cancel cases preceded the implementation | ✅ Focused use-case suite: 2/2 passed | ✅ Workspace isolation and human-controlled transitions passed | ✅ API TypeScript build passed |
| Protected marketplace routes | `apps/api/src/presentation/routes/agronautas-marketplace.test.ts` | API route | ✅ Protected route, duplicate, revision, audit, and forbidden-write cases preceded route implementation | ✅ Focused route suite: 1/1 passed | ✅ Authorized route path exercised with workspace scope and audit evidence | ✅ `--test-force-exit` keeps the suite deterministic despite Redis handles |
| Marketplace UI | `apps/web/src/components/marketplace/catalog-rfq.test.tsx` | Component | ✅ Catalog/RFQ and empty/stale/unavailable cases preceded UI implementation | ✅ Focused web marketplace/service suite: 11/11 passed | ✅ Real Playwright desktop/mobile runtime evidence: 2/2 passed | ✅ Web production build passed |

## S7 Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Package tests: exit 0, 67/67 passed; API marketplace tests with `node --test-force-exit`: exit 0, 3/3 passed; web marketplace/service tests: exit 0, 11/11 passed |
| Runtime harness command/scenario and exact result | `pnpm verify:agronautas:browser`: exit 0; Playwright real-runtime evidence passed desktop and mobile, 2/2, without route stubs |
| Rollback boundary | Revert only marketplace contracts/tests, API marketplace domain/use-cases/repository/routes/tests, additive marketplace Prisma migration/schema, web marketplace service/components/tests, and package export-config assertion; preserve B0–S6, auth isolation, G, and unrelated dirty files |

## S7 Verification

- `pnpm --dir apps/api exec prisma validate --schema prisma/schema.prisma`: exit 0.
- `pnpm --dir apps/web build`: exit 0; marketplace route compiled. Existing non-blocking Web lint warnings remain.
- Full root lint remains blocked by pre-existing unrelated errors documented above; no unrelated lint cleanup was performed.

## G TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| G prerequisite/provider/scope matrix | `apps/api/src/scripts/verify-agronautas-runtime-real.test.ts`, `apps/api/src/scripts/verify-provider-truth-production.test.ts` | Unit/contract | ✅ Existing focused G baseline: 22/22 passed | ✅ Missing scope classifier, dependency fail-closed status, and verifier exit-code tests failed before implementation | ✅ Combined focused API G suites: 28/28 passed | ✅ Missing/unavailable prerequisites, stale/blocked providers, forbidden scope, local/production separation, and blocked/incomplete/complete exit outcomes | ✅ Removed unused verifier imports; API build and targeted ESLint passed |
| G worker completion matrix | `apps/workflow-runtime-python/tests/test_completion_gate.py` | Unit | ✅ Existing worker gate baseline: 5/5 passed | ✅ Queue acknowledgement cases failed before adding the required matrix check | ✅ Focused worker gate suite: 7/7 passed | ✅ Blocked and not-run acknowledgement paths remain non-terminal alongside queue/lease/restart evidence | ✅ Ruff and focused mypy passed |
| G browser evidence harness | `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts` | E2E | ✅ Existing local harness: desktop/mobile 2/2 passed | ➖ Existing G harness; no new browser production behavior was added in this slice | ✅ Managed Playwright run: 2/2 passed | ✅ Desktop `1440x900` and mobile `390x844`; real browser/BFF/network/console/screenshot/snapshot evidence without route stubs | ✅ Evidence-only changes; no readiness claim |

## G Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `pnpm --dir apps/api exec node --import tsx --test src/scripts/verify-agronautas-runtime-real.test.ts src/scripts/verify-provider-truth-production.test.ts`: exit 0, 28/28 passed; `python -m pytest apps/workflow-runtime-python/tests/test_completion_gate.py -q`: exit 0, 7/7 passed; targeted API ESLint exit 0; targeted Ruff exit 0; focused mypy exit 0 |
| Safety-net regression/build | `TURBO_CONCURRENCY=1 pnpm test`: exit 0, 8/8 tasks successful, API 415/415 passed; `TURBO_CONCURRENCY=1 pnpm build`: exit 0, 6/6 tasks successful; Web emitted existing non-blocking lint warnings; full API lint remains blocked by pre-existing unrelated dirty-work errors |
| Local runtime harness command/scenario and exact result | `pnpm verify:agronautas:browser`: exit 0, Playwright desktop/mobile real-runtime evidence 2/2 passed without route stubs. `pnpm verify:agronautas:runtime` with queue/chat/hydrology writes explicitly disabled: verifier status `blocked`, process exit 1, blocked capabilities `api`, `web`, `worker`, `hydrology`; not-run `queue`, `render`; unavailable `scope`, provider matrix; `productionProven=false` |
| Production runtime evidence | Not run. No production endpoint, provider credential, access token, heartbeat/queue, cron, Render, or persistence proof was observed; no production readiness was claimed |
| Rollback boundary | Revert only the G additions in `verify-agronautas-runtime-real.ts` and its test (scope proof, fail-closed exit code, prerequisite matrix assertions), `verify-provider-truth-production.ts` and its test (dependency-aware manifest status), and `worker/runtime/completion_gate.py` and its test (acknowledgement matrix). Preserve pre-existing dirty G harness files, B0–S7 work, auth isolation, `.env`, runtime data, receipts/freezes/hashes, and unrelated changes |

## G Verification and Deferred Prerequisites

- The real-service gate now fails closed at the process boundary: blocked or incomplete runtime manifests return exit code 1, while only a complete matrix returns exit code 0.
- Missing durable dependencies prevent a production provider manifest from becoming `complete`; stale, blocked, unavailable, and unrun provider outcomes remain non-promoted and `productionReady` remains false.
- Authorized scope proof requires a real authorized field returning HTTP 200 and an explicitly configured unauthorized field returning HTTP 403. Without that prerequisite, scope evidence is recorded as unavailable and the gate remains incomplete/blocked.
- Queue/lease/restart evidence remains separate from acknowledgement evidence; acknowledgement is not promoted before terminal durable persistence.
- Local browser evidence is recorded separately from production evidence. The local managed harness passed desktop/mobile rendering, but the local service matrix remained blocked and no production artifact exists.
- G remains intentionally unchecked because external provider credentials/licensing, real authenticated field/scope IDs, Postgres/Redis/API/worker availability, queue/lease/restart proof, hydrology cron ownership, Render inspection, and production endpoint access were not available or not run.

## S6 Real Local API Follow-up

- The initial real local API smoke exposed a forbidden-audit visibility bug: a Postgres `INNER JOIN` dropped orphan forbidden audits. The fix changed the projection to a workspace-scoped `LEFT JOIN` in `apps/api/src/infrastructure/database/postgres/agronautas-management-repository.ts` and added a regression test. Focused tests passed 61/61, the API rebuild passed, and the rerun smoke passed health, readiness, auth, create, list, reload, transition, duplicate, stale, forbidden, and audit scenarios; the forbidden orphan was visible with workspace lineage.
- Prisma deploy was run successfully once with the explicit schema `apps/api/prisma/schema.prisma`; status was up to date. Metadata counts are intentionally not claimed because the metadata tooling failed.

## S7 Real API Follow-up

- Catalog discovery returned empty because no catalog-create route exists and no listing was seeded. RFQ was nevertheless verified without `listingId`: HTTP 201 create, HTTP 200 duplicate reuse/read, and HTTP 200 review to `under_review`. No financial flow was exercised.

## Runtime Execution Lesson

- Reusable subagent lesson: separate inventory, migration, build, and one-area smoke; never combine them. Rebuild compiled artifacts before runtime validation, capture stderr, and use an explicit Prisma schema with dotenv.
- G remains intentionally pending; these local/test results do not establish production readiness.

## Owner-Scope Decision

- The current acceptance scope is B0–S7, including management workflows and marketplace discovery/RFQ workflows.
- Gate G is explicitly deferred to a later follow-up because it requires external provider credentials/approval, authorized production field fixtures, and Render/worker/cron evidence.
- G remains unchecked and MUST NOT be represented as production-ready. The accepted B0–S7 scope does not constitute production readiness for G.
- Next action: verify the current B0–S7 scope, then archive only if the SDD tool accepts a deferred follow-up; otherwise leave the change open with G pending.
