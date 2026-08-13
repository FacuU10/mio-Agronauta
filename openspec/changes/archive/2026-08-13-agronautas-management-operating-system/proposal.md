# Proposal: Agronautas Management Foundation

## Intent

Give Agronautas one explicit management context without pretending the product already has identity, tenancy, or ownership semantics. The first slice makes current fields navigable inside a documented default workspace and exposes a read-only operational view derived from existing field evidence.

## Scope

### In Scope
- Define one persisted Agronautas default workspace and an explicit, idempotent backfill that associates every current field with it without changing field evidence.
- Add typed workspace context, workspace/field index navigation, pagination, and truthful empty/loading/error states.
- Add a read-only activity/history projection from existing field lifecycle, risk, alert, ingestion, and recompute records; label source and timestamps and do not create operator-history records.

### Out of Scope
- Multi-tenant auth, users, memberships, ownership claims, or cross-workspace permissions.
- Campaigns, tasks, responsibles, decisions, collaboration, notifications, reports, or new operational events.
- Any Iberá-Alerta route, schema, persistence, navigation, or vocabulary change.

## Capabilities

### New Capabilities
- `agronautas-management-foundation`: Default workspace context, field backfill, workspace/field read navigation, and stable typed contracts.
- `agronautas-activity-history`: Read-only, source-backed projection of existing Agronautas field activity and evidence timelines.

### Modified Capabilities
- None.

## Approach

Add Agronautas-only workspace persistence and a required field association using an additive migration, deterministic default seed, and idempotent backfill. Keep current field identifiers and evidence relations intact. Extend explicit domain ports, API routes/contracts, and the existing Agronautas workspace client; derive history on read from existing records rather than introducing an audit ledger. Use the documented default workspace until identity/ownership semantics are separately designed.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/` | Modified | Workspace, field association, seed/backfill. |
| `apps/api/src/domain/`, `apps/api/src/presentation/routes/agronautas.ts` | Modified | Management ports, read contracts, navigation and projection endpoints. |
| `packages/zod-schemas/src/agronautas.ts` | Modified | Shared workspace, field-index, and activity schemas. |
| `apps/web/src/components/agronautas/`, `apps/web/src/lib/agronautas/` | Modified | Default context, navigation, and read-only activity rendering. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backfill changes visibility of existing fields | Med | Transactional, idempotent default association; preserve IDs and verify counts before/after. |
| Projection is mistaken for authored history | Med | Label every item as derived source evidence; add no mutation or actor semantics. |
| Workspace concepts leak into Iberá | Low | Agronautas-only names, routes, schemas, and tests. |

## Rollback Plan

Disable the new read routes/UI, then revert the additive migration and seed/backfill only after removing the new association dependency; existing field, risk, alert, ingestion, and recompute records remain unchanged.

## Dependencies

- Existing Agronautas field and evidence persistence; no new provider or auth dependency.

## Success Criteria

- [ ] Every pre-existing field is visible in the documented default workspace with unchanged identity and evidence.
- [ ] Workspace/field navigation and activity projection expose typed, source-backed empty/error states.
- [ ] No campaign, task, responsibility, decision, collaboration, or Iberá-Alerta behavior is introduced.
