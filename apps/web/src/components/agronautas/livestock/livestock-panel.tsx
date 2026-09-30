'use client'

import { createElement, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  Bell,
  Check,
  ClipboardList,
  Heart,
  MapPin,
  Scale,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const React = { createElement }
const mockAnimals = [
  {
    id: '1',
    tag: 'AR-001',
    category: 'Vaca',
    breed: 'Brangus',
    sex: 'Hembra',
    weight: 485,
    paddock: 'Potrero Norte',
    status: 'Preñada',
  },
  {
    id: '2',
    tag: 'AR-002',
    category: 'Vaca',
    breed: 'Braford',
    sex: 'Hembra',
    weight: 462,
    paddock: 'Potrero Norte',
    status: 'Activa',
  },
  {
    id: '3',
    tag: 'AR-003',
    category: 'Ternero',
    breed: 'Brangus',
    sex: 'Macho',
    weight: 182,
    paddock: 'Potrero 2',
    status: 'Activo',
  },
  {
    id: '4',
    tag: 'AR-004',
    category: 'Ternera',
    breed: 'Braford',
    sex: 'Hembra',
    weight: 169,
    paddock: 'Potrero 2',
    status: 'Activa',
  },
  {
    id: '5',
    tag: 'AR-005',
    category: 'Toro',
    breed: 'Brangus',
    sex: 'Macho',
    weight: 735,
    paddock: 'Potrero Sur',
    status: 'Reproductor',
  },
  {
    id: '6',
    tag: 'AR-006',
    category: 'Vaquillona',
    breed: 'Braford',
    sex: 'Hembra',
    weight: 358,
    paddock: 'Potrero 3',
    status: 'Preñada',
  },
  {
    id: '7',
    tag: 'AR-007',
    category: 'Novillo',
    breed: 'Brangus',
    sex: 'Macho',
    weight: 412,
    paddock: 'Potrero Sur',
    status: 'Activo',
  },
  {
    id: '8',
    tag: 'AR-008',
    category: 'Vaca',
    breed: 'Cruza',
    sex: 'Hembra',
    weight: 441,
    paddock: 'Potrero Este',
    status: 'Tratamiento',
  },
]

type Animal = (typeof mockAnimals)[number]
const categories = ['Vaca', 'Vaquillona', 'Ternero', 'Ternera', 'Novillo', 'Toro']
const paddocks = ['Potrero Norte', 'Potrero 2', 'Potrero Sur', 'Potrero 3', 'Potrero Este']
const selectClass =
  'h-11 w-full min-w-0 rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800'
const initialActivity = [
  { title: 'Pesaje registrado', detail: 'AR-003 · 182 kg', time: '30 sep · 09:35' },
  {
    title: 'Cambio de potrero',
    detail: 'AR-007 · Potrero 2 → Potrero Sur',
    time: '29 sep · 17:20',
  },
  { title: 'Control de preñez', detail: 'AR-006 · Resultado positivo', time: '27 sep · 11:10' },
  { title: 'Tratamiento sanitario', detail: 'AR-008 · Control programado', time: '26 sep · 15:40' },
]
const compositionGroups = [
  { name: 'Vacas', categories: ['Vaca'], color: 'bg-emerald-800' },
  { name: 'Terneros', categories: ['Ternero', 'Ternera'], color: 'bg-emerald-500' },
  { name: 'Vaquillonas', categories: ['Vaquillona'], color: 'bg-lime-600' },
  { name: 'Toros', categories: ['Toro'], color: 'bg-amber-500' },
  { name: 'Novillos', categories: ['Novillo'], color: 'bg-stone-400' },
]

export function LivestockPanel() {
  const [animals, setAnimals] = useState(mockAnimals)
  const [activity, setActivity] = useState(initialActivity)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')
  const [paddock, setPaddock] = useState('Todos')
  const [selected, setSelected] = useState<Animal | null>(null)
  const [action, setAction] = useState<'new' | 'movement' | null>(null)
  const [notice, setNotice] = useState('')
  const [formError, setFormError] = useState('')
  const total = animals.length
  const pregnant = animals.filter((animal) => animal.status === 'Preñada').length
  const treatment = animals.filter((animal) => animal.status === 'Tratamiento').length
  const filtered = animals.filter(
    (animal) =>
      [animal.tag, animal.breed, animal.paddock].some((value) =>
        value.toLowerCase().includes(search.trim().toLowerCase())
      ) &&
      (category === 'Todas' || animal.category === category) &&
      (paddock === 'Todos' || animal.paddock === paddock)
  )
  const composition = compositionGroups.map((group) => ({
    ...group,
    count: animals.filter((animal) => group.categories.includes(animal.category)).length,
  }))

  return (
    <section
      id="agronautas-livestock"
      aria-label="Hacienda Agronautas"
      data-testid="agronautas-livestock-panel"
      className="min-h-screen bg-stone-100 pb-12"
    >
      <header className="relative isolate overflow-hidden bg-emerald-950 pt-20 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(12,35,25,.9), rgba(12,35,25,.5)), url('/landing/source/imagen1.webp')",
          }}
        />
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-8 sm:py-16">
          <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Gestión ganadera
            </span>
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1">
              Establecimiento demo
            </span>
          </div>
          <h1 className="font-serif text-5xl font-semibold tracking-tight sm:text-6xl">Hacienda</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-stone-100 sm:text-lg">
            Controlá tu rodeo, pesos, movimientos y estado productivo desde un solo lugar.
          </p>
          <div className="mt-7 flex flex-wrap gap-5 text-xs text-emerald-100">
            <span className="flex items-center gap-2">
              <MapPin size={15} aria-hidden="true" /> {paddocks.length} potreros
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={15} aria-hidden="true" /> Datos ficticios · sin persistencia
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 pt-7 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">Tu rodeo, de un vistazo</h2>
            <p className="mt-1 text-sm text-stone-500">
              Panorama del establecimiento · septiembre 2026
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAction('movement')
                setFormError('')
              }}
            >
              <ArrowUpRight size={16} className="mr-2" aria-hidden="true" />
              Registrar movimiento
            </Button>
            <Button
              className="bg-emerald-800 text-white"
              onClick={() => {
                setAction('new')
                setFormError('')
              }}
            >
              + Nuevo animal
            </Button>
          </div>
        </div>
        {notice && (
          <p
            role="status"
            className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
          >
            <Check size={16} aria-hidden="true" />
            {notice}
          </p>
        )}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
          <div className="grid min-w-0 gap-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ['Total hacienda', total, 'Animales registrados'],
                [
                  'Vacas',
                  composition.find((group) => group.name === 'Vacas')?.count ?? 0,
                  'Hembras adultas',
                ],
                [
                  'Terneros',
                  composition.find((group) => group.name === 'Terneros')?.count ?? 0,
                  'Machos y hembras',
                ],
                ['Preñadas', pregnant, 'Gestaciones registradas'],
              ].map(([title, value, detail], index) => (
                <Card
                  key={title}
                  className={
                    'rounded-2xl border-stone-200 p-4 sm:p-5 ' +
                    (index === 0 ? 'border-emerald-800 bg-emerald-900 text-white' : 'bg-white')
                  }
                >
                  <p
                    className={
                      'text-sm font-medium ' + (index === 0 ? 'text-emerald-100' : 'text-stone-600')
                    }
                  >
                    {title}
                  </p>
                  <p className="my-2 text-4xl font-semibold tracking-tight">{value}</p>
                  <p className={'text-xs ' + (index === 0 ? 'text-emerald-200' : 'text-stone-500')}>
                    {detail}
                  </p>
                </Card>
              ))}
            </div>
            <Panel title="Animales" description="Identificación y estado actual de tu hacienda.">
              <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_145px_155px]">
                <label className="text-xs font-medium text-stone-600">
                  Buscar animal
                  <span className="relative mt-2 block">
                    <Search
                      size={16}
                      className="absolute left-3 top-3.5 text-stone-400"
                      aria-hidden="true"
                    />
                    <Input
                      className="h-11 pl-9"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Caravana, raza o potrero"
                    />
                  </span>
                </label>
                <label className="text-xs font-medium text-stone-600">
                  Categoría
                  <select
                    className={selectClass + ' mt-2'}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option>Todas</option>
                    {categories.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-stone-600">
                  Potrero
                  <select
                    className={selectClass + ' mt-2'}
                    value={paddock}
                    onChange={(event) => setPaddock(event.target.value)}
                  >
                    <option>Todos</option>
                    {paddocks.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div
                className="overflow-x-auto rounded-xl border border-stone-200"
                tabIndex={0}
                role="region"
                aria-label="Listado de animales"
              >
                <table className="w-full min-w-[660px] text-left text-sm">
                  <caption className="sr-only">Animales del establecimiento demostrativo</caption>
                  <thead className="bg-stone-50 text-[11px] uppercase tracking-wider text-stone-500">
                    <tr>
                      {['Caravana / raza', 'Categoría', 'Peso', 'Potrero', 'Estado', 'Detalle'].map(
                        (title) => (
                          <th
                            scope="col"
                            key={title}
                            className="whitespace-nowrap px-3 py-3 font-medium"
                          >
                            {title}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filtered.map((animal) => (
                      <tr key={animal.id} className="transition-colors hover:bg-emerald-50/40">
                        <th scope="row" className="px-3 py-4 font-normal">
                          <span className="block font-semibold text-stone-900">{animal.tag}</span>
                          <span className="text-xs text-stone-500">{animal.breed}</span>
                        </th>
                        <td className="px-3 py-4">{animal.category}</td>
                        <td className="whitespace-nowrap px-3 py-4 font-medium">
                          {animal.weight} <span className="text-xs text-stone-500">kg</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-stone-600">
                          {animal.paddock}
                        </td>
                        <td className="px-3 py-4">
                          <AnimalStatus status={animal.status} />
                        </td>
                        <td className="px-3 py-4">
                          <button
                            type="button"
                            aria-label={'Ver ficha de ' + animal.tag}
                            onClick={() => setSelected(animal)}
                            className="min-h-10 whitespace-nowrap rounded-lg px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                          >
                            Ver ficha <span aria-hidden="true">↗</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-sm text-stone-500">
                      No encontramos animales con esos filtros.
                    </p>
                    <Button
                      variant="ghost"
                      className="mt-3"
                      onClick={() => {
                        setSearch('')
                        setCategory('Todas')
                        setPaddock('Todos')
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-stone-500">
                <span>
                  Mostrando {filtered.length} de {total} animales
                </span>
                <span>Datos demostrativos</span>
              </div>
            </Panel>
          </div>
          <aside
            aria-label="Resumen del rodeo"
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-1"
          >
            <Panel
              title="Alertas ganaderas"
              icon={<Bell size={19} />}
              description="Próximas tareas del rodeo"
            >
              <div className="space-y-3">
                {[
                  ['2', 'vacunas próximas', 'AR-001 y AR-002 · 5 oct'],
                  [String(treatment), 'animal en tratamiento', 'AR-008 · revisión 2 oct'],
                  ['3', 'controles de preñez pendientes', 'AR-001, AR-002 y AR-006 · 7 oct'],
                ].map(([count, label, detail]) => (
                  <div key={label} className="flex gap-3 rounded-xl bg-amber-50/70 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-semibold text-amber-900">
                      {count}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{label}</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel
              title="Así está tu rodeo"
              description={total + ' animales · distribución por categoría'}
            >
              <div className="mb-5 flex h-3 overflow-hidden rounded-full" aria-hidden="true">
                {composition.map((group) => (
                  <div
                    key={group.name}
                    className={group.color}
                    style={{ width: (group.count / total) * 100 + '%' }}
                  />
                ))}
              </div>
              <ul className="space-y-3">
                {composition.map((group) => (
                  <li key={group.name} className="flex items-center gap-2 text-sm">
                    <span aria-hidden="true" className={'h-2 w-2 rounded-full ' + group.color} />
                    <span className="flex-1 text-stone-600">{group.name}</span>
                    <span className="text-xs text-stone-400">{group.count}</span>
                    <strong className="w-14 text-right font-medium">
                      {((group.count / total) * 100).toLocaleString('es-AR', {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </strong>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Actividad reciente" icon={<ClipboardList size={19} />}>
              <ol className="space-y-4">
                {activity.slice(0, 4).map((item, index) => (
                  <li key={item.title + index} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600"
                    />
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-stone-600">{item.detail}</p>
                      <p className="mt-1 text-[11px] text-stone-400">{item.time}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </aside>
        </div>

        <div className="mb-5 mt-8">
          <h2 className="text-2xl font-semibold">Seguimiento del establecimiento</h2>
          <p className="mt-1 text-sm text-stone-500">Potreros, sanidad y evolución productiva.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Panel title="Distribución por potrero" icon={<MapPin size={19} />}>
            <div className="space-y-4">
              {paddocks.map((name) => {
                const count = animals.filter((animal) => animal.paddock === name).length
                return (
                  <div key={name}>
                    <div className="mb-2 flex justify-between gap-2 text-xs">
                      <span>{name}</span>
                      <span className="text-stone-500">{count} animales</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-emerald-700"
                        style={{ width: (count / total) * 100 + '%' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
          <Panel title="Resumen sanitario" icon={<ShieldCheck size={19} />}>
            <p className="text-3xl font-semibold text-emerald-900">
              {total - treatment}
              <span className="ml-2 text-sm font-normal text-stone-500">de {total} animales</span>
            </p>
            <p className="mb-5 mt-1 text-xs text-stone-500">Sin tratamiento activo registrado</p>
            <SummaryRow label="En tratamiento" value={String(treatment)} />
            <SummaryRow label="Vacunas próximas" value="2" />
            <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
              Próxima jornada sanitaria
              <br />
              <strong>5 de octubre de 2026</strong>
            </p>
          </Panel>
          <Panel title="Resumen reproductivo" icon={<Heart size={19} />}>
            <p className="text-3xl font-semibold text-emerald-900">
              {pregnant}
              <span className="ml-2 text-sm font-normal text-stone-500">preñadas</span>
            </p>
            <p className="mb-5 mt-1 text-xs text-stone-500">Gestaciones registradas en el rodeo</p>
            <SummaryRow label="Controles pendientes" value="3" />
            <SummaryRow
              label="Toros reproductores"
              value={String(animals.filter((animal) => animal.status === 'Reproductor').length)}
            />
            <p className="mt-4 rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-600">
              Último control positivo
              <br />
              <strong>AR-006 · 27 de septiembre</strong>
            </p>
          </Panel>
          <Panel
            title="Últimos pesajes"
            icon={<Scale size={19} />}
            description="Registros simulados · septiembre"
          >
            <div className="space-y-4">
              {mockAnimals
                .filter((animal) => ['1', '3', '6'].includes(animal.id))
                .sort((a, b) => ['3', '1', '6'].indexOf(a.id) - ['3', '1', '6'].indexOf(b.id))
                .map((animal, index) => (
                  <div
                    key={animal.id}
                    className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-semibold">{animal.tag}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {30 - index} sep · {animal.category}
                      </p>
                    </div>
                    <strong className="text-sm text-emerald-800">{animal.weight} kg</strong>
                  </div>
                ))}
            </div>
          </Panel>
        </div>
        <p className="mt-7 text-center text-xs text-stone-500">
          Hacienda · Agronautas · Todos los datos y eventos de esta vista son ficticios.
        </p>
      </div>

      {selected && (
        <Modal title={'Ficha de ' + selected.tag} onClose={() => setSelected(null)}>
          <div className="mb-5 flex items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-700">
                Identificación individual
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-950">{selected.tag}</p>
            </div>
            <AnimalStatus status={selected.status} />
          </div>
          <dl className="grid grid-cols-2 gap-5">
            {[
              ['Categoría', selected.category],
              ['Raza', selected.breed],
              ['Sexo', selected.sex],
              ['Peso registrado', selected.weight + ' kg'],
              ['Potrero actual', selected.paddock],
              ['Identificador', selected.id.padStart(4, '0')],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="mt-1 text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 border-t border-stone-200 pt-5">
            <h3 className="text-lg font-semibold">Estado y seguimiento</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {selected.status === 'Tratamiento'
                ? 'Tratamiento sanitario en curso. Revisión ficticia programada para el 2 de octubre.'
                : selected.status === 'Preñada'
                  ? 'Preñez registrada. Próximo control ficticio: 7 de octubre.'
                  : 'Sin observaciones adicionales en esta ficha demostrativa.'}
            </p>
          </div>
          <p className="mt-5 text-xs text-stone-500">
            Ficha ficticia · Los cambios de esta sesión no se guardan.
          </p>
        </Modal>
      )}
      {action && (
        <Modal
          title={action === 'new' ? 'Nuevo animal' : 'Registrar movimiento'}
          onClose={() => setAction(null)}
        >
          <p className="mb-5 text-sm text-stone-500">
            Simulación local. Los cambios se pierden al recargar la página.
          </p>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              const destination = String(data.get('paddock'))
              if (action === 'new') {
                const tag = String(data.get('tag')).trim().toUpperCase()
                if (!tag || animals.some((animal) => animal.tag.toUpperCase() === tag)) {
                  setFormError('Ingresá una caravana única para el animal.')
                  return
                }
                const animal: Animal = {
                  id: String(total + 1),
                  tag,
                  category: String(data.get('category')),
                  breed: String(data.get('breed')).trim(),
                  sex: String(data.get('sex')),
                  weight: Number(data.get('weight')),
                  paddock: destination,
                  status: 'Activo',
                }
                setAnimals((current) => [...current, animal])
                setActivity((current) => [
                  {
                    title: 'Alta de animal',
                    detail: tag + ' · ' + destination,
                    time: 'Esta sesión',
                  },
                  ...current,
                ])
                setNotice(tag + ' agregado al rodeo de demostración.')
              } else {
                const animal = animals.find((item) => item.id === data.get('animal'))
                if (!animal) return
                if (animal.paddock === destination) {
                  setFormError('Elegí un potrero distinto al actual.')
                  return
                }
                setAnimals((current) =>
                  current.map((item) =>
                    item.id === animal.id ? { ...item, paddock: destination } : item
                  )
                )
                setActivity((current) => [
                  {
                    title: 'Cambio de potrero',
                    detail: animal.tag + ' · ' + animal.paddock + ' → ' + destination,
                    time: 'Esta sesión',
                  },
                  ...current,
                ])
                setNotice('Movimiento de ' + animal.tag + ' simulado correctamente.')
              }
              setAction(null)
            }}
          >
            {action === 'new' ? (
              <>
                <label className="grid gap-2 text-sm">
                  Caravana
                  <Input name="tag" required maxLength={30} placeholder="AR-009" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-2 text-sm">
                    Categoría
                    <select name="category" className={selectClass}>
                      {categories.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm">
                    Sexo
                    <select name="sex" className={selectClass}>
                      <option>Hembra</option>
                      <option>Macho</option>
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-2 text-sm">
                    Raza
                    <Input name="breed" required maxLength={40} placeholder="Brangus" />
                  </label>
                  <label className="grid gap-2 text-sm">
                    Peso (kg)
                    <Input name="weight" type="number" min="1" max="2000" step="0.1" required />
                  </label>
                </div>
              </>
            ) : (
              <label className="grid gap-2 text-sm">
                Animal
                <select name="animal" className={selectClass}>
                  {animals.map((animal) => (
                    <option key={animal.id} value={animal.id}>
                      {animal.tag} · {animal.paddock}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="grid gap-2 text-sm">
              {action === 'new' ? 'Potrero' : 'Potrero de destino'}
              <select name="paddock" className={selectClass}>
                {paddocks.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            {formError && (
              <p role="alert" className="text-sm text-red-700">
                {formError}
              </p>
            )}
            <div className="mt-2 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setAction(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-emerald-800">
                Simular {action === 'new' ? 'alta' : 'movimiento'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}

function Panel({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="min-w-0 rounded-2xl border-stone-200 bg-white">
      <CardHeader className="p-5 pb-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-stone-900">
          {icon && (
            <span aria-hidden="true" className="text-emerald-700">
              {icon}
            </span>
          )}
          {title}
        </h3>
        {description && (
          <CardDescription className="text-xs leading-5 text-stone-500">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-5 pt-0">{children}</CardContent>
    </Card>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-stone-100 py-3 text-xs">
      <span className="text-stone-600">{label}</span>
      <strong className="text-stone-900">{value}</strong>
    </div>
  )
}

function AnimalStatus({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={
        'whitespace-nowrap text-[11px] ' +
        (status === 'Preñada'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : status === 'Tratamiento'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-stone-200 bg-stone-50 text-stone-600')
      }
    >
      {status}
    </Badge>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const dialog = ref.current
    triggerRef.current ??= document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      triggerRef.current?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby="livestock-dialog-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-stone-950/60"
    >
      <div className="p-5 sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="livestock-dialog-title" className="text-2xl font-semibold">
            {title}
          </h2>
          <Button variant="ghost" onClick={onClose} aria-label="Cerrar" className="shrink-0 px-2">
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
