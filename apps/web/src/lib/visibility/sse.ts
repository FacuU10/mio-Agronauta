export type SseEventType = 'metadata' | 'token' | 'done' | 'error'

export interface SseEvent {
  type: SseEventType
  sequence: number
  receivedAt: string
  token?: string
  metadata?: Record<string, unknown>
  error?: string
}

export function parseSseEvent(input: unknown): SseEvent {
  if (!input || typeof input !== 'object') throw new Error('Invalid SSE event')
  const value = input as Record<string, unknown>
  if (!['metadata', 'token', 'done', 'error'].includes(String(value['type']))) throw new Error('Unsupported SSE event')
  if (!Number.isInteger(value['sequence']) || Number(value['sequence']) < 1) throw new Error('SSE sequence must be a positive integer')
  if (typeof value['receivedAt'] !== 'string' || !value['receivedAt']) throw new Error('SSE receivedAt is required')
  return {
    type: value['type'] as SseEventType,
    sequence: value['sequence'] as number,
    receivedAt: value['receivedAt'],
    ...(typeof value['token'] === 'string' ? { token: value['token'] } : {}),
    ...(value['metadata'] && typeof value['metadata'] === 'object' ? { metadata: value['metadata'] as Record<string, unknown> } : {}),
    ...(typeof value['error'] === 'string' ? { error: value['error'] } : {}),
  }
}
