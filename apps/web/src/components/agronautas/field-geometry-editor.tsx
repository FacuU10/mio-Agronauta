'use client'

import { createElement, useState } from 'react'
import type { FieldGeometryResponse, FieldGeometryUpdate } from '@/lib/agronautas/schemas'
import { createAgronautasMapAdapter, createPolygonDraft, formatGeometryMetrics } from '@/lib/agronautas/intake-map'
import type { MapPoint } from '@/lib/visibility/map'

const React = { createElement }

interface FieldGeometryEditorProps {
  fieldId: string
  initialGeometry: FieldGeometryResponse
  onSave: (input: FieldGeometryUpdate) => Promise<FieldGeometryResponse>
}

export function FieldGeometryEditor({ initialGeometry, onSave }: FieldGeometryEditorProps) {
  const adapter = createAgronautasMapAdapter()
  const [points, setPoints] = useState<MapPoint[]>(parseWktPoints(initialGeometry.polygonWkt))
  const [savedGeometry, setSavedGeometry] = useState(initialGeometry)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const draft = createPolygonDraft(points)
  const metrics = formatGeometryMetrics({ hectares: draft.hectares, areaM2: draft.areaM2, perimeterM: draft.perimeterM })

  function addVertex() {
    const first = points[0] ?? initialGeometry.centroid
    setPoints([...points, { lat: first.lat + 0.001, lng: first.lng + 0.001 }])
    setError(null)
    setSaveMessage(null)
  }

  function removeVertex() {
    setPoints(points.slice(0, -1))
    setError(null)
    setSaveMessage(null)
  }

  async function save() {
    if (!draft.isComplete || !draft.polygonWkt) {
      setError('El perímetro necesita tres vértices para poder guardarse.')
      return
    }
    setIsSaving(true)
    setError(null)
    setSaveMessage(null)
    try {
      const result = await onSave({ polygonWkt: draft.polygonWkt, expectedUpdatedAt: savedGeometry.updatedAt ?? undefined })
      setSavedGeometry(result)
      setSaveMessage('Guardado por el backend. El área confirmada queda bajo autoridad del servidor.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el perímetro.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5" aria-label="Editor de perímetro">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Editor de perímetro</h2>
          <p className="mt-1 text-sm text-stone-600">Dibujá con coordenadas deterministas; el API autenticado valida y confirma las métricas.</p>
        </div>
        <span className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{draft.isComplete ? 'Borrador' : 'Incompleto'}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="grid min-h-52 content-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5" aria-label="Alternativa no cartográfica">
          <p className="text-sm font-semibold text-stone-900">Google Maps no está disponible</p>
          <p className="text-sm leading-6 text-stone-600">{adapter.google.status === 'disabled' ? 'Falta una clave pública restringida o la capacidad está deshabilitada.' : 'La capacidad cartográfica aún no se ha inicializado.'} Usá el editor de vértices sin depender del runtime de Google.</p>
          <p className="font-mono text-xs text-stone-500">{draft.polygonWkt ?? 'POLYGON pendiente de tres vértices'}</p>
        </div>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2" aria-label="Métricas de borrador">
            <Metric label="Área" value={metrics.area} />
            <Metric label="Huella" value={metrics.footprint} />
            <Metric label="Perímetro" value={metrics.perimeter} />
          </div>
          <p className="text-xs text-stone-500">{points.length} vértices · el borrador no reemplaza la geometría guardada.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" onClick={addVertex}>Agregar vértice</button>
            <button type="button" className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" onClick={removeVertex} disabled={!points.length}>Quitar vértice</button>
            <button type="button" className="rounded-xl bg-emerald-900 px-3 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => void save()} disabled={isSaving}> {isSaving ? 'Guardando…' : 'Guardar perímetro'}</button>
          </div>
          {error ? <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
          {saveMessage ? <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{saveMessage}</p> : null}
          <p className="rounded-xl border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-600">Último perímetro guardado: {savedGeometry.status} · fuente {savedGeometry.source} · {savedGeometry.updatedAt ?? 'solo punto'}</p>
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-stone-200 p-3"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 text-sm font-semibold text-stone-900">{value}</p></div>
}

function parseWktPoints(wkt: string): MapPoint[] {
  const body = /POLYGON\s*\(\((.+)\)\)/i.exec(wkt)?.[1]
  if (!body) return []
  const points: MapPoint[] = body.split(',').flatMap((pair) => {
    const [lngValue, latValue] = pair.trim().split(/\s+/)
    const lat = Number(latValue)
    const lng = Number(lngValue)
    return Number.isFinite(lat) && Number.isFinite(lng) ? [{ lat, lng }] : []
  })
  const first = points[0]
  const last = points.at(-1)
  return first && last && points.length > 1 && first.lat === last.lat && first.lng === last.lng ? points.slice(0, -1) : points
}
