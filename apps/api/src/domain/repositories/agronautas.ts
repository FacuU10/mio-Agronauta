import type { DemoContactSubmission } from '@repo/zod-schemas'
import type {
  ClimateSummary,
  Field,
  FieldContext,
  GeoPoint,
  RiskSnapshotFoundation,
  SatelliteSummary,
} from '../entities/agronautas'

export interface SupportedCoverageResult {
  insideSupportedArea: boolean
  locality?: string
  provinceCode?: string
  boundaryVersion?: string
  localityConfidence?: number
  staleCause?: string
}

export interface FieldRepository {
  save(field: Field): Promise<void>
  findById(fieldId: string): Promise<Field | null>
  findByExternalFieldId(fieldId: string): Promise<Field | null>
  resolveCoverage(point: GeoPoint): Promise<SupportedCoverageResult>
}

export interface FieldContextRepository {
  save(context: FieldContext): Promise<void>
  getLatest(fieldId: string): Promise<FieldContext | null>
}

export interface DemoContactSubmissionRecord extends DemoContactSubmission {
  sourcePath: string
  userAgent?: string
  ipHash?: string
}

export interface DemoContactSubmissionRepository {
  save(record: DemoContactSubmissionRecord): Promise<{ submissionId: string }>
}

export interface SignalSummaryRepository {
  getLatestClimateSummary(fieldId: string): Promise<ClimateSummary | null>
  getLatestSatelliteSummary(fieldId: string): Promise<SatelliteSummary | null>
  listClimateTimeline?(fieldId: string, limit: number): Promise<ClimateSummary[]>
}

export interface SignalIngestionRunRecord {
  fieldId: string
  runId: string
  provider: string
  signalType: 'climate' | 'satellite'
  status: 'succeeded' | 'degraded' | 'failed'
  startedAt: Date
  finishedAt?: Date
  observedAt?: Date
  staleCause?: string
  degradationReason?: string
  evidencePayload: Record<string, unknown>
}

export interface SignalIngestionRepository {
  saveRun(record: SignalIngestionRunRecord): Promise<void>
}

export interface RiskSnapshotRepository {
  save(snapshot: RiskSnapshotFoundation): Promise<void>
  getLatest(fieldId: string): Promise<RiskSnapshotFoundation | null>
  listTimeline?(fieldId: string, limit: number): Promise<RiskSnapshotFoundation[]>
 }

export interface AlertSnapshotRecord {
  alertId: string
  fieldId: string
  basedOnSnapshotId: string
  runId: string
  type: 'flood' | 'water_stress' | 'thermal_stress'
  priority: 1 | 2 | 3
  confidence: number
  freshness: 'fresh' | 'stale' | 'degraded'
  degradationReasons: string[]
  staleCause?: string
}

export interface AlertSnapshotRepository {
  saveMany(alerts: AlertSnapshotRecord[]): Promise<void>
  getLatestForField(fieldId: string): Promise<AlertSnapshotRecord[]>
  listTimeline(fieldId: string, limit: number): Promise<AlertSnapshotRecord[]>
}

export interface RecomputeLockMetadata {
  runId: string
  jobId: string
  requestId: string
  correlationId: string
  triggeredBy: 'api' | 'alert-refresh'
  contractVersion: string
}

export interface RecomputeLockAcquireResult {
  acquired: boolean
  metadata: RecomputeLockMetadata
}

export interface RecomputeLockRepository {
  acquire(fieldId: string, ttlSeconds: number, metadata: RecomputeLockMetadata): Promise<RecomputeLockAcquireResult>
  release(fieldId: string): Promise<void>
}

export interface AgronautasRuntimeDispatchCommand {
  contractVersion: string
  jobId: string
  runId: string
  fieldId: string
  triggeredBy: 'api' | 'alert-refresh'
  requestId: string
  correlationId: string
  requestedAt: Date
  runtimeMode: 'real' | 'demo'
}

export interface AgronautasRuntimeDispatcher {
  dispatchRiskRecompute(command: AgronautasRuntimeDispatchCommand): Promise<void>
}

export interface AgronautasJobRunRecord {
  jobId: string
  runId: string
  fieldId: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  triggeredBy: 'api' | 'alert-refresh'
  contractVersion: string
  requestId: string
  correlationId: string
  runtimeMode: 'real' | 'demo'
  queuedAt: Date
  startedAt?: Date
  heartbeatAt?: Date
  completedAt?: Date
  errorCode?: string
  errorMessage?: string
  resultPayload?: Record<string, unknown>
}

export interface AgronautasJobRunRepository {
  saveQueuedRun(record: AgronautasJobRunRecord): Promise<void>
  markRunning(jobId: string, startedAt: Date): Promise<void>
  markHeartbeat(jobId: string, heartbeatAt: Date): Promise<void>
  markCompleted(jobId: string, completedAt: Date, resultPayload: Record<string, unknown>): Promise<void>
  markFailed(jobId: string, failedAt: Date, errorCode: string, errorMessage: string): Promise<void>
}
