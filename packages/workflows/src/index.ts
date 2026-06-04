export const WORKFLOW_CONTRACT_VERSION = "1.0.0" as const;
export const AGRONAUTAS_RUNTIME_WORKFLOW_ID = 'agronautas-risk-recompute' as const;
export const AGRONAUTAS_RUNTIME_KIND = 'agronautas-risk-recompute' as const;

export type WorkflowRuntime = "python-langgraph";
export type WorkflowStatus = "queued" | "running" | "completed" | "failed";

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
  contractVersion?: typeof WORKFLOW_CONTRACT_VERSION;
  jobId: string;
  runId: string;
  fieldId: string;
  triggeredBy: 'api' | 'alert-refresh';
  requestId: string;
  correlationId: string;
  requestedAt: Date;
  runtimeMode: 'real' | 'demo';
}): AgronautasRiskRecomputeJob {
  return {
    contractVersion: input.contractVersion ?? WORKFLOW_CONTRACT_VERSION,
    jobId: input.jobId,
    workflowId: AGRONAUTAS_RUNTIME_WORKFLOW_ID,
    runId: input.runId,
    kind: AGRONAUTAS_RUNTIME_KIND,
    status: 'pending',
    priority: 50,
    createdAt: input.requestedAt.toISOString(),
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
