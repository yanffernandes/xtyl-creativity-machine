const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "/api"

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "")

export function buildApiUrl(path: string): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`
    return `${API_BASE_URL}${normalizedPath}`
}
