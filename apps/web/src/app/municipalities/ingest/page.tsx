import React from 'react'
import { IngestPanel } from '@/components/government/ingest-panel'
import type { Metadata } from 'next'
import { buildRouteMetadata } from '@/lib/route-contracts'

export function generateMetadata(): Metadata {
  return buildRouteMetadata('/municipalities/ingest')
}

export default function HydrologyIngestPage() {
  return <IngestPanel />
}
