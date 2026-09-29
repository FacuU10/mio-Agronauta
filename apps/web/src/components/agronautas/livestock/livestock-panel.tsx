'use client'

import { createElement } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const React = { createElement }

export function LivestockPanel() {
  return (
    <Card aria-label="Hacienda Agronautas" data-testid="agronautas-livestock-panel">
      <CardHeader>
        <CardTitle>Hacienda</CardTitle>

        <CardDescription>
          Gestión y seguimiento de los animales del establecimiento.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p>
          Todavía no hay animales registrados.
        </p>
      </CardContent>
    </Card>
  )
}