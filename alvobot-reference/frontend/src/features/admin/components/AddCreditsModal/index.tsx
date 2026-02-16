// AddCreditsModal - T018, T020, T058-T064
import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Button, Modal, Alert, Spinner } from '@/shared/components'
import { queryKeys } from '@/shared/utils/queryKeys'
import styles from './AddCreditsModal.module.css'
import { useAddCredits, useLogAdminAction  } from '../../api/mutations'
import { useSearchUsers } from '../../api/queries'
import type { AdminUser } from '../../types'

interface AddCreditsModalProps {
  isOpen: boolean
  onClose: () => void
  user?: AdminUser | null
  preselectedUserId?: string
  preselectedUserEmail?: string
  onSuccess?: () => void
}

interface SelectedUser {
  id: string
  email: string
  full_name?: string | null
}

export function AddCreditsModal({
  isOpen,
  onClose,
  user,
  preselectedUserId,
  preselectedUserEmail,
  onSuccess
}: AddCreditsModalProps) {
  const queryClient = useQueryClient()
  const addCredits = useAddCredits()
  const logAction = useLogAdminAction()

  // User selection state
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  // Search query
  const { data: searchResults, isLoading: isSearching } = useSearchUsers(searchQuery)

  // Form state
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [hasExpiration, setHasExpiration] = useState(false)
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')

  // Initialize selected user from props
  useEffect(() => {
    if (user) {
      setSelectedUser({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
      })
      setShowSearch(false)
    } else if (preselectedUserId && preselectedUserEmail) {
      setSelectedUser({
        id: preselectedUserId,
        email: preselectedUserEmail,
      })
      setShowSearch(false)
    } else {
      setSelectedUser(null)
      setShowSearch(true)
    }
  }, [user, preselectedUserId, preselectedUserEmail, isOpen])

  // Reset form
  const resetForm = () => {
    setAmount('')
    setDescription('')
    setHasExpiration(false)
    setExpiresAt('')
    setError('')
    setSearchQuery('')
    if (!user && !preselectedUserId) {
      setSelectedUser(null)
      setShowSearch(true)
    }
  }

  // Handle close
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Handle user selection from search
  const handleSelectUser = (u: { id: string; email: string; full_name?: string | null }) => {
    setSelectedUser(u)
    setShowSearch(false)
    setSearchQuery('')
  }

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedUser) {
      setError('Selecione um usuario')
      return
    }

    // Validation
    const amountNum = parseInt(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Quantidade deve ser um numero positivo')
      return
    }

    if (!description.trim()) {
      setError('Descricao e obrigatoria')
      return
    }

    if (hasExpiration && !expiresAt) {
      setError('Selecione uma data de expiracao')
      return
    }

    setError('')

    try {
      await addCredits.mutateAsync({
        user_id: selectedUser.id,
        amount: amountNum,
        description: description.trim(),
        expires_at: hasExpiration ? new Date(expiresAt).toISOString() : null,
      })

      // Log admin action
      await logAction.mutateAsync({
        action: 'credits_add',
        resource_type: 'credits',
        resource_id: selectedUser.id,
        details: {
          amount: amountNum,
          description: description.trim(),
          expires_at: hasExpiration ? expiresAt : null,
          user_email: selectedUser.email,
        },
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.all })

      handleClose()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar creditos')
    }
  }

  // Calculate expiration date suggestion (30 days from now)
  const getDefaultExpirationDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 30)
    return date.toISOString().split('T')[0]
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Adicionar Creditos Extras">
      <div className={styles.modalContent}>
        {/* User Selection / Info */}
        {showSearch ? (
          <div className={styles.formGroup}>
            <label htmlFor="user-search">Selecionar Usuario *</label>
            <div className={styles.searchWrapper}>
              <Search size={16} className={styles.searchIcon} />
              <input
                id="user-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por email ou nome..."
                className={styles.searchInput}
              />
            </div>
            {isSearching && (
              <div className={styles.searchLoading}>
                <Spinner size="sm" />
              </div>
            )}
            {searchResults && searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className={styles.searchResultItem}
                    onClick={() => handleSelectUser(u)}
                  >
                    <div className={styles.userAvatar}>
                      {u.full_name?.charAt(0) || u.email.charAt(0)}
                    </div>
                    <div className={styles.userDetails}>
                      <span className={styles.userName}>{u.full_name || 'Sem nome'}</span>
                      <span className={styles.userEmail}>{u.email}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.length >= 2 && !isSearching && (!searchResults || searchResults.length === 0) && (
              <div className={styles.noResults}>Nenhum usuario encontrado</div>
            )}
          </div>
        ) : selectedUser ? (
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {selectedUser.full_name?.charAt(0) || selectedUser.email.charAt(0)}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{selectedUser.full_name || 'Sem nome'}</span>
              <span className={styles.userEmail}>{selectedUser.email}</span>
            </div>
            {!user && (
              <button
                type="button"
                className={styles.changeUserBtn}
                onClick={() => setShowSearch(true)}
              >
                Alterar
              </button>
            )}
          </div>
        ) : null}

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {/* Amount */}
        <div className={styles.formGroup}>
          <label htmlFor="credits-amount">Quantidade de Creditos *</label>
          <input
            id="credits-amount"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ex: 100"
            className={styles.input}
          />
          <span className={styles.helpText}>
            Numero de creditos extras a adicionar
          </span>
        </div>

        {/* Description */}
        <div className={styles.formGroup}>
          <label htmlFor="credits-description">Motivo / Descricao *</label>
          <textarea
            id="credits-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Cortesia suporte, Compensacao por problemas, Pacote promocional..."
            className={`${styles.input} ${styles.textarea}`}
          />
          <span className={styles.helpText}>
            Sera exibido no historico de transacoes do usuario
          </span>
        </div>

        {/* Expiration */}
        <div className={styles.formGroup}>
          <div className={styles.checkboxGroup}>
            <input
              type="checkbox"
              id="hasExpiration"
              checked={hasExpiration}
              onChange={(e) => {
                setHasExpiration(e.target.checked)
                if (e.target.checked && !expiresAt) {
                  setExpiresAt(getDefaultExpirationDate())
                }
              }}
            />
            <label htmlFor="hasExpiration">
              Definir data de expiracao
            </label>
          </div>
          <span className={styles.helpText}>
            Creditos sem expiracao sao permanentes ate serem consumidos
          </span>
        </div>

        {hasExpiration && (
          <div className={styles.formGroup}>
            <label htmlFor="credits-expires-at">Data de Expiracao</label>
            <input
              id="credits-expires-at"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={styles.input}
            />
          </div>
        )}

        {/* Preview */}
        {amount && parseInt(amount) > 0 && (
          <div className={styles.previewSection}>
            <div className={styles.previewTitle}>Resumo</div>
            <div className={styles.previewRow}>
              <span className={styles.previewLabel}>Creditos a adicionar:</span>
              <span className={`${styles.previewValue} ${styles.highlight}`}>+{amount}</span>
            </div>
            <div className={styles.previewRow}>
              <span className={styles.previewLabel}>Expiracao:</span>
              <span className={styles.previewValue}>
                {hasExpiration && expiresAt
                  ? new Date(expiresAt).toLocaleDateString('pt-BR')
                  : 'Sem expiracao (permanente)'}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={styles.modalActions}>
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            isLoading={addCredits.isPending}
            disabled={!selectedUser || !amount || !description.trim()}
          >
            Adicionar Creditos
          </Button>
        </div>
      </div>
    </Modal>
  )
}
