const WORKSPACE_VIEW_VALUES = {
  FIELDS: 'fields',
  ACTIVITY: 'activity',
  GEOMETRY: 'geometry',
  MANAGEMENT: 'management',
  PLANNING: 'planning',
  EVIDENCE: 'evidence',
  INTELLIGENCE: 'intelligence',
  COPILOT: 'copilot',
} as const

export type OperationalWorkspaceView = (typeof WORKSPACE_VIEW_VALUES)[keyof typeof WORKSPACE_VIEW_VALUES]

export const OPERATIONAL_WORKSPACE_VIEWS = [
  { key: WORKSPACE_VIEW_VALUES.FIELDS, label: 'Campos', anchor: 'agronautas-intake' },
  { key: WORKSPACE_VIEW_VALUES.ACTIVITY, label: 'Actividad', anchor: 'agronautas-activity' },
  { key: WORKSPACE_VIEW_VALUES.GEOMETRY, label: 'Geometría', anchor: 'agronautas-geometry' },
  { key: WORKSPACE_VIEW_VALUES.MANAGEMENT, label: 'Gestión', anchor: 'agronautas-management' },
  { key: WORKSPACE_VIEW_VALUES.PLANNING, label: 'Planificación', anchor: 'agronautas-planning' },
  { key: WORKSPACE_VIEW_VALUES.EVIDENCE, label: 'Evidencia', anchor: 'agronautas-evidence' },
  { key: WORKSPACE_VIEW_VALUES.INTELLIGENCE, label: 'Inteligencia', anchor: 'agronautas-intelligence' },
  { key: WORKSPACE_VIEW_VALUES.COPILOT, label: 'Copilot', anchor: 'agronautas-copilot' },
] as const

export function buildWorkspaceHref(view: OperationalWorkspaceView, fieldId?: string | null, basePath = '/agronautas'): string {
  const params = new URLSearchParams({ view })
  if (fieldId) params.set('fieldId', fieldId)
  return `${basePath}?${params.toString()}`
}
