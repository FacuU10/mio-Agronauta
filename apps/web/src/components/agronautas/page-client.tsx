'use client'

import React from 'react'
import { useMemo } from 'react'
import { useMutation, useQueries } from '@tanstack/react-query'
import type { FieldIntake } from '@repo/zod-schemas'
import { ApiError } from '@/lib/api-client'
import { createAgronautasMockService, resolveAgronautasService, type AgronautasService } from '@/lib/agronautas/service'
import { contractErrorSchema } from '@/lib/agronautas/schemas'
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

  const intakeMutation = useMutation({
    mutationFn: (input: FieldIntake) => resolvedService.createFieldIntake(input),
    onSuccess: (result) => {
      setSelectedFieldId(result.fieldId)
      setLastCreatedFieldId(result.fieldId)
      setIntakeError(null)
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

  const [fieldQuery, riskQuery, alertsQuery] = useQueries({
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
    ],
  })

  return (
    <AgronautasWorkspace
      selectedFieldId={selectedFieldId}
      lastCreatedFieldId={lastCreatedFieldId}
      intakeError={intakeError}
      isSubmitting={intakeMutation.isPending}
      field={fieldQuery.data}
      risk={riskQuery.data}
      alerts={alertsQuery.data}
      isDashboardLoading={fieldQuery.isLoading || riskQuery.isLoading || alertsQuery.isLoading}
      onSelectField={setSelectedFieldId}
      onSubmitIntake={(input) => intakeMutation.mutateAsync(input)}
    />
  )
}

export function AgronautasPageClientForTests() {
  return <AgronautasPageClient service={createAgronautasMockService()} />
}
