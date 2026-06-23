'use client'

import React from 'react'
import { useMemo, useState } from 'react'
import { useMutation, useQueries } from '@tanstack/react-query'
import type { FieldIntake } from '@repo/zod-schemas'
import { ApiError } from '@/lib/api-client'
import { createAgronautasMockService, resolveAgronautasService, type AgronautasService } from '@/lib/agronautas/service'
import { AGRONAUTAS_CONTRACT_VERSION, contractErrorSchema, recomputeRequestResultSchema, type GroundedChatResponse } from '@/lib/agronautas/schemas'
import { useAgronautasStore } from '@/store/agronautas-store'
import { AgronautasWorkspace } from './workspace'

interface AgronautasPageClientProps {
  service?: AgronautasService
}

export function AgronautasPageClient({ service }: AgronautasPageClientProps) {
  const resolvedService = useMemo(() => service ?? resolveAgronautasService(), [service])
  const selectedFieldId = useAgronautasStore((state) => state.selectedFieldId)
  const lastCreatedFieldId = useAgronautasStore((state) => state.lastCreatedFieldId)
  const intakeError = useAgronautasStore((state) => state.intakeError)
  const setSelectedFieldId = useAgronautasStore((state) => state.setSelectedFieldId)
  const setLastCreatedFieldId = useAgronautasStore((state) => state.setLastCreatedFieldId)
  const setIntakeError = useAgronautasStore((state) => state.setIntakeError)
  const [chatResponse, setChatResponse] = useState<GroundedChatResponse | undefined>(undefined)
  const [hydrologyAnswer, setHydrologyAnswer] = useState('')
  const [hydrologyError, setHydrologyError] = useState<string | null>(null)
  const [chatError, setChatError] = useState<string | null>(null)

  const intakeMutation = useMutation({
    mutationFn: (input: FieldIntake) => resolvedService.createFieldIntake(input),
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
        setIntakeError(parsed.success ? parsed.data.message : error.message)
        return
      }

      setIntakeError(error instanceof Error ? error.message : 'No se pudo registrar el lote')
    },
  })

  const recomputeMutation = useMutation({
    mutationFn: (fieldId: string) => resolvedService.requestRecompute(fieldId),
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) => {
      if (!selectedFieldId) throw new Error('Seleccioná un lote antes de usar el chat')
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
      setHydrologyAnswer('')
      setHydrologyError(null)
      await resolvedService.askHydrologyCopilot(selectedFieldId, {
        contractVersion: AGRONAUTAS_CONTRACT_VERSION,
        message,
      }, (token) => setHydrologyAnswer((current) => `${current}${token}`))
    },
    onError: (error) => {
      setHydrologyError(error instanceof Error ? error.message : 'No se pudo abrir el Copilot Hidrológico')
    },
  })

  const [fieldQuery, riskQuery, alertsQuery, statusQuery, riskTimelineQuery, weatherTimelineQuery, hydrologyQuery] = useQueries({
    queries: [
      {
        queryKey: ['agronautas', 'field', selectedFieldId],
        queryFn: () => resolvedService.getField(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
      },
      {
        queryKey: ['agronautas', 'risk', selectedFieldId],
        queryFn: () => resolvedService.getCurrentRisk(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
      },
      {
        queryKey: ['agronautas', 'alerts', selectedFieldId],
        queryFn: () => resolvedService.getCurrentAlerts(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
      },
      {
        queryKey: ['agronautas', 'status', selectedFieldId],
        queryFn: () => resolvedService.getMonitoringStatus(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
      },
      {
        queryKey: ['agronautas', 'risk-timeline', selectedFieldId],
        queryFn: () => resolvedService.getRiskTimeline(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
      },
      {
        queryKey: ['agronautas', 'weather-timeline', selectedFieldId],
        queryFn: () => resolvedService.getWeatherTimeline(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
      },
      {
        queryKey: ['agronautas', 'hydrology-dashboard', selectedFieldId],
        queryFn: () => resolvedService.getHydrologyDashboard(selectedFieldId as string),
        enabled: Boolean(selectedFieldId),
      },
    ],
  })
  const runtimeQuery = useQueries({
    queries: [{ queryKey: ['agronautas', 'runtime'], queryFn: () => resolvedService.getRuntime() }],
  })[0]

  return (
    <AgronautasWorkspace
      runtimeMode={runtimeQuery.data?.mode ?? 'real'}
      selectedFieldId={selectedFieldId}
      lastCreatedFieldId={lastCreatedFieldId}
      intakeError={intakeError}
      isSubmitting={intakeMutation.isPending}
      field={fieldQuery.data}
      risk={riskQuery.data}
      alerts={alertsQuery.data}
      status={statusQuery.data}
      riskTimeline={riskTimelineQuery.data}
      weatherTimeline={weatherTimelineQuery.data}
      hydrologyDashboard={hydrologyQuery.data}
      chatResponse={chatResponse}
      hydrologyAnswer={hydrologyAnswer}
      hydrologyError={hydrologyError}
      chatError={chatError}
      isChatPending={chatMutation.isPending}
      isHydrologyChatPending={hydrologyChatMutation.isPending}
      recomputeStatus={recomputeRequestResultSchema.safeParse(recomputeMutation.data).success ? recomputeMutation.data : undefined}
      isRecomputePending={recomputeMutation.isPending}
      isDashboardLoading={fieldQuery.isLoading || riskQuery.isLoading || alertsQuery.isLoading || statusQuery.isLoading || riskTimelineQuery.isLoading || weatherTimelineQuery.isLoading || hydrologyQuery.isLoading}
      onSelectField={setSelectedFieldId}
      onSubmitIntake={(input) => intakeMutation.mutateAsync(input)}
      onRequestRecompute={() => (selectedFieldId ? recomputeMutation.mutateAsync(selectedFieldId) : Promise.resolve(undefined))}
      onAskChat={(message) => chatMutation.mutateAsync(message)}
      onAskHydrologyChat={(message) => hydrologyChatMutation.mutateAsync(message)}
    />
  )
}

export function AgronautasPageClientForTests() {
  return <AgronautasPageClient service={createAgronautasMockService()} />
}
