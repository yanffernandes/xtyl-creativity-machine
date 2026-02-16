import { usePrivacyStore } from '@/shared/stores/privacyStore'
import styles from './MaskedValue.module.css'

export type MaskType = 'full' | 'partial' | 'url' | 'email' | 'number'

export interface MaskedValueProps {
  /** The value to display/mask */
  value: string | number | null | undefined
  /** Type of masking to apply */
  type?: MaskType
  /** Custom className */
  className?: string
  /** Number of visible characters at start (for partial mask) */
  visibleStart?: number
  /** Number of visible characters at end (for partial mask) */
  visibleEnd?: number
  /** Fallback text when value is null/undefined */
  fallback?: string
}

/**
 * Masks a value based on the mask type
 */
function maskValue(
  value: string,
  type: MaskType,
  visibleStart: number,
  visibleEnd: number
): string {
  if (!value) return '•••••'

  switch (type) {
    case 'full':
      // Replace all characters with dots
      return '•'.repeat(Math.min(value.length, 12))

    case 'partial':
      // Show first N and last M characters
      if (value.length <= visibleStart + visibleEnd + 2) {
        return '•'.repeat(value.length)
      }
      const start = value.slice(0, visibleStart)
      const end = visibleEnd > 0 ? value.slice(-visibleEnd) : ''
      const middleLength = Math.min(value.length - visibleStart - visibleEnd, 8)
      return `${start}${'•'.repeat(middleLength)}${end}`

    case 'url':
      // Mask domain but show protocol
      try {
        const url = new URL(value.startsWith('http') ? value : `https://${value}`)
        const domainParts = url.hostname.split('.')
        const maskedDomain = domainParts
          .map((part, i) => {
            // Keep TLD visible (.com, .br, etc)
            if (i === domainParts.length - 1) return part
            // Mask other parts
            return '•'.repeat(Math.min(part.length, 6))
          })
          .join('.')
        return maskedDomain
      } catch {
        // Fallback for invalid URLs
        return '•'.repeat(Math.min(value.length, 12))
      }

    case 'email':
      // Show first 2 chars of email, mask rest before @
      const atIndex = value.indexOf('@')
      if (atIndex <= 2) return '••••@••••'
      const emailStart = value.slice(0, 2)
      const domain = value.slice(atIndex)
      return `${emailStart}${'•'.repeat(Math.min(atIndex - 2, 6))}${domain}`

    case 'number':
      // For numbers, just show dots
      return '•••'

    default:
      return '•'.repeat(Math.min(value.length, 12))
  }
}

/**
 * MaskedValue component - displays values that can be hidden for privacy
 *
 * Uses the global privacy store to determine if values should be masked.
 * Useful for protecting sensitive information during screen sharing.
 *
 * @example
 * // Full mask (all characters hidden)
 * <MaskedValue value="meu-blog.com.br" type="full" />
 *
 * // Partial mask (show first 3, hide rest)
 * <MaskedValue value="Título do Artigo" type="partial" visibleStart={3} />
 *
 * // URL mask (hides domain, keeps TLD)
 * <MaskedValue value="https://meu-blog.com.br" type="url" />
 */
export function MaskedValue({
  value,
  type = 'full',
  className,
  visibleStart = 3,
  visibleEnd = 0,
  fallback = '-',
}: MaskedValueProps) {
  const isPrivacyMode = usePrivacyStore((state) => state.isPrivacyMode)

  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return <span className={className}>{fallback}</span>
  }

  const stringValue = String(value)

  // If privacy mode is off, show the real value
  if (!isPrivacyMode) {
    return <span className={className}>{stringValue}</span>
  }

  // Apply masking
  const maskedValue = maskValue(stringValue, type, visibleStart, visibleEnd)

  return (
    <span className={`${styles.masked} ${className || ''}`} title="Valor oculto">
      {maskedValue}
    </span>
  )
}

/**
 * Hook to get masked value programmatically
 */
export function useMaskedValue() {
  const isPrivacyMode = usePrivacyStore((state) => state.isPrivacyMode)

  return {
    isPrivacyMode,
    mask: (
      value: string | number | null | undefined,
      type: MaskType = 'full',
      visibleStart = 3,
      visibleEnd = 0
    ) => {
      if (value === null || value === undefined || value === '') return '-'
      if (!isPrivacyMode) return String(value)
      return maskValue(String(value), type, visibleStart, visibleEnd)
    },
  }
}
