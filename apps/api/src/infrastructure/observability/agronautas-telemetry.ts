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
  }
}
