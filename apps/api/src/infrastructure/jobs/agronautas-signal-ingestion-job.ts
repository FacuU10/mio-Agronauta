import type { ClimateSummary, SatelliteSummary } from '../../domain/entities/agronautas'
import type { SignalIngestionRepository, SignalSummaryRepository } from '../../domain/repositories/agronautas'
import type { ClimateAdapter } from '../adapters/agronautas-climate-adapter'
import { toClimateSummary } from '../adapters/agronautas-climate-adapter'
import type { SatelliteAdapter } from '../adapters/agronautas-satellite-adapter'
import { toSatelliteSummary } from '../adapters/agronautas-satellite-adapter'

export interface IngestionJobResult<TSummary> {
  runId: string
  status: 'succeeded' | 'degraded'
  summary: TSummary
  degradationReason?: string
  staleCause?: string
}

interface IngestionJobOptions {
  now?: () => Date
}

export class ClimateIngestionJob {
  constructor(
    private readonly adapter: ClimateAdapter,
    private readonly summaryRepository: SignalSummaryRepository,
    private readonly ingestionRepository: SignalIngestionRepository,
    private readonly options: IngestionJobOptions = {},
  ) {}

  async run(fieldId: string, runId: string): Promise<IngestionJobResult<ClimateSummary>> {
    const startedAt = this.now()

    try {
      const result = await this.adapter.fetch(fieldId)
      const summary = toClimateSummary(this.adapter.provider, result, startedAt)
      await this.ingestionRepository.saveRun({
        fieldId,
        runId,
        provider: this.adapter.provider,
        signalType: 'climate',
        status: 'succeeded',
        startedAt,
        finishedAt: this.now(),
        observedAt: summary.observedAt,
        evidencePayload: {
          temperatureC: summary.temperatureC,
          rainfallMm7d: summary.rainfallMm7d,
          humidityPct: summary.humidityPct,
          confidence: summary.confidence,
          provenance: summary.provenance,
        },
      })

      return { runId, status: 'succeeded', summary }
    } catch (error) {
      const fallback = await this.summaryRepository.getLatestClimateSummary(fieldId)
      if (!fallback) throw error

      const staleCause = error instanceof Error ? error.message : 'climate_adapter_failed'
      await this.ingestionRepository.saveRun({
        fieldId,
        runId,
        provider: this.adapter.provider,
        signalType: 'climate',
        status: 'degraded',
        startedAt,
        finishedAt: this.now(),
        observedAt: fallback.observedAt,
        staleCause,
        degradationReason: 'weather_data_stale',
        evidencePayload: {
          temperatureC: fallback.temperatureC,
          rainfallMm7d: fallback.rainfallMm7d,
          humidityPct: fallback.humidityPct,
          confidence: Math.max(0, Number((fallback.confidence * 0.75).toFixed(3))),
          provenance: [...fallback.provenance, `fallback:${runId}`],
        },
      })

      return {
        runId,
        status: 'degraded',
        summary: { ...fallback, confidence: Math.max(0, Number((fallback.confidence * 0.75).toFixed(3))), staleCause },
        degradationReason: 'weather_data_stale',
        staleCause,
      }
    }
  }

  private now(): Date {
    return this.options.now?.() ?? new Date()
  }
}

export class SatelliteIngestionJob {
  constructor(
    private readonly adapter: SatelliteAdapter,
    private readonly summaryRepository: SignalSummaryRepository,
    private readonly ingestionRepository: SignalIngestionRepository,
    private readonly options: IngestionJobOptions = {},
  ) {}

  async run(fieldId: string, runId: string): Promise<IngestionJobResult<SatelliteSummary>> {
    const startedAt = this.now()

    try {
      const result = await this.adapter.fetch(fieldId)
      const summary = toSatelliteSummary(this.adapter.provider, result, startedAt)
      await this.ingestionRepository.saveRun({
        fieldId,
        runId,
        provider: this.adapter.provider,
        signalType: 'satellite',
        status: 'succeeded',
        startedAt,
        finishedAt: this.now(),
        observedAt: summary.observedAt,
        evidencePayload: {
          ndvi: summary.ndvi,
          evi: summary.evi,
          waterStressIndex: summary.waterStressIndex,
          confidence: summary.confidence,
          provenance: summary.provenance,
        },
      })

      return { runId, status: 'succeeded', summary }
    } catch (error) {
      const fallback = await this.summaryRepository.getLatestSatelliteSummary(fieldId)
      if (!fallback) throw error

      const staleCause = error instanceof Error ? error.message : 'satellite_adapter_failed'
      await this.ingestionRepository.saveRun({
        fieldId,
        runId,
        provider: this.adapter.provider,
        signalType: 'satellite',
        status: 'degraded',
        startedAt,
        finishedAt: this.now(),
        observedAt: fallback.observedAt,
        staleCause,
        degradationReason: 'satellite_data_stale',
        evidencePayload: {
          ndvi: fallback.ndvi,
          evi: fallback.evi,
          waterStressIndex: fallback.waterStressIndex,
          confidence: Math.max(0, Number((fallback.confidence * 0.7).toFixed(3))),
          provenance: [...fallback.provenance, `fallback:${runId}`],
        },
      })

      return {
        runId,
        status: 'degraded',
        summary: { ...fallback, confidence: Math.max(0, Number((fallback.confidence * 0.7).toFixed(3))), staleCause },
        degradationReason: 'satellite_data_stale',
        staleCause,
      }
    }
  }

  private now(): Date {
    return this.options.now?.() ?? new Date()
  }
}
