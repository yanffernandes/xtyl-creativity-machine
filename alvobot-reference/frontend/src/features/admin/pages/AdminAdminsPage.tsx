import { useState } from 'react'
import { Shield, UserPlus, Search } from 'lucide-react'
import { Button, Spinner, Alert, Modal, Input, Select } from '@/shared/components'
import { useConfirmDialog, useDocumentTitle } from '@/shared/hooks'
import styles from './AdminAdminsPage.module.css'
import { useRemoveAdmin, useAddAdmin, useLogAdminAction } from '../api/mutations'
import { useAdmins, useAdminRoles } from '../api/queries'
import { useAdminStore } from '../stores/adminStore'

export function AdminAdminsPage() {
  useDocumentTitle('Admin - Administradores')
  const { hasPermission, adminData } = useAdminStore()
  const [search, setSearch] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminRole, setNewAdminRole] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const { data: admins, isLoading, refetch } = useAdmins()
  const { data: roles } = useAdminRoles()
  const removeAdmin = useRemoveAdmin()
  const addAdmin = useAddAdmin()
  const logAction = useLogAdminAction()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const canManageAdmins = hasPermission('admins', 'edit')
  const canCreateAdmins = hasPermission('admins', 'create')

  const handleRemoveAdmin = async (userId: string, email: string) => {
    const confirmed = await confirm({
      title: 'Remover administrador',
      message: `Tem certeza que deseja remover ${email} como administrador?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await removeAdmin.mutateAsync(userId)
      await logAction.mutateAsync({
        action: 'admin_remove',
        resource_type: 'admin',
        resource_id: userId,
        details: { email },
      })
      refetch()
    } catch (error) {
      console.error('Error removing admin:', error)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminRole) {
      setAddError('Preencha todos os campos')
      return
    }

    setAddError(null)
    try {
      await addAdmin.mutateAsync({ email: newAdminEmail, role: newAdminRole })
      await logAction.mutateAsync({
        action: 'admin_add',
        resource_type: 'admin',
        details: { email: newAdminEmail, role: newAdminRole },
      })
      setIsAddModalOpen(false)
      setNewAdminEmail('')
      setNewAdminRole('')
      refetch()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao adicionar administrador'
      setAddError(errorMessage)
    }
  }

  const filteredAdmins = admins?.filter(
    (admin) =>
      admin.email?.toLowerCase().includes(search.toLowerCase()) ||
      admin.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const roleOptions = roles?.map((role) => ({
    value: role.id,
    label: role.public_name,
  })) || []

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Administradores</h1>
          <p className={styles.subtitle}>Gerencie os administradores do sistema</p>
        </div>
        {canCreateAdmins && (
          <Button
            variant="primary"
            leftIcon={<UserPlus size={18} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Adicionar Admin
          </Button>
        )}
      </div>

      {/* Search */}
      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar por nome ou email..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          size="md"
        />
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total de Admins</div>
          <div className={styles.statValue}>{admins?.length || 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Super Admins</div>
          <div className={styles.statValue}>
            {admins?.filter((a) => a.role === 'super_admin').length || 0}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Admins Ativos</div>
          <div className={styles.statValue}>
            {admins?.filter((a) => a.status === 'active').length || 0}
          </div>
        </div>
      </div>

      {/* Admins List */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !filteredAdmins || filteredAdmins.length === 0 ? (
        <div className={styles.emptyState}>
          <Shield size={48} />
          <h3>Nenhum administrador encontrado</h3>
          <p>Tente ajustar a busca ou adicione um novo administrador</p>
        </div>
      ) : (
        <div className={styles.adminsGrid}>
          {filteredAdmins.map((admin) => (
            <div key={admin.user_id} className={styles.adminCard}>
              <div className={styles.adminHeader}>
                <div className={styles.adminAvatar}>
                  {admin.full_name?.charAt(0) || admin.email?.charAt(0) || 'A'}
                </div>
                <div className={styles.adminInfo}>
                  <span className={styles.adminName}>{admin.full_name || admin.email}</span>
                  <span className={styles.adminEmail}>{admin.email}</span>
                </div>
              </div>
              <div className={styles.adminDetails}>
                <div className={styles.adminRole}>
                  <Shield size={14} />
                  {admin.role_name}
                </div>
                <div className={styles.adminLevel}>Nivel {admin.role_level}</div>
              </div>
              {admin.notes && <p className={styles.adminNotes}>{admin.notes}</p>}
              <div className={styles.adminMeta}>
                <span>Criado em: {new Date(admin.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className={styles.adminActions}>
                {canManageAdmins && admin.user_id !== adminData?.user_id && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveAdmin(admin.user_id, admin.email || '')}
                    isLoading={removeAdmin.isPending}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Admin Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setNewAdminEmail('')
          setNewAdminRole('')
          setAddError(null)
        }}
        title="Adicionar Administrador"
        size="sm"
      >
        <div className={styles.modalContent}>
          {addError && (
            <Alert variant="error" className={styles.modalAlert}>
              {addError}
            </Alert>
          )}
          <Input
            label="Email do Usuario"
            type="email"
            placeholder="email@exemplo.com"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
          />
          <Select
            label="Cargo"
            value={newAdminRole}
            onChange={(e) => setNewAdminRole(e.target.value)}
            options={[{ value: '', label: 'Selecione um cargo' }, ...roleOptions]}
          />
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false)
                setNewAdminEmail('')
                setNewAdminRole('')
                setAddError(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleAddAdmin}
              isLoading={addAdmin.isPending}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog />
    </div>
  )
}
