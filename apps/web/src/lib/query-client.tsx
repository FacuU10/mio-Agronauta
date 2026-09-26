'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, useState, type ReactNode } from 'react'
import { useAgronautasStore } from '@/store/agronautas-store'

const AGRONAUTAS_QUERY_ACCESS_VALUES = {
  PUBLIC: 'public',
  PROTECTED: 'protected',
} as const

export type AgronautasQueryAccess = (typeof AGRONAUTAS_QUERY_ACCESS_VALUES)[keyof typeof AGRONAUTAS_QUERY_ACCESS_VALUES]

export interface AgronautasAuthScope {
  actorId: string
  sessionId: string
  workspaceId: string
}

export interface AgronautasQueryMeta extends Record<string, unknown> {
  agronautasAccess: AgronautasQueryAccess
}

const React = { createElement }

export function createAgronautasQueryKey(access: AgronautasQueryAccess, scope: AgronautasAuthScope | null, resource: string, ...parts: unknown[]): readonly unknown[] {
  if (access === AGRONAUTAS_QUERY_ACCESS_VALUES.PUBLIC) return ['agronautas', access, resource, ...parts]
  return ['agronautas', access, scope?.actorId ?? 'unknown-actor', scope?.sessionId ?? 'unknown-session', scope?.workspaceId ?? 'unknown-workspace', resource, ...parts]
}

export function createAgronautasQueryMeta(agronautasAccess: AgronautasQueryAccess): AgronautasQueryMeta {
  return { agronautasAccess }
}

export function clearAgronautasProtectedState(queryClient: QueryClient): void {
  queryClient.removeQueries({ predicate: (query) => query.meta?.['agronautasAccess'] === AGRONAUTAS_QUERY_ACCESS_VALUES.PROTECTED || query.queryKey[0] === 'agronautas' && query.queryKey[1] === AGRONAUTAS_QUERY_ACCESS_VALUES.PROTECTED })
  useAgronautasStore.getState().reset()
}

export function QueryProvider({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [queryClient] = useState(
    () =>
      client ?? new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
