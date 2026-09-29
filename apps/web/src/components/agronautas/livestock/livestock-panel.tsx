'use client'

import { createElement, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export function LivestockPanel() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')

  const filteredAnimals = useMemo(() => {
    return mockAnimals.filter((animal) => {
      const matchesSearch =
        animal.tag.toLowerCase().includes(search.toLowerCase()) ||
        animal.breed.toLowerCase().includes(search.toLowerCase()) ||
        animal.paddock.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        category === 'Todas' || animal.category === category

      return matchesSearch && matchesCategory
    })
  }, [search, category])

  const total = mockAnimals.length
  const cows = mockAnimals.filter((animal) => animal.category === 'Vaca').length
  const calves = mockAnimals.filter(
    (animal) => animal.category === 'Ternero' || animal.category === 'Ternera'
  ).length
  const pregnant = mockAnimals.filter((animal) => animal.status === 'Preñada').length

  return (
    <div
      className="grid gap-6"
      aria-label="Hacienda Agronautas"
      data-testid="agronautas-livestock-panel"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-800">
            Gestión ganadera
          </p>

          <h2 className="mt-2 font-serif text-3xl font-semibold text-stone-950">
            Hacienda
          </h2>

          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Control de animales, categorías, pesos, potreros y estado productivo
            del establecimiento.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline">
            Registrar movimiento
          </Button>

          <Button className="bg-emerald-700 text-white hover:bg-emerald-800">
            + Nuevo animal
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total hacienda"
          value={String(total)}
          description="Animales registrados"
        />

        <MetricCard
          title="Vacas"
          value={String(cows)}
          description="Hembras adultas"
        />

        <MetricCard
          title="Terneros"
          value={String(calves)}
          description="Machos y hembras"
        />

        <MetricCard
          title="Preñadas"
          value={String(pregnant)}
          description="Gestaciones registradas"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Animales</CardTitle>
              <CardDescription>
                Datos ficticios para visualizar el módulo Hacienda.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar caravana, raza o potrero..."
                className="sm:w-72"
              />

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-h-10 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-900"
              >
                <option>Todas</option>
                <option>Vaca</option>
                <option>Vaquillona</option>
                <option>Ternero</option>
                <option>Ternera</option>
                <option>Novillo</option>
                <option>Toro</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Caravana</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Raza</th>
                  <th className="px-4 py-3">Sexo</th>
                  <th className="px-4 py-3">Peso</th>
                  <th className="px-4 py-3">Potrero</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-100 bg-white">
                {filteredAnimals.map((animal) => (
                  <tr
                    key={animal.id}
                    className="transition hover:bg-stone-50"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-stone-950">
                        {animal.tag}
                      </div>
                      <div className="text-xs text-stone-500">
                        ID {animal.id.padStart(4, '0')}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {animal.category}
                    </td>

                    <td className="px-4 py-4">
                      {animal.breed}
                    </td>

                    <td className="px-4 py-4">
                      {animal.sex}
                    </td>

                    <td className="px-4 py-4 font-medium">
                      {animal.weight} kg
                    </td>

                    <td className="px-4 py-4">
                      {animal.paddock}
                    </td>

                    <td className="px-4 py-4">
                      <AnimalStatus status={animal.status} />
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Button variant="outline" size="sm">
                        Ver ficha
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAnimals.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-500">
              No encontramos animales con esos filtros.
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
            <span>
              Mostrando {filteredAnimals.length} de {mockAnimals.length} animales
            </span>

            <span>
              Datos demostrativos
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por potrero</CardTitle>
            <CardDescription>
              Cantidad ficticia de animales actualmente asignados.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <PaddockRow name="Potrero Norte" animals={2} percentage={25} />
            <PaddockRow name="Potrero 2" animals={2} percentage={25} />
            <PaddockRow name="Potrero Sur" animals={2} percentage={25} />
            <PaddockRow name="Potrero 3" animals={1} percentage={12.5} />
            <PaddockRow name="Potrero Este" animals={1} percentage={12.5} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>
              Últimos eventos simulados de la hacienda.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <ActivityRow
              title="Pesaje registrado"
              detail="AR-003 · 182 kg"
              time="Hoy · 09:35"
            />

            <ActivityRow
              title="Cambio de potrero"
              detail="AR-007 · Potrero 2 → Potrero Sur"
              time="Ayer · 17:20"
            />

            <ActivityRow
              title="Control de preñez"
              detail="AR-006 · Resultado positivo"
              time="27 Sep · 11:10"
            />

            <ActivityRow
              title="Tratamiento sanitario"
              detail="AR-008 · Control programado"
              time="26 Sep · 15:40"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{title}</CardDescription>

        <CardTitle className="text-3xl">
          {value}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="text-xs text-stone-500">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function AnimalStatus({ status }: { status: string }) {
  const className =
    status === 'Preñada'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : status === 'Tratamiento'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : status === 'Reproductor'
          ? 'border-blue-200 bg-blue-50 text-blue-800'
          : 'border-stone-200 bg-stone-50 text-stone-700'

  return (
    <Badge variant="outline" className={className}>
      {status}
    </Badge>
  )
}

function PaddockRow({
  name,
  animals,
  percentage,
}: {
  name: string
  animals: number
  percentage: number
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-stone-900">
          {name}
        </span>

        <span className="text-stone-500">
          {animals} animales
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div
          className="h-full rounded-full bg-emerald-600"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function ActivityRow({
  title,
  detail,
  time,
}: {
  title: string
  detail: string
  time: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-4 last:border-b-0 last:pb-0">
      <div>
        <p className="text-sm font-semibold text-stone-950">
          {title}
        </p>

        <p className="mt-1 text-sm text-stone-600">
          {detail}
        </p>
      </div>

      <span className="whitespace-nowrap text-xs text-stone-400">
        {time}
      </span>
    </div>
  )
}