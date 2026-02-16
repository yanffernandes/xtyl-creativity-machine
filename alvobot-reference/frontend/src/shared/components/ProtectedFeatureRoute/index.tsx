import { Navigate } from 'react-router-dom'
import { FeatureAccessDeniedPage } from '@/shared/components/FeatureAccessDeniedPage'
import { Spinner } from '@/shared/components/Spinner'
import { useMenuItemVisibility } from '@/shared/hooks/useMenuVisibility'

interface ProtectedFeatureRouteProps {
  menuItemKey: string
  children: React.ReactNode
  featureName?: string
  redirectUrl?: string
  fallback?: 'denied-page' | 'redirect'
}

/**
 * Wrapper component to protect routes based on menu visibility configuration.
 * Use this to prevent users from accessing features via direct URL.
 *
 * @param menuItemKey - The menu item key to check visibility for
 * @param children - The protected content to render if access is allowed
 * @param featureName - Optional display name for the feature (shown on denied page)
 * @param redirectUrl - Optional custom redirect URL when access is denied
 * @param fallback - What to show when access is denied: 'denied-page' (default) or 'redirect'
 */
export function ProtectedFeatureRoute({
  menuItemKey,
  children,
  featureName,
  redirectUrl = '/subscription',
  fallback = 'denied-page',
}: ProtectedFeatureRouteProps) {
  const { isLoading, visibility, redirectUrl: configRedirectUrl } = useMenuItemVisibility(menuItemKey)

  // Show loading spinner while checking access
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Spinner size="lg" />
      </div>
    )
  }

  // Allow access for visible items
  if (visibility === 'visible') {
    return <>{children}</>
  }

  // Handle restricted access (coming_soon or hidden)
  const effectiveRedirectUrl = configRedirectUrl || redirectUrl

  if (fallback === 'redirect') {
    return <Navigate to={effectiveRedirectUrl} replace />
  }

  // Show access denied page
  return (
    <FeatureAccessDeniedPage
      featureName={featureName}
      redirectUrl={effectiveRedirectUrl}
    />
  )
}
