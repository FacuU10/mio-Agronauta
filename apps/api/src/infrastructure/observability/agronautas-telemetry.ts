interface RuntimeTelemetry {
  serviceName: string
}

function createRuntimeTelemetry(serviceName: string): RuntimeTelemetry {
  return { serviceName }
}

function logEvent(runtime: RuntimeTelemetry, name: string, level: 'info' | 'warn' | 'error', attributes: Record<string, unknown>): void {
  const line = JSON.stringify({
    channel: 'golden.telemetry.v1',
    serviceName: runtime.serviceName,
    name,
    level,
    timestamp: new Date().toISOString(),
    attributes,
  })

  switch (level) {
    case 'error':
      console.error(line)
      break
    case 'warn':
      console.warn(line)
      break
    default:
      console.log(line)
      break
  }
}

export interface AgronautasTelemetry {
  runtime: RuntimeTelemetry
  onSignalRunRecorded(input: { runId: string; provider: string; staleCause?: string }): void
  onLockAcquired(input: { fieldId: string; ttlSeconds: number; acquired: boolean }): void
  onDispatchAttempt(input: { fieldId: string; runId: string; jobId: string; requestId: string; runtimeMode: string }): void
  onDispatchPublished(input: { fieldId: string; runId: string; jobId: string; requestId: string }): void
  onDispatchFailed(input: { fieldId: string; runId: string; jobId: string; requestId: string; error: string }): void
  onJobRunPersisted(input: { fieldId: string; runId: string; jobId: string; status: string }): void
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
  }
}
