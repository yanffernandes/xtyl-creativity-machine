import { useMemo, useState } from 'react'
import { RefreshCw, Plus, CheckCircle, AlertCircle } from 'lucide-react'
import { Button, Input, Modal, Spinner } from '@/shared/components'
import styles from './SitemapManager.module.css'
import { useCreateSitemap, useDeleteSitemap, useDetectSitemaps, useSitemaps, useSyncSitemap, useUpdateSitemap } from '../../api'
import type { Sitemap } from '../../types'

interface Props {
  projectId?: string | null
  connectionId?: string | null
  isOpen: boolean
  onClose: () => void
}

export function SitemapManager({ projectId, connectionId, isOpen, onClose }: Props) {
  const { data: sitemaps = [], isLoading } = useSitemaps(projectId)
  const detectMutation = useDetectSitemaps(projectId, connectionId)
  const createMutation = useCreateSitemap(projectId)
  const updateMutation = useUpdateSitemap()
  const deleteMutation = useDeleteSitemap()
  const syncMutation = useSyncSitemap()

  const [newUrl, setNewUrl] = useState('')

  const primarySitemap = useMemo(() => sitemaps.find((s) => s.is_primary), [sitemaps])

  const handleAdd = async () => {
    if (!newUrl.trim()) return
    await createMutation.mutateAsync({ url: newUrl.trim() })
    setNewUrl('')
  }

  const handleTogglePrimary = async (sitemap: Sitemap) => {
    await updateMutation.mutateAsync({ sitemapId: sitemap.id, isPrimary: true })
  }

  const handleToggleEnabled = async (sitemap: Sitemap) => {
    await updateMutation.mutateAsync({ sitemapId: sitemap.id, isEnabled: !sitemap.is_enabled })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sitemaps" size="lg">
      <div className={styles.container}>
        {!projectId && (
          <div className={styles.empty}>
            Selecione um projeto para gerenciar sitemaps.
          </div>
        )}
        {!!projectId && (
          <>
        <div className={styles.actions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => detectMutation.mutateAsync()}
            isLoading={detectMutation.isPending}
            leftIcon={<RefreshCw size={14} />}
          >
            Auto-detectar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!primarySitemap) return
              syncMutation.mutateAsync({ sitemapId: primarySitemap.id, connectionId: connectionId || undefined })
            }}
            isLoading={syncMutation.isPending}
            leftIcon={<RefreshCw size={14} />}
            disabled={!primarySitemap}
          >
            Sincronizar principal
          </Button>
        </div>

        <div className={styles.addForm}>
          <Input
            placeholder="https://seusite.com/sitemap.xml"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            fullWidth
          />
          <Button size="sm" onClick={handleAdd} leftIcon={<Plus size={14} />}>
            Adicionar
          </Button>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            <Spinner size="sm" />
            <span>Carregando sitemaps...</span>
          </div>
        ) : (
          <div className={styles.list}>
            {sitemaps.map((sitemap) => (
              <div key={sitemap.id} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemUrl}>{sitemap.url}</span>
                  <div className={styles.meta}>
                    <span>{sitemap.sitemap_type}</span>
                    <span>{sitemap.urls_count} URLs</span>
                    {sitemap.last_sync_error ? (
                      <span className={styles.error} title={sitemap.last_sync_error}><AlertCircle size={12} />Erro</span>
                    ) : sitemap.last_synced_at ? (
                      <span className={styles.ok}><CheckCircle size={12} />OK</span>
                    ) : (
                      <span className={styles.pending}>Não sincronizado</span>
                    )}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <Button
                    variant={sitemap.is_primary ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleTogglePrimary(sitemap)}
                  >
                    {sitemap.is_primary ? 'Principal' : 'Definir principal'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncMutation.mutateAsync({ sitemapId: sitemap.id, connectionId: connectionId || undefined })}
                    isLoading={syncMutation.isPending}
                  >
                    Sincronizar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleEnabled(sitemap)}
                  >
                    {sitemap.is_enabled ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutateAsync(sitemap.id)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
            {sitemaps.length === 0 && (
              <div className={styles.empty}>Nenhum sitemap cadastrado.</div>
            )}
          </div>
        )}
          </>
        )}
      </div>
    </Modal>
  )
}
