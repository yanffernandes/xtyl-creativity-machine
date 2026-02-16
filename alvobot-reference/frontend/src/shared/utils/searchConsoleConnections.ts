import type { Connection } from '@/shared/types/entities'

const DOMAIN_PREFIX = 'sc-domain:'

type SiteEntry = { siteUrl?: string } | string

const getHostFromUrl = (url: string): string | null => {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

export const getSearchConsoleSites = (connection: Connection): string[] => {
  const sites = (connection.metadata as { sites?: SiteEntry[] } | undefined)?.sites
  if (!Array.isArray(sites)) return []

  return sites
    .map((site) => (typeof site === 'string' ? site : site?.siteUrl))
    .filter((siteUrl): siteUrl is string => !!siteUrl)
}

export const matchSearchConsoleSiteForUrl = (siteUrls: string[], url: string): string | null => {
  if (!url || siteUrls.length === 0) return null

  const urlHost = getHostFromUrl(url)

  for (const siteUrl of siteUrls) {
    if (!siteUrl) continue

    if (siteUrl.startsWith(DOMAIN_PREFIX)) {
      if (!urlHost) continue
      const domain = siteUrl.slice(DOMAIN_PREFIX.length).toLowerCase()
      if (!domain) continue
      if (urlHost === domain || urlHost.endsWith(`.${domain}`)) return siteUrl
      continue
    }

    if (url.startsWith(siteUrl)) return siteUrl
  }

  return null
}

export const isUrlCoveredByConnection = (connection: Connection, url: string): boolean => {
  const sites = getSearchConsoleSites(connection)
  return !!matchSearchConsoleSiteForUrl(sites, url)
}
