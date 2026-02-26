import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { matchRoute, type RouteMatch } from './routes'

interface RouterState {
  pathname: string
  search: string
  params: Record<string, string>
}

interface RouterContextValue extends RouterState {
  push: (to: string) => void
  replace: (to: string) => void
  back: () => void
  refresh: () => void
}

const RouterContext = createContext<RouterContextValue | null>(null)

function getState(): RouterState {
  const pathname = window.location.pathname || '/'
  const search = window.location.search || ''
  const match = matchRoute(pathname)
  return {
    pathname,
    search,
    params: match?.params ?? {},
  }
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RouterState>(() => getState())

  const syncState = useCallback(() => {
    setState(getState())
  }, [])

  useEffect(() => {
    const onPopState = () => syncState()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [syncState])

  const push = useCallback((to: string) => {
    if (window.location.pathname + window.location.search === to) return
    window.history.pushState({}, '', to)
    syncState()
  }, [syncState])

  const replace = useCallback((to: string) => {
    window.history.replaceState({}, '', to)
    syncState()
  }, [syncState])

  const back = useCallback(() => {
    window.history.back()
  }, [])

  const refresh = useCallback(() => {
    syncState()
  }, [syncState])

  const value = useMemo(() => ({ ...state, push, replace, back, refresh }), [state, push, replace, back, refresh])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouterContext() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouterContext must be used inside RouterProvider')
  return ctx
}

export function useRouteMatch(): RouteMatch | null {
  const { pathname } = useRouterContext()
  return useMemo(() => matchRoute(pathname), [pathname])
}
