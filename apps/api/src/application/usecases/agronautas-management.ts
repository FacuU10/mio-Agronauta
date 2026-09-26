import type { AuthPrincipal } from '../../domain/auth/contracts'
import type { AgronautasManagementRepository, AgronautasWorkspaceRepository, ManagementCreateInput } from '../../domain/repositories/agronautas'
import { toActivityResponse, toManagementResponse, toWorkspaceContext, toWorkspaceFieldPage } from '../viewmodels/agronautas-management'

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

  async execute(fieldId: string, workspaceId: string) {
    return toActivityResponse(fieldId, await this.repository.listFieldActivity(fieldId, workspaceId))
  }
}

type ManagementPrincipal = Pick<AuthPrincipal, 'actorId' | 'workspaceId' | 'scopes'>
type CreateManagementInput = Omit<ManagementCreateInput, 'actorId' | 'requestId' | 'status'> & { status?: ManagementCreateInput['status'] }

export class CreateManagementItem {
  constructor(private readonly repository: AgronautasManagementRepository) {}

  async execute(input: CreateManagementInput, principal: ManagementPrincipal, requestId = input.idempotencyKey) {
    assertManagementScope(principal, input.workspaceId, 'write')
    const result = await this.repository.createManagement({ ...input, status: input.status ?? 'planned', actorId: principal.actorId, requestId })
    return { status: result.status, ...toManagementResponse([result.resource], [result.audit]) }
  }
}

export class ListManagementItems {
  constructor(private readonly repository: AgronautasManagementRepository) {}

  async execute(input: { workspaceId: string; fieldId?: string }, principal: ManagementPrincipal) {
    assertManagementScope(principal, input.workspaceId, 'read')
    const result = await this.repository.listManagement(input)
    return toManagementResponse(result.items, result.audit)
  }
}

export class TransitionManagementItem {
  constructor(private readonly repository: AgronautasManagementRepository) {}

  async execute(input: { workspaceId: string; itemId: string; expectedRevision: number; status: ManagementCreateInput['status']; requestId: string }, principal: ManagementPrincipal) {
    assertManagementScope(principal, input.workspaceId, 'write')
    const result = await this.repository.transitionManagement({ ...input, status: input.status ?? 'planned', actorId: principal.actorId })
    if (!result.resource) return { status: result.status, ...toManagementResponse([], [result.audit]) }
    return { status: result.status, ...toManagementResponse([result.resource], [result.audit]) }
  }
}

function assertManagementScope(principal: ManagementPrincipal, workspaceId: string, scope: 'read' | 'write'): void {
  if (principal.workspaceId !== workspaceId) throw new Error('WORKSPACE_SCOPE_DENIED')
  if (!principal.scopes.includes(scope)) throw new Error('MANAGEMENT_PERMISSION_DENIED')
}
