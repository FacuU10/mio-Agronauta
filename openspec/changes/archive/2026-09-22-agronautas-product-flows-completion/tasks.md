# Tasks: Agronautas Product Flows Completion

## Review Workload Forecast
Estimate: 1,800–3,000 authored lines; High risk; approved single-PR size exception, budget `99999`, sequential slices.

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

| Unit | Focused test | Runtime harness | Rollback |
|---|---|---|---|
| B0 | `pnpm test` | N/A: contracts | schemas |
| S1 | API tests | `pnpm verify:agronautas:runtime` | location modules/migration |
| S2 | API + `pnpm worker:test` | API verify + worker | adapters/jobs/migration |
| S3 | web tests | `pnpm verify:agronautas:browser` | web/BFF |
| S4–S7 | focused suites | authorized Playwright | slice modules |

Active task summary: 7 active implementation tasks; 7 complete; 0 pending. Gate G is excluded from this active count and retained below as a deferred follow-up.

Legend: each task explicitly supplies RED failing test, GREEN targeted pass, SAFETY NET regression/build, TRIANGULATE integration/browser/real-service, REFACTOR unchanged behavior, smoke path, rollback, acceptance, and schema/config/provider-contract impact.

## Sequential Slices

- [x] **B0 boundaries/open decisions** — files=`packages/zod-schemas/src/agronautas-product-flows.ts`, `packages/zod-schemas/src/agronautas*.test.ts`, `apps/api/src/domain/{entities,repositories}/agronautas*.ts`; deps=none; RED/GREEN=envelope/scope/payment-forbidden tests; SAFETY NET=`pnpm test`; TRIANGULATE=API parse; REFACTOR=build/lint; smoke=N/A; rollback=contracts; contract=v2 only; AC=canonical location/evidence/readiness. Explicit owner decisions: map/geocoder, Sentinel/STAC licensing, official Iberá geometry registry, production worker/cron; no invented values.
- [x] **S1 location lineage** — files=`apps/api/src/domain/{location,repositories}/agronautas*.ts`, `application/usecases/agronautas-location.ts`, `presentation/routes/agronautas.ts`, `apps/web/src/lib/agronautas/intake-map.ts`, `components/agronautas/{page-client,workspace,field-geometry-editor}.tsx`; deps=B0; RED/GREEN=invalid/403/fallback API/UI tests; SAFETY NET=`pnpm --dir apps/api test`; TRIANGULATE=authorized API/browser; REFACTOR=build; smoke=`agronautas-reality-runtime.spec.ts`; rollback=location modules; contract=additive schema/provider decision; AC=lineage/no leakage.
- [x] **S2 signals/runtime** — implementation and truthful local persistence/lease/recovery evidence complete; explicit unavailable/degraded provider state is preserved; external provider/auth-token/complete heartbeat-queue matrix deferred to G. files=`apps/api/src/infrastructure/adapters/agronautas-{provider-adapters,climate-adapter,satellite-adapter,weather-adapter,smn-adapter}.ts`, `jobs/agronautas-{scheduler,signal-ingestion-job}.ts`, `prisma/schema.prisma`, worker `providers/agronautas_evidence.py`, `runtime/agronautas_jobs.py`, `queue/consumer.py`; deps=S1; RED/GREEN=timeout/schema/license/lease/DLQ tests; SAFETY NET=`pnpm test && pnpm worker:test`; TRIANGULATE=local persistence/readback, lease/restart, durable unavailable, and recovery evidence passed; REFACTOR=build/mypy/ruff; smoke=`pnpm verify:agronautas:runtime` records unavailable external-provider/auth-token capability; rollback=adapters/jobs/migration; contract=additive/provider; AC=satellite requires scene/coverage/processing proof and no unavailable source is promoted to readiness.
- [x] **S3 evidence UI/recovery** — files=`apps/web/src/lib/agronautas/{schemas,service,ingestion-status}.ts`, `apps/web/src/app/api/agronautas/[...path]/route.ts`, `components/agronautas/{workspace,field-detail,page-client}.tsx`; deps=S2; RED/GREEN=401/403/404/503/empty/degraded web tests; SAFETY NET=`pnpm build`; TRIANGULATE=1440x900/390x844 real API; REFACTOR=lint; smoke=`pnpm verify:agronautas:browser`; rollback=web/BFF; contract=v2 read flag; AC=source/times/freshness/lineage/recovery visible.
- [x] **S4 Agronautas Copilot** — files=`apps/api/src/application/usecases/grounded-chat-usecase.ts`, `presentation/routes/agronautas.ts`, `viewmodels/agronautas-intelligence.ts`, worker `src/worker/graph/agronautas_copilot.py`; deps=S1–S3; RED/GREEN=stale/missing citation/cross-boundary tests; SAFETY NET=API/worker suites; TRIANGULATE=cited authorized request; REFACTOR=build/mypy; smoke=Copilot browser path; rollback=Copilot modules; contract=citation/model categories; AC=non-actionable without approved evidence; no Iberá/marketplace/auth/financial/legal/hydraulic/guaranteed advice.
- [x] **S5 Iberá readiness/geometry** — files=`apps/api/src/presentation/routes/hydrology-government.ts`, `infrastructure/jobs/hydrology-ingestion-scheduler.ts`, `packages/hydrology-engine/src/{types.ts,repository.ts,services/hydrology-copilot-service.ts}`, `apps/web/src/components/government/{detail,overview,ingest-panel}.tsx`; deps=B0,S2; RED/GREEN=unverified/partial/recovered/boundary tests; SAFETY NET=API tests; TRIANGULATE=`pnpm --dir apps/api verify-local` + browser; REFACTOR=build; smoke=`pnpm --dir apps/api scheduler:once`; rollback=Iberá modules; contract=registry/coverage decision; AC=no official geometry/hydraulic/evacuation claim.
- [x] **S6 management** — files=`apps/api/prisma/schema.prisma` migration, `application/usecases/agronautas-management.ts`, `domain/repositories/agronautas.ts`, `infrastructure/database/postgres/agronautas-management-repository.ts`, `viewmodels/agronautas-management.ts`, `presentation/routes/agronautas.ts`, `apps/web/src/app/agronautas/page.tsx`; deps=S1,B0; RED/GREEN=403/duplicate/revision/timeout tests; SAFETY NET=API/build; TRIANGULATE=create/transition/reload/audit; REFACTOR=targeted TypeScript (targeted/full lint report pre-existing unrelated errors); smoke=authorized API/browser; rollback=migration/routes/UI; contract=additive/no provider; AC=durable permissions/audit; no payments/payouts/Checkout Pro/Money Out/settlement/escrow/custody.
- [x] **S7 local catalog/RFQ** — files=`apps/api/src/{domain,application,infrastructure,presentation}/marketplace/*`, Prisma migration, `apps/web/src/components/marketplace/*`, schemas/tests; deps=S1,S6; RED/GREEN=scope/stale/forbidden/duplicate tests; SAFETY NET=API/web suites; TRIANGULATE=authorized discovery/human review; REFACTOR=build/lint; smoke=marketplace Playwright path; rollback=marketplace migration/modules; contract=additive/no money provider; AC=no offer/order/guarantee, inventory/logistics/credit, or Alqui/Vialovers behavior.

## Deferred Follow-Up (Excluded from Active Task Count)

- **Gate G real-service gate — deferred, not complete** — files=`apps/api/src/scripts/{verify-agronautas-runtime-real.ts,verify-provider-truth-production.ts}`, `apps/web/tests/e2e/agronautas-reality-runtime.spec.ts`, worker matrix, `render.yaml`; deps=S1–S7/decisions; RED/GREEN=missing prerequisite blocks/compiled matrix; SAFETY NET=`pnpm test && pnpm build`; TRIANGULATE=endpoint/provider/persistence/queue/lease/cron/recovery/isolation/desktop/mobile; REFACTOR=evidence-only; smoke=root `verify:agronautas:runtime` + `verify:agronautas:browser`; rollback=harness/reports; contract=config categories; AC=separate sanitized local/production proof, no aggregate readiness.
- G will be handled by a later change after external provider/production prerequisites are supplied, including provider credentials/approval, authorized production field fixtures, and Render/worker/cron evidence. The retained G rationale and evidence do not establish production readiness.

Preserve `agronautas-auth-security-isolation`, receipts/freezes/hashes, `.env`, runtime data, and unrelated artifacts; this evidence update changes no source or runtime state.

## Owner-Scope Decision

- The current acceptance scope is B0–S7, including management workflows and marketplace discovery/RFQ workflows.
- Gate G is explicitly deferred to a later follow-up because it requires external provider credentials/approval, authorized production field fixtures, and Render/worker/cron evidence.
- G remains unchecked and MUST NOT be represented as production-ready. The accepted B0–S7 scope does not constitute production readiness for G.
- Next action: verify the current B0–S7 scope, then archive only if the SDD tool accepts a deferred follow-up; otherwise leave the change open with G pending.
