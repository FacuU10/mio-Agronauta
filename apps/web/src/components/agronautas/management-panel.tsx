'use client'

import { createElement, useState } from 'react'
import type { AgronautasManagementAuditItem, AgronautasManagementItem } from '@/lib/agronautas/schemas'
import { VisibilityState } from '@/components/visibility/primitives'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const React = { createElement }

export interface ManagementPanelProps {
  selectedFieldId: string | null
  items: AgronautasManagementItem[]
  audit: AgronautasManagementAuditItem[]
  isLoading: boolean
  error: string | null
  isMutating: boolean
  accessState?: 'ready' | 'unauthorized' | 'forbidden' | 'unavailable' | 'maintenance' | 'degraded'
  accessReason?: string | null
  onRetry: () => Promise<unknown>
  onCreateOperation: (name: string) => Promise<unknown>
  onTransition: (item: AgronautasManagementItem) => Promise<unknown>
}

export function ManagementPanel(props: ManagementPanelProps) {
  const [name, setName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [mutationNotice, setMutationNotice] = useState<string | null>(null)

  if (props.accessState === 'forbidden') return <VisibilityState state="forbidden" title="Gestión Agronautas restringida" description={props.accessReason ?? 'La sesión no tiene permisos para consultar la gestión de este workspace.'} retryAllowed={false} />
  if (props.accessState === 'unauthorized') return <VisibilityState state="unauthorized" title="Gestión Agronautas no autorizada" description={props.accessReason ?? 'Se requiere una sesión autorizada para consultar la gestión.'} retryAllowed={false} />
  if (props.accessState === 'maintenance') return <VisibilityState state="error" title="Gestión Agronautas en mantenimiento" description={props.accessReason ?? 'La capacidad no está disponible mientras se verifica el almacenamiento.'} retryAllowed={false} />
  if (props.accessState === 'unavailable') return <VisibilityState state="unavailable" title="Gestión Agronautas no disponible" description={props.accessReason ?? 'No se pudo consultar el almacenamiento de gestión.'} retryLabel="Reintentar gestión" onRetry={() => void props.onRetry()} />
  if (props.accessState === 'degraded') return <VisibilityState state="degraded" title="Gestión Agronautas degradada" description={props.accessReason ?? 'La respuesta puede estar incompleta; no se agregan registros locales para compensarla.'} retryLabel="Reintentar gestión" onRetry={() => void props.onRetry()} />

  if (props.isLoading) return <Card aria-label="Gestión Agronautas"><CardHeader><CardTitle>Gestión operativa</CardTitle></CardHeader><CardContent><p role="status">Cargando campañas, operaciones y tareas…</p></CardContent></Card>
  if (props.error) return <Card aria-label="Gestión Agronautas"><CardHeader><CardTitle>Gestión operativa no disponible</CardTitle><CardDescription>No se muestran registros fabricados mientras el almacenamiento está fuera de servicio.</CardDescription></CardHeader><CardContent><VisibilityState state="error" title="No se pudo cargar la gestión" description={props.error} retryLabel="Reintentar gestión" onRetry={() => void props.onRetry()} /></CardContent></Card>

  const create = async () => {
    const value = name.trim()
    if (!value) {
      setFormError('Ingresá un nombre antes de crear la operación.')
      return
    }
    if (!props.selectedFieldId) {
      setFormError('Seleccioná un lote autorizado antes de crear una operación.')
      return
    }
    setFormError(null)
    setMutationError(null)
    setMutationNotice(null)
    try {
      await props.onCreateOperation(value)
      setName('')
      setMutationNotice(`Operación “${value}” confirmada.`)
    } catch (error) {
      setMutationError(mutationErrorMessage(error))
    }
  }

  const transition = async (item: AgronautasManagementItem) => {
    setMutationError(null)
    setMutationNotice(null)
    try {
      await props.onTransition(item)
      setMutationNotice(`Transición de “${item.name}” confirmada.`)
    } catch (error) {
      setMutationError(mutationErrorMessage(error))
    }
  }

  return <Card aria-label="Gestión Agronautas" data-testid="agronautas-management-panel">
    <CardHeader><CardTitle>Gestión operativa</CardTitle><CardDescription>Campañas, temporadas, operaciones y tareas persistidas con revisión y auditoría. La planificación permanece etiquetada como supuesto.</CardDescription></CardHeader>
    <CardContent className="grid gap-5">
      <form className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end" onSubmit={(event) => { event.preventDefault(); void create() }}>
        <div className="grid gap-2"><Label htmlFor="management-operation-name">Nombre de operación</Label><Input id="management-operation-name" value={name} onChange={(event) => setName(event.target.value)} onInput={(event) => setName(event.currentTarget.value)} placeholder="Aplicar tratamiento" aria-describedby={formError ? 'management-form-error' : undefined} /></div>
        <Button type="submit" disabled={props.isMutating}>{props.isMutating ? 'Guardando…' : 'Crear operación'}</Button>
      </form>
      {formError ? <p id="management-form-error" role="alert">{formError}</p> : null}
      {mutationError ? <div role="alert" aria-live="assertive"><p>{mutationError}</p><Button type="button" variant="outline" className="mt-2" onClick={() => void props.onRetry()}>Reintentar gestión</Button></div> : null}
      {mutationNotice ? <p role="status" aria-live="polite">{mutationNotice}</p> : null}
      {!props.items.length ? <p role="status">No hay campañas, operaciones o tareas persistidas.</p> : <ul className="grid gap-3 md:grid-cols-2" aria-label="Registros de gestión">
        {props.items.map((item) => <li key={item.id} className="rounded-2xl border border-stone-200 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{item.name}</p><p className="text-sm text-stone-600">{item.kind} · revisión {item.revision}</p></div><Badge variant={item.status === 'completed' ? 'success' : item.status === 'blocked' ? 'destructive' : item.status === 'cancelled' ? 'outline' : 'warning'}>{item.status}</Badge></div>
          <p className="mt-2 text-xs text-stone-500">Responsable: {item.responsibleActorId ?? 'sin asignar'} · {item.planningLabel}</p>
          {item.status === 'planned' || item.status === 'active' ? <Button type="button" variant="outline" className="mt-3" disabled={props.isMutating} onClick={() => void transition(item)}>{item.status === 'planned' ? 'Activar operación' : 'Completar operación'}</Button> : null}
        </li>)}
      </ul>}
      <div className="grid gap-2 border-t border-stone-200 pt-4" aria-label="Auditoría de gestión"><p className="font-semibold">Auditoría e historial respaldado</p>{props.audit.length ? <ol className="grid gap-2">{props.audit.map((entry) => <li key={entry.auditId} className="text-sm text-stone-600">{entry.action} · {entry.outcome} · {entry.targetId} · revisión {entry.revisionBefore ?? '—'} → {entry.revisionAfter ?? '—'} · actor {entry.actorId} · {entry.occurredAt}</li>)}</ol> : <p className="text-sm text-stone-600">Sin actividad de gestión todavía.</p>}</div>
    </CardContent>
  </Card>
}

function mutationErrorMessage(error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : undefined
  if (status === 409) return 'La gestión cambió mientras la editabas (HTTP 409). Conservamos el borrador y mostramos la última revisión después de recargar.'
  if (status === 403) return 'No tenés permisos para modificar esta gestión (HTTP 403). Conservamos el borrador.'
  if (status === 401) return 'La sesión ya no está autorizada para modificar esta gestión (HTTP 401). Conservamos el borrador.'
  return error instanceof Error && error.message ? error.message : 'No se pudo confirmar la mutación de gestión. Conservamos el borrador.'
}
