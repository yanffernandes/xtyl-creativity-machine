import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Image, Video, Paperclip, ExternalLink } from 'lucide-react'
import styles from './BugReportCard.module.css'
import type { BugReportWithAttachments } from '../../types'

interface BugReportCardProps {
  report: BugReportWithAttachments
  onClick: () => void
}

const statusLabels: Record<string, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

const severityLabels: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
}

const typeLabels: Record<string, string> = {
  visual: 'Visual',
  functional: 'Funcional',
  performance: 'Performance',
  other: 'Outro',
}

function getStatusClass(status: string): string {
  const classes: Record<string, string> = {
    open: styles.statusOpen,
    in_progress: styles.statusInProgress,
    resolved: styles.statusResolved,
    closed: styles.statusClosed,
  }
  return classes[status] || styles.statusOpen
}

function getSeverityClass(severity: string): string {
  const classes: Record<string, string> = {
    low: styles.severityLow,
    medium: styles.severityMedium,
    high: styles.severityHigh,
    critical: styles.severityCritical,
  }
  return classes[severity] || styles.severityMedium
}

export function BugReportCard({ report, onClick }: BugReportCardProps) {
  const attachments = report.bug_report_attachments || []
  const hasScreenshots = attachments.some((a) => a.attachment_type === 'screenshot')
  const hasVideos = attachments.some((a) => a.attachment_type === 'video')
  const fileCount = attachments.filter((a) => a.attachment_type === 'file').length

  const timeAgo = formatDistanceToNow(new Date(report.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  return (
    <button type="button" className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{report.title}</h3>
          <div className={styles.meta}>
            <span className={styles.date}>{timeAgo}</span>
            <span className={`${styles.badge}`}>{typeLabels[report.bug_type]}</span>
          </div>
        </div>
        <div className={styles.badges}>
          <span className={`${styles.badge} ${getSeverityClass(report.severity)}`}>
            {severityLabels[report.severity]}
          </span>
          <span className={`${styles.badge} ${getStatusClass(report.status)}`}>
            {statusLabels[report.status]}
          </span>
        </div>
      </div>

      <p className={styles.description}>{report.description}</p>

      <div className={styles.footer}>
        <div className={styles.footerInfo}>
          {hasScreenshots && (
            <span className={styles.infoItem} title="Contém screenshots">
              <Image size={14} />
            </span>
          )}
          {hasVideos && (
            <span className={styles.infoItem} title="Contém vídeos">
              <Video size={14} />
            </span>
          )}
          {fileCount > 0 && (
            <span className={styles.infoItem} title={`${fileCount} anexo(s)`}>
              <Paperclip size={14} />
              <span>{fileCount}</span>
            </span>
          )}
        </div>
        {report.clickup_sent_at && (
          <span className={`${styles.infoItem} ${styles.clickupSent}`} title="Enviado ao ClickUp">
            <ExternalLink size={14} />
            <span>ClickUp</span>
          </span>
        )}
      </div>
    </button>
  )
}
