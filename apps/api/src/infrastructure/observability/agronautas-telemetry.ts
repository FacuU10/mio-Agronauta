import { logger } from './logger'
import type { EvidenceEnvelope } from '@repo/zod-schemas'

const MAX_TELEMETRY_STRING_LENGTH = 256
const MAX_TRANSITION_METRIC_KEYS = 32
const TELEMETRY_ATTRIBUTE_KEYS = new Set([
  'fieldId',
  'contractVersion',
  'jobId',
  'runId',
  'requestId',
  'from',
  'to',
  'attempt',
  'workerId',
  'leaseExpiresAt',
  'resultStatus',
  'status',
  'provider',
  'signalType',
  'providerMode',
  'httpStatus',
  'schemaStatus',
  'latencyMs',
  'reason',
  'staleCause',
  'ttlSeconds',
  'acquired',
  'degradationReasons',
])

interface RuntimeTelemetry {
  serviceName: string
}

function createRuntimeTelemetry(serviceName: string): RuntimeTelemetry {
  return { serviceName }
}

function logEvent(runtime: RuntimeTelemetry, name: string, level: 'info' | 'warn' | 'error', attributes: Record<string, unknown>): void {
  logger[level]({
    channel: 'golden.telemetry.v1',
    serviceName: runtime.serviceName,
    name,
    level,
    attributes: sanitizeTelemetryAttributes(attributes),
  }, name)
}

export function sanitizeTelemetryAttributes(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input)) {
    if (!TELEMETRY_ATTRIBUTE_KEYS.has(key)) continue
    if (typeof value === 'string') {
      output[key] = value.slice(0, MAX_TELEMETRY_STRING_LENGTH)
      continue
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      output[key] = value
      continue
    }
    if (typeof value === 'boolean') {
      output[key] = value
      continue
    }
    if (key === 'degradationReasons' && Array.isArray(value)) {
      output[key] = value
        .filter((reason): reason is string => typeof reason === 'string')
        .slice(0, 5)
        .map((reason) => reason.slice(0, MAX_TELEMETRY_STRING_LENGTH))
    }
  }

  return output
}

export interface AgronautasTelemetry {
  runtime: RuntimeTelemetry
  getQueueTransitionMetrics(): Readonly<Record<string, number>>
  onSignalRunRecorded(input: { runId: string; provider: string; staleCause?: string }): void
  onLockAcquired(input: { fieldId: string; ttlSeconds: number; acquired: boolean }): void
  onDispatchAttempt(input: { fieldId: string; runId: string; jobId: string; requestId: string; runtimeMode: string }): void
  onDispatchPublished(input: { fieldId: string; runId: string; jobId: string; requestId: string }): void
  onDispatchFailed(input: { fieldId: string; runId: string; jobId: string; requestId: string; error: string }): void
  onJobRunPersisted(input: { fieldId: string; runId: string; jobId: string; status: string }): void
  onQueueTransition(input: { contractVersion: string; jobId: string; runId: string; from: string; to: string; attempt: number; workerId: string; leaseExpiresAt?: string | null; resultStatus?: string; providerMode?: string; latencyMs?: number; reason?: string }): void
  onLeaseHeartbeat(input: { jobId: string; runId: string; leaseExpiresAt?: string | null }): void
  onQueueResult(input: { jobId: string; runId: string; status: string }): void
  onQueueDeadLetter(input: { jobId: string; runId: string; reason: string }): void
  onProviderEvidence(input: Pick<EvidenceEnvelope, 'provider' | 'signalType' | 'providerMode' | 'runId' | 'requestId' | 'httpStatus' | 'schemaStatus' | 'latencyMs' | 'degradationReasons'>): void
}

export function createAgronautasTelemetry(): AgronautasTelemetry {
  const runtime = createRuntimeTelemetry('agronautas-api')
  const transitionMetrics = new Map<string, number>()

  return {
    runtime,
    getQueueTransitionMetrics() {
      return Object.fromEntries(transitionMetrics)
    },
    onSignalRunRecorded(input) {
      logEvent(runtime, 'agronautas.signal-run.recorded', 'info', input)
    },
    onLockAcquired(input) {
      logEvent(runtime, 'agronautas.recompute-lock', input.acquired ? 'info' : 'warn', input)
    },
    onDispatchAttempt(input) {
      logEvent(runtime, 'agronautas.dispatch.attempt', 'info', input)
    },
    onDispatchPublished(input) {
      logEvent(runtime, 'agronautas.dispatch.published', 'info', input)
    },
    onDispatchFailed(input) {
      logEvent(runtime, 'agronautas.dispatch.failed', 'error', { ...input, reason: input.error })
    },
    onJobRunPersisted(input) {
      logEvent(runtime, 'agronautas.job-run.persisted', 'info', input)
    },
    onQueueTransition(input) {
      const metricKey = `${input.from}->${input.to}`.slice(0, MAX_TELEMETRY_STRING_LENGTH)
      if (transitionMetrics.has(metricKey) || transitionMetrics.size < MAX_TRANSITION_METRIC_KEYS) {
        transitionMetrics.set(metricKey, (transitionMetrics.get(metricKey) ?? 0) + 1)
      }
      logEvent(runtime, 'agronautas.queue.transition', input.to === 'dlq' ? 'error' : 'info', input)
    },
    onLeaseHeartbeat(input) {
      logEvent(runtime, 'agronautas.queue.heartbeat', 'info', input)
    },
    onQueueResult(input) {
      logEvent(runtime, 'agronautas.queue.result', input.status === 'succeeded' ? 'info' : 'warn', input)
    },
    onQueueDeadLetter(input) {
      logEvent(runtime, 'agronautas.queue.dlq', 'error', input)
    },
    onProviderEvidence(input) {
      logEvent(runtime, 'agronautas.provider.evidence', input.providerMode === 'live' ? 'info' : 'warn', input)
    },
  }
}
