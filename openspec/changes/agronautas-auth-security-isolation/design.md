# Design: Agronautas Auth Security Isolation

## Technical Approach

Replace static tokens with Agronautas-owned PostgreSQL users, sessions, rotating refresh families, memberships, and trusted `(actorId, workspaceId, scope)` principals. Keep domain, evidence, and Iberá-Alerta contracts additive. Use `apps/api/src/server.ts` (not `presentation/server.ts`), preserving `/agronautas` and `/agronautas/v1`. No marketplace route exists or is added; Checkout Pro is deferred, and Money Out/payouts are excluded.

## Architecture Decisions

| Choice | Rejected | Rationale |
|---|---|---|
| Agronautas ports and PostgreSQL adapters | Alqui models; SQL in middleware | Explicit ownership and test seams. |
| PostgreSQL authority; bounded Redis deny-cache/telemetry | Redis-only authorization; no-expiry sets | Durable, auditable safety during Redis loss. |
| Required `AGRONAUTAS_BFF_BEARER_TOKEN` | Browser credentials; operator-token fallback | Prevents credential leakage and legacy bridges. |
| Named pilot plus explicit mappings | Default-workspace ownership inference | Unmapped records stay non-writable. |
| bcrypt-compatible hashing, cost 12 | permissive/default hashing | Matches verified auth-kit pattern; parameters are fixed. |

## Data Flow

```text
login → auth service → PostgreSQL → principal + tokens
request → verifier → principal → membership/field policy → use case
refresh → atomic PostgreSQL consume → replacement; replay → family revoke
BFF → strip browser credentials → server assertion → API
deployment orchestrator → internal bootstrap service → PostgreSQL transaction
```

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Auth, mapping, bootstrap-idempotency models. |
| `apps/api/prisma/migrations/{timestamp}_agronautas_auth_security_isolation/migration.sql` | Create | Additive ordered migration. |
| `apps/api/src/domain/auth/{contracts,ports}.ts` | Create | Principal, policy, bootstrap, adapter contracts. |
| `apps/api/src/application/auth/agronautas-auth-service.ts` | Create | Auth/bootstrap orchestration. |
| `apps/api/src/infrastructure/database/postgres/agronautas-auth-repository.ts` | Create | Transactional adapter. |
| `apps/api/src/server.ts`, `apps/api/src/presentation/{middleware,routes}` | Modify | Fail-closed wiring and membership enforcement. |
| `packages/zod-schemas/src/agronautas.ts` | Modify | Versioned auth/principal/error contracts. |
| `apps/web/src/app/api/agronautas/[...path]/route.ts` | Modify | Strip browser auth; inject server credential. |
| Auth/BFF tests and `apps/web/tests/e2e/agronautas-auth-security.spec.ts` | Create/modify | RED-first coverage. |

## Interfaces / Contracts

Prefixes are aliases. Contracts remain: `POST /auth/login` returns `200` token pair/principal/memberships; `POST /auth/refresh` returns a replacement pair or `409 REFRESH_REPLAY`; `POST /auth/logout` returns `204`; `GET /auth/status` returns principal/memberships/expiry. Errors are `400 INVALID_CONTRACT`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `422 UNMAPPED_RECORD`, or `503 AUTH_MAINTENANCE`. Requests never supply identity; BFF credentials are server-managed/HttpOnly and never forwarded.

Internal bootstrap is not an HTTP endpoint:

```ts
type BootstrapInput = {
  idempotencyKey: string; bootstrapSecret: string;
  pilotWorkspace: { key: 'agronautas-pilot'; name: string };
  admin: { email: string; password: string; displayName: string };
  fieldMappings: Array<{ fieldId: string; workspaceKey: string }>;
};
type BootstrapResult = {
  status: 'created' | 'already_initialized'; workspaceId: string;
  adminUserId: string; mappedFieldIds: string[]; unmappedFieldIds: string[];
};
```

`AgronautasAuthService.bootstrap` validates the one-time `AGRONAUTAS_AUTH_BOOTSTRAP_SECRET`, input, atomic idempotency key, and explicit mappings, then calls `AgronautasAuthRepository.runBootstrapTransaction`. The same key/input returns `already_initialized`; the same key/different input returns `IDEMPOTENCY_CONFLICT`; a different key after initialization returns `ALREADY_INITIALIZED_CONFLICT`. Typed failures are `INVALID_INPUT`, `INVALID_BOOTSTRAP_SECRET`, `IDEMPOTENCY_CONFLICT`, `ALREADY_INITIALIZED_CONFLICT`, `MAPPING_CONFLICT`, and `STORAGE_FAILURE`. Only listed fields map; all others remain unmapped/non-writable. Failure rolls back atomically: workspace, user, secret-consumption marker, mappings, and idempotency record.

Production requires non-empty, non-default `AGRONAUTAS_AUTH_ACCESS_SECRET`, `AGRONAUTAS_AUTH_REFRESH_SECRET`, `AGRONAUTAS_AUTH_BOOTSTRAP_SECRET`, and existing `AGRONAUTAS_BFF_BEARER_TOKEN`; missing/default values fail closed. Test dependency injection is the only fallback. Passwords use bcrypt cost 12 (verified auth-kit/project pattern), no runtime default.

Redis is operation-specific: PostgreSQL owns sessions, memberships, refresh consumption, and revocation; Redis stores only deny markers with TTL `min(300s, remaining lifetime)`. On failure, use PostgreSQL only when safety is provable; otherwise `503 AUTH_MAINTENANCE`. Logout persists revocation before best-effort invalidation; telemetry may degrade.

## Testing Strategy

Strict TDD: RED first. Unit-test secrets, hashing, principals, scopes, rotation/replay, bootstrap conflicts/rollback, and Redis policy; integration-test bootstrap twice, mappings, route errors, cross-workspace denial, and BFF stripping; Playwright covers operator/member sign-in, forbidden, maintenance, and recovery at both viewports.

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable classification | No execution change | None |
| Git repository selection | N/A — no Git automation | No repository selection | None |
| Commit state | N/A — no commit automation | No index behavior | None |
| Push state | N/A — no push automation | No ref resolution | None |
| PR commands | N/A — no PR automation | No command composition | None |
| Process integration | N/A — deployment/bootstrap orchestrator calls the internal service; no command composition or subprocess/VCS/PR automation | No process boundary | None |

HTTP routing/middleware is applicable: RED tests cover 401, 403 membership/scope, 422 unmapped writes, Redis maintenance, health-only rollback, and literal BFF stripping.

## Migration / Rollout

A controlled deployment/bootstrap orchestrator invokes the internal service after the additive migration. Provisioning/mappings are repeatable and transactional; rollback exposes public health only and denies/maintains protected routes—never auth-disabled or legacy fallback. Iberá data is unchanged.

## Open Questions

None; production names, validation, bootstrap ownership, and bcrypt cost are resolved.
