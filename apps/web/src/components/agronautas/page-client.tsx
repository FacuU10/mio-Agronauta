'use client'

import { createElement, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueries } from '@tanstack/react-query'
import type { FieldIntake } from '@repo/zod-schemas'
import { ApiError } from '@/lib/api-client'
import { createAgronautasMockService, resolveAgronautasService, type AgronautasService } from '@/lib/agronautas/service'
import { AGRONAUTAS_CONTRACT_VERSION, agronautasWorkspaceFieldPageSchema, contractErrorSchema, fieldCreatedSchema, recomputeRequestResultSchema, type GroundedChatResponse, type AgronautasWorkspaceFieldPage, type CampaignPlanningContextResponse, type AssumptionSimulationResponse } from '@/lib/agronautas/schemas'
import { useAgronautasStore } from '@/store/agronautas-store'
import { applyChatEvent, createChatStreamState, type ChatStreamState } from '@/lib/visibility/chat'
import { normalizeRequestError } from '@/lib/visibility/view-models'
import type { SseEvent } from '@/lib/visibility/sse'
import { AgronautasWorkspace, type AgronautasAccessState, type AgronautasCapabilityState, type AgronautasCapabilityStates } from './workspace'

const React = { createElement }

interface AgronautasPageClientProps {
  service?: AgronautasService
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

function resolveAccessState(runtimeQuery: { data?: { mode?: string }; error: unknown }, workspaceQuery: { error: unknown }): { state: AgronautasAccessState; reason?: string } {
  const error = runtimeQuery.error ?? workspaceQuery.error
  if (error) {
    const outcome = normalizeRequestError(error)
    const status = error instanceof ApiError ? error.status : outcome.httpStatus
    if (status === 401) return { state: 'unauthorized', reason: outcome.reason }
    if (status === 403) return { state: 'forbidden', reason: outcome.reason }
    return { state: 'unavailable', reason: outcome.reason }
  }
  if (runtimeQuery.data?.mode === 'demo') return { state: 'demo' }
  if (runtimeQuery.data) return { state: 'authenticated' }
  return { state: 'loading' }
}

export function AgronautasPageClient({ service }: AgronautasPageClientProps) {
  const resolvedService = service ?? resolveAgronautasService()
  const selectedFieldId = useAgronautasStore((state) => state.selectedFieldId)
  const lastCreatedFieldId = useAgronautasStore((state) => state.lastCreatedFieldId)
  const intakeError = useAgronautasStore((state) => state.intakeError)
  const setSelectedFieldId = useAgronautasStore((state) => state.setSelectedFieldId)
  const setLastCreatedFieldId = useAgronautasStore((state) => state.setLastCreatedFieldId)
  const setIntakeError = useAgronautasStore((state) => state.setIntakeError)
  const [chatResponse, setChatResponse] = useState<GroundedChatResponse | undefined>(undefined)
  const [hydrologyChatState, setHydrologyChatState] = useState<ChatStreamState>(createChatStreamState())
  const [chatError, setChatError] = useState<string | null>(null)
  const [lastChatMessage, setLastChatMessage] = useState<string | null>(null)
  const [lastHydrologyMessage, setLastHydrologyMessage] = useState<string | null>(null)
  const [planningContext, setPlanningContext] = useState<CampaignPlanningContextResponse | undefined>()
  const [simulation, setSimulation] = useState<AssumptionSimulationResponse | undefined>()
  const workspaceQuery = useQueries({ queries: [{ queryKey: ['agronautas', 'workspace'], queryFn: () => resolvedService.getWorkspace(), retry: false }] })[0]
  const fieldsQuery = useInfiniteQuery({
    queryKey: ['agronautas', 'workspace-fields', workspaceQuery.data?.workspaceId],
    queryFn: ({ pageParam }) => resolvedService.listWorkspaceFields(workspaceQuery.data?.workspaceId ?? '', pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(workspaceQuery.data?.workspaceId),
    retry: false,
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
  const geometryQuery = useQueries({ queries: [{ queryKey: ['agronautas', 'geometry', selectedFieldId], queryFn: () => resolvedService.getFieldGeometry?.(selectedFieldId as string), enabled: Boolean(selectedFieldId && resolvedService.getFieldGeometry) }] })[0]
  const geometryMutation = useMutation({ mutationFn: async (input: { polygonWkt: string; expectedUpdatedAt?: string }) => {
    if (!selectedFieldId || !resolvedService.updateFieldGeometry) throw new Error('La edición de geometría no está disponible')
    return resolvedService.updateFieldGeometry(selectedFieldId, input)
  }, onSuccess: () => void geometryQuery.refetch() })

  const intakeMutation = useMutation({
    mutationFn: async (input: FieldIntake) => fieldCreatedSchema.parse(await resolvedService.createFieldIntake(input)),
    onSuccess: (result) => {
      setSelectedFieldId(result.fieldId)
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
        queryKey: ['agronautas', 'field', selectedFieldId],
        queryFn: () => resolvedService.getField(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
        retry: false,
      },
      {
        queryKey: ['agronautas', 'risk', selectedFieldId],
        queryFn: () => resolvedService.getCurrentRisk(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
        retry: false,
      },
      {
        queryKey: ['agronautas', 'alerts', selectedFieldId],
        queryFn: () => resolvedService.getCurrentAlerts(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
        retry: false,
      },
      {
        queryKey: ['agronautas', 'status', selectedFieldId],
        queryFn: () => resolvedService.getMonitoringStatus(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
        retry: false,
      },
      {
        queryKey: ['agronautas', 'risk-timeline', selectedFieldId],
        queryFn: () => resolvedService.getRiskTimeline(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
        retry: false,
      },
      {
        queryKey: ['agronautas', 'weather-timeline', selectedFieldId],
        queryFn: () => resolvedService.getWeatherTimeline(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
        retry: false,
      },
      {
        queryKey: ['agronautas', 'dashboard-payload', selectedFieldId],
        queryFn: () => resolvedService.getDashboard(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
        retry: false,
      },
      {
        queryKey: ['agronautas', 'hydrology-dashboard', selectedFieldId],
        queryFn: () => resolvedService.getHydrologyDashboard(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
        retry: false,
      },
    ],
  })
  const activityQuery = useQueries({ queries: [{ queryKey: ['agronautas', 'activity', selectedFieldId], queryFn: () => resolvedService.getFieldActivity(selectedFieldId as string), enabled: Boolean(selectedFieldId), retry: false }] })[0]
  const intelligenceQuery = useQueries({ queries: [{ queryKey: ['agronautas', 'intelligence', selectedFieldId], queryFn: () => resolvedService.getFieldIntelligence(selectedFieldId as string), enabled: Boolean(selectedFieldId), retry: false }] })[0]
  const loadPlanningContext = async (input: { campaignName: string; season: string; fieldIds: string[] }) => { const result = await resolvedService.getCampaignPlanningContext({ contractVersion: 'agronautas-campaign-planning-context-v1', workspaceId: 'agronautas-default-workspace', ...input }); setPlanningContext(result) }
  const simulateAssumptions = async (input: Parameters<AgronautasService['simulateAssumptions']>[0]) => { setSimulation(undefined); setSimulation(await resolvedService.simulateAssumptions(input)) }
  const runtimeQuery = useQueries({
    queries: [{ queryKey: ['agronautas', 'runtime'], queryFn: () => resolvedService.getRuntime(), retry: false }],
  })[0]
  const access = resolveAccessState(runtimeQuery, workspaceQuery)
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
    ])
  }

  return (
    <div
      id="main-content"
      data-testid="agronautas-main-content"
      tabIndex={-1}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
    >
      <AgronautasWorkspace
        runtimeMode={runtimeQuery.data?.mode ?? 'real'}
        runtimeStatus={runtimeQuery.isLoading ? 'loading' : runtimeQuery.error ? 'error' : 'ready'}
        runtimeError={runtimeQuery.error instanceof Error ? runtimeQuery.error.message : null}
        accessState={access.state}
        accessReason={access.reason ?? null}
        capabilityStates={capabilityStates}
       selectedFieldId={selectedFieldId}
        fieldIndex={fieldIndex}
        isFieldIndexLoading={fieldsQuery.isLoading}
        isFieldIndexFetchingNextPage={fieldsQuery.isFetchingNextPage}
        hasNextFieldPage={Boolean(fieldsQuery.hasNextPage)}
        onLoadMoreFields={() => void fieldsQuery.fetchNextPage()}
       workspace={workspaceQuery.data}
       activity={activityQuery.data}
       intelligence={intelligenceQuery.data}
       planningContext={planningContext}
       simulation={simulation}
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
      dashboardPayload={dashboardQuery.data}
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
      onSelectField={setSelectedFieldId}
      onSubmitIntake={(input) => intakeMutation.mutateAsync(input)}
      onSaveGeometry={(input) => geometryMutation.mutateAsync(input) as Promise<NonNullable<typeof geometryQuery.data>>}
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
