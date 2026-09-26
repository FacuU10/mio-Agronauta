'use client'

import { createElement, useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { FieldIntake } from '@repo/zod-schemas'
import { ApiError } from '@/lib/api-client'
import { createAgronautasMockService, resolveAgronautasService, type AgronautasService } from '@/lib/agronautas/service'
import { buildFallbackLocationSelection, buildPolygonLocationSelection } from '@/lib/agronautas/intake-map'
import { AGRONAUTAS_CONTRACT_VERSION, agronautasWorkspaceFieldPageSchema, contractErrorSchema, fieldCreatedSchema, recomputeRequestResultSchema, type GroundedChatResponse, type AgronautasWorkspaceFieldPage, type CampaignPlanningContextResponse, type AssumptionSimulationResponse, type AgronautasLocationSelectionRequest } from '@/lib/agronautas/schemas'
import { useAgronautasStore } from '@/store/agronautas-store'
import { clearAgronautasProtectedState, createAgronautasQueryKey, createAgronautasQueryMeta, type AgronautasAuthScope } from '@/lib/query-client'
import { createAgronautasAuthClient, type AgronautasAuthClient, type AgronautasAuthStatus } from '@/lib/agronautas/auth-client'
import { isAgronautasAuthBoundaryFailure } from '@/lib/agronautas/auth-recovery'
import { applyChatEvent, createChatStreamState, type ChatStreamState } from '@/lib/visibility/chat'
import { normalizeRequestError } from '@/lib/visibility/view-models'
import type { EvidenceDashboardModel } from '@/lib/agronautas/ingestion-status'
import type { AgronautasManagementItem } from '@/lib/agronautas/schemas'
import type { SseEvent } from '@/lib/visibility/sse'
import { AgronautasWorkspace, type AgronautasAccessState, type AgronautasCapabilityState, type AgronautasCapabilityStates } from './workspace'
import { buildWorkspaceHref, OPERATIONAL_WORKSPACE_VIEWS, type OperationalWorkspaceView } from './workspace-navigation'

const React = { createElement }

export { buildWorkspaceHref, OPERATIONAL_WORKSPACE_VIEWS } from './workspace-navigation'
export type { OperationalWorkspaceView } from './workspace-navigation'

interface AgronautasPageClientProps {
  service?: AgronautasService
  authClient?: AgronautasAuthClient
  mode?: 'demo' | 'protected'
  initialFieldId?: string
  initialView?: OperationalWorkspaceView
}

function capabilityState(query: { data?: unknown; error: unknown; isLoading: boolean }): AgronautasCapabilityState {
  if (query.isLoading) return { state: 'loading' }
  if (query.error) {
    const outcome = normalizeRequestError(query.error)
    const status = query.error instanceof ApiError ? query.error.status : outcome.httpStatus
    if (status === 401) return { state: 'unauthorized', status, reason: outcome.reason }
    if (status === 403) return { state: 'forbidden', status, reason: outcome.reason }
    return { state: status === 404 ? 'unavailable' : 'error', status, reason: outcome.reason }
  }
  return { state: query.data === undefined ? 'unavailable' : 'available' }
}

function resolveAccessState(runtimeQuery: { data?: { mode?: string }; error: unknown }, workspaceQuery: { error: unknown }, authQuery: { data?: AgronautasAuthStatus; error: unknown; isPending: boolean; isFetching: boolean }, isDemo: boolean, boundaryError: unknown, scopeTransitioning: boolean): { state: AgronautasAccessState; reason?: string } {
  const authError = authQuery.error
  if (authError) return resolveAccessError(authError)
  if (scopeTransitioning) return { state: 'loading' }
  if (!isDemo && (authQuery.isPending || authQuery.isFetching || !authQuery.data)) return { state: 'loading' }
  if (boundaryError) return resolveAccessError(boundaryError)

  const error = runtimeQuery.error ?? workspaceQuery.error
  if (error) {
    return resolveAccessError(error)
  }
  if (isDemo) return { state: 'demo' }
  if (runtimeQuery.data?.mode === 'demo') return { state: 'demo' }
  if (runtimeQuery.data) return { state: 'authenticated' }
  return { state: 'loading' }
}

function resolveAccessError(error: unknown): { state: AgronautasAccessState; reason?: string } {
  const outcome = normalizeRequestError(error)
  const status = error instanceof ApiError ? error.status : outcome.httpStatus
  if (status === 401 || status === 409) return { state: 'unauthorized', reason: outcome.reason }
  if (status === 403) return { state: 'forbidden', reason: outcome.reason }
  if (status === 503 && outcome.code === 'AUTH_MAINTENANCE') return { state: 'maintenance', reason: outcome.reason }
  return { state: 'unavailable', reason: outcome.reason }
}

export function AgronautasPageClient({ service, authClient, mode, initialFieldId, initialView = 'fields' }: AgronautasPageClientProps) {
  const [defaultService] = useState(() => mode === 'demo' ? createAgronautasMockService() : resolveAgronautasService())
  const resolvedService = service ?? defaultService
  const isDemo = mode === 'demo' || resolvedService.isDemo === true
  const queryClient = useQueryClient()
  const [defaultAuthClient] = useState(() => createAgronautasAuthClient())
  const resolvedAuthClient = authClient ?? defaultAuthClient
  const authQuery = useQuery({
    queryKey: ['agronautas', 'auth-status'],
    queryFn: () => resolvedAuthClient.status(),
    enabled: !isDemo,
    staleTime: 0,
    refetchOnMount: 'always',
    retry: false,
  })
  const authScope: AgronautasAuthScope | null = authQuery.data?.principal ?? null
  const queryAccess = isDemo ? 'public' : 'protected'
  const queryMeta = createAgronautasQueryMeta(queryAccess)
  const queryKey = (resource: string, ...parts: unknown[]) => createAgronautasQueryKey(queryAccess, authScope, resource, ...parts)
  const authScopeSignature = authScope ? `${authScope.actorId}:${authScope.sessionId}:${authScope.workspaceId}` : null
  const previousAuthScope = useRef<string | null>(null)
  const scopeTransitioning = Boolean(authScopeSignature && previousAuthScope.current && previousAuthScope.current !== authScopeSignature)
  const selectedFieldId = useAgronautasStore((state) => state.selectedFieldId)
  const selectedLocation = useAgronautasStore((state) => state.selectedLocation)
  const selectionError = useAgronautasStore((state) => state.selectionError)
  const lastCreatedFieldId = useAgronautasStore((state) => state.lastCreatedFieldId)
  const intakeError = useAgronautasStore((state) => state.intakeError)
  const setSelectedFieldId = useAgronautasStore((state) => state.setSelectedFieldId)
  const setSelectedLocation = useAgronautasStore((state) => state.setSelectedLocation)
  const setSelectionError = useAgronautasStore((state) => state.setSelectionError)
  const setLastCreatedFieldId = useAgronautasStore((state) => state.setLastCreatedFieldId)
  const setIntakeError = useAgronautasStore((state) => state.setIntakeError)
  const [chatResponse, setChatResponse] = useState<GroundedChatResponse | undefined>(undefined)
  const [hydrologyChatState, setHydrologyChatState] = useState<ChatStreamState>(createChatStreamState())
  const [chatError, setChatError] = useState<string | null>(null)
  const [lastChatMessage, setLastChatMessage] = useState<string | null>(null)
  const [lastHydrologyMessage, setLastHydrologyMessage] = useState<string | null>(null)
  const [planningContext, setPlanningContext] = useState<CampaignPlanningContextResponse | undefined>()
  const [simulation, setSimulation] = useState<AssumptionSimulationResponse | undefined>()
  const [planningError, setPlanningError] = useState<string | null>(null)
  const [isPlanningLoading, setIsPlanningLoading] = useState(false)
  const [isPlanningMutating, setIsPlanningMutating] = useState(false)
  const [lastPlanningRequest, setLastPlanningRequest] = useState<{ kind: 'context' | 'simulation'; input: { campaignName: string; season: string; fieldIds: string[] } | Parameters<AgronautasService['simulateAssumptions']>[0] } | null>(null)
  const authReady = isDemo || Boolean(authQuery.data && !authQuery.isFetching && !authQuery.error)
  const workspaceQuery = useQueries({ queries: [{ queryKey: queryKey('workspace'), queryFn: () => resolvedService.getWorkspace(), enabled: authReady, retry: false, meta: queryMeta }] })[0]
  const fieldsQuery = useInfiniteQuery<AgronautasWorkspaceFieldPage, Error, InfiniteData<AgronautasWorkspaceFieldPage, string | undefined>, readonly unknown[], string | undefined>({
    queryKey: queryKey('workspace-fields', workspaceQuery.data?.workspaceId),
    queryFn: ({ pageParam }) => resolvedService.listWorkspaceFields(workspaceQuery.data?.workspaceId ?? '', pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: authReady && Boolean(workspaceQuery.data?.workspaceId),
    retry: false,
    meta: queryMeta,
  })
  const managementQuery = useQuery({
    queryKey: queryKey('management', selectedFieldId ?? 'all'),
    queryFn: () => resolvedService.listManagement ? resolvedService.listManagement(workspaceQuery.data?.workspaceId ?? '', selectedFieldId ?? undefined) : Promise.resolve({ contractVersion: 'agronautas-management-v2' as const, items: [], audit: [] }),
    enabled: authReady && Boolean(workspaceQuery.data?.workspaceId),
    retry: false,
    meta: queryMeta,
  })
  const managementCreateMutation = useMutation({
    mutationFn: async (name: string) => {
      const workspaceId = workspaceQuery.data?.workspaceId
      if (!workspaceId || !selectedFieldId) throw new Error('Seleccioná un lote autorizado antes de crear una operación.')
      if (!resolvedService.createManagement) throw new Error('La gestión Agronautas no está disponible.')
      return resolvedService.createManagement({ contractVersion: 'agronautas-management-v2', kind: 'operation', workspaceId, fieldId: selectedFieldId, name, status: 'planned', idempotencyKey: `operation-${workspaceId}-${selectedFieldId}-${name.trim().toLowerCase()}`, sourceLocationIds: selectedLocation?.locationId ? [selectedLocation.locationId] : [] })
    },
    onSuccess: async () => { await managementQuery.refetch() },
  })
  const managementTransitionMutation = useMutation({
    mutationFn: async (item: AgronautasManagementItem) => {
      if (!resolvedService.transitionManagement) throw new Error('La gestión Agronautas no está disponible.')
      return resolvedService.transitionManagement(item.id, { contractVersion: 'agronautas-management-v2', expectedRevision: item.revision, status: item.status === 'planned' ? 'active' : 'completed' })
    },
    onSuccess: async () => { await managementQuery.refetch() },
  })
  const fieldIndex = fieldsQuery.data?.pages.reduce<AgronautasWorkspaceFieldPage | undefined>((current, page) => {
    const parsedResult = agronautasWorkspaceFieldPageSchema.safeParse(page)
    if (!parsedResult.success) return current
    const parsed = parsedResult.data
    return {
      ...parsed,
      items: [...(current?.items ?? []), ...parsed.items],
      nextCursor: parsed.nextCursor,
    }
  }, undefined)
  const locationMutation = useMutation({
    mutationFn: (input: AgronautasLocationSelectionRequest) => resolvedService.resolveLocation(input),
    onSuccess: (result) => {
      if (result.status === 'accepted') {
        setSelectedLocation(result.location)
        setSelectionError(null)
      } else {
        setSelectedLocation(null)
        setSelectionError(result.reason)
      }
    },
    onError: (error) => {
      setSelectedLocation(null)
      setSelectionError(error instanceof Error ? error.message : 'No se pudo confirmar la selección')
    },
  })
  const selectionReady = Boolean(selectedLocation && selectedLocation.fieldId === selectedFieldId)
  const geometryQuery = useQueries({ queries: [{ queryKey: queryKey('geometry', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'), queryFn: () => resolvedService.getFieldGeometry?.(selectedFieldId as string), enabled: authReady && selectionReady && Boolean(resolvedService.getFieldGeometry), meta: queryMeta }] })[0]
  const geometryMutation = useMutation({ mutationFn: async (input: { polygonWkt: string; expectedUpdatedAt?: string }) => {
    if (!selectedFieldId || !resolvedService.updateFieldGeometry) throw new Error('La edición de geometría no está disponible')
    return resolvedService.updateFieldGeometry(selectedFieldId, input)
  }, onSuccess: () => void geometryQuery.refetch() })

  const intakeMutation = useMutation({
    mutationFn: async (input: FieldIntake) => fieldCreatedSchema.parse(await resolvedService.createFieldIntake(input)),
    onSuccess: (result, input) => {
      setSelectedFieldId(result.fieldId)
      setSelectedLocation(null)
      const workspaceId = workspaceQuery.data?.workspaceId ?? 'agronautas-default-workspace'
      const fallback = buildFallbackLocationSelection(input.location, input.locality)
      void locationMutation.mutateAsync({ contractVersion: AGRONAUTAS_CONTRACT_VERSION === '1.0.0' ? 'agronautas-product-flows-v2' : 'agronautas-product-flows-v2', workspaceId, fieldId: result.fieldId, ...fallback })
      setLastCreatedFieldId(result.fieldId)
      setIntakeError(null)
      setChatResponse(undefined)
      setChatError(null)
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        const parsed = contractErrorSchema.safeParse(error.data)
        setIntakeError(formatRequestError(error, parsed.success ? parsed.data.message : undefined))
        return
      }

      setIntakeError(formatRequestError(error, 'No se pudo confirmar el registro del lote'))
    },
  })

  const recomputeMutation = useMutation({
    mutationFn: (fieldId: string) => resolvedService.requestRecompute(fieldId),
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) => {
      if (!selectedFieldId) throw new Error('Seleccioná un lote antes de usar el chat')
      setLastChatMessage(message)
      return resolvedService.askFieldChat(selectedFieldId, {
        contractVersion: AGRONAUTAS_CONTRACT_VERSION,
        message,
        ...(selectedLocation?.locationId ? { locationId: selectedLocation.locationId } : {}),
      })
    },
    onSuccess: (result) => {
      setChatResponse(result)
      setChatError(null)
    },
    onError: (error) => {
      setChatResponse(undefined)
      setChatError(error instanceof Error ? error.message : 'No se pudo obtener una respuesta del chat')
    },
  })

  const hydrologyChatMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!selectedFieldId) throw new Error('Seleccioná un lote antes de usar el Copilot Hidrológico')
      setLastHydrologyMessage(message)
      setHydrologyChatState(createChatStreamState())
      await resolvedService.askHydrologyCopilot(selectedFieldId, {
        contractVersion: AGRONAUTAS_CONTRACT_VERSION,
        message,
      }, (event: SseEvent) => setHydrologyChatState((current) => applyChatEvent(current, event)))
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'No se pudo abrir el Copilot Hidrológico'
      setHydrologyChatState((current) => ({ ...current, status: current.answer ? 'partial' : 'error', error: message, retryable: true }))
    },
  })

  const [fieldQuery, riskQuery, alertsQuery, statusQuery, riskTimelineQuery, weatherTimelineQuery, dashboardQuery, hydrologyQuery] = useQueries({
    queries: [
      {
         queryKey: queryKey('field', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'),
        queryFn: () => resolvedService.getField(selectedFieldId as string),
         enabled: authReady && selectionReady,
        retry: false,
        meta: queryMeta,
      },
      {
         queryKey: queryKey('risk', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'),
        queryFn: () => resolvedService.getCurrentRisk(selectedFieldId as string),
         enabled: authReady && selectionReady,
        retry: false,
        meta: queryMeta,
      },
      {
         queryKey: queryKey('alerts', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'),
        queryFn: () => resolvedService.getCurrentAlerts(selectedFieldId as string),
         enabled: authReady && selectionReady,
        retry: false,
        meta: queryMeta,
      },
      {
         queryKey: queryKey('status', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'),
        queryFn: () => resolvedService.getMonitoringStatus(selectedFieldId as string),
         enabled: authReady && selectionReady,
        retry: false,
        meta: queryMeta,
      },
      {
         queryKey: queryKey('risk-timeline', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'),
        queryFn: () => resolvedService.getRiskTimeline(selectedFieldId as string),
         enabled: authReady && selectionReady,
        retry: false,
        meta: queryMeta,
      },
      {
         queryKey: queryKey('weather-timeline', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'),
        queryFn: () => resolvedService.getWeatherTimeline(selectedFieldId as string),
         enabled: authReady && selectionReady,
        retry: false,
        meta: queryMeta,
      },
      {
         queryKey: queryKey('dashboard-payload', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'),
         queryFn: () => resolvedService.getEvidenceDashboard(selectedFieldId as string),
         enabled: authReady && selectionReady,
        retry: false,
        meta: queryMeta,
      },
      {
         queryKey: queryKey('hydrology-dashboard', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'),
        queryFn: () => resolvedService.getHydrologyDashboard(selectedFieldId as string),
         enabled: authReady && selectionReady,
        retry: false,
        meta: queryMeta,
      },
    ],
  })
  const activityQuery = useQueries({ queries: [{ queryKey: queryKey('activity', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'), queryFn: () => resolvedService.getFieldActivity(selectedFieldId as string), enabled: authReady && selectionReady, retry: false, meta: queryMeta }] })[0]
  const intelligenceQuery = useQueries({ queries: [{ queryKey: queryKey('intelligence', selectedFieldId, selectedLocation?.locationId ?? 'unresolved'), queryFn: () => resolvedService.getFieldIntelligence(selectedFieldId as string), enabled: authReady && selectionReady, retry: false, meta: queryMeta }] })[0]
  const loadPlanningContext = async (input: { campaignName: string; season: string; fieldIds: string[] }) => {
    const workspaceId = workspaceQuery.data?.workspaceId
    setLastPlanningRequest({ kind: 'context', input })
    setPlanningError(null)
    if (!workspaceId) {
      setPlanningError('No se puede planificar sin un workspace autorizado')
      return
    }
    setIsPlanningLoading(true)
    try {
      const result = await resolvedService.getCampaignPlanningContext({ contractVersion: 'agronautas-campaign-planning-context-v1', workspaceId, ...input })
      setPlanningContext(result)
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : 'No se pudo cargar el contexto de planificación.')
    } finally {
      setIsPlanningLoading(false)
    }
  }
  const simulateAssumptions = async (input: Parameters<AgronautasService['simulateAssumptions']>[0]) => {
    setLastPlanningRequest({ kind: 'simulation', input })
    setPlanningError(null)
    setSimulation(undefined)
    setIsPlanningMutating(true)
    try {
      setSimulation(await resolvedService.simulateAssumptions(input))
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : 'No se pudo calcular el supuesto.')
    } finally {
      setIsPlanningMutating(false)
    }
  }
  const retryPlanning = async () => {
    if (!lastPlanningRequest) return
    if (lastPlanningRequest.kind === 'context') {
      await loadPlanningContext(lastPlanningRequest.input as { campaignName: string; season: string; fieldIds: string[] })
      return
    }
    await simulateAssumptions(lastPlanningRequest.input as Parameters<AgronautasService['simulateAssumptions']>[0])
  }
  const runtimeQuery = useQueries({
    queries: [{ queryKey: queryKey('runtime'), queryFn: () => resolvedService.getRuntime(), enabled: authReady, retry: false, meta: queryMeta }],
  })[0]
  // A source/evidence outage is rendered as a scoped recovery state by the
  // evidence panel. It must not become a workspace auth boundary, otherwise a
  // retryable HTTP 503 would hide all of the location-scoped dashboard UI.
  const protectedQueries = [workspaceQuery, fieldsQuery, geometryQuery, fieldQuery, riskQuery, alertsQuery, statusQuery, riskTimelineQuery, weatherTimelineQuery, hydrologyQuery, activityQuery, intelligenceQuery, runtimeQuery]
  const boundaryError = protectedQueries.map((query) => query.error).find((error) => {
    if (!error) return false
    const outcome = normalizeRequestError(error)
    const status = error instanceof ApiError ? error.status : outcome.httpStatus
    return isAgronautasAuthBoundaryFailure({ status, code: outcome.code })
  })
  const access = resolveAccessState(runtimeQuery, workspaceQuery, authQuery, isDemo, boundaryError, scopeTransitioning)
  const workspaceReady = Boolean(runtimeQuery.data && workspaceQuery.data && (isDemo || access.state === 'authenticated'))
  useEffect(() => {
    if (isDemo) return
    if (authScopeSignature && previousAuthScope.current && previousAuthScope.current !== authScopeSignature) {
      clearAgronautasProtectedState(queryClient)
      setChatResponse(undefined)
      setHydrologyChatState(createChatStreamState())
      setChatError(null)
      setLastChatMessage(null)
      setLastHydrologyMessage(null)
      setPlanningContext(undefined)
      setSimulation(undefined)
      setSelectedLocation(null)
      setSelectionError(null)
    }
    previousAuthScope.current = authScopeSignature
  }, [authScopeSignature, isDemo, queryClient])
  useEffect(() => {
    if (isDemo || !boundaryError) return
    clearAgronautasProtectedState(queryClient)
  }, [boundaryError, isDemo, queryClient])
  const capabilityStates: AgronautasCapabilityStates = {
    geometry: capabilityState(geometryQuery),
    activity: capabilityState(activityQuery),
    intelligence: capabilityState(intelligenceQuery),
    hydrology: capabilityState(hydrologyQuery),
  }
  const queryErrors = [fieldQuery, riskQuery, alertsQuery, statusQuery, riskTimelineQuery, weatherTimelineQuery, dashboardQuery, hydrologyQuery]
    .filter((query) => Boolean(query.error))
    .map((query) => query.error instanceof Error ? query.error.message : 'Una capacidad devolvió un error no identificado')
  const retrySync = async () => {
    await Promise.all([
      runtimeQuery.refetch(),
      ...[fieldQuery, riskQuery, alertsQuery, statusQuery, riskTimelineQuery, weatherTimelineQuery, dashboardQuery, hydrologyQuery]
        .filter((query) => query.isEnabled)
        .map((query) => query.refetch()),
      geometryQuery.refetch(),
      activityQuery.refetch(),
      intelligenceQuery.refetch(),
        managementQuery.refetch(),
    ])
  }

  const evidenceDashboard = dashboardQuery.data as EvidenceDashboardModel | undefined
  const dashboardPayload = evidenceDashboard?.dashboard

  const selectField = (fieldId: string | null) => {
    setSelectedFieldId(fieldId)
    setSelectedLocation(null)
    setSelectionError(null)
    if (!fieldId) return
    const item = fieldIndex?.items.find((candidate) => candidate.fieldId === fieldId)
    if (!item) return
    const fallback = buildFallbackLocationSelection(item.centroid, item.locality)
    void locationMutation.mutateAsync({ contractVersion: 'agronautas-product-flows-v2', workspaceId: item ? (workspaceQuery.data?.workspaceId ?? 'agronautas-default-workspace') : 'agronautas-default-workspace', fieldId, ...fallback })
  }

  const initialSelectionApplied = useRef(false)
  useEffect(() => {
    if (!initialFieldId || initialSelectionApplied.current || !fieldIndex || fieldsQuery.isFetching) return
    initialSelectionApplied.current = true
    const item = fieldIndex.items.find((candidate) => candidate.fieldId === initialFieldId)
    if (item) {
      selectField(item.fieldId)
      return
    }
    setSelectedFieldId(null)
    setSelectedLocation(null)
    setSelectionError(`El lote ${initialFieldId} no está disponible en el índice del workspace.`)
  }, [fieldIndex, fieldsQuery.isFetching, initialFieldId, setSelectedFieldId, setSelectedLocation, setSelectionError])

  const selectPolygon = async (polygonWkt: string) => {
    if (!selectedFieldId) return
    const selection = buildPolygonLocationSelection(polygonWkt, `field:${selectedFieldId}`)
    if (!selection) throw new Error('No se pudo conservar el polígono seleccionado')
    const result = await locationMutation.mutateAsync({ contractVersion: 'agronautas-product-flows-v2', workspaceId: workspaceQuery.data?.workspaceId ?? 'agronautas-default-workspace', fieldId: selectedFieldId, ...selection })
    if (result.status !== 'accepted') throw new Error(result.reason)
  }

  return (
    <div
      data-testid="agronautas-main-content"
      tabIndex={-1}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
    >
      <AgronautasWorkspace
        runtimeMode={runtimeQuery.data?.mode ?? (isDemo ? 'demo' : 'real')}
        runtimeStatus={runtimeQuery.isLoading ? 'loading' : runtimeQuery.error ? 'error' : 'ready'}
        runtimeError={runtimeQuery.error instanceof Error ? runtimeQuery.error.message : null}
        accessState={access.state}
        accessReason={access.reason ?? null}
        workspaceReady={workspaceReady}
        capabilityStates={capabilityStates}
         selectedFieldId={selectedFieldId}
         selectedLocation={selectedLocation}
         selectionError={selectionError}
         isLocationResolving={locationMutation.isPending}
        fieldIndex={fieldIndex}
        isFieldIndexLoading={fieldsQuery.isLoading}
        isFieldIndexFetchingNextPage={fieldsQuery.isFetchingNextPage}
        hasNextFieldPage={Boolean(fieldsQuery.hasNextPage)}
        onLoadMoreFields={() => void fieldsQuery.fetchNextPage()}
       workspace={workspaceQuery.data}
        activity={activityQuery.data}
        managementItems={managementQuery.data?.items ?? []}
        managementAudit={managementQuery.data?.audit ?? []}
        isManagementLoading={managementQuery.isLoading}
        managementError={managementQuery.error instanceof Error ? managementQuery.error.message : managementQuery.error ? 'La gestión Agronautas no está disponible.' : null}
        isManagementMutating={managementCreateMutation.isPending || managementTransitionMutation.isPending}
        onRetryManagement={() => managementQuery.refetch()}
        onCreateManagementOperation={(name) => managementCreateMutation.mutateAsync(name)}
        onTransitionManagement={async (item) => {
          const refreshed = await managementQuery.refetch()
          const current = refreshed.data?.items.find((candidate) => candidate.id === item.id) ?? item
          return managementTransitionMutation.mutateAsync(current)
        }}
        intelligence={intelligenceQuery.data}
        planningContext={planningContext}
        simulation={simulation}
        isPlanningLoading={isPlanningLoading}
        isPlanningMutating={isPlanningMutating}
        planningError={planningError}
        onRetryPlanning={retryPlanning}
        onLoadPlanningContext={loadPlanningContext}
       onSimulateAssumptions={simulateAssumptions}
      lastCreatedFieldId={lastCreatedFieldId}
      intakeError={intakeError}
      isSubmitting={intakeMutation.isPending}
      field={fieldQuery.data}
      risk={riskQuery.data}
      alerts={alertsQuery.data}
      status={statusQuery.data}
      riskTimeline={riskTimelineQuery.data}
      weatherTimeline={weatherTimelineQuery.data}
       dashboardPayload={dashboardPayload}
       evidenceDashboard={evidenceDashboard}
       evidenceDashboardError={dashboardQuery.error}
      hydrologyDashboard={hydrologyQuery.data}
      geometry={geometryQuery.data}
      chatResponse={chatResponse}
       hydrologyChatState={hydrologyChatState}
      chatError={chatError}
      isChatPending={chatMutation.isPending}
      isHydrologyChatPending={hydrologyChatMutation.isPending}
      recomputeStatus={recomputeRequestResultSchema.safeParse(recomputeMutation.data).success ? recomputeMutation.data : undefined}
      isRecomputePending={recomputeMutation.isPending}
       isDashboardLoading={fieldQuery.isLoading || riskQuery.isLoading || alertsQuery.isLoading || statusQuery.isLoading || riskTimelineQuery.isLoading || weatherTimelineQuery.isLoading || dashboardQuery.isLoading}
       queryErrors={[...queryErrors, ...(workspaceQuery.error ? [workspaceQuery.error instanceof Error ? workspaceQuery.error.message : 'No se pudo cargar el contexto Agronautas'] : []), ...(activityQuery.error ? [activityQuery.error instanceof Error ? activityQuery.error.message : 'No se pudo cargar la actividad'] : []), ...(intelligenceQuery.error ? [intelligenceQuery.error instanceof Error ? intelligenceQuery.error.message : 'No se pudo cargar la inteligencia Agronautas'] : []), ...(fieldsQuery.error ? [fieldsQuery.error instanceof Error ? fieldsQuery.error.message : 'No se pudo cargar el índice de lotes'] : [])]}
        onRetrySync={retrySync}
        onSelectField={selectField}
        workspaceView={initialView}
        workspaceBasePath={isDemo ? '/demo' : '/agronautas'}
       onSubmitIntake={(input) => intakeMutation.mutateAsync(input)}
       onSaveGeometry={(input) => geometryMutation.mutateAsync(input) as Promise<NonNullable<typeof geometryQuery.data>>}
       onSelectPolygon={selectPolygon}
      onRequestRecompute={() => (selectedFieldId ? recomputeMutation.mutateAsync(selectedFieldId) : Promise.resolve(undefined))}
       onAskChat={(message) => chatMutation.mutateAsync(message)}
       onRetryChat={() => lastChatMessage ? chatMutation.mutateAsync(lastChatMessage) : Promise.resolve()}
       onAskHydrologyChat={(message) => hydrologyChatMutation.mutateAsync(message)}
       onRetryHydrologyChat={() => lastHydrologyMessage ? hydrologyChatMutation.mutateAsync(lastHydrologyMessage) : Promise.resolve()}
      />
    </div>
  )
}

function formatRequestError(error: unknown, fallback = 'No se pudo registrar el lote'): string {
  const outcome = normalizeRequestError(error)
  if (outcome.httpStatus === 401) return 'Sesión requerida para registrar el lote (HTTP 401). Iniciá sesión y reintentá.'
  if (outcome.httpStatus === 403) return 'No tenés permisos para registrar el lote (HTTP 403). Consultá al administrador.'
  if (outcome.httpStatus === 404) return 'La capacidad de registro no está disponible (HTTP 404). Conservamos el borrador para reintentar.'
  if (error instanceof Error && error.name === 'ZodError') return 'La respuesta del registro no cumplió el contrato. Conservamos el borrador para reintentar.'
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function AgronautasPageClientForTests() {
  return <AgronautasPageClient service={createAgronautasMockService()} />
}
