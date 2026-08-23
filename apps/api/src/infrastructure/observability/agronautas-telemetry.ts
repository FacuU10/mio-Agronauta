import { logger } from './logger'
import type { EvidenceEnvelope } from '@repo/zod-schemas'

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
    attributes,
  }, name)
}

export interface AgronautasTelemetry {
  runtime: RuntimeTelemetry
  onSignalRunRecorded(input: { runId: string; provider: string; staleCause?: string }): void
  onLockAcquired(input: { fieldId: string; ttlSeconds: number; acquired: boolean }): void
  onDispatchAttempt(input: { fieldId: string; runId: string; jobId: string; requestId: string; runtimeMode: string }): void
  onDispatchPublished(input: { fieldId: string; runId: string; jobId: string; requestId: string }): void
  onDispatchFailed(input: { fieldId: string; runId: string; jobId: string; requestId: string; error: string }): void
  onJobRunPersisted(input: { fieldId: string; runId: string; jobId: string; status: string }): void
  onQueueTransition(input: { jobId: string; runId: string; from: string; to: string; reason?: string }): void
  onLeaseHeartbeat(input: { jobId: string; runId: string; leaseExpiresAt?: string | null }): void
  onQueueResult(input: { jobId: string; runId: string; status: string }): void
  onQueueDeadLetter(input: { jobId: string; runId: string; reason: string }): void
  onProviderEvidence(input: Pick<EvidenceEnvelope, 'provider' | 'signalType' | 'providerMode' | 'runId' | 'requestId' | 'httpStatus' | 'schemaStatus' | 'latencyMs' | 'degradationReasons'>): void
}

export function createAgronautasTelemetry(): AgronautasTelemetry {
  const runtime = createRuntimeTelemetry('agronautas-api')

  return {
    runtime,
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
      logEvent(runtime, 'agronautas.dispatch.failed', 'error', input)
    },
    onJobRunPersisted(input) {
      logEvent(runtime, 'agronautas.job-run.persisted', 'info', input)
    },
    onQueueTransition(input) {
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
