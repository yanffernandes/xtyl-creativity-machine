import { useState } from 'react'
import { Building2, Users, Settings, Crown, Shield, User, Eye, Trash2, UserPlus, ArrowLeft, Mail, Clock, RefreshCw, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/shared/components/Alert'
import { Button } from '@/shared/components/Button'
import { Input } from '@/shared/components/Input'
import { Modal } from '@/shared/components/Modal'
import { Select, type SelectOption } from '@/shared/components/Select'
import { Spinner } from '@/shared/components/Spinner'
import { Textarea } from '@/shared/components/Textarea'
import { useConfirmDialog } from '@/shared/hooks'
import styles from './WorkspaceSettingsPage.module.css'
import {
  useUpdateWorkspace,
  useInviteMember,
  useUpdateMember,
  useRemoveMember,
  useResendInvitation,
  useCancelInvitation,
} from '../api/mutations'
import { useWorkspaceMembersQuery, useWorkspaceInvitationsQuery } from '../api/queries'
import {
  useCurrentWorkspace,
  useIsWorkspaceAdmin,
} from '../stores/workspaceStore'
import type { WorkspaceMember, WorkspaceRole, WorkspaceInvitation } from '../types'

const roleOptions: SelectOption[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Membro' },
  { value: 'viewer', label: 'Visualizador' },
]

const inviteRoleOptions: SelectOption[] = [
  { value: 'admin', label: 'Admin - Pode gerenciar membros e projetos' },
  { value: 'member', label: 'Membro - Pode criar e editar conteúdo' },
  { value: 'viewer', label: 'Visualizador - Apenas visualização' },
]

export function WorkspaceSettingsPage() {
  const navigate = useNavigate()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const currentWorkspace = useCurrentWorkspace()
  const isAdmin = useIsWorkspaceAdmin()

  const [activeTab, setActiveTab] = useState<'general' | 'members'>('general')
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Form states
  const [name, setName] = useState(currentWorkspace?.name || '')
  const [description, setDescription] = useState(currentWorkspace?.description || '')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<WorkspaceRole, 'owner'>>('member')

  // Queries & Mutations
  const { data: members, isLoading: loadingMembers } = useWorkspaceMembersQuery(currentWorkspace?.id)
  const { data: invitations, isLoading: loadingInvitations } = useWorkspaceInvitationsQuery(currentWorkspace?.id)
  const updateWorkspace = useUpdateWorkspace()
  const inviteMember = useInviteMember()
  const updateMember = useUpdateMember()
  const removeMember = useRemoveMember()
  const resendInvitation = useResendInvitation()
  const cancelInvitation = useCancelInvitation()

  // Filter pending invitations
  const pendingInvitations = invitations?.filter(inv => inv.status === 'pending') || []

  if (!currentWorkspace) {
    return (
      <div className={styles.emptyState}>
        <Building2 size={48} />
        <h2>Nenhum workspace selecionado</h2>
        <p>Selecione um workspace para ver as configurações.</p>
      </div>
    )
  }

  const handleSaveGeneral = async () => {
    if (!currentWorkspace) return
    try {
      await updateWorkspace.mutateAsync({
        workspaceId: currentWorkspace.id,
        data: { name, description },
      })
    } catch (error) {
      console.error('Failed to update workspace:', error)
    }
  }

  const handleInvite = async () => {
    if (!currentWorkspace || !inviteEmail) return
    try {
      await inviteMember.mutateAsync({
        workspaceId: currentWorkspace.id,
        data: { email: inviteEmail, role: inviteRole },
      })
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('member')
    } catch (error) {
      console.error('Failed to invite member:', error)
    }
  }

  const handleRoleChange = async (member: WorkspaceMember, newRole: Exclude<WorkspaceRole, 'owner'>) => {
    if (!currentWorkspace) return
    try {
      await updateMember.mutateAsync({
        workspaceId: currentWorkspace.id,
        userId: member.user_id,
        data: { role: newRole },
      })
    } catch (error) {
      console.error('Failed to update member:', error)
    }
  }

  const handleRemoveMember = async (member: WorkspaceMember) => {
    if (!currentWorkspace) return
    const shouldRemove = await confirm({
      title: 'Remover membro',
      message: `Remover ${member.user?.email || 'este membro'} do workspace?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      variant: 'danger',
    })
    if (!shouldRemove) return
    try {
      await removeMember.mutateAsync({
        workspaceId: currentWorkspace.id,
        userId: member.user_id,
      })
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const handleResendInvitation = async (invitation: WorkspaceInvitation) => {
    if (!currentWorkspace) return
    try {
      await resendInvitation.mutateAsync({
        workspaceId: currentWorkspace.id,
        invitationId: invitation.id,
      })
    } catch (error) {
      console.error('Failed to resend invitation:', error)
    }
  }

  const handleCancelInvitation = async (invitation: WorkspaceInvitation) => {
    if (!currentWorkspace) return
    const shouldCancel = await confirm({
      title: 'Cancelar convite',
      message: `Cancelar convite para ${invitation.email}?`,
      confirmText: 'Cancelar convite',
      cancelText: 'Manter',
      variant: 'danger',
    })
    if (!shouldCancel) return
    try {
      await cancelInvitation.mutateAsync({
        workspaceId: currentWorkspace.id,
        invitationId: invitation.id,
      })
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
    }
  }

  const getRoleIcon = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner':
        return <Crown size={16} />
      case 'admin':
        return <Shield size={16} />
      case 'member':
        return <User size={16} />
      case 'viewer':
        return <Eye size={16} />
    }
  }

  const getRoleLabel = (role: WorkspaceRole) => {
    switch (role) {
      case 'owner':
        return 'Dono'
      case 'admin':
        return 'Admin'
      case 'member':
        return 'Membro'
      case 'viewer':
        return 'Visualizador'
    }
  }

  const formatExpirationDate = (date: string) => {
    const expDate = new Date(date)
    const now = new Date()
    const diffMs = expDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Expirado'
    if (diffDays === 0) return 'Expira hoje'
    if (diffDays === 1) return 'Expira amanhã'
    return `Expira em ${diffDays} dias`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className={styles.title}>Configurações do Workspace</h1>
          <p className={styles.subtitle}>{currentWorkspace.name}</p>
        </div>
      </div>

      <div className={styles.content}>
        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'general' ? styles.active : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Settings size={18} />
            Geral
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`}
            onClick={() => setActiveTab('members')}
          >
            <Users size={18} />
            Membros
          </button>
        </nav>

        <div className={styles.tabContent}>
          {activeTab === 'general' && (
            <div className={styles.generalTab}>
              <div className={styles.formGroup}>
                <Input
                  label="Nome do Workspace"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do workspace"
                  disabled={!isAdmin}
                />
              </div>

              <div className={styles.formGroup}>
                <Textarea
                  label="Descrição"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição opcional do workspace"
                  rows={3}
                  disabled={!isAdmin}
                />
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Projetos</span>
                  <span className={styles.infoValue}>
                    - / {currentWorkspace.max_projects}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Membros</span>
                  <span className={styles.infoValue}>
                    {members?.length || 0} / {currentWorkspace.max_members}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Seu papel</span>
                  <span className={styles.infoValue}>
                    {getRoleLabel(currentWorkspace.membership?.role || 'member')}
                  </span>
                </div>
              </div>

              {isAdmin && (
                <div className={styles.formActions}>
                  <Button
                    onClick={handleSaveGeneral}
                    disabled={updateWorkspace.isPending}
                  >
                    {updateWorkspace.isPending ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'members' && (
            <div className={styles.membersTab}>
              {isAdmin && (
                <div className={styles.membersHeader}>
                  <Button onClick={() => setShowInviteModal(true)}>
                    <UserPlus size={18} />
                    Convidar membro
                  </Button>
                </div>
              )}

              {loadingMembers ? (
                <div className={styles.loading}>
                  <Spinner />
                </div>
              ) : (
                <div className={styles.membersList}>
                  {members?.map((member) => (
                    <div key={member.id} className={styles.memberItem}>
                      <div className={styles.memberAvatar}>
                        {member.user?.raw_user_meta_data?.avatar_url ? (
                          <img
                            src={member.user.raw_user_meta_data.avatar_url}
                            alt=""
                          />
                        ) : (
                          <User size={20} />
                        )}
                      </div>

                      <div className={styles.memberInfo}>
                        <span className={styles.memberName}>
                          {member.user?.raw_user_meta_data?.name ||
                            member.user?.raw_user_meta_data?.full_name ||
                            member.user?.email ||
                            'Usuário'}
                        </span>
                        <span className={styles.memberEmail}>{member.user?.email}</span>
                      </div>

                      <div className={styles.memberRole}>
                        {member.role === 'owner' ? (
                          <span className={styles.roleBadge}>
                            {getRoleIcon(member.role)}
                            {getRoleLabel(member.role)}
                          </span>
                        ) : isAdmin ? (
                          <Select
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(member, e.target.value as Exclude<WorkspaceRole, 'owner'>)
                            }
                            options={roleOptions}
                          />
                        ) : (
                          <span className={styles.roleBadge}>
                            {getRoleIcon(member.role)}
                            {getRoleLabel(member.role)}
                          </span>
                        )}
                      </div>

                      {isAdmin && member.role !== 'owner' && (
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveMember(member)}
                          title="Remover membro"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!loadingMembers && (!members || members.length === 0) && (
                <div className={styles.emptyMembers}>
                  <Users size={48} />
                  <p>Nenhum membro encontrado</p>
                </div>
              )}

              {/* Pending Invitations Section */}
              {isAdmin && pendingInvitations.length > 0 && (
                <div className={styles.invitationsSection}>
                  <h3 className={styles.sectionTitle}>
                    <Mail size={18} />
                    Convites pendentes ({pendingInvitations.length})
                  </h3>

                  {loadingInvitations ? (
                    <div className={styles.loading}>
                      <Spinner />
                    </div>
                  ) : (
                    <div className={styles.invitationsList}>
                      {pendingInvitations.map((invitation) => (
                        <div key={invitation.id} className={styles.invitationItem}>
                          <div className={styles.invitationAvatar}>
                            <Mail size={20} />
                          </div>

                          <div className={styles.invitationInfo}>
                            <span className={styles.invitationEmail}>{invitation.email}</span>
                            <span className={styles.invitationMeta}>
                              <Clock size={12} />
                              {formatExpirationDate(invitation.expires_at)}
                            </span>
                          </div>

                          <div className={styles.invitationRole}>
                            <span className={styles.roleBadge}>
                              {getRoleIcon(invitation.role)}
                              {getRoleLabel(invitation.role)}
                            </span>
                          </div>

                          <div className={styles.invitationActions}>
                            <button
                              className={styles.resendButton}
                              onClick={() => handleResendInvitation(invitation)}
                              disabled={resendInvitation.isPending}
                              title="Reenviar convite"
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button
                              className={styles.cancelButton}
                              onClick={() => handleCancelInvitation(invitation)}
                              disabled={cancelInvitation.isPending}
                              title="Cancelar convite"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Convidar membro"
      >
        <div className={styles.inviteForm}>
          {inviteMember.error && (
            <Alert variant="error">
              {(inviteMember.error as Error).message || 'Erro ao enviar convite'}
            </Alert>
          )}

          <div className={styles.formGroup}>
            <Input
              label="Email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className={styles.formGroup}>
            <Select
              label="Papel"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Exclude<WorkspaceRole, 'owner'>)}
              options={inviteRoleOptions}
            />
          </div>

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail || inviteMember.isPending}
            >
              {inviteMember.isPending ? 'Enviando...' : 'Enviar convite'}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog />
    </div>
  )
}
