import { useState } from 'react'
import { ArrowUpRight, ExternalLink, MoreVertical, RefreshCw } from 'lucide-react'
import { Checkbox, Spinner, Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from '@/shared/components'
import styles from './IndexingTable.module.css'
import { mapVerdictToStatus } from '../../utils/statusMapping'
import { StatusBadge } from '../StatusBadge/StatusBadge'
import type { SitemapUrl } from '../../types'

interface ActionState {
  disabled?: boolean
  reason?: string
}

interface Props {
  urls: SitemapUrl[]
  isLoading?: boolean
  selectedIds: string[]
  onToggleSelection: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onInspectUrl?: (url: SitemapUrl) => void
  onIndexUrl?: (url: SitemapUrl) => void
  getInspectState?: (url: SitemapUrl) => ActionState
  getIndexState?: (url: SitemapUrl) => ActionState
  isInspecting?: boolean
  isIndexing?: boolean
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function IndexingTable({
  urls,
  isLoading,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onInspectUrl,
  onIndexUrl,
  getInspectState,
  getIndexState,
  isInspecting,
  isIndexing,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const allIds = urls.map((url) => url.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))

  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeader className={styles.checkboxCell}>
            <Checkbox
              checked={allSelected}
              onChange={() => onSelectAll(allSelected ? [] : allIds)}
            />
          </TableHeader>
          <TableHeader>URL</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Último envio</TableHeader>
          <TableHeader>Indexado em</TableHeader>
          <TableHeader>Verificado em</TableHeader>
          <TableHeader />
        </tr>
      </TableHead>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={7} className={styles.loadingCell}>
              <Spinner size="sm" />
              <span>Carregando URLs...</span>
            </TableCell>
          </TableRow>
        ) : urls.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className={styles.emptyCell}>
              Nenhuma URL encontrada.
            </TableCell>
          </TableRow>
        ) : (
          urls.map((url) => {
            const status = mapVerdictToStatus(url.verdict)
            const inspectState = getInspectState?.(url)
            const indexState = getIndexState?.(url)
            return (
              <TableRow key={url.id}>
                <TableCell className={styles.checkboxCell}>
                  <Checkbox
                    checked={selectedIds.includes(url.id)}
                    onChange={() => onToggleSelection(url.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className={styles.urlCell}>
                    <span className={styles.path}>{url.url}</span>
                    <a href={url.url} target="_blank" rel="noreferrer" className={styles.fullUrl}>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </TableCell>
                <TableCell><StatusBadge status={status} /></TableCell>
                <TableCell>{formatDate(url.last_submitted_at)}</TableCell>
                <TableCell
                  title={
                    url.last_inspected_at
                      ? `Última verificação: ${formatDate(url.last_inspected_at)}`
                      : undefined
                  }
                >
                  {formatDate(url.indexed_at)}
                </TableCell>
                <TableCell>{formatDate(url.last_inspected_at)}</TableCell>
                <TableCell className={styles.actionsCell}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setOpenMenuId(openMenuId === url.id ? null : url.id)}
                    aria-label="Abrir menu de ações"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === url.id && (
                    <>
                      <button
                        type="button"
                        className={styles.menuOverlay}
                        onClick={() => setOpenMenuId(null)}
                        aria-label="Fechar menu"
                      />
                      <div className={styles.actionMenu}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null)
                            onInspectUrl?.(url)
                          }}
                          disabled={inspectState?.disabled || !onInspectUrl || isInspecting}
                          title={inspectState?.reason || 'Verificar status'}
                        >
                          <RefreshCw size={14} />
                          Verificar status
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null)
                            onIndexUrl?.(url)
                          }}
                          disabled={indexState?.disabled || !onIndexUrl || isIndexing}
                          title={indexState?.reason || 'Solicitar indexação'}
                        >
                          <ArrowUpRight size={14} />
                          Solicitar indexação
                        </button>
                      </div>
                    </>
                  )}
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
