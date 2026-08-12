export const WORKFLOW_CONTRACT_VERSION = '1.0.0' as const
export const AGRONAUTAS_RUNTIME_WORKFLOW_ID = 'agronautas-risk-recompute' as const
export const AGRONAUTAS_RUNTIME_KIND = 'agronautas-risk-recompute' as const
export const AGRONAUTAS_RUNTIME_QUEUE_NAME = 'agronautas-runtime' as const
export const AGRONAUTAS_RUNTIME_QUEUE_KEY = `bull:${AGRONAUTAS_RUNTIME_QUEUE_NAME}:wait` as const
export const AGRONAUTAS_RUNTIME_DEFAULT_MAX_ATTEMPTS = 3 as const

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
