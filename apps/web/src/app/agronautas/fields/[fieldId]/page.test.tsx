import test from 'node:test'
import assert from 'node:assert/strict'
import type { ReactElement } from 'react'
import FieldDetailRoute, { generateMetadata } from './page'
import { AgronautasFieldDetailPageClient } from '@/components/agronautas/field-detail'

test('protected field route carries the deep-linked field identity and route metadata', async () => {
  const element = await FieldDetailRoute({ params: Promise.resolve({ fieldId: 'field-workspace-001' }) }) as ReactElement<{ fieldId: string }>

  assert.equal(element.type, AgronautasFieldDetailPageClient)
  assert.equal(element.props.fieldId, 'field-workspace-001')
  assert.equal(generateMetadata().title, 'Detalle del lote | Agronautas')
})

test('field route passes unknown identifiers to the client boundary instead of inventing a field', async () => {
  const element = await FieldDetailRoute({ params: Promise.resolve({ fieldId: 'field-unknown' }) }) as ReactElement<{ fieldId: string }>

  assert.equal(element.props.fieldId, 'field-unknown')
})
