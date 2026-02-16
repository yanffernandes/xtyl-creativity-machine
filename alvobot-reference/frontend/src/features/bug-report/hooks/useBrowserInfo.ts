import { useMemo } from 'react'
import type { BrowserInfo } from '../types'

/**
 * Hook to capture browser and device information
 * Returns current browser info for bug reports
 */
export function useBrowserInfo(): BrowserInfo {
  const browserInfo = useMemo<BrowserInfo>(() => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      online: navigator.onLine,
      cookiesEnabled: navigator.cookieEnabled,
    }
  }, [])

  return browserInfo
}

/**
 * Get browser info synchronously (for use outside of React components)
 */
export function getBrowserInfo(): BrowserInfo {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    online: navigator.onLine,
    cookiesEnabled: navigator.cookieEnabled,
  }
}

/**
 * Parse user agent to get readable browser and OS info
 */
export function parseUserAgent(userAgent: string): {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
} {
  let browser = 'Unknown'
  let browserVersion = ''
  let os = 'Unknown'
  let osVersion = ''

  // Detect browser
  if (userAgent.includes('Firefox/')) {
    browser = 'Firefox'
    browserVersion = userAgent.match(/Firefox\/([\d.]+)/)?.[1] || ''
  } else if (userAgent.includes('Edg/')) {
    browser = 'Edge'
    browserVersion = userAgent.match(/Edg\/([\d.]+)/)?.[1] || ''
  } else if (userAgent.includes('Chrome/')) {
    browser = 'Chrome'
    browserVersion = userAgent.match(/Chrome\/([\d.]+)/)?.[1] || ''
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    browser = 'Safari'
    browserVersion = userAgent.match(/Version\/([\d.]+)/)?.[1] || ''
  }

  // Detect OS
  if (userAgent.includes('Windows NT 10')) {
    os = 'Windows'
    osVersion = '10/11'
  } else if (userAgent.includes('Windows NT')) {
    os = 'Windows'
    osVersion = userAgent.match(/Windows NT ([\d.]+)/)?.[1] || ''
  } else if (userAgent.includes('Mac OS X')) {
    os = 'macOS'
    osVersion = userAgent.match(/Mac OS X ([\d_]+)/)?.[1]?.replace(/_/g, '.') || ''
  } else if (userAgent.includes('Linux')) {
    os = 'Linux'
  } else if (userAgent.includes('Android')) {
    os = 'Android'
    osVersion = userAgent.match(/Android ([\d.]+)/)?.[1] || ''
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS'
    osVersion = userAgent.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || ''
  }

  return { browser, browserVersion, os, osVersion }
}

/**
 * Format browser info for display
 */
export function formatBrowserInfo(info: BrowserInfo): string {
  const parsed = parseUserAgent(info.userAgent)
  return `${parsed.browser} ${parsed.browserVersion} on ${parsed.os} ${parsed.osVersion}`
}
