"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useState } from "react"

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // T003: Default stale time of 5 minutes for general data
            staleTime: 5 * 60 * 1000,
            // T006: Garbage collection time of 30 minutes
            gcTime: 30 * 60 * 1000,
            // T007: Single retry for failed queries
            retry: 1,
            // T004: Disable refetch on window focus to prevent unnecessary requests
            refetchOnWindowFocus: false,
            // T005: Disable refetch on reconnect
            refetchOnReconnect: false,
          },
          mutations: {
            // Retry failed mutations 0 times
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
