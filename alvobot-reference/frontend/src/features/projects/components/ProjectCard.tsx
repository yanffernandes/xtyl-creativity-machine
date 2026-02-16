import { useState, useEffect } from 'react'
import { Calendar, BarChart3, ExternalLink, Layers, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, MaskedValue } from '@/shared/components'
import { usePrivacyStore } from '@/shared/stores/privacyStore'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'
import { PageSpeedScoreCompact } from './PageSpeedScoreBadge'
import styles from './ProjectCard.module.css'
import type { Project } from '../types'

interface ProjectCardProps {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  articleCount?: number
  lastArticleDate?: string
}

type AdSenseStatus = 'approved' | 'preparing' | 'analyzing' | 'rejected' | 'undefined'

function getAdSenseStatus(project: Project): AdSenseStatus {
  if (project.is_approved_on_adsense) return 'approved'
  if (project.adsense_status === 'approved') return 'approved'
  if (project.adsense_status === 'preparing') return 'preparing'
  if (project.adsense_status === 'analyzing') return 'analyzing'
  if (project.adsense_status === 'rejected') return 'rejected'
  return 'undefined'
}

const adSenseConfig: Record<AdSenseStatus, { label: string; className: string }> = {
  approved: { label: 'Aprovado', className: styles.adsenseApproved },
  preparing: { label: 'Preparando', className: styles.adsensePreparing },
  analyzing: { label: 'Em análise', className: styles.adsenseAnalyzing },
  rejected: { label: 'Rejeitado', className: styles.adsenseRejected },
  undefined: { label: 'Não definido', className: styles.adsenseUndefined },
}

function getFaviconUrl(domain: string | undefined): string | null {
  if (!domain) return null
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`
}

export function ProjectCard({ project, onEdit, articleCount = 0, lastArticleDate }: ProjectCardProps) {
  const navigate = useNavigate()
  const [faviconError, setFaviconError] = useState(false)
  const [faviconLoaded, setFaviconLoaded] = useState(false)
  const isPrivacyMode = usePrivacyStore((state) => state.isPrivacyMode)

  const faviconUrl = getFaviconUrl(project.domain)
  const adSenseStatus = getAdSenseStatus(project)
  const adSense = adSenseConfig[adSenseStatus]

  useEffect(() => {
    setFaviconError(false)
    setFaviconLoaded(false)
  }, [project.domain])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  const getDomainDisplay = (domain: string | undefined) => {
    if (!domain) return null
    return domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }

  return (
    <Card className={styles.card}>
      {/* Connection status badge in top right corner */}
      <div className={styles.statusBadge}>
        <ConnectionStatusBadge
          status={project.connection_status || (project.status ? 'connected' : 'not_configured')}
          errorMessage={project.connection_error_message}
        />
      </div>

      {/* Header with favicon and title */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          {faviconUrl && !faviconError ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
              <img
                src={faviconUrl}
                alt=""
                className={`${styles.favicon} ${faviconLoaded ? styles.loaded : ''}`}
                onError={() => setFaviconError(true)}
                onLoad={() => setFaviconLoaded(true)}
              />
            </>
          ) : (
            <div className={styles.faviconPlaceholder}>
              {project.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className={styles.name}>
            <MaskedValue value={project.name} type="partial" visibleStart={3} />
          </h3>
        </div>
      </div>

      {/* Domain with external link */}
      {project.domain && (
        isPrivacyMode ? (
          <span className={styles.domain}>
            <MaskedValue value={getDomainDisplay(project.domain)} type="url" />
          </span>
        ) : (
          <a
            href={project.domain.startsWith('http') ? project.domain : `https://${project.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.domain}
          >
            <MaskedValue value={getDomainDisplay(project.domain)} type="url" />
            <ExternalLink size={12} />
          </a>
        )
      )}

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <BarChart3 size={14} />
          <span>{project.articles_count || articleCount || 0} Artigos publicados</span>
        </div>
        <div className={styles.statItem}>
          <Calendar size={14} />
          <span>Projeto iniciado em {formatDate(project.created_at)}</span>
        </div>
        {lastArticleDate || project.last_sync_at ? (
          <div className={styles.statItem}>
            <Calendar size={14} />
            <span>Último artigo em {formatDate(lastArticleDate || project.last_sync_at!)}</span>
          </div>
        ) : (
          <div className={styles.statItem}>
            <Calendar size={14} />
            <span>Nenhum artigo criado ainda.</span>
          </div>
        )}
      </div>

      {/* Badges: AdSense + Niche + PageSpeed */}
      <div className={styles.badges}>
        <span className={`${styles.adsenseBadge} ${adSense.className}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          {adSense.label}
        </span>
        {project.niche_selected && (
          <span className={styles.nicheBadge}>
            <MaskedValue value={project.niche_selected} type="partial" visibleStart={4} />
          </span>
        )}
        {(project.pagespeed_mobile_score !== null || project.pagespeed_desktop_score !== null) && (
          <PageSpeedScoreCompact
            mobileScore={project.pagespeed_mobile_score}
            desktopScore={project.pagespeed_desktop_score}
            size="sm"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="sm"
          className={styles.primaryAction}
          onClick={() => navigate(`/base-structure?project=${project.id}`)}
          leftIcon={<Layers size={16} />}
        >
          Estrutura de Base
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={styles.secondaryAction}
          onClick={() => onEdit(project)}
          leftIcon={<Settings size={16} />}
        >
          Gerenciar Projeto
        </Button>
      </div>
    </Card>
  )
}
