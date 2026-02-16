import { useState } from 'react'
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { Modal, Button, Input, Alert, Spinner } from '@/shared/components'
import styles from './AdvertiserManager.module.css'
import { useAddAdvertiser, useToggleAdvertiser, useDeleteAdvertiser } from '../../api/mutations'
import { useGoogleAdsAdvertisers } from '../../api/queries'
import type { GoogleAdsAdvertiser } from '../../types'

interface AdvertiserManagerProps {
  isOpen: boolean
  onClose: () => void
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Nunca'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdvertiserManager({ isOpen, onClose }: AdvertiserManagerProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newAdvertiserId, setNewAdvertiserId] = useState('')
  const [newAdvertiserName, setNewAdvertiserName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<GoogleAdsAdvertiser | null>(null)

  const { data: advertisers, isLoading, error } = useGoogleAdsAdvertisers()
  const addMutation = useAddAdvertiser()
  const toggleMutation = useToggleAdvertiser()
  const deleteMutation = useDeleteAdvertiser()

  const handleAddAdvertiser = async () => {
    if (!newAdvertiserId.trim() || !newAdvertiserName.trim()) return

    try {
      await addMutation.mutateAsync({
        advertiserId: newAdvertiserId.trim(),
        advertiserName: newAdvertiserName.trim(),
      })
      setNewAdvertiserId('')
      setNewAdvertiserName('')
      setIsAddModalOpen(false)
    } catch (error) {
      console.error('Failed to add advertiser:', error)
    }
  }

  const handleToggleAdvertiser = async (advertiser: GoogleAdsAdvertiser) => {
    try {
      await toggleMutation.mutateAsync({
        advertiserId: advertiser.advertiserId,
        active: !advertiser.active,
      })
    } catch (error) {
      console.error('Failed to toggle advertiser:', error)
    }
  }

  const handleDeleteAdvertiser = async () => {
    if (!deleteConfirm) return

    try {
      await deleteMutation.mutateAsync(deleteConfirm.advertiserId)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Failed to delete advertiser:', error)
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gerenciar Anunciantes" size="lg">
        <div className={styles.content}>
          {error && (
            <Alert variant="error">
              Erro ao carregar anunciantes: {error.message}
            </Alert>
          )}

          <div className={styles.header}>
            <p className={styles.description}>
              Gerencie os anunciantes monitorados pelo sistema. Adicione novos anunciantes
              pelo ID do Google Ads Transparency.
            </p>
            <Button
              leftIcon={<Plus size={16} />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Adicionar Anunciante
            </Button>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <Spinner size="lg" />
            </div>
          ) : advertisers && advertisers.length > 0 ? (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>ID</th>
                    <th>Anúncios Est.</th>
                    <th>Última Coleta</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {advertisers.map((advertiser) => (
                    <tr key={advertiser.advertiserId}>
                      <td className={styles.name}>{advertiser.advertiserName}</td>
                      <td className={styles.id}>{advertiser.advertiserId}</td>
                      <td>{advertiser.estimatedAds || '-'}</td>
                      <td>{formatDate(advertiser.last_scraped_at)}</td>
                      <td>
                        <span
                          className={`${styles.status} ${
                            advertiser.active ? styles.statusActive : styles.statusInactive
                          }`}
                        >
                          {advertiser.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            className={styles.actionButton}
                            onClick={() => handleToggleAdvertiser(advertiser)}
                            disabled={toggleMutation.isPending}
                            title={advertiser.active ? 'Desativar' : 'Ativar'}
                          >
                            {toggleMutation.isPending ? (
                              <Loader2 size={16} className={styles.spinning} />
                            ) : advertiser.active ? (
                              <ToggleRight size={16} />
                            ) : (
                              <ToggleLeft size={16} />
                            )}
                          </button>
                          <button
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={() => setDeleteConfirm(advertiser)}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.empty}>
              <p>Nenhum anunciante cadastrado.</p>
              <p className={styles.emptyHint}>
                Adicione anunciantes para começar a monitorar seus anúncios.
              </p>
            </div>
          )}

          <div className={styles.footer}>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Advertiser Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Adicionar Anunciante"
        size="sm"
      >
        <div className={styles.addForm}>
          <Input
            label="ID do Anunciante"
            placeholder="Ex: AR12345678901234567"
            value={newAdvertiserId}
            onChange={(e) => setNewAdvertiserId(e.target.value)}
            fullWidth
          />
          <Input
            label="Nome do Anunciante"
            placeholder="Ex: Empresa XYZ"
            value={newAdvertiserName}
            onChange={(e) => setNewAdvertiserName(e.target.value)}
            fullWidth
          />
          <p className={styles.hint}>
            O ID do anunciante pode ser encontrado na URL do Google Ads Transparency Center.
          </p>

          <div className={styles.footer}>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddAdvertiser}
              disabled={!newAdvertiserId.trim() || !newAdvertiserName.trim()}
              isLoading={addMutation.isPending}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Excluir Anunciante"
        size="sm"
      >
        <div className={styles.deleteContent}>
          <p className={styles.deleteMessage}>
            Tem certeza que deseja excluir o anunciante{' '}
            <strong>{deleteConfirm?.advertiserName}</strong>?
          </p>
          <p className={styles.deleteWarning}>
            Esta ação não pode ser desfeita. Os anúncios coletados não serão removidos.
          </p>

          <div className={styles.footer}>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAdvertiser}
              isLoading={deleteMutation.isPending}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
