import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  Image,
  Video,
  FileText,
  Monitor,
  AlertTriangle,
} from 'lucide-react'
import { Modal, Button } from '@/shared/components'
import { supabase } from '@/shared/utils/supabase'
import styles from './BugReportDetailModal.module.css'
import { useUpdateBugReportStatus, useSendToClickUp } from '../../api'
import type { BugReportWithAttachments, BugStatus } from '../../types'

interface BugReportDetailModalProps {
  report: BugReportWithAttachments | null
  isOpen: boolean
  onClose: () => void
}

const statusLabels: Record<BugStatus, string> = {
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

function getAttachmentUrl(storagePath: string): string {
  const { data } = supabase.storage.from('bug-reports').getPublicUrl(storagePath)
  return data.publicUrl
}

export function BugReportDetailModal({ report, isOpen, onClose }: BugReportDetailModalProps) {
  const updateStatus = useUpdateBugReportStatus()
  const sendToClickUp = useSendToClickUp()

  if (!report) return null

  const attachments = report.bug_report_attachments || []
  const screenshots = attachments.filter((a) => a.attachment_type === 'screenshot')
  const videos = attachments.filter((a) => a.attachment_type === 'video')
  const files = attachments.filter((a) => a.attachment_type === 'file')

  const handleStatusChange = async (newStatus: BugStatus) => {
    await updateStatus.mutateAsync({ id: report.id, status: newStatus })
  }

  const handleSendToClickUp = async () => {
    await sendToClickUp.mutateAsync(report.id)
  }

  const createdAt = new Date(report.created_at)
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true, locale: ptBR })
  const formattedDate = format(createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={report.title} size="lg">
      <div className={styles.modalContent}>
        {/* Header badges and meta */}
        <div className={styles.headerMeta}>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${getSeverityClass(report.severity)}`}>
              {severityLabels[report.severity]}
            </span>
            <span className={`${styles.badge} ${getStatusClass(report.status)}`}>
              {statusLabels[report.status]}
            </span>
          </div>
          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <Calendar size={14} />
              {formattedDate}
            </span>
            <span className={styles.metaItem}>
              <Clock size={14} />
              {timeAgo}
            </span>
            <span className={styles.metaItem}>
              {typeLabels[report.bug_type]}
            </span>
          </div>
        </div>

        {/* Body content */}
        <div className={styles.body}>
          {/* Description */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Descrição</h3>
            <p className={styles.description}>{report.description}</p>
          </div>

          {/* Page URL */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>URL da Página</h3>
            <div className={styles.pageUrl}>
              <Globe size={16} />
              <a href={report.page_url} target="_blank" rel="noopener noreferrer">
                {report.page_url}
              </a>
            </div>
          </div>

          {/* Screenshots */}
          {screenshots.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Image size={16} /> Screenshots ({screenshots.length})
              </h3>
              <div className={styles.attachmentsGrid}>
                {screenshots.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={getAttachmentUrl(attachment.storage_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachmentItem}
                  >
                    <img
                      src={getAttachmentUrl(attachment.storage_path)}
                      alt={attachment.original_name}
                      className={styles.attachmentImage}
                    />
                    {attachment.is_primary_screenshot && (
                      <span className={styles.attachmentBadge}>
                        <Image size={10} /> Principal
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {videos.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <Video size={16} /> Vídeos ({videos.length})
              </h3>
              <div className={styles.attachmentsGrid}>
                {videos.map((attachment) => (
                  <div key={attachment.id} className={styles.attachmentItem}>
                    <video
                      src={getAttachmentUrl(attachment.storage_path)}
                      controls
                      className={styles.attachmentVideo}
                    />
                    <span className={styles.attachmentBadge}>
                      <Video size={10} /> Vídeo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <FileText size={16} /> Arquivos ({files.length})
              </h3>
              <div className={styles.attachmentsGrid}>
                {files.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={getAttachmentUrl(attachment.storage_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.attachmentItem}
                  >
                    <div className={styles.attachmentFile}>
                      <FileText size={32} />
                      <span className={styles.attachmentFileName}>
                        {attachment.original_name}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Browser Info */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              <Monitor size={16} /> Informações do Navegador
            </h3>
            <div className={styles.browserInfo}>
              <div className={styles.browserInfoItem}>
                <span className={styles.browserInfoLabel}>User Agent</span>
                <span className={styles.browserInfoValue}>
                  {report.browser_info?.userAgent || 'N/A'}
                </span>
              </div>
              <div className={styles.browserInfoItem}>
                <span className={styles.browserInfoLabel}>Plataforma</span>
                <span className={styles.browserInfoValue}>
                  {report.browser_info?.platform || 'N/A'}
                </span>
              </div>
              <div className={styles.browserInfoItem}>
                <span className={styles.browserInfoLabel}>Resolução da Tela</span>
                <span className={styles.browserInfoValue}>
                  {report.browser_info?.screenWidth}x{report.browser_info?.screenHeight}
                </span>
              </div>
              <div className={styles.browserInfoItem}>
                <span className={styles.browserInfoLabel}>Viewport</span>
                <span className={styles.browserInfoValue}>
                  {report.browser_info?.viewportWidth}x{report.browser_info?.viewportHeight}
                </span>
              </div>
              <div className={styles.browserInfoItem}>
                <span className={styles.browserInfoLabel}>Idioma</span>
                <span className={styles.browserInfoValue}>
                  {report.browser_info?.language || 'N/A'}
                </span>
              </div>
              <div className={styles.browserInfoItem}>
                <span className={styles.browserInfoLabel}>Pixel Ratio</span>
                <span className={styles.browserInfoValue}>
                  {report.browser_info?.devicePixelRatio || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Console Errors */}
          {report.console_errors && report.console_errors.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                <AlertTriangle size={16} /> Erros do Console ({report.console_errors.length})
              </h3>
              <div className={styles.consoleErrors}>
                {report.console_errors.map((error, index) => (
                  <div key={index} className={styles.consoleError}>
                    <span className={styles.consoleErrorType}>{error.type}</span>
                    <code className={styles.consoleErrorMessage}>{error.message}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerInfo}>
            {report.clickup_sent_at && (
              <span className={styles.clickupBadge}>
                <ExternalLink size={12} />
                Enviado ao ClickUp em {format(new Date(report.clickup_sent_at), 'dd/MM/yyyy HH:mm')}
              </span>
            )}
          </div>
          <div className={styles.footerActions}>
            {!report.clickup_sent_at && (
              <Button
                variant="secondary"
                onClick={handleSendToClickUp}
                isLoading={sendToClickUp.isPending}
              >
                <ExternalLink size={16} />
                Enviar ao ClickUp
              </Button>
            )}
            {report.status === 'open' && (
              <Button
                variant="secondary"
                onClick={() => handleStatusChange('in_progress')}
                isLoading={updateStatus.isPending}
              >
                Marcar Em Andamento
              </Button>
            )}
            {report.status === 'in_progress' && (
              <Button
                variant="primary"
                onClick={() => handleStatusChange('resolved')}
                isLoading={updateStatus.isPending}
              >
                Marcar como Resolvido
              </Button>
            )}
            {report.status === 'resolved' && (
              <Button
                variant="secondary"
                onClick={() => handleStatusChange('closed')}
                isLoading={updateStatus.isPending}
              >
                Fechar Report
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
