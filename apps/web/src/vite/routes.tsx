import React from 'react'

import HomePage from '@/app/page'
import LoginPage from '@/app/login/page'
import RegisterPage from '@/app/register/page'
import SignupPage from '@/app/signup/page'
import ForgotPasswordPage from '@/app/forgot-password/page'
import ResetPasswordPage from '@/app/reset-password/page'
import DashboardPage from '@/app/dashboard/page'
import AuthCallbackPage from '@/app/auth/callback/page'
import SharedDocumentPage from '@/app/shared/[token]/page'

import WorkspacePage from '@/app/workspace/[id]/page'
import WorkspaceProfilePage from '@/app/workspace/[id]/profile/page'
import WorkspaceSettingsPage from '@/app/workspace/[id]/settings/page'
import WorkspaceTemplatesPage from '@/app/workspace/[id]/templates/page'
import WorkspaceAIUsagePage from '@/app/workspace/[id]/ai-usage/page'

import ProjectPage from '@/app/workspace/[id]/project/[projectId]/page'
import ProjectSettingsPage from '@/app/workspace/[id]/project/[projectId]/settings/page'
import ProjectStudioPage from '@/app/workspace/[id]/project/[projectId]/studio/page'
import ProjectVisualContextPage from '@/app/workspace/[id]/project/[projectId]/settings/visual-context/page'

import AdminLayout from '@/app/admin/layout'
import AdminDashboardPage from '@/app/admin/page'
import AdminSettingsPage from '@/app/admin/settings/page'
import AdminMessagesPage from '@/app/admin/messages/page'
import AdminModelsPage from '@/app/admin/models/page'
import AdminUsersPage from '@/app/admin/users/page'
import AdminUserDetailPage from '@/app/admin/users/[id]/page'
import AdminWorkspacesPage from '@/app/admin/workspaces/page'
import AdminWorkspaceDetailPage from '@/app/admin/workspaces/[id]/page'

import DesignSystemPage from '@/app/design-system/page'
import DesignDemoPage from '@/app/design-demo/page'
import FalModelsExplorerPage from '@/app/fal-models-explorer/page'

export interface RouteMatch {
  route: AppRoute
  params: Record<string, string>
}

interface AppRoute {
  path: string
  component: React.ComponentType<any>
  wrapWithAdminLayout?: boolean
}

const routes: AppRoute[] = [
  { path: '/', component: HomePage },
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/signup', component: SignupPage },
  { path: '/forgot-password', component: ForgotPasswordPage },
  { path: '/reset-password', component: ResetPasswordPage },
  { path: '/dashboard', component: DashboardPage },
  { path: '/auth/callback', component: AuthCallbackPage },
  { path: '/shared/:token', component: SharedDocumentPage },

  { path: '/workspace/:id', component: WorkspacePage },
  { path: '/workspace/:id/profile', component: WorkspaceProfilePage },
  { path: '/workspace/:id/settings', component: WorkspaceSettingsPage },
  { path: '/workspace/:id/templates', component: WorkspaceTemplatesPage },
  { path: '/workspace/:id/ai-usage', component: WorkspaceAIUsagePage },

  { path: '/workspace/:id/project/:projectId', component: ProjectPage },
  { path: '/workspace/:id/project/:projectId/settings', component: ProjectSettingsPage },
  { path: '/workspace/:id/project/:projectId/studio', component: ProjectStudioPage },
  { path: '/workspace/:id/project/:projectId/settings/visual-context', component: ProjectVisualContextPage },

  { path: '/admin', component: AdminDashboardPage, wrapWithAdminLayout: true },
  { path: '/admin/settings', component: AdminSettingsPage, wrapWithAdminLayout: true },
  { path: '/admin/messages', component: AdminMessagesPage, wrapWithAdminLayout: true },
  { path: '/admin/models', component: AdminModelsPage, wrapWithAdminLayout: true },
  { path: '/admin/users', component: AdminUsersPage, wrapWithAdminLayout: true },
  { path: '/admin/users/:id', component: AdminUserDetailPage, wrapWithAdminLayout: true },
  { path: '/admin/workspaces', component: AdminWorkspacesPage, wrapWithAdminLayout: true },
  { path: '/admin/workspaces/:id', component: AdminWorkspaceDetailPage, wrapWithAdminLayout: true },

  { path: '/design-system', component: DesignSystemPage },
  { path: '/design-demo', component: DesignDemoPage },
  { path: '/fal-models-explorer', component: FalModelsExplorerPage },
]

function compilePath(path: string) {
  const segments = path.split('/').filter(Boolean)
  return {
    segments,
    isDynamic: segments.some((s) => s.startsWith(':')),
  }
}

function matchPath(routePath: string, pathname: string): Record<string, string> | null {
  const routeSegments = routePath.split('/').filter(Boolean)
  const pathSegments = pathname.split('/').filter(Boolean)

  if (routeSegments.length !== pathSegments.length) return null

  const params: Record<string, string> = {}

  for (let i = 0; i < routeSegments.length; i += 1) {
    const r = routeSegments[i]
    const p = pathSegments[i]

    if (r.startsWith(':')) {
      params[r.slice(1)] = decodeURIComponent(p)
    } else if (r !== p) {
      return null
    }
  }

  return params
}

const routeIndex = routes
  .map((route) => ({ route, meta: compilePath(route.path) }))
  .sort((a, b) => {
    if (a.meta.isDynamic !== b.meta.isDynamic) {
      return a.meta.isDynamic ? 1 : -1
    }
    return b.meta.segments.length - a.meta.segments.length
  })

export function matchRoute(pathname: string): RouteMatch | null {
  for (const item of routeIndex) {
    const params = matchPath(item.route.path, pathname)
    if (params) {
      return { route: item.route, params }
    }
  }
  return null
}

export function renderMatchedRoute(match: RouteMatch | null): React.ReactNode {
  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Pagina nao encontrada</h1>
          <p className="text-muted-foreground mt-2">Verifique a URL ou volte para o dashboard.</p>
        </div>
      </div>
    )
  }

  const PageComponent = match.route.component
  const content = <PageComponent />

  if (match.route.wrapWithAdminLayout) {
    return <AdminLayout>{content}</AdminLayout>
  }

  return content
}
