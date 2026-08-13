import type { AgronautasWorkspaceRepository } from '../../domain/repositories/agronautas'
import { toActivityResponse, toWorkspaceContext, toWorkspaceFieldPage } from '../viewmodels/agronautas-management'

export class EnsureDefaultWorkspace {
  constructor(private readonly repository: AgronautasWorkspaceRepository) {}

  async execute() {
    return toWorkspaceContext(await this.repository.ensureDefaultWorkspace())
  }
}

export class GetWorkspaceContext {
  constructor(private readonly repository: AgronautasWorkspaceRepository) {}

  async execute(workspaceId: string) {
    const workspace = await this.repository.getWorkspace(workspaceId)
    return workspace ? toWorkspaceContext(workspace) : null
  }
}

export class ListWorkspaceFields {
  constructor(private readonly repository: AgronautasWorkspaceRepository) {}

  async execute(input: { workspaceId: string; limit: number; cursor?: string }) {
    return toWorkspaceFieldPage(input.workspaceId, await this.repository.listWorkspaceFields(input))
  }
}

export class GetFieldActivity {
  constructor(private readonly repository: AgronautasWorkspaceRepository) {}

  async execute(fieldId: string) {
    return toActivityResponse(fieldId, await this.repository.listFieldActivity(fieldId))
  }
}
