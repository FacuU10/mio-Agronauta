# Design: Agronautas Management Foundation

## Technical Approach

Add an Agronautas-only persisted `Workspace` with one deterministic default record and a required `Field.workspaceId` association. A repeatable bootstrap/backfill transaction upserts the default workspace and associates only unassigned fields; the field-create use case resolves that same default for new records. Existing field, risk, alert, ingestion, and recompute identities remain unchanged. Add read contracts for workspace context, paginated fields, and a derived activity projection, then extend the existing Agronautas client without changing Iberá-Alerta.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Required foreign key on `Field` | Smallest query surface; migration needs staged nullability | Choose. Add nullable column, seed/backfill, then enforce `NOT NULL` and FK. |
| Separate join table | Future multi-membership flexibility; unnecessary semantics now | Reject. It suggests membership/ownership that is explicitly out of scope. |
| Persist activity events | Easy rendering; duplicates and mutates the evidence model | Reject. Project read-only rows from existing tables on demand. |
| Extend existing field/risk repositories for all management reads | Fewer files; mixes bounded responsibilities | Reject. Add explicit management/activity ports and adapters. |

## Data Flow

```text
bootstrap transaction ──→ default Workspace ──→ Field.workspaceId
API read ──→ management port ──→ workspace/field viewmodels ──→ typed web service ──→ dumb UI
Field ID ──→ activity adapter ──→ fields/risk/alerts/ingestion/jobs ──→ sorted projection
```

The API exposes `GET /workspace`, `GET /workspace/fields`, and `GET /fields/:fieldId/activity` under the existing Agronautas versioned router. The default workspace is the only context; no caller identity, tenant, membership, assignment, or collaboration claim is produced.

## File Changes

| File | Action | Description |
|---|---|---|
| `apps/api/prisma/schema.prisma` | Modify | Add `Workspace`, default status, and required `Field.workspaceId` relation/index. |
| `apps/api/prisma/migrations/<timestamp>_agronautas_management_foundation/migration.sql` | Create | Create workspace table, seed deterministic default, backfill unassigned fields, add FK/not-null/index; keep SQL repeatable where rerun is supported. |
| `apps/api/src/domain/repositories/agronautas.ts` | Modify | Add workspace context, paginated workspace-field, and activity read ports. |
| `apps/api/src/application/usecases/agronautas-management.ts` | Create | Ensure default/backfill orchestration and read use cases. |
| `apps/api/src/application/viewmodels/agronautas-management.ts` | Create | Map domain/storage records to stable workspace, field-summary, and activity contracts. |
| `apps/api/src/infrastructure/database/postgres/agronautas-management-repository.ts` | Create | Transactional bootstrap, workspace/field queries, and source-backed activity union query. |
| `apps/api/src/presentation/routes/agronautas.ts` | Modify | Inject ports, add read routes, map invalid IDs/unavailable storage to existing contract errors. |
| `packages/zod-schemas/src/agronautas.ts` | Modify | Add workspace, pagination, activity-source, and response schemas using const-backed values. |
| `apps/web/src/lib/agronautas/schemas.ts`, `service.ts` | Modify | Re-export schemas and add typed workspace/activity methods. |
| `apps/web/src/components/agronautas/page-client.tsx`, `workspace.tsx` | Modify | Load default context/activity and render loading, empty, unavailable, and source-labeled states. |
| `apps/api/src/**/{*.test.ts}`, `apps/web/src/components/agronautas/*.test.tsx`, `apps/web/src/lib/agronautas/service.test.ts` | Modify/Create | RED-first repository, route, contract, service, and UI coverage. |

## Interfaces / Contracts

```typescript
interface WorkspaceContext {
  workspaceId: string; name: string; status: 'active'; fieldCount: number;
  createdAt: string; updatedAt: string;
}
interface ActivityItem {
  activityId: string; sourceType: 'field' | 'risk_snapshot' | 'alert_snapshot' | 'ingestion_run' | 'recompute_run';
  occurredAt: string; title: string; sourceId: string;
}
```

Field pagination preserves the existing cursor convention and includes current field identity, crop, hectares, locality, geometry status/source, and `updatedAt`. Activity IDs are deterministic from source type/id; projection reads never write or infer actors.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Idempotent bootstrap, viewmodels, deterministic activity ordering | In-memory ports and node test runner; write RED tests first. |
| Integration | Migration/backfill preservation, workspace routes, invalid IDs, unavailable storage, source projection | API route tests with repository fakes and PostgreSQL migration checks. |
| E2E | Default context, paginated/empty field index, field selection, activity labels, loading/error states | Extend Agronautas Playwright journey; assert no Iberá or ownership/collaboration language. |

## Threat Matrix

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no executable documentation classification | None | None |
| Git repository selection | N/A — no Git automation | None | None |
| Commit state | N/A — no commit/index automation | None | None |
| Push state | N/A — no push automation | None | None |
| PR commands | N/A — no PR automation | None | None |

## Migration / Rollout

Deploy the additive migration before API/UI reads. Run the idempotent default initializer/backfill, verify association counts through application tests, then enable reads. Rollback disables the new routes/UI first, removes the association dependency from the write path, and only then drops the FK/column/table; existing evidence tables and field IDs are retained. No ownership, collaboration, or multi-workspace rollout is implied.

## Open Questions

None blocking. Campaigns, tasks, responsibles, decisions, reports, and collaboration require separate approved contracts.
