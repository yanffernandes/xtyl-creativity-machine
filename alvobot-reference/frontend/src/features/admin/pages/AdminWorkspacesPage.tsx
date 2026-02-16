import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Search,
  Users,
  FolderKanban,
  Trash2,
  ChevronRight,
  Plus,
  UserPlus,
  X,
} from 'lucide-react'
import { Button, Spinner, Modal, Input, RowActionsMenu, type RowActionItem } from '@/shared/components'
import { useColumnReorder, useColumnResize, useConfirmDialog, useDocumentTitle } from '@/shared/hooks'
import styles from './AdminWorkspacesPage.module.css'
import {
  useLogAdminAction,
  useCreateWorkspace,
  useDeleteWorkspace,
  useAddWorkspaceMember,
  useRemoveWorkspaceMember,
  useMoveProject,
  useRemoveProjectFromWorkspace,
} from '../api/mutations'
import {
  useAdminWorkspaces,
  useWorkspaceMembers,
  useWorkspaceProjects,
  useSearchUsers,
} from '../api/queries'
import { useAdminStore } from '../stores/adminStore'
import type { Workspace, WorkspaceMember, WorkspaceProject } from '../types'

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ==================== SUB-COMPONENTS ====================

interface MembersTabProps {
  workspaceId: string
  hasEditPermission: boolean
}

function MembersTab({ workspaceId, hasEditPermission }: MembersTabProps) {
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId)
  const addMember = useAddWorkspaceMember()
  const removeMember = useRemoveWorkspaceMember()
  const logAction = useLogAdminAction()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member')
  const [error, setError] = useState('')

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberEmail.trim()) return

    setError('')
    try {
      await addMember.mutateAsync({
        workspace_id: workspaceId,
        user_email: newMemberEmail.trim(),
        role: newMemberRole,
      })
      await logAction.mutateAsync({
        action: 'workspace_add_member',
        resource_type: 'workspace',
        resource_id: workspaceId,
        details: { member_email: newMemberEmail, role: newMemberRole },
      })
      setNewMemberEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar membro')
    }
  }

  const handleRemoveMember = async (member: WorkspaceMember) => {
    const confirmed = await confirm({
      title: 'Remover membro',
      message: `Remover ${member.email} do workspace?`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      variant: 'danger',
    })
    if (!confirmed) return

    try {
      await removeMember.mutateAsync({ memberId: member.id, workspaceId })
      await logAction.mutateAsync({
        action: 'workspace_remove_member',
        resource_type: 'workspace',
        resource_id: workspaceId,
        details: { member_email: member.email },
      })
    } catch (err) {
      console.error('Error removing member:', err)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.emptyList}>
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <div>
      {members && members.length > 0 ? (
        <div className={styles.listItems}>
          {members.map((member) => (
            <div key={member.id} className={styles.listItem}>
              <div className={styles.listItemInfo}>
                <span className={styles.listItemMain}>
                  {member.full_name || member.email}
                </span>
                <span className={styles.listItemSecondary}>{member.email}</span>
              </div>
              <div className={styles.listItemActions}>
                <span className={`${styles.roleBadge} ${styles[member.role]}`}>
                  {member.role === 'admin' ? 'Admin' : 'Membro'}
                </span>
                {member.status === 'pending' && (
                  <span className={`${styles.statusBadge} ${styles.pending}`}>
                    Pendente
                  </span>
                )}
                {hasEditPermission && (
                  <button
                    className={`${styles.actionButton} ${styles.danger}`}
                    onClick={() => handleRemoveMember(member)}
                    title="Remover membro"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyList}>
          <Users size={24} />
          <p>Nenhum membro adicional</p>
        </div>
      )}

      {hasEditPermission && (
        <form className={styles.addMemberForm} onSubmit={handleAddMember}>
          <input
            type="email"
            placeholder="Email do usuario..."
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            className={styles.addMemberInput}
          />
          <select
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'member')}
            className={styles.roleSelect}
          >
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </select>
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            isLoading={addMember.isPending}
          >
            <UserPlus size={14} />
            Adicionar
          </Button>
        </form>
      )}
      {error && <p className={styles.formError}>{error}</p>}
      <ConfirmDialog />
    </div>
  )
}

interface ProjectsTabProps {
  workspaceId: string
  allWorkspaces: Workspace[]
  hasEditPermission: boolean
}

function ProjectsTab({ workspaceId, allWorkspaces, hasEditPermission }: ProjectsTabProps) {
  const { data: projects, isLoading } = useWorkspaceProjects(workspaceId)
  const moveProject = useMoveProject()
  const removeProject = useRemoveProjectFromWorkspace()
  const logAction = useLogAdminAction()

  const handleMoveProject = async (project: WorkspaceProject, targetWorkspaceId: string) => {
    try {
      if (targetWorkspaceId === '') {
        // Remove from workspace
        await removeProject.mutateAsync({ projectId: project.id, workspaceId })
        await logAction.mutateAsync({
          action: 'project_remove_from_workspace',
          resource_type: 'project',
          resource_id: String(project.id),
          details: { project_name: project.name, from_workspace: workspaceId },
        })
      } else {
        // Move to another workspace
        await moveProject.mutateAsync({
          project_id: project.id,
          target_workspace_id: targetWorkspaceId,
        })
        await logAction.mutateAsync({
          action: 'project_move',
          resource_type: 'project',
          resource_id: String(project.id),
          details: {
            project_name: project.name,
            from_workspace: workspaceId,
            to_workspace: targetWorkspaceId,
          },
        })
      }
    } catch (err) {
      console.error('Error moving project:', err)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.emptyList}>
        <Spinner size="sm" />
      </div>
    )
  }

  return (
    <div>
      {projects && projects.length > 0 ? (
        <div className={styles.listItems}>
          {projects.map((project) => (
            <div key={project.id} className={styles.listItem}>
              <div className={styles.listItemInfo}>
                <span className={styles.listItemMain}>{project.name || project.domain}</span>
                <span className={styles.listItemSecondary}>
                  {project.domain} • {project.owner_email}
                </span>
              </div>
              {hasEditPermission && (
                <div className={styles.listItemActions}>
                  <select
                    className={styles.moveProjectSelect}
                    value={workspaceId}
                    onChange={(e) => handleMoveProject(project, e.target.value)}
                    title="Mover para outro workspace"
                  >
                    <option value={workspaceId}>Este workspace</option>
                    <option value="">-- Remover do workspace --</option>
                    {allWorkspaces
                      .filter((ws) => ws.id !== workspaceId)
                      .map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {ws.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyList}>
          <FolderKanban size={24} />
          <p>Nenhum projeto neste workspace</p>
        </div>
      )}
    </div>
  )
}

interface ExpandedWorkspaceRowProps {
  workspace: Workspace
  allWorkspaces: Workspace[]
  hasEditPermission: boolean
}

function ExpandedWorkspaceRow({
  workspace,
  allWorkspaces,
  hasEditPermission,
}: ExpandedWorkspaceRowProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'projects'>('members')

  return (
    <tr className={styles.expandedRow}>
      <td colSpan={6}>
        <div className={styles.expandedContent}>
          <div className={styles.expandedTabs}>
            <button
              className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <Users size={14} />
              Membros ({workspace.members_count})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'projects' ? styles.active : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <FolderKanban size={14} />
              Projetos ({workspace.projects_count})
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'members' ? (
              <MembersTab
                workspaceId={workspace.id}
                hasEditPermission={hasEditPermission}
              />
            ) : (
              <ProjectsTab
                workspaceId={workspace.id}
                allWorkspaces={allWorkspaces}
                hasEditPermission={hasEditPermission}
              />
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ==================== CREATE WORKSPACE MODAL ====================

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [selectedOwner, setSelectedOwner] = useState<{ id: string; email: string } | null>(null)
  const [maxProjects, setMaxProjects] = useState(5)
  const [maxMembers, setMaxMembers] = useState(3)
  const [error, setError] = useState('')
  const idBase = useId()
  const nameId = `${idBase}-name`
  const slugId = `${idBase}-slug`
  const descriptionId = `${idBase}-description`
  const ownerSearchId = `${idBase}-owner-search`
  const maxProjectsId = `${idBase}-max-projects`
  const maxMembersId = `${idBase}-max-members`

  const { data: searchResults } = useSearchUsers(ownerSearch)
  const createWorkspace = useCreateWorkspace()
  const logAction = useLogAdminAction()

  const handleNameChange = (value: string) => {
    setName(value)
    setSlug(generateSlug(value))
  }

  const handleSelectOwner = (user: { id: string; email: string; full_name: string | null }) => {
    setSelectedOwner({ id: user.id, email: user.email })
    setOwnerSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Nome e obrigatorio')
      return
    }
    if (!slug.trim()) {
      setError('Slug e obrigatorio')
      return
    }
    if (!selectedOwner) {
      setError('Selecione um proprietario')
      return
    }

    try {
      await createWorkspace.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        owner_user_id: selectedOwner.id,
        max_projects: maxProjects,
        max_members: maxMembers,
      })
      await logAction.mutateAsync({
        action: 'workspace_create',
        resource_type: 'workspace',
        details: { workspace_name: name, owner_email: selectedOwner.email },
      })
      onSuccess()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar workspace')
    }
  }

  const handleClose = () => {
    setName('')
    setSlug('')
    setDescription('')
    setOwnerSearch('')
    setSelectedOwner(null)
    setMaxProjects(5)
    setMaxMembers(3)
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Criar Workspace" size="md">
      <form onSubmit={handleSubmit}>
        <div className={styles.modalContent}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor={nameId}>Nome do Workspace</label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={styles.formInput}
              placeholder="Minha Empresa"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor={slugId}>Slug (URL)</label>
            <input
              id={slugId}
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={styles.formInput}
              placeholder="minha-empresa"
            />
            <span className={styles.formHint}>Usado na URL: /workspace/{slug || 'slug'}</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor={descriptionId}>Descricao (opcional)</label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.formTextarea}
              placeholder="Descricao do workspace..."
            />
          </div>

          <div className={styles.formGroup}>
            <span className={styles.formLabel}>Proprietario</span>
            {selectedOwner ? (
              <div className={styles.listItem}>
                <span className={styles.listItemMain}>{selectedOwner.email}</span>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => setSelectedOwner(null)}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className={styles.userSearchWrapper}>
                <Input
                  id={ownerSearchId}
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  className={styles.ownerSearchInput}
                  placeholder="Buscar por email..."
                  leftIcon={<Search size={16} />}
                  size="md"
                />
                {searchResults && searchResults.length > 0 && (
                  <div className={styles.userSearchResults}>
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        className={styles.userSearchItem}
                        onClick={() => handleSelectOwner(user)}
                        type="button"
                      >
                        <span className={styles.listItemMain}>
                          {user.full_name || user.email}
                        </span>
                        <span className={styles.listItemSecondary}>{user.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor={maxProjectsId}>Max. Projetos</label>
              <input
                id={maxProjectsId}
                type="number"
                value={maxProjects}
                onChange={(e) => setMaxProjects(Number(e.target.value))}
                className={styles.formInput}
                min={1}
                max={100}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel} htmlFor={maxMembersId}>Max. Membros</label>
              <input
                id={maxMembersId}
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                className={styles.formInput}
                min={1}
                max={50}
              />
            </div>
          </div>

          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={createWorkspace.isPending}>
              Criar Workspace
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ==================== MAIN PAGE ====================

export function AdminWorkspacesPage() {
  useDocumentTitle('Admin - Workspaces')
  const { hasPermission } = useAdminStore()
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortKey, setSortKey] = useState<'workspace' | 'owner' | 'projects' | 'members' | 'created_at'>(
    'created_at'
  )
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const tableRef = useRef<HTMLTableElement>(null)

  const { data: workspaces, isLoading, refetch } = useAdminWorkspaces({ search })
  const deleteWorkspace = useDeleteWorkspace()
  const logAction = useLogAdminAction()

  const canCreate = hasPermission('workspaces', 'create')
  const canEdit = hasPermission('workspaces', 'edit')
  const canDelete = hasPermission('workspaces', 'delete')

  const handleDeleteWorkspace = async () => {
    if (!selectedWorkspace) return

    try {
      await deleteWorkspace.mutateAsync(selectedWorkspace.id)
      await logAction.mutateAsync({
        action: 'workspace_delete',
        resource_type: 'workspace',
        resource_id: selectedWorkspace.id,
        details: {
          workspace_name: selectedWorkspace.name,
          owner_email: selectedWorkspace.owner_email,
        },
      })
      setShowDeleteModal(false)
      setSelectedWorkspace(null)
      refetch()
    } catch (error) {
      console.error('Error deleting workspace:', error)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleHeaderSort = useCallback((key: typeof sortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'))
        return prevKey
      }
      setSortDirection('desc')
      return key
    })
  }, [])

  const getSortIcon = useCallback(
    (key: typeof sortKey) => {
      if (sortKey !== key) {
        return <ArrowUpDown size={14} className={styles.sortIcon} />
      }
      return sortDirection === 'asc' ? (
        <ArrowUp size={14} className={styles.sortIconActive} />
      ) : (
        <ArrowDown size={14} className={styles.sortIconActive} />
      )
    },
    [sortDirection, sortKey]
  )

  const columns = useMemo(
    () => [
      { key: 'workspace', label: 'Workspace', sortable: true, sortKey: 'workspace', minWidth: 260, width: 320 },
      { key: 'owner', label: 'Proprietario', sortable: true, sortKey: 'owner', minWidth: 200, width: 260 },
      { key: 'projects', label: 'Projetos', sortable: true, sortKey: 'projects', minWidth: 120, width: 140 },
      { key: 'members', label: 'Membros', sortable: true, sortKey: 'members', minWidth: 120, width: 140 },
      { key: 'created_at', label: 'Criado em', sortable: true, sortKey: 'created_at', minWidth: 160, width: 180 },
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

  const sortedWorkspaces = useMemo(() => {
    if (!workspaces) return []
    const direction = sortDirection === 'asc' ? 1 : -1

    return [...workspaces].sort((a, b) => {
      switch (sortKey) {
        case 'workspace':
          return direction * a.name.localeCompare(b.name)
        case 'owner':
          return direction * (a.owner_name || a.owner_email || '').localeCompare(b.owner_name || b.owner_email || '')
        case 'projects':
          return direction * ((a.projects_count || 0) - (b.projects_count || 0))
        case 'members':
          return direction * ((a.members_count || 0) - (b.members_count || 0))
        case 'created_at':
        default: {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
          return direction * (dateA - dateB)
        }
      }
    })
  }, [sortDirection, sortKey, workspaces])

  const buildWorkspaceActions = (workspace: Workspace): RowActionItem[] => {
    if (!canDelete) return []

    return [
      {
        label: 'Excluir workspace',
        onSelect: () => {
          setSelectedWorkspace(workspace)
          setShowDeleteModal(true)
        },
        icon: <Trash2 size={16} />,
        destructive: true,
      },
    ]
  }

  // Calculate stats
  const stats = {
    total: workspaces?.length || 0,
    totalProjects: workspaces?.reduce((sum, ws) => sum + ws.projects_count, 0) || 0,
    totalMembers: workspaces?.reduce((sum, ws) => sum + ws.members_count, 0) || 0,
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Workspaces</h1>
          <p className={styles.subtitle}>Gerencie todos os workspaces do sistema</p>
        </div>
        {canCreate && (
          <Button leftIcon={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>
            Criar Workspace
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Building2 size={20} />
          </div>
          <div>
            <div className={styles.statLabel}>Total de Workspaces</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <FolderKanban size={20} />
          </div>
          <div>
            <div className={styles.statLabel}>Total de Projetos</div>
            <div className={styles.statValue}>{stats.totalProjects}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.statLabel}>Total de Membros</div>
            <div className={styles.statValue}>{stats.totalMembers}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={styles.filters}>
        <Input
          placeholder="Buscar por nome ou slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
          leftIcon={<Search size={18} />}
          size="md"
        />
      </div>

      {/* Workspaces Table */}
      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : !workspaces || workspaces.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={48} />
          <h3>Nenhum workspace encontrado</h3>
          <p>Tente ajustar os filtros de busca</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table} ref={tableRef}>
            <thead>
              <tr>
                {orderedColumns.map((column) => {
                  const isSortable = column.sortable && column.sortKey
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
                            onClick={() => handleHeaderSort(column.sortKey as typeof sortKey)}
                          >
                            {column.label}
                            {getSortIcon(column.sortKey as typeof sortKey)}
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
              {sortedWorkspaces.map((workspace) => (
                <Fragment key={workspace.id}>
                  <tr
                    className={`${styles.mainRow} ${expandedId === workspace.id ? styles.expanded : ''}`}
                    onClick={() => toggleExpand(workspace.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleExpand(workspace.id)
                      }
                    }}
                    tabIndex={0}
                    aria-expanded={expandedId === workspace.id}
                  >
                    {orderedColumns.map((column) => {
                      const columnWidth = columnWidths[column.key]

                      if (column.key === 'workspace') {
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            <div className={styles.workspaceCell}>
                              <ChevronRight
                                size={16}
                                className={`${styles.expandIcon} ${expandedId === workspace.id ? styles.expanded : ''}`}
                              />
                              <div className={styles.workspaceAvatar}>
                                {workspace.name.charAt(0).toUpperCase()}
                              </div>
                              <div className={styles.workspaceInfo}>
                                <span className={styles.workspaceName}>{workspace.name}</span>
                                <span className={styles.workspaceSlug}>/{workspace.slug}</span>
                              </div>
                            </div>
                          </td>
                        )
                      }

                      if (column.key === 'owner') {
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            <div className={styles.ownerCell}>
                              <span className={styles.ownerName}>
                                {workspace.owner_name || 'Sem nome'}
                              </span>
                              <span className={styles.ownerEmail}>{workspace.owner_email}</span>
                            </div>
                          </td>
                        )
                      }

                      if (column.key === 'projects') {
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            <span className={styles.countBadge}>
                              <FolderKanban size={14} />
                              {workspace.projects_count}
                            </span>
                          </td>
                        )
                      }

                      if (column.key === 'members') {
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            <span className={styles.countBadge}>
                              <Users size={14} />
                              {workspace.members_count}
                            </span>
                          </td>
                        )
                      }

                      if (column.key === 'created_at') {
                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            {formatDate(workspace.created_at)}
                          </td>
                        )
                      }

                      if (column.key === 'actions') {
                        const actions = buildWorkspaceActions(workspace)

                        return (
                          <td key={column.key} data-column-key={column.key} style={{ width: columnWidth || undefined }}>
                            <div className={styles.actionsCell}>
                              {actions.length > 0 ? (
                                <RowActionsMenu items={actions} ariaLabel="Acoes do workspace" />
                              ) : (
                                <span className={styles.actionsPlaceholder} />
                              )}
                            </div>
                          </td>
                        )
                      }

                      return null
                    })}
                  </tr>
                  {expandedId === workspace.id && (
                    <ExpandedWorkspaceRow
                      workspace={workspace}
                      allWorkspaces={workspaces}
                      hasEditPermission={canEdit}
                    />
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedWorkspace(null)
        }}
        title="Excluir Workspace"
      >
        <div className={styles.modalContent}>
          <p className={styles.modalText}>
            Tem certeza que deseja excluir o workspace{' '}
            <strong>{selectedWorkspace?.name}</strong>?
          </p>
          <p className={styles.modalWarning}>
            Os projetos associados nao serao excluidos, mas perderao a associacao com este
            workspace.
          </p>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false)
                setSelectedWorkspace(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteWorkspace}
              isLoading={deleteWorkspace.isPending}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
