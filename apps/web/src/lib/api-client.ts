import { z } from 'zod'

const DEFAULT_API_BASE_URL = '/api/agronautas/v1'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
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
      throw new ApiError(
        response.status,
        errorData.message || `HTTP ${response.status}`,
        errorData
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
    throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function resolveApiBaseUrl(): string {
  const configured = process.env['NEXT_PUBLIC_API_URL']?.trim()
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  return DEFAULT_API_BASE_URL
}
