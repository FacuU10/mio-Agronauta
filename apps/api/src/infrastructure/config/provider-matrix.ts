import type { Pool } from 'pg'
import { getPostgresPool } from '../database/postgres/pool'
import { getAgronautasRuntimeConfig } from './agronautas-runtime'

export type ProviderMode = 'live' | 'seam' | 'mock' | 'unavailable'

export interface ProviderEvidence {
  provider: string
  signalType: string
  mode: ProviderMode
  observedAt: Date
  sourceUrl?: string
  proofRef: string
  degradationReasons: string[]
}

export interface ProviderEvidencePort {
  getEvidence(provider: string, signalType: string, fieldId?: string): Promise<ProviderEvidence>
}

const PLACEHOLDERS = [
  'replace-with-secret-manager-reference',
  'your-secret-key-change-in-production',
  'replace-with-operator-token',
  'reader-token',
  'operator-token',
  'admin-token',
  'replace-me-if-required',
  'user:password',
]

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true
  const lower = value.toLowerCase().trim()
  for (const placeholder of PLACEHOLDERS) {
    if (lower.includes(placeholder.toLowerCase())) {
      return true
    }
  }
  return false
}

export class RealProviderEvidencePort implements ProviderEvidencePort {
  constructor(private readonly pool: Pick<Pool, 'query'> = getPostgresPool()) {}

  async getEvidence(provider: string, signalType: string, fieldId?: string): Promise<ProviderEvidence> {
    const runtimeConfig = getAgronautasRuntimeConfig()

    // 1. Check environment overrides first for testability
    const envKey = `PROVIDER_MODE_${provider.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`
    const override = process.env[envKey] || process.env['PROVIDER_MODE_OVERRIDE']
    if (override && ['live', 'seam', 'mock', 'unavailable'].includes(override)) {
      return {
        provider,
        signalType,
        mode: override as ProviderMode,
        observedAt: new Date(),
        sourceUrl: `https://${provider}.example.com/`,
        proofRef: `override-active-${override}`,
        degradationReasons: override === 'unavailable' ? ['weather_data_unavailable'] : [],
      }
    }

    // 2. Demo mode check
    if (runtimeConfig.mode === 'demo') {
      return {
        provider,
        signalType,
        mode: 'mock',
        observedAt: new Date(),
        sourceUrl: `https://${provider}.example.com/mock`,
        proofRef: 'demo-mode-simulation',
        degradationReasons: [],
      }
    }

    // 3. API Proof (Credentials and configuration check)
    let apiProof = true
    if (provider === 'nasa-firms' || provider === 'firms') {
      const apiKey = process.env['FIRMS_API_KEY'] || process.env['NASA_FIRMS_API_KEY']
      if (isPlaceholder(apiKey)) {
        apiProof = false
      }
    } else if (provider === 'sentinel-stac' || provider === 'sentinel-hub') {
      const clientId = process.env['SENTINEL_CLIENT_ID']
      const clientSecret = process.env['SENTINEL_CLIENT_SECRET']
      if (isPlaceholder(clientId) || isPlaceholder(clientSecret)) {
        apiProof = false
      }
    }

    // 4. DB Proof (Query the database for the latest ingestion run)
    let dbProof = false
    let observedAt = new Date()
    let proofRef = 'no-db-proof'
    let sourceUrl = `https://${provider}.example.com/`
    const degradationReasons: string[] = []

    try {
      const query = fieldId
        ? `SELECT status, observed_at, run_id, stale_cause, degradation_reason, evidence_payload
           FROM signal_ingestion_runs
           WHERE provider = $1 AND signal_type = $2 AND field_id = $3
           ORDER BY started_at DESC
           LIMIT 1`
        : `SELECT status, observed_at, run_id, stale_cause, degradation_reason, evidence_payload
           FROM signal_ingestion_runs
           WHERE provider = $1 AND signal_type = $2
           ORDER BY started_at DESC
           LIMIT 1`
      const params = fieldId ? [provider, signalType, fieldId] : [provider, signalType]
      const result = await this.pool.query(query, params)
      const row = result.rows[0]

      if (row) {
        proofRef = `run-${row.run_id}`
        if (row.observed_at) {
          observedAt = new Date(row.observed_at)
        }
        const payload = row.evidence_payload || {}
        if (typeof payload.sourceUrl === 'string') {
          sourceUrl = payload.sourceUrl
        } else if (typeof payload.provenance === 'string') {
          sourceUrl = payload.provenance
        } else if (Array.isArray(payload.provenance) && typeof payload.provenance[0] === 'string') {
          sourceUrl = payload.provenance[0]
        }

        if (row.status === 'succeeded' && !row.stale_cause && !row.degradation_reason) {
          dbProof = true
        } else {
          if (row.stale_cause) degradationReasons.push(row.stale_cause)
          if (row.degradation_reason) degradationReasons.push(row.degradation_reason)
        }
      }
    } catch (err) {
      // Ignore DB errors or log, treat as no proof
      degradationReasons.push('database_error')
    }

    // 5. Determine Mode
    let mode: ProviderMode = 'unavailable'
    if (apiProof && dbProof) {
      mode = 'live'
    } else if (apiProof && !dbProof) {
      mode = 'seam'
    } else if (!apiProof && !dbProof && runtimeConfig.runtimeRequired === false) {
      mode = 'seam' // Fallback to seam when not required
    } else {
      mode = 'unavailable'
    }

    // Force mock mode if requested specifically or as fallback
    if (process.env['AGRONAUTAS_FORCE_MOCK_PROVIDERS'] === 'true') {
      mode = 'mock'
    }

    return {
      provider,
      signalType,
      mode,
      observedAt,
      sourceUrl,
      proofRef,
      degradationReasons,
    }
  }
}
