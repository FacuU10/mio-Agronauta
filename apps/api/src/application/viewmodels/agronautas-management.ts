import {
  agronautasActivityResponseSchema,
  agronautasWorkspaceContextSchema,
  agronautasWorkspaceFieldPageSchema,
} from '@repo/zod-schemas'
import type { AgronautasActivitySourceRecord, AgronautasWorkspaceContextRecord, FieldRepository, ManagementAuditRecord, ManagementItemRecord } from '../../domain/repositories/agronautas'
import { toAgronautasFieldIndexItem } from './agronautas-pilot'

export function toWorkspaceContext(record: AgronautasWorkspaceContextRecord) {
  return agronautasWorkspaceContextSchema.parse({
    contractVersion: 'agronautas-management-v1',
    workspaceId: record.workspaceId,
    name: record.name,
    status: record.status,
    fieldCount: record.fieldCount,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  })
}

export function toWorkspaceFieldPage(workspaceId: string, page: Awaited<ReturnType<NonNullable<FieldRepository['list']>>>) {
  return agronautasWorkspaceFieldPageSchema.parse({
    contractVersion: 'agronautas-workspace-fields-v1',
    workspaceId,
    items: page.items.map(toAgronautasFieldIndexItem),
    nextCursor: page.nextCursor,
  })
}

export function toActivityResponse(fieldId: string, records: AgronautasActivitySourceRecord[]) {
  const items = records
    .map((record) => ({
      activityId: `${record.sourceType}:${record.sourceId}`,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      occurredAt: record.occurredAt.toISOString(),
      title: record.title,
    }))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || left.activityId.localeCompare(right.activityId))

  return agronautasActivityResponseSchema.parse({ contractVersion: 'agronautas-activity-v1', fieldId, items })
}

export function toManagementResponse(items: ManagementItemRecord[], audit: ManagementAuditRecord[]) {
  return {
    contractVersion: 'agronautas-management-v2' as const,
    items: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      workspaceId: item.workspaceId,
      fieldId: item.fieldId,
      parentId: item.parentId,
      name: item.name,
      status: item.status,
      revision: item.revision,
      responsibleActorId: item.responsibleActorId,
      createdByActorId: item.createdByActorId,
      idempotencyKey: item.idempotencyKey,
      sourceLocationIds: item.sourceLocationIds,
      planningLabel: 'assumption_only' as const,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    audit: audit.map((entry) => ({ ...entry, occurredAt: entry.occurredAt.toISOString() })),
  }
}
