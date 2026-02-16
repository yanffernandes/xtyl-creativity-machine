import { useEffect } from 'react'

const APP_NAME = 'AlvoBot'

/**
 * Hook to set the document title dynamically
 * @param title - The page-specific title (e.g., "Meus Blogs")
 * @param options - Optional configuration
 * @param options.suffix - Whether to append the app name (default: true)
 *
 * @example
 * // Results in: "Meus Blogs | AlvoBot"
 * useDocumentTitle('Meus Blogs')
 *
 * @example
 * // Results in: "Custom Title"
 * useDocumentTitle('Custom Title', { suffix: false })
 */
export function useDocumentTitle(
  title: string,
  options: { suffix?: boolean } = {}
) {
  const { suffix = true } = options

  useEffect(() => {
    const previousTitle = document.title
    document.title = suffix ? `${title} | ${APP_NAME}` : title

    return () => {
      document.title = previousTitle
    }
  }, [title, suffix])
}
