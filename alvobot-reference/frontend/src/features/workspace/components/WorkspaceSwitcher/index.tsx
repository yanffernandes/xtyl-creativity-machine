import { useState, useRef, useEffect, useMemo } from 'react'
import { Building2, ChevronDown, Plus, Check, Settings, Search, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MaskedValue, Input, Modal, Button } from '@/shared/components'
import { useWorkspaceChangeGuard } from '@/shared/hooks/useWorkspaceChangeGuard'
import { useWorkspacesQuery } from '../../api/queries'
import { useWorkspaceStore, useWorkspaces } from '../../stores/workspaceStore'
import { CreateWorkspaceModal } from '../CreateWorkspaceModal'
import styles from './WorkspaceSwitcher.module.css'
import type { WorkspaceWithMembership } from '../../types'

interface WorkspaceSwitcherProps {
  compact?: boolean
}

export function WorkspaceSwitcher({ compact = false }: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    workspace: WorkspaceWithMembership | null
    messages: string[]
  }>({ isOpen: false, workspace: null, messages: [] })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace)
  const workspaces = useWorkspaces()
  const { requestWorkspaceChange, confirmWorkspaceChange } = useWorkspaceChangeGuard()

  // Filtered workspaces based on search
  const filteredWorkspaces = useMemo(() => {
    if (!searchQuery.trim()) return workspaces
    const query = searchQuery.toLowerCase()
    return workspaces.filter((ws) => ws.name.toLowerCase().includes(query))
  }, [workspaces, searchQuery])

  // Fetch workspaces
  useWorkspacesQuery()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current && workspaces.length > 5) {
      searchInputRef.current.focus()
    }
  }, [isOpen, workspaces.length])

  const handleSelectWorkspace = (workspace: WorkspaceWithMembership) => {
    const result = requestWorkspaceChange(workspace)

    if (result.needsConfirmation) {
      // Show confirmation modal - don't switch yet
      setConfirmModal({ isOpen: true, workspace, messages: result.messages })
      setIsOpen(false)
      setSearchQuery('')
      return
    }

    // Switched immediately (no dirty state)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleConfirmSwitch = () => {
    if (confirmModal.workspace) {
      confirmWorkspaceChange(confirmModal.workspace)
    }
    setConfirmModal({ isOpen: false, workspace: null, messages: [] })
  }

  const handleCancelSwitch = () => {
    setConfirmModal({ isOpen: false, workspace: null, messages: [] })
  }

  const handleCreateNew = () => {
    setIsOpen(false)
    setShowCreateModal(true)
  }

  const handleManageWorkspace = () => {
    setIsOpen(false)
    navigate('/settings/workspace')
  }

  const getRoleBadge = (role: string | undefined) => {
    if (!role) return null
    const roleLabels: Record<string, string> = {
      owner: 'Dono',
      admin: 'Admin',
      member: 'Membro',
      viewer: 'Visualizador',
    }
    return roleLabels[role] || role
  }

  // Always show current workspace, even with just one
  return (
    <>
      <div className={`${styles.container} ${compact ? styles.compact : ''}`} ref={dropdownRef}>
        <button
          className={styles.trigger}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <div className={styles.workspaceIcon}>
            {currentWorkspace?.logo_url ? (
              <img src={currentWorkspace.logo_url} alt="" className={styles.logo} />
            ) : (
              <Building2 size={18} />
            )}
          </div>
          {!compact && (
            <span className={styles.workspaceName}>
              <MaskedValue value={currentWorkspace?.name || 'Meu Workspace'} type="partial" visibleStart={3} />
            </span>
          )}
          <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
        </button>

        {isOpen && (
          <div className={styles.dropdown} role="listbox">
            {workspaces.length > 0 && (
              <>
                <div className={styles.dropdownHeader}>
                  <span>Workspaces</span>
                </div>

                {workspaces.length > 5 && (
                  <div className={styles.searchContainer}>
                    <Input
                      ref={searchInputRef}
                      placeholder="Buscar workspace..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={styles.searchInput}
                      leftIcon={<Search size={16} />}
                      size="md"
                      fullWidth
                    />
                  </div>
                )}

                <div className={styles.workspaceList}>
                  {filteredWorkspaces.length === 0 ? (
                    <div className={styles.emptySearch}>
                      Nenhum workspace encontrado
                    </div>
                  ) : (
                    filteredWorkspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        className={`${styles.workspaceItem} ${
                          currentWorkspace?.id === workspace.id ? styles.selected : ''
                        }`}
                        onClick={() => handleSelectWorkspace(workspace)}
                        role="option"
                        aria-selected={currentWorkspace?.id === workspace.id}
                      >
                        <div className={styles.workspaceItemIcon}>
                          {workspace.logo_url ? (
                            <img src={workspace.logo_url} alt="" className={styles.logo} />
                          ) : (
                            <Building2 size={16} />
                          )}
                        </div>
                        <div className={styles.workspaceItemInfo}>
                          <span className={styles.workspaceItemName}>
                            <MaskedValue value={workspace.name} type="partial" visibleStart={3} />
                          </span>
                          {workspace.membership?.role && (
                            <span className={styles.workspaceItemRole}>
                              {getRoleBadge(workspace.membership.role)}
                            </span>
                          )}
                        </div>
                        {currentWorkspace?.id === workspace.id && (
                          <Check size={16} className={styles.checkIcon} />
                        )}
                      </button>
                    ))
                  )}
                </div>

                <div className={styles.dropdownDivider} />
              </>
            )}

            <div className={styles.actionList}>
              <button className={styles.actionButton} onClick={handleManageWorkspace}>
                <Settings size={16} />
                Gerenciar workspace
              </button>
              <button className={styles.createButton} onClick={handleCreateNew}>
                <Plus size={16} />
                Criar novo workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workspace Change Confirmation Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelSwitch}
        title="Trocar de workspace?"
        size="sm"
        closeOnOverlayClick={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'var(--color-warning-bg, rgba(245, 158, 11, 0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
            </div>
            <div>
              <p style={{
                margin: 0,
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                lineHeight: '1.5',
              }}>
                {confirmModal.messages.length > 0
                  ? confirmModal.messages[0]
                  : 'Você está em uma página de criação/edição.'
                }
              </p>
              <p style={{
                margin: '8px 0 0',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
                lineHeight: '1.5',
              }}>
                Ao trocar de workspace, todo o progresso não salvo será perdido.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <Button variant="outline" onClick={handleCancelSwitch}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmSwitch}>
              Trocar e descartar
            </Button>
          </div>
        </div>
      </Modal>

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  )
}
