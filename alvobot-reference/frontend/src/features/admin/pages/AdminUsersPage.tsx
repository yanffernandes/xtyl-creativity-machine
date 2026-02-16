import { useId, useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  Mail,
  Shield,
  Ban,
  ExternalLink,
  UserCheck,
  LogIn,
  Users,
  CreditCard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  KeyRound,
} from 'lucide-react'
import { Button, Spinner, Modal, Alert, Input, RowActionsMenu, type RowActionItem } from '@/shared/components'
import { useColumnResize, useColumnReorder, useDocumentTitle } from '@/shared/hooks'
import styles from './AdminUsersPage.module.css'
import {
  useGenerateMagicLink,
  useBanUser,
  useCreateAdmin,
  useCreateTransaction,
  useLogAdminAction,
  useCreateUser,
  useChangeUserPassword,
} from '../api/mutations'
import { useAdminUsers, useAdminPlans } from '../api/queries'
import { useAdminStore } from '../stores/adminStore'
import type { AdminUser, AdminUsersFilter } from '../types'

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminUsersPage() {
  useDocumentTitle('Admin - Usuários')
  const magicLinkReasonId = useId()
  const banDurationId = useId()
  const subscriptionPlanId = useId()
  const subscriptionDurationId = useId()
  const adminRoleId = useId()
  const createEmailId = useId()
  const createNameId = useId()
  const createPasswordId = useId()
  const createPlanId = useId()
  const createPlanDurationId = useId()
  const { hasPermission } = useAdminStore()
  const tableRef = useRef<HTMLTableElement>(null)

  // Filters state
  const [filters, setFilters] = useState<AdminUsersFilter>({
    search: '',
    subscription_status: 'all',
    is_admin: null,
    sort_by: 'created_at',
    sort_order: 'desc',
    page: 1,
    per_page: 20,
  })

  // Modal states
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false)
  const [showBanModal, setShowBanModal] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [changePasswordError, setChangePasswordError] = useState('')
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false)
  const [magicLinkUrl, setMagicLinkUrl] = useState<string | null>(null)
  const [magicLinkReason, setMagicLinkReason] = useState('')
  const [banDuration, setBanDuration] = useState('7')
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [subscriptionDuration, setSubscriptionDuration] = useState('1')
  const [adminRole, setAdminRole] = useState('support')

  // Create user form state
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserPlanId, setNewUserPlanId] = useState<number | null>(null)
  const [newUserPlanDuration, setNewUserPlanDuration] = useState('1')
  const [createUserError, setCreateUserError] = useState('')
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  // Queries and mutations
  const { data: users, isLoading, refetch } = useAdminUsers(filters)
  const { data: plans } = useAdminPlans()
  const generateMagicLink = useGenerateMagicLink()
  const banUser = useBanUser()
  const createAdmin = useCreateAdmin()
  const createTransaction = useCreateTransaction()
  const logAction = useLogAdminAction()
  const createUser = useCreateUser()
  const changeUserPassword = useChangeUserPassword()

  // Handlers
  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value, page: 1 }))
  }

  const handleFilterChange = (key: keyof AdminUsersFilter, value: string | boolean | null) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      setCreateUserError('Email e senha sao obrigatorios')
      return
    }

    if (!newUserPlanId) {
      setCreateUserError('Selecione um plano para o usuario')
      return
    }

    const selectedPlan = plans?.find((p) => p.id === newUserPlanId)
    if (!selectedPlan) {
      setCreateUserError('Plano invalido')
      return
    }

    setCreateUserError('')
    setIsCreatingUser(true)

    try {
      // Create user first
      const newUser = await createUser.mutateAsync({
        email: newUserEmail.trim(),
        password: newUserPassword,
        full_name: newUserName.trim() || undefined,
      })

      // Then create subscription for the user
      if (newUser?.id) {
        await createTransaction.mutateAsync({
          user_id: newUser.id,
          plan_id: newUserPlanId,
          duration: parseInt(newUserPlanDuration),
          buyer_paid: (selectedPlan.price || 0) * parseInt(newUserPlanDuration),
          payment_method: 'admin_manual',
        })
      }

      await logAction.mutateAsync({
        action: 'user_create',
        resource_type: 'user',
        details: {
          email: newUserEmail,
          plan_id: newUserPlanId,
          plan_name: selectedPlan.name,
          duration: newUserPlanDuration,
        },
      })

      setShowCreateUserModal(false)
      setNewUserEmail('')
      setNewUserName('')
      setNewUserPassword('')
      setNewUserPlanId(null)
      setNewUserPlanDuration('1')
      refetch()
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Erro ao criar usuario'
      setCreateUserError(msg)
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleCloseCreateUserModal = () => {
    setShowCreateUserModal(false)
    setNewUserEmail('')
    setNewUserName('')
    setNewUserPassword('')
    setNewUserPlanId(null)
    setNewUserPlanDuration('1')
    setCreateUserError('')
  }

  const handleGenerateMagicLink = async () => {
    if (!selectedUser) return

    try {
      const result = await generateMagicLink.mutateAsync({
        userId: selectedUser.id,
        reason: magicLinkReason || undefined,
      })

      setMagicLinkUrl(result.url)

      await logAction.mutateAsync({
        action: 'user_impersonate',
        resource_type: 'user',
        resource_id: selectedUser.id,
        details: { reason: magicLinkReason, user_email: selectedUser.email },
      })
    } catch (error) {
      console.error('Error generating magic link:', error)
    }
  }

  const handleBanUser = async () => {
    if (!selectedUser) return

    const bannedUntil = banDuration === '0'
      ? null
      : new Date(Date.now() + parseInt(banDuration) * 24 * 60 * 60 * 1000).toISOString()

    try {
      await banUser.mutateAsync({ userId: selectedUser.id, bannedUntil })

      await logAction.mutateAsync({
        action: bannedUntil ? 'user_ban' : 'user_unban',
        resource_type: 'user',
        resource_id: selectedUser.id,
        details: { duration_days: banDuration, user_email: selectedUser.email },
      })

      setShowBanModal(false)
      setSelectedUser(null)
      refetch()
    } catch (error) {
      console.error('Error banning user:', error)
    }
  }

  const handleCreateSubscription = async () => {
    if (!selectedUser || !selectedPlanId) return

    const plan = plans?.find((p) => p.id === selectedPlanId)
    if (!plan) return

    try {
      await createTransaction.mutateAsync({
        user_id: selectedUser.id,
        plan_id: selectedPlanId,
        duration: parseInt(subscriptionDuration),
        buyer_paid: (plan.price || 0) * parseInt(subscriptionDuration),
        payment_method: 'admin_manual',
      })

      await logAction.mutateAsync({
        action: 'subscription_create',
        resource_type: 'subscription',
        resource_id: selectedUser.id,
        details: {
          plan_id: selectedPlanId,
          plan_name: plan.name,
          duration: subscriptionDuration,
          user_email: selectedUser.email,
        },
      })

      setShowSubscriptionModal(false)
      setSelectedUser(null)
      refetch()
    } catch (error) {
      console.error('Error creating subscription:', error)
    }
  }

  const handleMakeAdmin = async () => {
    if (!selectedUser) return

    try {
      await createAdmin.mutateAsync({
        user_id: selectedUser.id,
        role: adminRole,
      })

      await logAction.mutateAsync({
        action: 'admin_create',
        resource_type: 'admin',
        resource_id: selectedUser.id,
        details: { role: adminRole, user_email: selectedUser.email },
      })

      setShowAdminModal(false)
      setSelectedUser(null)
      refetch()
    } catch (error) {
      console.error('Error making admin:', error)
    }
  }

  const handleChangePassword = async () => {
    if (!selectedUser) return

    if (newPassword.length < 6) {
      setChangePasswordError('A senha deve ter no minimo 6 caracteres')
      return
    }

    setChangePasswordError('')

    try {
      await changeUserPassword.mutateAsync({
        userId: selectedUser.id,
        password: newPassword,
      })

      await logAction.mutateAsync({
        action: 'user_change_password',
        resource_type: 'user',
        resource_id: selectedUser.id,
        details: { user_email: selectedUser.email },
      })

      setChangePasswordSuccess(true)
      setNewPassword('')
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Erro ao alterar senha'
      setChangePasswordError(msg)
    }
  }

  const openUserAction = (user: AdminUser, action: string) => {
    setSelectedUser(user)

    switch (action) {
      case 'magic_link':
        setMagicLinkUrl(null)
        setMagicLinkReason('')
        setShowMagicLinkModal(true)
        break
      case 'change_password':
        setNewPassword('')
        setChangePasswordError('')
        setChangePasswordSuccess(false)
        setShowChangePasswordModal(true)
        break
      case 'ban':
        setBanDuration(user.banned_until ? '0' : '7')
        setShowBanModal(true)
        break
      case 'subscription':
        setSelectedPlanId(plans?.[0]?.id || null)
        setSubscriptionDuration('1')
        setShowSubscriptionModal(true)
        break
      case 'make_admin':
        setAdminRole('support')
        setShowAdminModal(true)
        break
    }
  }

  const handleHeaderSort = useCallback((sortBy: AdminUsersFilter['sort_by']) => {
    setFilters((prev) => {
      const isSame = prev.sort_by === sortBy
      return {
        ...prev,
        sort_by: sortBy,
        sort_order: isSame ? (prev.sort_order === 'asc' ? 'desc' : 'asc') : 'desc',
        page: 1,
      }
    })
  }, [])

  const getSortIcon = (sortBy?: AdminUsersFilter['sort_by']) => {
    if (!sortBy) return null
    if (filters.sort_by !== sortBy) {
      return <ArrowUpDown size={14} className={styles.sortIcon} />
    }
    return filters.sort_order === 'asc' ? (
      <ArrowUp size={14} className={styles.sortIconActive} />
    ) : (
      <ArrowDown size={14} className={styles.sortIconActive} />
    )
  }

  const columns = useMemo(
    () => [
      { key: 'user', label: 'Usuario', sortable: true, sortBy: 'email', minWidth: 260, width: 320 },
      { key: 'subscription', label: 'Assinatura', sortable: false, minWidth: 160, width: 200 },
      { key: 'projects', label: 'Projetos', sortable: false, minWidth: 120, width: 140 },
      { key: 'articles', label: 'Artigos', sortable: false, minWidth: 120, width: 140 },
      { key: 'created_at', label: 'Cadastro', sortable: true, sortBy: 'created_at', minWidth: 160, width: 180 },
      { key: 'last_sign_in_at', label: 'Ultimo acesso', sortable: true, sortBy: 'last_sign_in_at', minWidth: 180, width: 200 },
      { key: 'status', label: 'Status', sortable: false, minWidth: 140, width: 160 },
      { key: 'actions', label: 'Acao', sortable: false, minWidth: 72, width: 72 },
    ],
    []
  )

  const columnMap = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns])

  const {
    columnOrder,
    setColumnOrder,
    draggedColumn,
    dragOverColumn,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useColumnReorder(columns.map((column) => column.key))

  useEffect(() => {
    setColumnOrder(columns.map((column) => column.key))
  }, [columns, setColumnOrder])

  const orderedColumns = useMemo(
    () =>
      columnOrder
        .map((key) => columnMap.get(key))
        .filter((column): column is (typeof columns)[number] => Boolean(column)),
    [columnMap, columnOrder]
  )

  const initialWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    columns.forEach((column) => {
      widths[column.key] = column.width
    })
    return widths
  }, [columns])

  const { columnWidths, handleMouseDown, handleDoubleClick } = useColumnResize(
    initialWidths,
    tableRef,
    columns.map((column) => ({ key: column.key, minWidth: column.minWidth }))
  )

  const buildUserActions = (user: AdminUser): RowActionItem[] => {
    const items: RowActionItem[] = []

    if (hasPermission('users', 'impersonate')) {
      items.push({
        label: 'Login como usuario',
        onSelect: () => openUserAction(user, 'magic_link'),
        icon: <LogIn size={16} />,
      })
    }

    if (hasPermission('users', 'edit')) {
      items.push({
        label: 'Alterar senha',
        onSelect: () => openUserAction(user, 'change_password'),
        icon: <KeyRound size={16} />,
      })
    }

    if (hasPermission('subscriptions', 'create')) {
      items.push({
        label: 'Adicionar assinatura',
        onSelect: () => openUserAction(user, 'subscription'),
        icon: <CreditCard size={16} />,
      })
    }

    if (hasPermission('admins', 'create') && !user.is_admin) {
      items.push({
        label: 'Tornar admin',
        onSelect: () => openUserAction(user, 'make_admin'),
        icon: <Shield size={16} />,
      })
    }

    const dangerItems: RowActionItem[] = []
    if (hasPermission('users', 'edit')) {
      dangerItems.push({
        label: user.banned_until ? 'Remover banimento' : 'Banir usuario',
        onSelect: () => openUserAction(user, 'ban'),
        icon: <Ban size={16} />,
        destructive: !user.banned_until,
      })
    }

    if (items.length > 0 && dangerItems.length > 0) {
      items.push({ type: 'separator' })
    }

    return [...items, ...dangerItems]
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Usuarios</h1>
          <p className={styles.subtitle}>Gerencie todos os usuarios do sistema</p>
        </div>
        {hasPermission('users', 'create') && (
          <Button leftIcon={<Plus size={18} />} onClick={() => setShowCreateUserModal(true)}>
            Novo Usuario
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <Input
            placeholder="Buscar por email ou nome..."
            leftIcon={<Search size={18} />}
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.searchInput}
            size="md"
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            value={filters.subscription_status}
            onChange={(e) => handleFilterChange('subscription_status', e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Todas assinaturas</option>
            <option value="active">Assinatura ativa</option>
            <option value="inactive">Sem assinatura</option>
          </select>

          <select
            value={filters.is_admin === null ? 'all' : filters.is_admin ? 'true' : 'false'}
            onChange={(e) =>
              handleFilterChange(
                'is_admin',
                e.target.value === 'all' ? null : e.target.value === 'true'
              )
            }
            className={styles.filterSelect}
          >
            <option value="all">Todos tipos</option>
            <option value="true">Admins</option>
            <option value="false">Usuarios</option>
          </select>

          <select
            value={`${filters.sort_by}-${filters.sort_order}`}
            onChange={(e) => {
              const [sort_by, sort_order] = e.target.value.split('-')
              setFilters((prev) => ({
                ...prev,
                sort_by: sort_by as AdminUsersFilter['sort_by'],
                sort_order: sort_order as 'asc' | 'desc',
              }))
            }}
            className={styles.filterSelect}
          >
            <option value="created_at-desc">Mais recentes</option>
            <option value="created_at-asc">Mais antigos</option>
            <option value="last_sign_in_at-desc">Ultimo acesso</option>
            <option value="email-asc">Email A-Z</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !users || users.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={48} />
          <h3>Nenhum usuario encontrado</h3>
          <p>Tente ajustar os filtros de busca</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table} ref={tableRef}>
            <thead>
              <tr>
                {orderedColumns.map((column) => {
                  const isSortable = column.sortable && column.sortBy
                  const columnWidth = columnWidths[column.key]
                  return (
                    <th
                      key={column.key}
                      data-column-key={column.key}
                      className={`${styles.th} ${styles.draggableHeader} ${
                        draggedColumn === column.key ? styles.draggingHeader : ''
                      } ${dragOverColumn === column.key ? styles.dragOverHeader : ''}`}
                      style={{ width: columnWidth || undefined }}
                      draggable
                      onDragStart={(e) => handleDragStart(column.key, e)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(column.key, e)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(column.key, e)}
                    >
                      <div className={styles.thContent}>
                        {isSortable ? (
                          <button
                            type="button"
                            className={styles.sortButton}
                            onClick={() => handleHeaderSort(column.sortBy as AdminUsersFilter['sort_by'])}
                          >
                            {column.label}
                            {getSortIcon(column.sortBy as AdminUsersFilter['sort_by'])}
                          </button>
                        ) : (
                          <span>{column.label}</span>
                        )}
                      </div>
                      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                      <div
                        className={styles.resizeHandle}
                        onMouseDown={(e) => handleMouseDown(column.key, e)}
                        onDoubleClick={(e) => handleDoubleClick(column.key, e)}
                      />
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  {orderedColumns.map((column) => {
                    const columnWidth = columnWidths[column.key]

                    if (column.key === 'user') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <div className={styles.userCell}>
                            <div className={styles.userAvatar}>
                              {user.full_name?.charAt(0) || user.email.charAt(0)}
                            </div>
                            <div className={styles.userInfo}>
                              <span className={styles.userName}>
                                {user.full_name || 'Sem nome'}
                                {user.is_admin && (
                                  <span className={styles.adminBadge}>
                                    <Shield size={12} />
                                    Admin
                                  </span>
                                )}
                              </span>
                              <span className={styles.userEmail}>{user.email}</span>
                            </div>
                          </div>
                        </td>
                      )
                    }

                    if (column.key === 'subscription') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          <span
                            className={`${styles.statusBadge} ${
                              user.subscription_status === 'active' ? styles.active : styles.inactive
                            }`}
                          >
                            {user.subscription_status === 'active'
                              ? user.current_plan_name || 'Ativo'
                              : 'Inativo'}
                          </span>
                        </td>
                      )
                    }

                    if (column.key === 'projects') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {user.projects_count}
                        </td>
                      )
                    }

                    if (column.key === 'articles') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {user.articles_count}
                        </td>
                      )
                    }

                    if (column.key === 'created_at') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {formatDate(user.created_at)}
                        </td>
                      )
                    }

                    if (column.key === 'last_sign_in_at') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {formatDateTime(user.last_sign_in_at)}
                        </td>
                      )
                    }

                    if (column.key === 'status') {
                      return (
                        <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                          {user.banned_until ? (
                            <span className={`${styles.statusBadge} ${styles.banned}`}>
                              <Ban size={12} />
                              Banido
                            </span>
                          ) : user.email_confirmed_at ? (
                            <span className={`${styles.statusBadge} ${styles.verified}`}>
                              <UserCheck size={12} />
                              Verificado
                            </span>
                          ) : (
                            <span className={`${styles.statusBadge} ${styles.pending}`}>
                              <Mail size={12} />
                              Pendente
                            </span>
                          )}
                        </td>
                      )
                    }

                    if (column.key === 'actions') {
                      return (
                        <td
                          key={column.key}
                          data-column-key={column.key}
                          style={{ width: columnWidth || undefined }}
                        >
                          <div className={styles.actionsCell}>
                            <RowActionsMenu items={buildUserActions(user)} ariaLabel="Acoes do usuario" />
                          </div>
                        </td>
                      )
                    }

                    return null
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Magic Link Modal */}
      <Modal
        isOpen={showMagicLinkModal}
        onClose={() => {
          setShowMagicLinkModal(false)
          setMagicLinkUrl(null)
        }}
        title="Login como Usuario"
      >
        <div className={styles.modalContent}>
          {magicLinkUrl ? (
            <>
              <Alert variant="success">
                Magic link gerado com sucesso! O link expira em 15 minutos.
              </Alert>
              <div className={styles.magicLinkBox}>
                <input
                  type="text"
                  value={magicLinkUrl}
                  readOnly
                  className={styles.magicLinkInput}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(magicLinkUrl)
                  }}
                >
                  Copiar
                </Button>
                <Button
                  onClick={() => {
                    window.open(magicLinkUrl, '_blank')
                  }}
                  leftIcon={<ExternalLink size={16} />}
                >
                  Abrir
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.modalText}>
                Voce esta prestes a fazer login como <strong>{selectedUser?.email}</strong>.
                Esta acao sera registrada no log de auditoria.
              </p>
              <div className={styles.formGroup}>
                <label htmlFor={magicLinkReasonId}>Motivo (opcional)</label>
                <input
                  id={magicLinkReasonId}
                  type="text"
                  value={magicLinkReason}
                  onChange={(e) => setMagicLinkReason(e.target.value)}
                  placeholder="Ex: Suporte ao usuario"
                  className={styles.input}
                />
              </div>
              <div className={styles.modalActions}>
                <Button variant="secondary" onClick={() => setShowMagicLinkModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleGenerateMagicLink}
                  isLoading={generateMagicLink.isPending}
                >
                  Gerar Link
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Ban Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title={selectedUser?.banned_until ? 'Remover Ban' : 'Banir Usuario'}
      >
        <div className={styles.modalContent}>
          {selectedUser?.banned_until ? (
            <p className={styles.modalText}>
              Deseja remover o ban do usuario <strong>{selectedUser.email}</strong>?
            </p>
          ) : (
            <>
              <p className={styles.modalText}>
                Voce esta prestes a banir o usuario <strong>{selectedUser?.email}</strong>.
              </p>
              <div className={styles.formGroup}>
                <label htmlFor={banDurationId}>Duracao do ban</label>
                <select
                  id={banDurationId}
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className={styles.select}
                >
                  <option value="1">1 dia</option>
                  <option value="7">7 dias</option>
                  <option value="30">30 dias</option>
                  <option value="365">1 ano</option>
                  <option value="3650">Permanente</option>
                </select>
              </div>
            </>
          )}
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setShowBanModal(false)}>
              Cancelar
            </Button>
            <Button
              variant={selectedUser?.banned_until ? 'primary' : 'danger'}
              onClick={handleBanUser}
              isLoading={banUser.isPending}
            >
              {selectedUser?.banned_until ? 'Remover Ban' : 'Banir'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subscription Modal */}
      <Modal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        title="Adicionar Assinatura"
      >
        <div className={styles.modalContent}>
          <p className={styles.modalText}>
            Adicionar assinatura manual para <strong>{selectedUser?.email}</strong>
          </p>
          <div className={styles.formGroup}>
            <label htmlFor={subscriptionPlanId}>Plano</label>
            <select
              id={subscriptionPlanId}
              value={selectedPlanId || ''}
              onChange={(e) => setSelectedPlanId(parseInt(e.target.value))}
              className={styles.select}
            >
              <option value="">Selecione um plano</option>
              {plans?.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - R$ {(plan.price || 0).toFixed(2)}/mes
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor={subscriptionDurationId}>Duracao (meses)</label>
            <select
              id={subscriptionDurationId}
              value={subscriptionDuration}
              onChange={(e) => setSubscriptionDuration(e.target.value)}
              className={styles.select}
            >
              <option value="1">1 mes</option>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </div>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setShowSubscriptionModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSubscription}
              isLoading={createTransaction.isPending}
              disabled={!selectedPlanId}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Make Admin Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        title="Tornar Administrador"
      >
        <div className={styles.modalContent}>
          <p className={styles.modalText}>
            Tornar <strong>{selectedUser?.email}</strong> um administrador do sistema.
          </p>
          <div className={styles.formGroup}>
            <label htmlFor={adminRoleId}>Nivel de acesso</label>
            <select
              id={adminRoleId}
              value={adminRole}
              onChange={(e) => setAdminRole(e.target.value)}
              className={styles.select}
            >
              <option value="viewer">Visualizador - Apenas leitura</option>
              <option value="support">Suporte - Acesso limitado</option>
              <option value="admin">Administrador - Gerenciamento</option>
              <option value="super_admin">Super Admin - Acesso total</option>
            </select>
          </div>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setShowAdminModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleMakeAdmin} isLoading={createAdmin.isPending}>
              Confirmar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={showChangePasswordModal}
        onClose={() => {
          setShowChangePasswordModal(false)
          setChangePasswordSuccess(false)
        }}
        title="Alterar Senha"
      >
        <div className={styles.modalContent}>
          {changePasswordSuccess ? (
            <>
              <Alert variant="success">
                Senha alterada com sucesso para <strong>{selectedUser?.email}</strong>.
              </Alert>
              <div className={styles.modalActions}>
                <Button
                  onClick={() => {
                    setShowChangePasswordModal(false)
                    setChangePasswordSuccess(false)
                  }}
                >
                  Fechar
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.modalText}>
                Alterar a senha do usuario <strong>{selectedUser?.email}</strong>.
              </p>

              {changePasswordError && (
                <Alert variant="error" style={{ marginBottom: 'var(--space-4)' }}>
                  {changePasswordError}
                </Alert>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="changePasswordInput">Nova senha *</label>
                <input
                  id="changePasswordInput"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  className={styles.input}
                />
              </div>

              <div className={styles.modalActions}>
                <Button variant="secondary" onClick={() => setShowChangePasswordModal(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleChangePassword}
                  isLoading={changeUserPassword.isPending}
                  disabled={newPassword.length < 6}
                >
                  Alterar Senha
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateUserModal}
        onClose={handleCloseCreateUserModal}
        title="Criar Novo Usuario"
      >
        <div className={styles.modalContent}>
          <p className={styles.modalText}>
            Crie um novo usuario no sistema. O usuario recebera um email para confirmar a conta.
          </p>

          {createUserError && (
            <Alert variant="error" style={{ marginBottom: 'var(--space-4)' }}>
              {createUserError}
            </Alert>
          )}

          <div className={styles.formGroup}>
            <label htmlFor={createEmailId}>Email *</label>
            <input
              id={createEmailId}
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={createNameId}>Nome completo</label>
            <input
              id={createNameId}
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Nome do usuario"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={createPasswordId}>Senha *</label>
            <input
              id={createPasswordId}
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={createPlanId}>Plano *</label>
            <select
              id={createPlanId}
              value={newUserPlanId || ''}
              onChange={(e) => setNewUserPlanId(e.target.value ? parseInt(e.target.value) : null)}
              className={styles.select}
            >
              <option value="">Selecione um plano</option>
              {plans?.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {plan.price === 0 ? 'Gratuito' : `R$ ${(plan.price || 0).toFixed(2)}/mes`}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={createPlanDurationId}>Duracao do plano</label>
            <select
              id={createPlanDurationId}
              value={newUserPlanDuration}
              onChange={(e) => setNewUserPlanDuration(e.target.value)}
              className={styles.select}
            >
              <option value="1">1 mes</option>
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </div>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={handleCloseCreateUserModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              isLoading={isCreatingUser}
              disabled={!newUserEmail.trim() || !newUserPassword.trim() || !newUserPlanId}
            >
              Criar Usuario
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
