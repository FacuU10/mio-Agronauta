# Tasks: Agronautas Auth Security Isolation

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,300 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Single PR with `size:exception` approval |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High
Maintainer decision: size:exception approved for this single-PR implementation.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Auth contracts, persistence, bootstrap | Exception PR | `pnpm --dir apps/api test` | API integration with disposable DB/Redis | Auth schema, migration, domain/application/infrastructure auth files |
| 2 | Middleware, routes, Redis policy, BFF | Exception PR | `pnpm --dir apps/api test && pnpm --dir apps/web test` | `pnpm dev`; exercise auth and BFF endpoints | Auth wiring, Agronautas routes/middleware, BFF handler |
| 3 | UI recovery and regression proof | Exception PR | `pnpm --dir apps/web test:e2e` | Playwright operator/member flow at 1440x900 and 390x844 | Auth E2E tests and recovery-state changes |

## Phase 1: RED Tests and Contracts

- [x] 1.1 Add failing API tests for non-default `AGRONAUTAS_AUTH_ACCESS_SECRET`, `AGRONAUTAS_AUTH_REFRESH_SECRET`, `AGRONAUTAS_AUTH_BOOTSTRAP_SECRET`, `AGRONAUTAS_BFF_BEARER_TOKEN`; permit test-only injection, never runtime defaults; assert bcrypt cost 12 and login/refresh/logout/status contracts.
- [x] 1.2 Add failing tests for exact non-HTTP `BootstrapInput={idempotencyKey:string;bootstrapSecret:string;pilotWorkspace:{key:'agronautas-pilot';name:string};admin:{email:string;password:string;displayName:string};fieldMappings:Array<{fieldId:string;workspaceKey:string}>}` and `BootstrapResult={status:'created'|'already_initialized';workspaceId:string;adminUserId:string;mappedFieldIds:string[];unmappedFieldIds:string[]}`, plus principal/scope/membership, legacy mappings, conflicts, rollback, and refresh replay.
- [x] 1.3 Add HTTP RED tests: missing auth→401; cross-workspace/missing scope→403; unmapped write→422; required Redis failure→503 fail-closed; rollback→health only; BFF literal browser `Authorization`/cookie stripping.
- [x] 1.4 Add tests for six specs under `openspec/changes/agronautas-auth-security-isolation/specs/` (truthful-state-recovery, runtime-evidence-foundation, agronautas-operational-journey, management-foundation, frontend-route-foundations, agronautas-auth-security-isolation): typed Zod, Iberá-Alerta, evidence, management, and browser recovery at both viewports.

## Phase 2: Foundation / GREEN

- [x] 2.1 Modify `apps/api/prisma/schema.prisma`; create the additive ordered migration for users, sessions, refresh records/families, memberships, mappings, bootstrap idempotency, and rollback-safe markers.
- [x] 2.2 Create `apps/api/src/domain/auth/{contracts,ports}.ts` and `apps/api/src/application/auth/agronautas-auth-service.ts`; implement exact BootstrapInput/Result, bcrypt-12 hashing, token rotation, replay revocation, and typed failures.
- [x] 2.3 Create `apps/api/src/infrastructure/database/postgres/agronautas-auth-repository.ts`; make PostgreSQL authoritative and bootstrap atomic/repeatable: same key/input is `already_initialized`, conflicts are typed, only listed fields map.
- [x] 2.4 Modify `packages/zod-schemas/src/agronautas.ts` with versioned auth/principal/error schemas and preserve existing field/evidence/Iberá contracts.

## Phase 3: Enforcement / GREEN

- [x] 3.1 Modify `apps/api/src/server.ts` and Agronautas middleware/routes to derive trusted principals, enforce `(actorId, workspaceId, scope)`, map 401/403/422/503, and keep unmapped records non-writable.
- [x] 3.2 Implement per-operation Redis policy: PostgreSQL owns sessions/memberships/refresh/revocation; Redis deny markers use `min(300s, remaining lifetime)`; logout persists revocation before best-effort invalidation.
- [x] 3.3 Modify `apps/web/src/app/api/agronautas/[...path]/route.ts` to strip browser credentials and send only the server-owned BFF credential; never add marketplace, Checkout Pro, Money Out/payouts, or Alqui compatibility.

## Phase 4: REFACTOR / Verification

- [x] 4.1 Refactor only after GREEN; run API, contract, web, and `pnpm test` suites plus migration/bootstrap-twice and health-only rollback smoke scenarios.
- [x] 4.2 Verify Playwright operator/member sign-in, forbidden, maintenance, refresh recovery, draft preservation, and no fabricated readiness at both viewports; record Iberá regression evidence.

### Corrective writer slice — desktop auth transition

- Added a focused component regression for successful sign-in transition and the existing forbidden sign-in boundary.
- Local focused, web, root, TypeScript, and production web build checks passed; the authored Playwright contract still discovers 10 desktop/mobile tests.
- The live browser boundary remains pending: the next runtime executor must rerun both projects after this fix before task 4.2 can be marked complete.

### Current Synchronized Evidence — 2026-09-19

- Task state before synchronization: 12/13 tasks complete; task 4.2 was unchecked.
- Task state after synchronization: tasks 1.1-3.3 and 4.1 remain `[x]`; task 4.2 remains `[ ]`. No additional task is marked complete from test execution alone.
- Local storage evidence is complete: the additive Prisma migration is up to date; auth bootstrap was run twice idempotently; all 9 required tables are present; two active users and memberships are present; one authorized field and mapping are present; forbidden-member isolation is preserved; and Redis returned `PONG`.
- Focused local source/build evidence is green: BFF `10/10`, Web auth/UI `39/39` or later focused coverage, API `85/85` or later focused coverage, TypeScript/build checks, and diff checks passed.
- One real compiled local matrix ran with API `NODE_ENV=test` and Web `NODE_ENV=production`, without mocks, interception, or stubs. Health/readiness passed and teardown was verified: desktop `4 pass / 0 fail / 1 skip`, mobile `4 pass / 0 fail / 1 skip`, total `10` with `8 pass / 0 fail / 2 skip`.
- The only skips are the maintenance scenario at both viewports because no live maintenance endpoint/path is configured. Since task 4.2 is an aggregate acceptance item, it remains pending until that scenario is executable and passes; no production/deployment evidence exists.
- The official Corrientes seed initially hit PostgreSQL `42P08`; the canonical application-model fallback seeded the required field/mapping. The official seed defect remains a pending follow-up and is not treated as completion evidence.

### Latest Verified Evidence — 2026-09-20

- Task state before synchronization: 12/13 tasks complete; task 4.2 was unchecked.
- Task state after synchronization: 13/13 tasks complete; tasks 1.1-4.2 are marked `[x]`.
- The latest compiled local matrix used API `NODE_ENV=test` and Web `NODE_ENV=production` with real test PostgreSQL, Redis, and auth. No mocks, interception, or stubs were used. API/Web health and readiness passed, and owned-process teardown passed.
- Playwright passed `10/10`: desktop `5/5` and mobile `5/5`. The matrix included maintenance `2/2`, operator/member sign-in, forbidden access, refresh/replay recovery, protected mutation `422` with draft preservation, and truthful readiness with no fabricated positive state.
- Focused tests, builds, and TypeScript checks are green. This is compiled local evidence only; no production or deployment claim is made.
- The official Corrientes seed still has a separate PostgreSQL `42P08` follow-up. Canonical fixture setup and the task 4.2 acceptance matrix passed; the fallback does not close the official seed follow-up.

### Remaining Risks and Follow-ups

- Official Corrientes seed path: resolve and separately verify the `42P08` issue.
- Production evidence: not available and intentionally not claimed by this local verification.
