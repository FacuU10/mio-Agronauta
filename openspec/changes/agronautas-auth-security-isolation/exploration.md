## Exploration: Agronautas Auth Security Isolation

### Current State

Agronautas currently protects API routes with static role tokens (`reader`, `operator`, `admin`) and coarse scopes (`read`, `write`, `recompute`, `admin`). `apps/api/src/presentation/middleware/agronautas-auth.ts` resolves only the configured token role and token ID; it does not attach a durable user, workspace, membership, or tenant principal. Authentication is disabled by default. `apps/api/src/server.ts` mounts the Agronautas router at the configured route prefix and its `/v1` compatibility prefix.

The current Prisma model contains fields, a default workspace, evidence, risk, alert, ingestion, copilot-reference, and job-run records, but no users, organizations, memberships, sessions, or refresh-token records. The management specification explicitly says the default workspace is not ownership or collaboration authority. Current field access proves field existence, not tenant ownership.

The exact current BFF path `apps/web/src/app/api/agronautas/[...path]/route.ts` exists. It forwards selected request metadata, injects a server-owned bearer token, does not forward a browser bearer token, preserves request/revision IDs, and returns no-store responses. Its focused test verifies this credential-isolation boundary. This boundary must remain intact while its server-side authentication contract evolves.

There is no current `apps/api/src/presentation/routes/marketplace.ts`; no marketplace entities, route, or Prisma marketplace model were found in the checked-out Agronautas tree. Marketplace is therefore a future/new integration path, not an existing route. The current UI and roadmap describe marketplace/export as future or unavailable. The existing workspace path is `apps/api/src/presentation/routes/agronautas.ts`, with workspace management backed by `apps/api/src/infrastructure/database/postgres/agronautas-management-repository.ts`, but it has no membership relation.

The standalone auth-kit at `C:\Users\mmmau\auth-kit-standalone\packages\core\` provides framework-neutral token, session, revocation, validation, adapter, middleware, and test surfaces. Its secret resolver is strict, while its Redis revocation uses sets without an observed expiration policy. The Vialovers/Alqui core at `C:\Users\mmmau\vialovers-worktrees\alqui-runtime-integration\apps\server\auth-kit\core\` contains refresh-family/token semantics, session handling, and security utilities, but its token implementation has test-secret fallbacks and its surrounding code is Alqui-specific. `C:\Users\mmmau\vialovers-worktrees\alqui-runtime-integration\apps\server\auth-security\` is a thin shield/RBAC policy surface. These behaviors are references only and must not be copied wholesale.

Mercado Pago is present in both `packages/mercado-pago/` and `apps/api/mercado-pago/`, including Checkout Pro preference creation and Money Out types/validation. Checkout Pro must remain behind an independent Agronautas billing port and must not become an authentication dependency. Money Out/payout behavior is excluded.

### Affected Areas

- `apps/api/src/presentation/middleware/agronautas-auth.ts` — **verified existing**; replace or extend static token authorization with a trusted authenticated principal and Agronautas scopes.
- `apps/api/src/server.ts` — **verified existing**; integrate the auth boundary at the actual API mounting path while preserving both route-prefix contracts.
- `apps/api/src/presentation/routes/agronautas.ts` — **verified existing**; preserve current route contracts while deriving workspace/field authorization from request identity.
- `apps/api/src/presentation/routes/marketplace.ts` — **proposed new path; verified absent**; create only in a later slice after real identity and membership contracts are proven. It is not current route integration.
- `apps/api/prisma/schema.prisma` — **verified existing**; add Agronautas-owned user/session/membership/refresh-token models without changing Iberá-Alerta or existing field/evidence records.
- `apps/api/prisma/migrations/<new-agronautas-auth-migration>/migration.sql` — **proposed new path**; add an additive, reversible migration with explicit legacy-field/bootstrap mapping.
- `apps/api/src/infrastructure/database/postgres/` — **verified existing**; add the Agronautas auth/session adapter and transaction-safe durable refresh/session persistence as proposed new files under this directory.
- `apps/web/src/app/api/agronautas/[...path]/route.ts` — **verified existing literal bracketed path**; retain credential-isolating BFF behavior and change only the approved server-side authentication contract if required.
- `apps/web/src/app/api/agronautas/[...path]/route.test.ts` — **verified existing literal bracketed path**; extend focused coverage for principal/BFF isolation without exposing browser credentials.
- `packages/zod-schemas/src/agronautas.ts` — **verified existing**; extend the shared source of truth with versioned auth, principal, session, membership, and typed authorization-error contracts as proposed.
- `packages/mercado-pago/src/` — **verified existing**; reuse or select the Checkout Pro adapter behind a generic billing port; do not activate Money Out.
- `apps/api/mercado-pago/src/` — **verified existing duplicate surface**; consolidate/select deliberately in a later billing slice rather than coupling it to auth.
- `C:\Users\mmmau\auth-kit-standalone\packages\core\` — **verified existing external reference**; selectively reuse framework-neutral token, validation, adapter, side-effect-boundary, and test patterns.
- `C:\Users\mmmau\vialovers-worktrees\alqui-runtime-integration\apps\server\auth-kit\core\` — **verified existing external reference**; borrow only verified refresh rotation, replay-family, CSRF, audit, and role semantics, with Agronautas-owned secrets and persistence.
- `C:\Users\mmmau\vialovers-worktrees\alqui-runtime-integration\apps\server\auth-security\` — **verified existing external reference**; use security policy/RBAC ideas only, excluding Alqui routes, schemas, migrations, and compatibility behavior.
- `apps/api/src/presentation/routes/agronautas.test.ts`, `apps/api/src/presentation/routes/agronautas-planning.test.ts`, `apps/web/src/app/api/agronautas/[...path]/route.test.ts`, and proposed auth-focused test files — existing paths are **verified**; proposed auth test files must prove unauthenticated access, principal/tenant isolation, refresh rotation/replay, Redis failure policy, and BFF credential isolation before marketplace or billing integration.

### Approaches

1. **Agronautas-owned auth boundary with selectively reused auth-kit core** — define Agronautas users, sessions, refresh records, and workspace memberships locally; adapt only framework-neutral token, validation, revocation, and controller behavior from the standalone/latest auth-kit implementations.
   - Pros: clear ownership; no Alqui schema contamination; supports real actor identity, tenant authorization, refresh rotation, and future marketplace/billing use; preserves the existing BFF boundary.
   - Cons: requires a new migration, adapter, identity mapping, explicit Redis failure policy, and focused integration tests; provider/runtime setup is needed for full proof.
   - Effort: Medium

2. **Harden the existing static bearer-token model** — keep role tokens and add actor IDs/workspace allowlists, stronger configuration validation, and additional tests without introducing user/session persistence.
   - Pros: smallest implementation and lowest migration risk; compatible with current API/BFF behavior.
   - Cons: does not provide real user identity, refresh rotation, replay response, session lifecycle, or scalable tenant membership; marketplace and billing authorization remain operationally brittle.
   - Effort: Low

3. **Copy Vialovers/Alqui auth wholesale** — transplant the current application auth package and adapt its existing database and route assumptions.
   - Pros: substantial behavior already exists, including browser/native paths and refresh replay handling.
   - Cons: high contamination risk; couples Agronautas to Alqui columns, legacy cookies, product routes, and unrelated migrations; inherits test-secret fallback and unresolved revocation-compatibility hazards.
   - Effort: High

### Recommendation

Choose Approach 1. Build a narrow Agronautas-owned auth/security boundary and use `C:\Users\mmmau\auth-kit-standalone\packages\core\` as the primary structural reference, borrowing only verified framework-neutral behavior from `C:\Users\mmmau\vialovers-worktrees\alqui-runtime-integration\apps\server\auth-kit\core\` and `C:\Users\mmmau\vialovers-worktrees\alqui-runtime-integration\apps\server\auth-security\`. Make production actor identity originate from the authenticated trusted principal and resolve membership by `(actorId, workspaceId)`; never accept actor identity from browser headers or public environment variables. Keep the current BFF credential stripping, preserve all existing Agronautas/Iberá contracts, and place Checkout Pro behind an independent billing adapter. Do not implement marketplace until real identity and membership are available; `apps/api/src/presentation/routes/marketplace.ts` remains a proposed new path.

The first implementation slice should establish strict production secret configuration, Agronautas-owned user/session/refresh-token and membership contracts, adapter ports, access-token/refresh-token rotation with replay-family revocation, an explicit fail-closed/degraded Redis policy per operation, and API/BFF principal propagation. Marketplace and Checkout Pro should integrate only after those contracts have deterministic tests. Test-secret fallbacks must be test-only dependency injection, not runtime defaults; legacy Vialovers cookie aliases and Alqui business compatibility must not enter the Agronautas contract without a separately approved requirement. Money Out is excluded.

### Risks

- Existing Agronautas defaults to authentication disabled; rollout must fail closed or be explicitly flagged and must not silently expose protected routes in production.
- A stable mapping from auth user ID to marketplace `actorId` is required; accepting caller-supplied actor IDs would permit cross-tenant impersonation.
- Refresh rotation and replay detection need an authoritative persistence boundary and clear Redis failure semantics; Redis set revocation without expiry can leak state and is insufficient as the only durable source.
- Importing Vialovers legacy middleware or migrations could reintroduce Alqui schema coupling, permissive cookie aliases, or incompatible role semantics.
- Current Agronautas has no auth schema or membership relation, so migration ordering, bootstrap/admin provisioning, transitional field ownership, and rollback must be specified before implementation.
- The marketplace route named in the prior exploration is absent; treating it as existing would create a false integration claim. It must remain a proposed future path until implemented and tested.
- Mercado Pago code is duplicated and includes Money Out behavior; provider selection/consolidation must remain independent from auth and must not expand into payouts.
- Full runtime/database/Redis/provider/browser evidence is currently unavailable; static tests alone cannot prove production identity isolation.
- Existing unrelated dirty files in the main worktree must remain untouched during the next phases.

### Ready for Proposal

Yes. The recommended direction is sufficiently bounded for a proposal: Agronautas-owned auth/session/membership contracts, selective framework-neutral auth-kit reuse, strict secrets, refresh replay handling, an explicit Redis failure policy, trusted principal propagation, preserved BFF isolation, marketplace integration only after real identity, Checkout Pro behind an independent billing port, and Money Out excluded. The proposal should explicitly define the first-slice scope, migration/bootstrap strategy, production secret requirements, replay/Redis failure policy, actual API/BFF integration paths, the proposed-new marketplace boundary, and exclusions for Alqui/Vialovers business compatibility and Money Out.
