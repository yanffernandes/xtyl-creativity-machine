import { useState } from 'react'
import { Plus, Search, Users, Mail, Shield, Edit2, Trash2 } from 'lucide-react'
import {
  Button,
  Input,
  Modal,
  Spinner,
  EmptyState,
  Alert,
  Select,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '@/shared/components'
import styles from './UsersPage.module.css'
import { useUsers, useInviteUser, useUpdateUser, useRemoveUser } from '../api/useUsers'
import type { TeamUser, UserRole, UserStatus } from '../types'

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
}

const statusLabels: Record<UserStatus, { label: string; color: string }> = {
  active: { label: 'Ativo', color: 'var(--color-success)' },
  inactive: { label: 'Inativo', color: 'var(--color-text-muted)' },
  pending: { label: 'Pendente', color: 'var(--color-warning)' },
}

const roleOptions = [
  { value: 'admin', label: 'Administrador' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Visualizador' },
]

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null)
  const [removingUser, setRemovingUser] = useState<TeamUser | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('viewer')
  const [editRole, setEditRole] = useState<UserRole>('viewer')

  const { data: users, isLoading, error } = useUsers({ search })
  const inviteMutation = useInviteUser()
  const updateMutation = useUpdateUser()
  const removeMutation = useRemoveUser()

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    await inviteMutation.mutateAsync({
      email: inviteEmail,
      role: inviteRole,
    })

    setInviteEmail('')
    setInviteRole('viewer')
    setIsInviteModalOpen(false)
  }

  const handleUpdateRole = async () => {
    if (!editingUser) return

    await updateMutation.mutateAsync({
      id: editingUser.id,
      role: editRole,
    })

    setEditingUser(null)
  }

  const handleRemove = async () => {
    if (!removingUser) return

    await removeMutation.mutateAsync(removingUser.id)
    setRemovingUser(null)
  }

  const openEditModal = (user: TeamUser) => {
    setEditingUser(user)
    setEditRole(user.role)
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Usuários</h1>
          <p className={styles.subtitle}>Gerencie os membros da sua equipe</p>
        </div>
        <Button leftIcon={<Plus size={18} />} onClick={() => setIsInviteModalOpen(true)}>
          Convidar usuário
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar usuários..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          size="md"
        />
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar usuários: {error.message}
        </Alert>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : users?.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="Nenhum usuário encontrado"
          description={search ? 'Tente uma busca diferente' : 'Convide membros para sua equipe'}
          action={
            !search && (
              <Button leftIcon={<Plus size={18} />} onClick={() => setIsInviteModalOpen(true)}>
                Convidar usuário
              </Button>
            )
          }
        />
      ) : (
        <div className={styles.tableWrapper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Usuário</TableHeader>
                <TableHeader>Função</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Último acesso</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <TableBody>
              {users?.map((user) => {
                const status = statusLabels[user.status]
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className={styles.userCell}>
                        <div className={styles.avatar}>
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" />
                          ) : (
                            <span>{(user.name || user.email)[0].toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <p className={styles.userName}>{user.name || '-'}</p>
                          <p className={styles.userEmail}>{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={styles.role}>
                        <Shield size={14} />
                        {roleLabels[user.role]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={styles.status} style={{ color: status.color }}>
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(user.last_login)}</TableCell>
                    <TableCell>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => openEditModal(user)}
                          aria-label="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.danger}`}
                          onClick={() => setRemovingUser(user)}
                          aria-label="Remover"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false)
          setInviteEmail('')
          setInviteRole('viewer')
        }}
        title="Convidar usuário"
        size="sm"
      >
        <div className={styles.form}>
          <Input
            label="Email"
            type="email"
            placeholder="usuario@exemplo.com"
            leftIcon={<Mail size={18} />}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            fullWidth
            autoFocus
          />
          <Select
            label="Função"
            options={roleOptions}
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
          />
          <div className={styles.formActions}>
            <Button
              variant="outline"
              onClick={() => {
                setIsInviteModalOpen(false)
                setInviteEmail('')
                setInviteRole('viewer')
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              isLoading={inviteMutation.isPending}
              disabled={!inviteEmail.trim()}
            >
              Enviar convite
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Editar função"
        size="sm"
      >
        <div className={styles.form}>
          <p className={styles.editingUser}>
            Alterando função de <strong>{editingUser?.email}</strong>
          </p>
          <Select
            label="Função"
            options={roleOptions}
            value={editRole}
            onChange={(e) => setEditRole(e.target.value as UserRole)}
          />
          <div className={styles.formActions}>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} isLoading={updateMutation.isPending}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={!!removingUser}
        onClose={() => setRemovingUser(null)}
        title="Remover usuário"
        size="sm"
      >
        <p className={styles.removeMessage}>
          Tem certeza que deseja remover <strong>{removingUser?.email}</strong> da equipe?
        </p>
        <div className={styles.formActions}>
          <Button variant="outline" onClick={() => setRemovingUser(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={handleRemove}
            isLoading={removeMutation.isPending}
          >
            Remover
          </Button>
        </div>
      </Modal>
    </div>
  )
}
