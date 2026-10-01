'use client'

import React, { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, Droplets, Leaf, MapPin, Plus, Sprout, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  definitions,
  initialData,
  stockStatus,
  formatDate,
  type Entity,
  type Row,
} from './agronomy-data'

const tabs = [
  ['summary', 'Resumen'],
  ['lots', 'Lotes'],
  ['tasks', 'Tareas'],
  ['applications', 'Aplicaciones'],
  ['stock', 'Stock'],
  ['water', 'Riego y Monitoreo'],
] as const
type Tab = (typeof tabs)[number][0]
type Modal = { entity: Entity; row?: Row; mode: 'edit' | 'view' | 'delete' | 'in' | 'out' }
const control =
  'w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-offset-4 focus:outline-emerald-700'
function Status({ children }: { children: string | undefined }) {
  const warning = ['Revisar', 'Alta', 'Stock bajo', 'Pendiente'].includes(children || '')
  const danger = ['Sin stock', 'Atrasada'].includes(children || '')
  return (
    <Badge
      className={
        danger
          ? 'border-rose-200 bg-rose-50 text-rose-800'
          : warning
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }
    >
      {children}
    </Badge>
  )
}
function SummaryCard({
  title,
  children,
  onClick,
}: {
  title: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <Card className="bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-stone-900">{title}</h3>
        <button
          onClick={onClick}
          aria-label={`Ver ${title.toLowerCase()}`}
          className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50"
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
      <div className="space-y-4">{children}</div>
    </Card>
  )
}

export function AgronomyPanel() {
  const [tab, setTab] = useState<Tab>('summary')
  const [water, setWater] = useState<'irrigation' | 'monitoring'>('irrigation')
  const [data, setData] = useState(initialData)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<Modal | null>(null)
  const [notice, setNotice] = useState('')
  const [activity, setActivity] = useState([
    'Monitoreo registrado · Lote Sur',
    'Aplicación registrada · Lote Norte',
    'Riego registrado · Lote Norte',
  ])
  const entity: Entity = tab === 'water' ? water : tab === 'summary' ? 'lots' : tab
  const pending = data.tasks.filter((row) => row['status'] !== 'Completada')
  const critical = data.stock.filter((row) => stockStatus(row) !== 'Stock normal')
  const alerts = [
    ...data.monitoring
      .filter((row) => row['status'] === 'Revisar')
      .map((row) => ({ title: row['lot'], detail: row['notes'], tab: 'water' as Tab })),
    ...critical.map((row) => ({
      title: row['name'],
      detail: stockStatus(row),
      tab: 'stock' as Tab,
    })),
  ]
  const rows = data[entity].filter((row) =>
    Object.values(row).join(' ').toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))
  )
  function navigate(next: Tab) {
    setTab(next)
    setSearch('')
  }
  function record(message: string) {
    setNotice(message)
    setActivity((previous) => [message, ...previous].slice(0, 5))
  }
  function save(row: Row) {
    if (!modal) return
    setData((previous) => ({
      ...previous,
      [modal.entity]: modal.row
        ? previous[modal.entity].map((item) => (item.id === row.id ? row : item))
        : [...previous[modal.entity], row],
    }))
    record(
      `${modal.row ? 'Registro actualizado' : 'Registro agregado'} · ${row['name'] || row['title'] || row['lot']}`
    )
    setModal(null)
  }
  const metrics = [
    ['Lotes activos', String(data.lots.length), 'En esta campaña'],
    [
      'Hectáreas cultivadas',
      data.lots
        .reduce((sum, row) => sum + Number(row['area']), 0)
        .toLocaleString('es-AR', { maximumFractionDigits: 1 }),
      'Superficie total · ha',
    ],
    ['Tareas pendientes', String(pending.length), 'Por realizar o finalizar'],
    [
      'Aplicaciones del mes',
      String(data.applications.filter((row) => (row['date'] || '').startsWith('2026-10')).length),
      'Octubre de 2026',
    ],
    ['Alertas activas', String(alerts.length), 'Requieren seguimiento'],
  ]
  return (
    <section id="agronautas-agronomy">
      <div className="relative overflow-hidden bg-emerald-950 pt-20 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-[position:center_65%]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(6, 30, 20, 0.82), rgba(6, 30, 20, 0.22)), url('/agronomy/agronomy-hero.png')",
          }}
        />
        <div className="relative mx-auto flex min-h-[320px] max-w-[1440px] flex-wrap items-center justify-between gap-8 px-4 py-12 sm:min-h-[360px] sm:px-8 sm:py-16">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold tracking-[0.24em] text-emerald-200">
              GESTIÓN AGRONÓMICA
            </p>
            <h2 className="font-serif text-3xl leading-tight sm:text-5xl">
              Tu campaña, en un solo lugar.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-50 sm:text-base">
              Organizá lotes, tareas, aplicaciones, insumos y monitoreos desde un solo lugar.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-emerald-100">
              <span className="flex items-center gap-1.5">
                <MapPin size={15} /> Corrientes, Argentina
              </span>
              <span>Campaña 2026/27</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
            <Sprout className="mb-3 text-emerald-200" size={30} />
            <p className="font-semibold">Cada lote cuenta.</p>
            <p className="mt-1 text-sm text-emerald-100">Planificá. Registrá. Monitoreá.</p>
            <Button
              className="mt-5 bg-white text-emerald-950 hover:bg-emerald-50"
              onClick={() => {
                navigate('tasks')
                setModal({ entity: 'tasks', mode: 'edit' })
              }}
            >
              <Plus size={16} className="mr-2" /> Nueva tarea
            </Button>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[90rem] space-y-6 px-4 py-6 sm:px-8">
        <p className="text-xs text-stone-500">
          DEMO · Datos ficticios · Fecha de referencia: 1 de octubre de 2026. Los cambios duran
          durante esta sesión.
        </p>
        <div
          role="tablist"
          aria-label="Secciones de Gestión Agronómica"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm"
        >
          {tabs.map(([key, label], index) => (
            <button
              key={key}
              id={`ag-tab-${key}`}
              role="tab"
              aria-selected={tab === key}
              aria-controls="ag-tabpanel"
              tabIndex={tab === key ? 0 : -1}
              onKeyDown={(event) => {
                const next =
                  event.key === 'ArrowRight'
                    ? (index + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (index + tabs.length - 1) % tabs.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : -1
                if (next >= 0) {
                  event.preventDefault()
                  navigate(tabs[next]![0])
                  document.getElementById(`ag-tab-${tabs[next]![0]}`)?.focus()
                }
              }}
              onClick={() => navigate(key)}
              className={`whitespace-nowrap rounded-xl px-5 py-3 text-sm font-semibold transition ${tab === key ? 'bg-emerald-800 text-white shadow-sm' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {notice && (
          <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </p>
        )}
        <div
          id="ag-tabpanel"
          role="tabpanel"
          aria-labelledby={`ag-tab-${tab}`}
          tabIndex={0}
          className="space-y-6"
        >
          {tab === 'summary' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {metrics.map(([label, value, detail], index) => (
                  <Card
                    key={label}
                    className={`p-5 ${index === 4 ? 'border-amber-200 bg-amber-50' : 'bg-white'}`}
                  >
                    <p className="text-sm text-stone-600">{label}</p>
                    <p className="my-3 text-3xl font-semibold tracking-tight text-stone-900">
                      {value}
                    </p>
                    <p className="text-xs text-stone-500">{detail}</p>
                  </Card>
                ))}
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                <SummaryCard title="Próximas tareas" onClick={() => navigate('tasks')}>
                  {pending.length ? (
                    [...pending]
                      .sort((a, b) => (a['date'] || '').localeCompare(b['date'] || ''))
                      .slice(0, 4)
                      .map((row) => (
                        <div key={row.id} className="border-b border-stone-100 pb-3 last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{row['title']}</p>
                            <Status>{row['status']}</Status>
                          </div>
                          <p className="mt-2 text-xs text-stone-500">
                            {formatDate(row['date'])} · {row['responsible']}
                          </p>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-stone-500">Todas las tareas están al día.</p>
                  )}
                </SummaryCard>
                <SummaryCard title="Estado de cultivos" onClick={() => navigate('lots')}>
                  {data.lots.map((row) => (
                    <div key={row.id} className="flex items-center gap-3">
                      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                        <Leaf size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{row['name']}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {row['crop']} · {row['stage']} · {row['area']} ha
                        </p>
                      </div>
                      <Status>{row['status']}</Status>
                    </div>
                  ))}
                  {!data.lots.length && (
                    <p className="text-sm text-stone-500">Agregá tu primer lote.</p>
                  )}
                </SummaryCard>
                <SummaryCard title="Alertas agronómicas" onClick={() => navigate('water')}>
                  {alerts.length ? (
                    alerts.map((alert, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          navigate(alert.tab)
                          if (alert.tab === 'water') setWater('monitoring')
                        }}
                        className="w-full rounded-xl border border-amber-100 bg-amber-50 p-3 text-left"
                      >
                        <p className="text-sm font-semibold text-amber-950">{alert.title}</p>
                        <p className="mt-1 text-xs leading-5 text-amber-900">{alert.detail}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-stone-500">Sin alertas activas.</p>
                  )}
                </SummaryCard>
                <SummaryCard title="Actividad reciente" onClick={() => navigate('applications')}>
                  {activity.map((item, index) => (
                    <div key={`${index}-${item}`} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      <div>
                        <p>{item}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {index === 0 && notice ? 'Esta sesión' : 'Campaña demo'}
                        </p>
                      </div>
                    </div>
                  ))}
                </SummaryCard>
                <SummaryCard title="Stock crítico" onClick={() => navigate('stock')}>
                  {critical.length ? (
                    critical.map((row) => (
                      <div key={row.id}>
                        <div className="flex justify-between gap-2 text-sm">
                          <p className="font-medium">{row['name']}</p>
                          <Status>{stockStatus(row)}</Status>
                        </div>
                        <p className="mt-2 text-xs text-stone-500">
                          {row['quantity']} {row['unit']} disponibles · Mínimo {row['minimum']}{' '}
                          {row['unit']}
                        </p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className="h-full rounded-full bg-amber-500"
                            style={{
                              width: `${Number(row['minimum']) ? Math.min(100, (Number(row['quantity']) / Number(row['minimum'])) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-stone-500">Inventario sin faltantes.</p>
                  )}
                </SummaryCard>
                <SummaryCard
                  title="Próximos riegos"
                  onClick={() => {
                    navigate('water')
                    setWater('irrigation')
                  }}
                >
                  {[...data.irrigation]
                    .filter((row) => (row['next'] || '') >= '2026-10-01')
                    .sort((a, b) => (a['next'] || '').localeCompare(b['next'] || ''))
                    .map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center gap-3 rounded-xl bg-sky-50 p-3"
                      >
                        <Droplets size={21} className="text-sky-700" />
                        <div>
                          <p className="text-sm font-semibold">{row['lot']}</p>
                          <p className="mt-1 text-xs text-stone-600">
                            {formatDate(row['next'])} · {row['method']}
                          </p>
                        </div>
                      </div>
                    ))}
                  {!data.irrigation.some((row) => (row['next'] || '') >= '2026-10-01') && (
                    <p className="text-sm text-stone-500">Sin riegos programados.</p>
                  )}
                </SummaryCard>
              </div>
            </>
          ) : (
            <>
              {tab === 'water' && (
                <div className="flex gap-2" aria-label="Tipo de registro">
                  {(['irrigation', 'monitoring'] as const).map((key) => (
                    <Button
                      key={key}
                      variant={water === key ? 'default' : 'outline'}
                      aria-pressed={water === key}
                      onClick={() => {
                        setWater(key)
                        setSearch('')
                      }}
                    >
                      {key === 'irrigation' ? 'Riego' : 'Monitoreo'}
                    </Button>
                  ))}
                </div>
              )}
              <Card className="overflow-hidden bg-white">
                <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <h2 className="text-xl font-semibold">{definitions[entity].title}</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      {data[entity].length} registros · Campaña 2026/27
                    </p>
                  </div>
                  <Button
                    className="bg-emerald-800 text-white"
                    onClick={() => setModal({ entity, mode: 'edit' })}
                  >
                    <Plus size={16} className="mr-2" />
                    {definitions[entity].action}
                  </Button>
                </div>
                {entity === 'stock' && critical.length > 0 && (
                  <p className="mx-6 mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    {critical.length} insumos requieren reposición. Registrá una entrada para
                    actualizar su disponibilidad.
                  </p>
                )}
                <div className="px-6 pb-5">
                  <label className="sr-only" htmlFor="ag-search">
                    Buscar registros
                  </label>
                  <input
                    id="ag-search"
                    className={`${control} max-w-sm`}
                    placeholder="Buscar por lote, producto o responsable…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">{definitions[entity].title}</caption>
                    <thead className="border-y border-stone-200 bg-stone-50 text-xs text-stone-500">
                      <tr>
                        {definitions[entity].fields
                          .filter((field) => field.key !== 'notes')
                          .map((field) => (
                            <th
                              key={field.key}
                              scope="col"
                              className="whitespace-nowrap px-5 py-4 font-medium"
                            >
                              {field.label}
                            </th>
                          ))}
                        {entity === 'stock' && (
                          <th scope="col" className="px-5 py-4">
                            Estado
                          </th>
                        )}
                        <th scope="col" className="px-5 py-4">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {rows.map((row) => (
                        <tr key={row.id} className="hover:bg-stone-50/70">
                          {definitions[entity].fields
                            .filter((field) => field.key !== 'notes')
                            .map((field, index) => (
                              <td
                                key={field.key}
                                className={`whitespace-nowrap px-5 py-5 ${index === 0 ? 'font-semibold text-stone-900' : 'text-stone-600'}`}
                              >
                                {['status', 'priority'].includes(field.key) ? (
                                  <Status>{row[field.key]}</Status>
                                ) : field.type === 'date' ? (
                                  formatDate(row[field.key])
                                ) : (
                                  row[field.key] || '—'
                                )}
                              </td>
                            ))}
                          {entity === 'stock' && (
                            <td className="px-5">
                              <Status>{stockStatus(row)}</Status>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex gap-1 whitespace-nowrap">
                              <Button
                                variant="ghost"
                                onClick={() => setModal({ entity, row, mode: 'view' })}
                              >
                                {tab === 'water' ? 'Ver historial' : 'Ver'}
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => setModal({ entity, row, mode: 'edit' })}
                              >
                                Editar
                              </Button>
                              {entity === 'tasks' && row['status'] !== 'Completada' && (
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setData((previous) => ({
                                      ...previous,
                                      tasks: previous.tasks.map((item) =>
                                        item.id === row.id
                                          ? { ...item, status: 'Completada' }
                                          : item
                                      ),
                                    }))
                                    record(`Tarea completada · ${row['title']}`)
                                  }}
                                >
                                  Completar
                                </Button>
                              )}
                              {entity === 'stock' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    onClick={() => setModal({ entity, row, mode: 'in' })}
                                  >
                                    Registrar entrada
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    onClick={() => setModal({ entity, row, mode: 'out' })}
                                  >
                                    Registrar salida
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                className="text-rose-700"
                                onClick={() => setModal({ entity, row, mode: 'delete' })}
                              >
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!rows.length && (
                  <div className="p-12 text-center">
                    <Sprout className="mx-auto mb-3 text-emerald-600" />
                    <p className="font-semibold">
                      {search ? 'No hay coincidencias' : 'Todavía no hay registros'}
                    </p>
                    <p className="mt-2 text-sm text-stone-500">
                      {search ? 'Probá con otra búsqueda.' : 'Agregá un registro para empezar.'}
                    </p>
                  </div>
                )}
                <p className="border-t border-stone-100 px-6 py-4 text-xs text-stone-500">
                  Mostrando {rows.length} de {data[entity].length} registros · Deslizá la tabla para
                  ver todos los campos.
                </p>
              </Card>
            </>
          )}
        </div>
        {modal && (
          <RecordDialog
            modal={modal}
            lots={data.lots}
            history={data[modal.entity].filter((row) => row['lot'] === modal.row?.['lot'])}
            onClose={() => setModal(null)}
            onSave={save}
            onDelete={() => {
              setData((previous) => ({
                ...previous,
                [modal.entity]: previous[modal.entity].filter((row) => row.id !== modal.row?.id),
              }))
              record(
                `Registro eliminado · ${modal.row?.['name'] || modal.row?.['title'] || modal.row?.['lot']}`
              )
              setModal(null)
            }}
          />
        )}
      </div>
    </section>
  )
}

function RecordDialog({
  modal,
  lots,
  history,
  onClose,
  onSave,
  onDelete,
}: {
  modal: Modal
  lots: Row[]
  history: Row[]
  onClose: () => void
  onSave: (row: Row) => void
  onDelete: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const definition = definitions[modal.entity]
  const movement = modal.mode === 'in' || modal.mode === 'out'
  const title =
    modal.mode === 'delete'
      ? 'Eliminar registro'
      : movement
        ? modal.mode === 'in'
          ? 'Registrar entrada'
          : 'Registrar salida'
        : modal.mode === 'view'
          ? 'Detalle del registro'
          : modal.row
            ? 'Editar registro'
            : definition.action
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog.current?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      aria-labelledby="ag-dialog-title"
      onCancel={onClose}
      className="m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 text-stone-900 shadow-2xl backdrop:bg-stone-950/50"
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 id="ag-dialog-title" className="text-xl font-semibold">
          {title}
        </h2>
        <Button variant="ghost" aria-label="Cerrar" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      {modal.mode === 'delete' ? (
        <>
          <p className="text-sm text-stone-600">
            Se eliminará «{modal.row?.['name'] || modal.row?.['title'] || modal.row?.['lot']}» de
            esta sesión demo. Los demás registros conservarán su historial.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              Confirmar eliminación
            </Button>
          </div>
        </>
      ) : modal.mode === 'view' ? (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            {definition.fields.map((field) => (
              <div key={field.key}>
                <dt className="text-xs text-stone-500">{field.label}</dt>
                <dd className="mt-1 break-words text-sm font-medium">
                  {field.type === 'date'
                    ? formatDate(modal.row?.[field.key] || '')
                    : modal.row?.[field.key] || '—'}
                </dd>
              </div>
            ))}
          </dl>
          {['irrigation', 'monitoring'].includes(modal.entity) && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold">Historial · {modal.row?.['lot']}</h3>
              {[...history]
                .sort((a, b) => (b['date'] || '').localeCompare(a['date'] || ''))
                .map((row) => (
                  <p key={row.id} className="mt-3 text-sm text-stone-600">
                    {formatDate(row['date'])} · {row['method'] || row['status']} · {row['notes']}
                  </p>
                ))}
            </div>
          )}
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const values = Object.fromEntries(
              new FormData(event.currentTarget).entries()
            ) as Record<string, string>
            if (movement && modal.row) {
              const amount = Number(values['amount'])
              const quantity =
                Number(modal.row['quantity']) + (modal.mode === 'in' ? amount : -amount)
              if (!Number.isFinite(amount) || amount <= 0 || quantity < 0) {
                setError('Ingresá una cantidad positiva que no supere el stock disponible.')
                return
              }
              onSave({ ...modal.row, quantity: String(quantity) })
              return
            }
            for (const field of definition.fields) {
              values[field.key] = values[field.key]?.trim() || ''
              if (field.key !== 'notes' && !values[field.key]) {
                setError('Completá los campos obligatorios.')
                return
              }
            }
            onSave({ ...values, id: modal.row?.id || crypto.randomUUID() })
          }}
        >
          {movement ? (
            <div>
              <p className="mb-4 text-sm text-stone-600">
                {modal.row?.['name']} · Disponible: {modal.row?.['quantity']} {modal.row?.['unit']}
              </p>
              <label className="text-sm">
                Cantidad ({modal.row?.['unit']})
                <input
                  className={`${control} mt-2`}
                  type="number"
                  name="amount"
                  required
                  min="0.01"
                  step="any"
                  max={modal.mode === 'out' ? modal.row?.['quantity'] : undefined}
                />
              </label>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {definition.fields.map((field) => {
                const options =
                  field.key === 'lot'
                    ? [
                        ...new Set([
                          ...lots.map((row) => row['name']),
                          ...(modal.row?.['lot'] ? [modal.row['lot']] : []),
                        ]),
                      ]
                    : field.options
                return (
                  <label
                    key={field.key}
                    className={`text-sm font-medium ${field.key === 'notes' ? 'sm:col-span-2' : ''}`}
                  >
                    {field.label}
                    {field.key !== 'notes' && <span className="text-stone-400"> *</span>}
                    {options ? (
                      <select
                        name={field.key}
                        defaultValue={modal.row?.[field.key] || options[0] || ''}
                        required
                        className={`${control} mt-1.5`}
                      >
                        {!options.length && <option value="">Creá primero un lote</option>}
                        {options.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    ) : field.key === 'notes' ? (
                      <textarea
                        name={field.key}
                        defaultValue={modal.row?.[field.key]}
                        className={`${control} mt-1.5`}
                        rows={3}
                      />
                    ) : (
                      <input
                        name={field.key}
                        type={field.type || 'text'}
                        defaultValue={modal.row?.[field.key]}
                        required
                        min={
                          field.type === 'number'
                            ? ['area', 'dose', 'duration', 'amount'].includes(field.key)
                              ? '0.01'
                              : '0'
                            : undefined
                        }
                        max={field.key === 'humidity' ? '100' : undefined}
                        step={field.type === 'number' ? 'any' : undefined}
                        className={`${control} mt-1.5`}
                      />
                    )}
                  </label>
                )
              })}
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-rose-700">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-emerald-800 text-white">
              {movement ? 'Guardar movimiento' : 'Guardar registro'}
            </Button>
          </div>
        </form>
      )}
    </dialog>
  )
}
