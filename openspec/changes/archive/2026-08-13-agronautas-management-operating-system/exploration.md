# Exploration: Agronautas management operating system

## Current State

The repository is a pnpm/Turborepo monorepo with separate Agronautas and Iberá-Alerta product namespaces. The current Agronautas contract is an evidence-oriented field workflow: a `Field` is created from intake data, stored in PostgreSQL/PostGIS, listed through `GET /agronautas/fields`, selected in the Agronautas workspace, and opened in a field detail route. Existing field data includes crop, hectares, locality, province, centroid, optional polygon geometry, boundary provenance, field context, risk snapshots, alerts, signal-ingestion runs, and recompute job records.

The API already has explicit read/write/recompute scopes, but authentication is currently a global token/role gate with no user identity, tenant, workspace membership, or ownership context. The web app has a single Agronautas workspace and field index, while `FutureCapabilities` explicitly marks broader workspace/task management as pending. CodeGraph and source searches found no existing workspace, lot grouping, campaign, operational task, responsible, or business decision records/routes/repositories. The word “decision” currently refers to scheduler retry decisions or presentation copy, not a durable operator decision.

### Actual gap classification

- **Present and reusable:** Agronautas product shell, `/demo` workspace, field intake, paginated field index, field detail, PostGIS geometry, evidence/risk/timeline records, API scope middleware, typed Zod contracts, service adapter, React Query data loading, and component tests.
- **Absent:** a workspace aggregate and identifier; workspace-to-field ownership relation; multiple workspace/field navigation; campaign records and field membership; task records and state transitions; responsible identity/reference; durable decision records; append-only operational history; actionable management report contract; collaboration primitives.
- **Undefined and therefore unsafe to invent:** users, tenants, membership roles, identity provider, cross-workspace visibility, assignment semantics, campaign lifecycle, task state machine, decision authority, audit retention, notification rules, report KPIs, and collaboration permissions.
- **Product boundary:** Iberá-Alerta has separate routes, copy, schemas, and monitoring vocabulary. The management operating system must be added only under Agronautas and must not reuse Iberá operational entities or navigation.

## Affected Areas

- `apps/api/src/domain/entities/agronautas.ts` — existing `Field` invariants and Agronautas domain vocabulary; a workspace-management slice should remain additive rather than changing field evidence semantics.
- `apps/api/src/domain/repositories/agronautas.ts` — existing `FieldRepository` and scope-related ports; new management ports should be explicit and not overload signal/risk repositories.
- `apps/api/src/presentation/routes/agronautas.ts` — existing `/fields` routes and middleware boundary; the smallest future API can add namespaced management routes beside these routes.
- `apps/api/src/presentation/middleware/agronautas-auth.ts` — current scopes are global `reader/operator/admin` tokens and do not provide ownership or membership claims; ownership cannot be asserted until an explicit identity/workspace contract exists.
- `apps/api/prisma/schema.prisma` — `Field` currently has no workspace foreign key; existing risk, alert, ingestion, and job records depend directly on fields.
- `apps/api/prisma/migrations/` — additive persistence would require a migration for management records and, only after ownership semantics are approved, a field-to-workspace relation.
- `apps/web/src/components/agronautas/page-client.tsx` — current client orchestration loads one global field index and selected field; management UI should consume a typed read model and keep mutations in narrow client islands.
- `apps/web/src/components/agronautas/workspace.tsx` — current workspace renders intake, field index, evidence, and field operations; it is the likely composition point for an initial workspace/field index without coupling reports or collaboration into the field detail.
- `apps/web/src/lib/agronautas/service.ts` — current API service contract is field/evidence focused; management methods should be added only with server-backed schemas and explicit scope behavior.
- `apps/web/src/lib/agronautas/schemas.ts` and `packages/zod-schemas/src/agronautas.ts` — typed contract locations for new management read/write payloads; shared schemas should be namespaced to Agronautas.
- `apps/web/src/components/shell/product-shell.tsx` and `apps/web/src/components/visibility/future-capabilities.tsx` — preserve product separation and replace only the Agronautas roadmap claim if a bounded management slice becomes real.
- `apps/web/src/components/agronautas/*.test.tsx` and `apps/web/tests/` — existing unit/E2E coverage should be extended only after real route selectors and state contracts exist; no current management journeys were found.

## Approaches

1. **Workspace/field index foundation** — introduce an explicit Agronautas workspace read model and stable workspace/field identifiers, expose a workspace index plus field list, and defer campaigns, tasks, decisions, and collaboration.
   - Pros: smallest useful operational increment; directly builds on existing field index; makes ownership boundary explicit before adding records; low UI and persistence blast radius.
   - Cons: does not yet provide workflow coordination; requires deciding whether the initial workspace is a persisted record or a single explicit default workspace.
   - Effort: Medium

2. **Full management operating system in one change** — add workspaces, field membership, campaigns, tasks, responsible references, decisions, history, reports, and collaboration together.
   - Pros: complete product narrative and fewer temporary screens.
   - Cons: requires inventing unresolved identity, tenant, membership, lifecycle, authority, notification, audit, and reporting rules; high migration and UI coupling risk; conflicts with the existing evidence-first boundary.
   - Effort: High

3. **Metadata-only overlay** — keep fields global and attach campaign/task/decision-like JSON metadata or UI-only state without durable ownership semantics.
   - Pros: fast prototype.
   - Cons: cannot support multiple workspaces safely; no reliable state transitions, history, or collaboration; would create an untyped shadow model and make later migration harder.
   - Effort: Low initially, High follow-up cost

## Recommendation

Proceed with Approach 1 as the first proposal boundary. Define an Agronautas-only management foundation with a persisted `workspace` record and explicit `workspace_field` membership (or an equivalent required `workspaceId` relation on fields), then expose a read contract for workspace summary and paginated fields. The contract should identify the workspace, name it, expose its field count and timestamps, and return field summaries using the existing field identity, crop, hectares, locality, geometry status/source, and updated timestamps.

Do not add campaign, task, responsible, decision, history, report, or collaboration records until ownership semantics are explicit. The next bounded slice may add only one of those records at a time, starting with an Agronautas campaign if its workspace/field scope, lifecycle states, and immutable identifiers are approved. For a first actionable report, prefer a derived read-only summary over existing field/risk/evidence data rather than inventing KPIs or operational conclusions.

The minimum future contracts should follow these boundaries:

- **Workspace read:** `workspaceId`, `name`, `status` (`active` only unless another state is justified), `fieldCount`, `createdAt`, `updatedAt`.
- **Field membership/read:** `workspaceId`, existing `fieldId`, `membershipStatus` (`active` only initially), and field summary; reject or clearly report fields outside the selected workspace.
- **Ownership context:** the API must either require an explicitly resolved workspace context from the caller or use one documented Agronautas default workspace. It must not claim per-user or per-tenant ownership while auth exposes only global role tokens.
- **Failure states:** invalid workspace/field identifiers return the existing typed Agronautas contract error; unavailable storage returns a truthful unavailable state; empty workspace returns an empty list with pagination metadata.
- **UI:** retain `/demo` and Agronautas styling/product shell; add a workspace selector only if there are real persisted workspaces, otherwise render the single explicit workspace context and field index. Keep Iberá routes and copy untouched.

## Risks

- Adding a `workspaceId` to existing fields without a migration/backfill policy could orphan current demo and production fields or change field visibility unexpectedly.
- Current auth cannot prove ownership, tenant isolation, or collaboration membership; implementing those claims now would invent business rules.
- A campaign/task/decision state machine without an approved actor and transition contract would create un-auditable operational data.
- “Actionable reports” can silently become recommendations or risk conclusions; reports must distinguish derived field/evidence facts from operator decisions.
- Existing Agronautas field/risk/ingestion records are intentionally separate from Iberá-Alerta records; shared generic management tables could blur product boundaries.
- The current mock service returns an empty field index, so browser work must define real empty/loading/error states and avoid presenting mock records as persistence evidence.

## Ready for Proposal

Yes. The proposal should scope only the persisted Agronautas workspace/field index foundation, state the ownership limitation (explicit workspace context or one documented default), preserve existing fields and Iberá-Alerta unchanged, and defer campaigns, tasks, responsibles, decisions, history, reports, and collaboration until their semantics can be specified without invented auth or tenancy rules.
