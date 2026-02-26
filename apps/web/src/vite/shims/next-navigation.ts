import { useMemo } from 'react'
import { useRouterContext } from '@/vite/router'

export function useRouter() {
  const { push, replace, back, refresh } = useRouterContext()
  return {
    push,
    replace,
    back,
    refresh,
    prefetch: async () => {},
  }
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  const { params } = useRouterContext()
  return params as T
}

export function useSearchParams() {
  const { search } = useRouterContext()
  return useMemo(() => new URLSearchParams(search), [search])
}

export function usePathname() {
  const { pathname } = useRouterContext()
  return pathname
}
