import { useState } from 'react'
import {
  ExternalLink,
  Calendar,
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react'
import { Modal, Button } from '@/shared/components'
import styles from './AdDetailsModal.module.css'
import type { GoogleAd, AdVariation } from '../../types'

interface AdDetailsModalProps {
  ad: GoogleAd | null
  isOpen: boolean
  onClose: () => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function extractImageUrl(variation: AdVariation, previewUrl: string | null): string | null {
  if (variation?.imageUrl) return variation.imageUrl
  if (previewUrl) return previewUrl
  return null
}

export function AdDetailsModal({ ad, isOpen, onClose }: AdDetailsModalProps) {
  const [currentVariationIndex, setCurrentVariationIndex] = useState(0)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [imageError, setImageError] = useState(false)

  if (!ad) return null

  const variations = ad.variations || []
  const currentVariation = variations[currentVariationIndex] || {}
  const hasMultipleVariations = variations.length > 1
  const imageUrl = extractImageUrl(currentVariation, ad.previewUrl)

  const handlePrevVariation = () => {
    setCurrentVariationIndex((prev) =>
      prev === 0 ? variations.length - 1 : prev - 1
    )
    setImageError(false)
  }

  const handleNextVariation = () => {
    setCurrentVariationIndex((prev) =>
      prev === variations.length - 1 ? 0 : prev + 1
    )
    setImageError(false)
  }

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const destinationUrl = currentVariation.clickUrl || ad.startUrl || currentVariation.displayUrl

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Anúncio" size="lg">
      <div className={styles.content}>
        {/* Image Section */}
        {imageUrl && !imageError && (
          <div className={styles.imageSection}>
            <div className={styles.imageContainer}>
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
              <img
                src={imageUrl}
                alt={currentVariation.headline || 'Ad preview'}
                className={styles.image}
                onError={() => setImageError(true)}
              />

              {hasMultipleVariations && (
                <>
                  <button
                    className={`${styles.navButton} ${styles.navButtonLeft}`}
                    onClick={handlePrevVariation}
                    aria-label="Variação anterior"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    className={`${styles.navButton} ${styles.navButtonRight}`}
                    onClick={handleNextVariation}
                    aria-label="Próxima variação"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>

            {hasMultipleVariations && (
              <div className={styles.variationIndicators}>
                <span className={styles.variationCount}>
                  Variação {currentVariationIndex + 1} de {variations.length}
                </span>
                <div className={styles.dots}>
                  {variations.map((_, index) => (
                    <button
                      key={index}
                      className={`${styles.dot} ${
                        index === currentVariationIndex ? styles.dotActive : ''
                      }`}
                      onClick={() => {
                        setCurrentVariationIndex(index)
                        setImageError(false)
                      }}
                      aria-label={`Ir para variação ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ad Copy */}
        {(currentVariation.headline || currentVariation.description) && (
          <div className={styles.adCopy}>
            {currentVariation.headline && (
              <h3 className={styles.headline}>{currentVariation.headline}</h3>
            )}
            {currentVariation.description && (
              <p className={styles.description}>{currentVariation.description}</p>
            )}
          </div>
        )}

        {/* Info Grid */}
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>
              <Building2 size={16} />
              <span>Anunciante</span>
            </div>
            <div className={styles.infoValue}>{ad.advertiserName}</div>
            <div className={styles.infoSubvalue}>ID: {ad.advertiserId}</div>
          </div>

          <div className={styles.infoItem}>
            <div className={styles.infoLabel}>
              <span>Formato</span>
            </div>
            <div className={styles.infoValue}>
              <span className={styles.formatBadge} data-format={ad.format}>
                {ad.format}
              </span>
            </div>
          </div>

          {ad.creativeRegions && ad.creativeRegions.length > 0 && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>
                <MapPin size={16} />
                <span>Regiões</span>
              </div>
              <div className={styles.regionTags}>
                {ad.creativeRegions.map((region) => (
                  <span key={region} className={styles.regionTag}>
                    {region}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ad.lastShown && (
            <div className={styles.infoItem}>
              <div className={styles.infoLabel}>
                <Calendar size={16} />
                <span>Última exibição</span>
              </div>
              <div className={styles.infoValue}>{formatDate(ad.lastShown)}</div>
            </div>
          )}
        </div>

        {/* Destination URL */}
        {destinationUrl && (
          <div className={styles.urlSection}>
            <div className={styles.urlLabel}>URL de Destino</div>
            <div className={styles.urlContainer}>
              <a
                href={destinationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.url}
              >
                <ExternalLink size={14} />
                <span>{destinationUrl}</span>
              </a>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyUrl(destinationUrl)}
                className={styles.copyButton}
              >
                {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
              </Button>
            </div>
          </div>
        )}

        {/* Creative ID */}
        <div className={styles.creativeId}>
          <span>Creative ID: {ad.creativeId}</span>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {destinationUrl && (
            <a
              href={destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.visitButton}
            >
              <Button>
                <ExternalLink size={16} />
                Visitar página
              </Button>
            </a>
          )}
        </div>
      </div>
    </Modal>
  )
}
