# Proposal: Agronautas Auth Security Isolation

## Intent

Replace static role tokens with Agronautas-owned identity, sessions, and memberships. In the first slice, an internal operator/admin and an invited workspace member authenticate and reach only authorized field/workspace workflows; self-service registration remains out of scope.

## Scope

### In Scope
- Strict production secrets with test-only injection; no silent auth-disabled or test-secret fallback.
- Durable users, sessions, refresh records, and memberships; one-time, environment-controlled bootstrap admin provisioning with no default credentials.
- Idempotent named pilot-workspace bootstrap/migration: explicit ordering, repeatability, rollback semantics, no inferred ownership for existing fields, and unmapped records non-writable until assigned.
- Trusted server principal, `(actorId, workspaceId)` authorization, refresh rotation/replay-family revocation, explicit Redis failure policy, actual routes/contracts, BFF credential stripping, and deterministic tests.

### Out of Scope
- No wholesale Alqui/Vialovers product behavior.
- No marketplace route implementation.
- No Checkout Pro execution.
- No Money Out/payouts.
- Preserve Iberá-Alerta/domain data contracts.

## Capabilities

### New Capabilities
- `agronautas-auth-security-isolation`: identity, sessions/refresh, memberships, principals, authorization, bootstrap, replay, and Redis policy.

### Modified Capabilities
- `management-foundation`: preserve truthful read-only projections and non-ownership semantics; membership is required for writes/admin operations, and the default workspace is not membership authority.
- `agronautas-operational-journey`: principal-based authorization and 401/403 recovery.
- `runtime-evidence-foundation`: auth outcomes cannot imply readiness without evidence.
- `frontend-route-foundations`: BFF/auth remains credential-isolating.
- `truthful-state-recovery`: auth recovery states.

## Approach

Use narrow Prisma/PostgreSQL ports and Agronautas adapters. Keep auth data additive and authoritative; derive identity only from the server principal. Reuse framework-neutral patterns only, and make Redis degradation explicit per operation.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/prisma/schema.prisma` and migrations | New | Auth/session/membership data and ordered bootstrap. |
| `apps/api/src/presentation/{middleware,server,routes}` | Modified | Principal and membership enforcement. |
| `apps/api/src/infrastructure/database/postgres/` | New | Auth/session adapters. |
| `packages/zod-schemas/src/agronautas.ts` | Modified | Auth/principal/error contracts. |
| `apps/web/src/app/api/agronautas/[...path]/route.ts` and tests | Modified | BFF credential isolation. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Bootstrap assigns ownership incorrectly | High | Named pilot workspace, explicit mappings, unmapped records non-writable. |
| Rollback or Redis failure weakens access control | High | Fail closed; durable state and per-operation policy. |
| Reuse imports Alqui behavior | Med | Framework-neutral extraction and boundary tests. |

## Rollback Plan

Disable new protected/write paths only; expose public health, while protected routes deny access or return maintenance. Never restore unguarded auth-disabled production behavior or claim automatic legacy-token fallback. Preserve additive auth data. Destructive down-migration is allowed only in disposable environments after approved backup/recovery.

## Dependencies

- PostgreSQL/Prisma, non-default production auth secrets, and configured Redis policy.
- Strict TDD and Agronautas/Iberá regression suites.

## Success Criteria

- [ ] Tests reject missing/default production secrets and cover personas, 401/403 boundaries, cross-workspace denial, rotation, replay, Redis policy, and BFF isolation.
- [ ] Ordered bootstrap run twice creates one named pilot workspace/admin, makes no inferred ownership, leaves unmapped records non-writable, and documents rollback/recovery.
- [ ] Existing read-only projections/evidence remain truthful and unchanged; every write/admin operation requires membership.
- [ ] `pnpm test` and contract/API/web suites pass with no marketplace, billing, payout, or unverified production-evidence claim.
