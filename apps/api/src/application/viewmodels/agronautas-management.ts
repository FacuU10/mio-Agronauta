import {
  agronautasActivityResponseSchema,
  agronautasWorkspaceContextSchema,
  agronautasWorkspaceFieldPageSchema,
} from '@repo/zod-schemas'
import type { AgronautasActivitySourceRecord, AgronautasWorkspaceContextRecord, FieldRepository } from '../../domain/repositories/agronautas'
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
