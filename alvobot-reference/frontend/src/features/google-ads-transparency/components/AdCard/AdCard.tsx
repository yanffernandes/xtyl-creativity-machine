import { useState } from 'react'
import { ExternalLink, Calendar, MapPin, FileText, Image, Video } from 'lucide-react'
import styles from './AdCard.module.css'
import type { GoogleAd, AdVariation } from '../../types'

interface AdCardProps {
  ad: GoogleAd
  onClick: () => void
}

const formatIcons = {
  TEXT: FileText,
  IMAGE: Image,
  VIDEO: Video,
}

function extractFirstVariation(variations: AdVariation[]): AdVariation | null {
  if (!variations || variations.length === 0) return null
  return variations[0]
}

function extractImageUrl(ad: GoogleAd): string | null {
  // Try previewUrl first
  if (ad.previewUrl) return ad.previewUrl

  // Try to find image in variations
  const variation = extractFirstVariation(ad.variations)
  if (variation?.imageUrl) return variation.imageUrl

  return null
}

function extractHeadline(ad: GoogleAd): string | null {
  const variation = extractFirstVariation(ad.variations)
  return variation?.headline || null
}

function extractDescription(ad: GoogleAd): string | null {
  const variation = extractFirstVariation(ad.variations)
  return variation?.description || null
}

function extractDestinationUrl(ad: GoogleAd): string | null {
  if (ad.startUrl) return ad.startUrl

  const variation = extractFirstVariation(ad.variations)
  if (variation?.clickUrl) return variation.clickUrl
  if (variation?.displayUrl) return variation.displayUrl

  return null
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function truncateUrl(url: string, maxLength = 30): string {
  try {
    const parsed = new URL(url)
    const domain = parsed.hostname.replace('www.', '')
    if (domain.length > maxLength) {
      return `${domain.substring(0, maxLength)  }...`
    }
    return domain
  } catch {
    return url.length > maxLength ? `${url.substring(0, maxLength)  }...` : url
  }
}

export function AdCard({ ad, onClick }: AdCardProps) {
  const [imageError, setImageError] = useState(false)

  const imageUrl = extractImageUrl(ad)
  const headline = extractHeadline(ad)
  const description = extractDescription(ad)
  const destinationUrl = extractDestinationUrl(ad)
  const FormatIcon = formatIcons[ad.format] || FileText

  const hasImage = imageUrl && !imageError
  const regions = ad.creativeRegions?.slice(0, 3) || []

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      {/* Format Badge */}
      <div className={styles.formatBadge} data-format={ad.format}>
        <FormatIcon size={12} />
        <span>{ad.format}</span>
      </div>

      {/* Image */}
      {hasImage && (
        <div className={styles.imageContainer}>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <img
            src={imageUrl}
            alt={headline || 'Ad preview'}
            className={styles.image}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {/* Content */}
      <div className={styles.content}>
        {headline && <h3 className={styles.headline}>{headline}</h3>}

        {description && (
          <p className={styles.description}>{description}</p>
        )}

        {/* Regions */}
        {regions.length > 0 && (
          <div className={styles.regions}>
            <MapPin size={14} />
            <div className={styles.regionTags}>
              {regions.map((region) => (
                <span key={region} className={styles.regionTag}>
                  {region}
                </span>
              ))}
              {ad.creativeRegions && ad.creativeRegions.length > 3 && (
                <span className={styles.regionTag}>
                  +{ad.creativeRegions.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          {destinationUrl && (
            <a
              href={destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.url}
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              <span>{truncateUrl(destinationUrl)}</span>
            </a>
          )}

          {ad.lastShown && (
            <div className={styles.date}>
              <Calendar size={12} />
              <span>{formatDate(ad.lastShown)}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
