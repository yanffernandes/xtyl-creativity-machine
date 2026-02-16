import { Navigate } from 'react-router-dom'

/**
 * GoogleAdsDashboardPage - Redirects to integrated AlvoAdsGooglePage
 *
 * The Google Ads Dashboard functionality has been integrated into the
 * main AlvoAds Google page (/alvoads-google) with a "Performance" tab.
 * This page exists only to handle any direct navigation to the old route.
 */
export function GoogleAdsDashboardPage() {
  return <Navigate to="/alvoads-google" replace />
}
