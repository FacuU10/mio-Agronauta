import { z } from 'zod'
import { normalizeRequestError, normalizeRequestResponse, type RequestOutcome } from './visibility/view-models'

const DEFAULT_API_BASE_URL = '/api/agronautas/v1'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
    public retryAfterMs?: number,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface FetchOptions extends RequestInit {
  timeout?: number
}

async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const externalSignal = fetchOptions.signal
  const abortExternal = () => controller.abort()
  if (externalSignal?.aborted) controller.abort()
  else externalSignal?.addEventListener('abort', abortExternal, { once: true })

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  } finally {
    externalSignal?.removeEventListener('abort', abortExternal)
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {},
  schema?: z.ZodSchema<T>
): Promise<T> {
  const baseUrl = resolveApiBaseUrl()
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${normalizedEndpoint}`

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorRecord = asRecord(errorData)
      throw new ApiError(
        response.status,
        readErrorMessage(errorRecord, response.status),
        errorData,
        readRetryAfterMs(response, errorData),
        readErrorCode(errorRecord),
      )
    }

    const data = await response.json()

    if (schema) {
      return schema.parse(data)
    }

    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    const wrapped = new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    if (error instanceof Error && error.name === 'AbortError') {
      wrapped.name = 'AbortError'
      Object.assign(wrapped, { code: readErrorCode(error) ?? 'ERR_ABORTED' })
    }
    throw wrapped
  }
}

export async function apiClientOutcome<T>(
  endpoint: string,
  options: FetchOptions = {},
  schema?: z.ZodSchema<T>,
): Promise<RequestOutcome<T>> {
  try {
    const data = await apiClient(endpoint, options, schema)
    return normalizeRequestResponse({ status: 200, data, raw: data })
  } catch (error) {
    return normalizeRequestError(error) as RequestOutcome<T>
  }
}

function readRetryAfterMs(response: Response, data: unknown): number | undefined {
  const record = asRecord(data)
  const bodyValue = record?.['retryAfterMs']
  if (typeof bodyValue === 'number' && Number.isFinite(bodyValue) && bodyValue > 0) return Math.floor(bodyValue)
  return parseRetryAfter(response.headers.get('retry-after'))
}

function parseRetryAfter(value: string | null): number | undefined {
  const normalized = value?.trim()
  if (!normalized) return undefined
  if (/^\d+$/.test(normalized)) return Number(normalized) * 1_000
  const retryAt = Date.parse(normalized)
  if (Number.isNaN(retryAt)) return undefined
  const delay = retryAt - Date.now()
  return delay > 0 ? Math.floor(delay) : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function readErrorMessage(record: Record<string, unknown> | undefined, status: number): string {
  return typeof record?.['message'] === 'string' && record['message'].trim() ? record['message'] : `HTTP ${status}`
}

function readErrorCode(value: unknown): string | undefined {
  const record = asRecord(value)
  return typeof record?.['code'] === 'string' && record['code'].trim() ? record['code'] : undefined
}

export function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return DEFAULT_API_BASE_URL
  }

  const configured = process.env['NEXT_PUBLIC_API_URL']?.trim()
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  return DEFAULT_API_BASE_URL
}
