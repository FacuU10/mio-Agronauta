'use client'

import { createElement, useEffect, useState } from 'react'
import { ProductShell } from '@/components/shell/product-shell'
import { VisibilityState } from '@/components/visibility/primitives'

const React = { createElement }

export interface MaintenanceReadiness {
  ready: boolean
  maintenance: {
    enabled: boolean
    reason?: string
  }
}

interface AgronautasMaintenancePageProps {
  readiness?: MaintenanceReadiness
  loadReadiness?: () => Promise<MaintenanceReadiness>
}

export function AgronautasMaintenancePage({ readiness, loadReadiness = fetchReadiness }: AgronautasMaintenancePageProps) {
  const [loadedReadiness, setLoadedReadiness] = useState<MaintenanceReadiness | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (readiness) return
    let active = true
    void loadReadiness().then((nextReadiness) => {
      if (active) setLoadedReadiness(nextReadiness)
    }).catch(() => {
      if (active) setLoadError(true)
    })
    return () => { active = false }
  }, [loadReadiness, readiness])

  const resolvedReadiness = readiness ?? loadedReadiness
  const state = resolvedReadiness
    ? resolvedReadiness.maintenance.enabled
      ? <VisibilityState state="error" title="Agronautas en mantenimiento" description="El acceso protegido está temporalmente suspendido para preservar la seguridad. No se muestran datos de workspace ni se declara disponibilidad operativa." reason={resolvedReadiness.maintenance.reason} retryAllowed={false} />
      : <VisibilityState state="unavailable" title="Mantenimiento no confirmado" description="Esta ruta sólo muestra un mantenimiento explícitamente confirmado por el runtime. No se muestran datos protegidos ni se presenta un estado operativo sin evidencia." retryAllowed={false} />
    : loadError
      ? <VisibilityState state="unavailable" title="Estado Agronautas no disponible" description="No se pudo confirmar el estado de mantenimiento. No se muestran datos protegidos ni se declara disponibilidad." retryAllowed={false} />
      : <VisibilityState state="loading" title="Verificando mantenimiento Agronautas" description="Confirmando el estado operativo antes de mostrar cualquier contenido protegido." retryAllowed={false} />

  return <ProductShell product="agronautas" title="Estado de mantenimiento" description="Estado público del runtime Agronautas, sin contenido de workspace." navItems={[{ href: '/', label: 'Inicio' }, { href: '/login', label: 'Acceso protegido' }]}><div className="mx-auto max-w-4xl py-8">{state}</div></ProductShell>
}

async function fetchReadiness(): Promise<MaintenanceReadiness> {
  const response = await fetch('/api/agronautas/ready', { cache: 'no-store' })
  const payload = await response.json() as unknown
  if (!isMaintenanceReadiness(payload)) throw new Error('maintenance_readiness_contract_unavailable')
  return payload
}

function isMaintenanceReadiness(value: unknown): value is MaintenanceReadiness {
  if (value === null || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  const maintenance = record['maintenance']
  if (maintenance === null || typeof maintenance !== 'object') return false
  return typeof record['ready'] === 'boolean' && typeof (maintenance as Record<string, unknown>)['enabled'] === 'boolean'
}
