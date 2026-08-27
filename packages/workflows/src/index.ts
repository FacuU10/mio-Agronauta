import { randomUUID } from 'node:crypto'

export const WORKFLOW_CONTRACT_VERSION = '1.0.0' as const
export const AGRONAUTAS_RUNTIME_CONTRACT_V2 = '2.0.0' as const
export const AGRONAUTAS_RUNTIME_WORKFLOW_ID = 'agronautas-risk-recompute' as const
export const AGRONAUTAS_RUNTIME_KIND = 'agronautas-risk-recompute' as const
export const AGRONAUTAS_SCHEDULED_WINDOW_WORKFLOW_ID = 'agronautas-scheduled-window' as const
export const AGRONAUTAS_SCHEDULED_WINDOW_KIND = 'agronautas-scheduled-window' as const
export const AGRONAUTAS_SCHEDULED_WINDOW_SIGNAL_TYPES = {
  CLIMATE: 'climate',
  SATELLITE: 'satellite',
  WEATHER_ALERT: 'weather_alert',
  FIRE: 'fire',
  SOIL: 'soil',
} as const
export type AgronautasScheduledWindowSignalType = (typeof AGRONAUTAS_SCHEDULED_WINDOW_SIGNAL_TYPES)[keyof typeof AGRONAUTAS_SCHEDULED_WINDOW_SIGNAL_TYPES]
export const AGRONAUTAS_RUNTIME_QUEUE_NAME = 'agronautas-runtime' as const
export const AGRONAUTAS_RUNTIME_QUEUE_KEY = `bull:${AGRONAUTAS_RUNTIME_QUEUE_NAME}:wait` as const
export const AGRONAUTAS_RUNTIME_DEFAULT_MAX_ATTEMPTS = 3 as const

export const AGRONAUTAS_RUNTIME_OPERATIONS = {
  RISK_RECOMPUTE: 'risk-recompute',
  SCHEDULED_WINDOW: 'scheduled-window',
} as const

export type AgronautasRuntimeOperation = (typeof AGRONAUTAS_RUNTIME_OPERATIONS)[keyof typeof AGRONAUTAS_RUNTIME_OPERATIONS]

export interface AgronautasRuntimeJob {
  contractVersion: typeof AGRONAUTAS_RUNTIME_CONTRACT_V2
  jobId: string
  runId: string
  operation: AgronautasRuntimeOperation
  fieldId: string | null
  requestedAt: string
  trace: {
    traceId: string
    correlationId: string
    causationId: string
  }
  runtime: {
    mode: 'real' | 'demo'
  }
  state: 'queued' | 'leased' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'dlq' | 'cancelled'
  lease: {
    attempt: number
    maxAttempts: number
    leaseExpiresAt: string | null
  }
  sourceWindow?: AgronautasRuntimeSourceWindow
}

export interface AgronautasRuntimeSourceWindow {
  provider: string
  signalType: AgronautasScheduledWindowSignalType
  windowStart: string
  windowEnd: string
  runId: string
}

export interface AgronautasRuntimeJobFactoryInput {
  fieldId: string | null
  operation: AgronautasRuntimeOperation
  runtimeMode: 'real' | 'demo'
  requestedAt?: Date
  jobId?: string
  runId?: string
  requestId?: string
  correlationId?: string
  idGenerator?: () => string
  lease?: {
    attempt?: number
    maxAttempts?: number
    leaseExpiresAt?: string | null
  }
  sourceWindow?: AgronautasRuntimeSourceWindow
}

export const JOB_STATUS = {
  PENDING: 'pending',
  LEASED: 'leased',
  RUNNING: 'running',
  WAITING: 'waiting',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  DLQ: 'dlq',
} as const

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS]
export type WorkflowRuntime = 'python-langgraph'
export type WorkflowStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface JobLease {
  attempt: number
  maxAttempts: number
  leasedAt?: string
  leaseExpiresAt?: string
}

export interface WorkflowDispatch {
  workflowId: string;
  runtime: WorkflowRuntime;
  contractVersion: typeof WORKFLOW_CONTRACT_VERSION;
  runId: string;
  input: Record<string, unknown>;
}

export interface AgronautasRiskRecomputeJob {
  contractVersion: typeof WORKFLOW_CONTRACT_VERSION;
  jobId: string;
  workflowId: typeof AGRONAUTAS_RUNTIME_WORKFLOW_ID;
  runId: string;
  kind: typeof AGRONAUTAS_RUNTIME_KIND;
  status: 'pending';
  priority: 50;
  createdAt: string;
  lease: JobLease;
  trace: {
    traceId: string;
    correlationId: string;
    causationId: string;
  };
  payload: {
    fieldId: string;
    triggeredBy: 'api' | 'alert-refresh';
    requestedAt: string;
    runtime: {
      mode: 'real' | 'demo';
    };
  };
  labels: {
    domain: 'agronautas';
    operation: 'risk-recompute';
  };
}

export interface AgronautasScheduledWindowInput {
  provider: string
  signalType: AgronautasScheduledWindowSignalType
  windowStart: Date
  windowEnd: Date
  runId: string
}

export interface AgronautasScheduledWindowJob {
  contractVersion: typeof WORKFLOW_CONTRACT_VERSION
  jobId: string
  workflowId: typeof AGRONAUTAS_SCHEDULED_WINDOW_WORKFLOW_ID
  runId: string
  kind: typeof AGRONAUTAS_SCHEDULED_WINDOW_KIND
  status: 'pending'
  priority: 50
  createdAt: string
  lease: JobLease
  trace: {
    traceId: string
    correlationId: string
    causationId: string
  }
  payload: {
    sourceWindow: {
      provider: string
      signalType: AgronautasScheduledWindowSignalType
      windowStart: string
      windowEnd: string
      runId: string
    }
  }
  labels: {
    domain: 'agronautas'
    operation: 'scheduled-window'
  }
}

export interface WorkflowResult {
  workflowId: string;
  runId: string;
  status: WorkflowStatus;
  output?: Record<string, unknown>;
  error?: { message: string; code?: string };
}

export const WORKFLOW_RUNTIME = "python-langgraph" as const;

export function createWorkflowDispatch(input: Omit<WorkflowDispatch, "contractVersion">): WorkflowDispatch {
  return {
    contractVersion: WORKFLOW_CONTRACT_VERSION,
    ...input,
  };
}

export function createAgronautasRiskRecomputeJob(input: {
  contractVersion?: string;
  jobId: string;
  runId: string;
  fieldId: string;
  triggeredBy: 'api' | 'alert-refresh';
  requestId: string;
  correlationId: string;
  requestedAt: Date;
  runtimeMode: 'real' | 'demo';
  lease?: Pick<JobLease, 'attempt' | 'maxAttempts'>;
}): AgronautasRiskRecomputeJob {
  if (input.contractVersion !== undefined && input.contractVersion !== WORKFLOW_CONTRACT_VERSION) {
    throw new Error(`Unsupported workflow contract version: ${input.contractVersion}`)
  }

  const lease = input.lease ?? {
    attempt: 1,
    maxAttempts: AGRONAUTAS_RUNTIME_DEFAULT_MAX_ATTEMPTS,
  }

  return {
    contractVersion: input.contractVersion ?? WORKFLOW_CONTRACT_VERSION,
    jobId: input.jobId,
    workflowId: AGRONAUTAS_RUNTIME_WORKFLOW_ID,
    runId: input.runId,
    kind: AGRONAUTAS_RUNTIME_KIND,
    status: 'pending',
    priority: 50,
    createdAt: input.requestedAt.toISOString(),
    lease,
    trace: {
      traceId: input.requestId,
      correlationId: input.correlationId,
      causationId: input.runId,
    },
    payload: {
      fieldId: input.fieldId,
      triggeredBy: input.triggeredBy,
      requestedAt: input.requestedAt.toISOString(),
      runtime: {
        mode: input.runtimeMode,
      },
    },
    labels: {
      domain: 'agronautas',
      operation: 'risk-recompute',
    },
  };
}

export function createAgronautasRuntimeJob(input: AgronautasRuntimeJobFactoryInput): AgronautasRuntimeJob {
  const generateId = input.idGenerator ?? randomUUID
  const runId = input.runId ?? generateId()
  const jobId = input.jobId ?? `agro-job-${generateId()}`
  const traceId = input.requestId ?? generateId()
  const correlationId = input.correlationId ?? traceId
  const requestedAt = input.requestedAt ?? new Date()

  return {
    contractVersion: AGRONAUTAS_RUNTIME_CONTRACT_V2,
    jobId,
    runId,
    operation: input.operation,
    fieldId: input.fieldId,
    requestedAt: requestedAt.toISOString(),
    trace: { traceId, correlationId, causationId: runId },
    runtime: { mode: input.runtimeMode },
    state: 'queued',
    lease: {
      attempt: input.lease?.attempt ?? 1,
      maxAttempts: input.lease?.maxAttempts ?? AGRONAUTAS_RUNTIME_DEFAULT_MAX_ATTEMPTS,
      leaseExpiresAt: input.lease?.leaseExpiresAt ?? null,
    },
    ...(input.sourceWindow ? { sourceWindow: input.sourceWindow } : {}),
  }
}

export function createAgronautasScheduledWindowRuntimeJob(input: {
  provider: string
  signalType: AgronautasScheduledWindowSignalType
  windowStart: Date
  windowEnd: Date
  runId: string
  jobId?: string
  requestId?: string
  correlationId?: string
  createdAt?: Date
  lease?: Pick<JobLease, 'attempt' | 'maxAttempts'>
  idGenerator?: () => string
}): AgronautasRuntimeJob {
  const createdAt = input.createdAt ?? new Date()
  if (input.windowEnd.getTime() <= input.windowStart.getTime()) {
    throw new Error('scheduled_window_end_must_follow_start')
  }
  if (input.runId.trim().length === 0) {
    throw new Error('scheduled_window_run_id_required')
  }

  return createAgronautasRuntimeJob({
    fieldId: null,
    operation: 'scheduled-window',
    runtimeMode: 'real',
    requestedAt: createdAt,
    jobId: input.jobId ?? `agronautas-window:${input.runId}`,
    runId: input.runId,
    requestId: input.requestId ?? `scheduler:${input.runId}`,
    correlationId: input.correlationId ?? input.runId,
    lease: input.lease,
    idGenerator: input.idGenerator,
    sourceWindow: {
      provider: input.provider,
      signalType: input.signalType,
      windowStart: input.windowStart.toISOString(),
      windowEnd: input.windowEnd.toISOString(),
      runId: input.runId,
    },
  })
}

export function createAgronautasScheduledWindowJob(input: {
  window: AgronautasScheduledWindowInput
  jobId?: string
  requestId?: string
  correlationId?: string
  createdAt?: Date
  lease?: Pick<JobLease, 'attempt' | 'maxAttempts'>
}): AgronautasScheduledWindowJob {
  const createdAt = input.createdAt ?? new Date()
  if (input.window.windowEnd.getTime() <= input.window.windowStart.getTime()) {
    throw new Error('scheduled_window_end_must_follow_start')
  }
  if (input.window.runId.trim().length === 0) {
    throw new Error('scheduled_window_run_id_required')
  }

  const jobId = input.jobId ?? `agronautas-window:${input.window.runId}`
  const requestId = input.requestId ?? jobId
  const correlationId = input.correlationId ?? input.window.runId
  return {
    contractVersion: WORKFLOW_CONTRACT_VERSION,
    jobId,
    workflowId: AGRONAUTAS_SCHEDULED_WINDOW_WORKFLOW_ID,
    runId: input.window.runId,
    kind: AGRONAUTAS_SCHEDULED_WINDOW_KIND,
    status: 'pending',
    priority: 50,
    createdAt: createdAt.toISOString(),
    lease: input.lease ?? { attempt: 1, maxAttempts: AGRONAUTAS_RUNTIME_DEFAULT_MAX_ATTEMPTS },
    trace: { traceId: requestId, correlationId, causationId: input.window.runId },
    payload: {
      sourceWindow: {
        provider: input.window.provider,
        signalType: input.window.signalType,
        windowStart: input.window.windowStart.toISOString(),
        windowEnd: input.window.windowEnd.toISOString(),
        runId: input.window.runId,
      },
    },
    labels: { domain: 'agronautas', operation: 'scheduled-window' },
  }
}
