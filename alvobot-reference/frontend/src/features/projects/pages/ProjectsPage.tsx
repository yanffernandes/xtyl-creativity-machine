import { useState } from 'react'
import { Plus, Search, FolderKanban, Folder } from 'lucide-react'
import { Button, Input, Modal, Spinner, EmptyState, Alert } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './ProjectsPage.module.css'
import { useCreateProject, useUpdateProject, useDeleteProject } from '../api/mutations'
import { useProjects } from '../api/useProjects'
import { useProjectStats } from '../api/useProjectStats'
import { ProjectCard } from '../components/ProjectCard'
import { ProjectCreateWizard } from '../components/ProjectCreateWizard'
import { ProjectManageModal } from '../components/ProjectManageModal'
import type { Project, CreateProjectInput } from '../types'

export function ProjectsPage() {
  useDocumentTitle('Meus Blogs')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'error' | 'not_configured'>('all')
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false)
  const [managingProject, setManagingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [reinstallProject, setReinstallProject] = useState<Project | null>(null)

  const { data: allProjects, isLoading, error } = useProjects({ search })

  // Filter projects by connection status
  const projects = allProjects?.filter(project => {
    if (statusFilter === 'all') return true
    return project.connection_status === statusFilter
  })
  const { data: projectStats } = useProjectStats()
  const createMutation = useCreateProject()
  const updateMutation = useUpdateProject()
  const deleteMutation = useDeleteProject()

  const handleCreate = () => {
    setIsCreateWizardOpen(true)
  }

  const handleEdit = (project: Project) => {
    setManagingProject(project)
  }

  const handleDelete = (project: Project) => {
    setDeletingProject(project)
  }

  const handleCreateComplete = async (data: CreateProjectInput) => {
    // Create project immediately after Step 1 (name + domain)
    // The WordPress plugin will later update this project with credentials (login, password, token)
    await createMutation.mutateAsync(data)
    // Note: Wizard stays open so user can continue to Step 2 (install plugin)
  }

  const handleManageSave = async (data: Partial<CreateProjectInput>) => {
    if (managingProject) {
      await updateMutation.mutateAsync({ id: managingProject.id, ...data })
      setManagingProject(null)
    }
  }

  const confirmDelete = async () => {
    if (deletingProject) {
      await deleteMutation.mutateAsync({ id: deletingProject.id, name: deletingProject.name })
      setDeletingProject(null)
    }
  }

  // Calculate blog count indicator
  const totalBlogs = projects?.length || 0
  const maxBlogs = 7 // Default limit

  // Get article count for managing project
  const managingProjectStats = managingProject
    ? projectStats?.[managingProject.id]
    : undefined

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <Folder size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Meus Blogs</h1>
            <p className={styles.subtitle}>Gerencie todos os seus Blogs.</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.blogCount}>Blog: {totalBlogs}/{maxBlogs}</span>
          <Button leftIcon={<Plus size={18} />} onClick={handleCreate}>
            Adicionar novo Blog
          </Button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Buscar projetos..."
          leftIcon={<Search size={18} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          size="md"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className={styles.statusFilter}
        >
          <option value="all">Todos os status</option>
          <option value="connected">Conectados</option>
          <option value="error">Com erro</option>
          <option value="not_configured">Não configurados</option>
        </select>
      </div>

      {error && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar projetos: {error.message}
        </Alert>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner size="lg" />
        </div>
      ) : projects?.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={48} />}
          title="Nenhum projeto encontrado"
          description={search ? 'Tente uma busca diferente' : 'Crie seu primeiro projeto para começar'}
          action={
            !search && (
              <Button leftIcon={<Plus size={18} />} onClick={handleCreate}>
                Criar projeto
              </Button>
            )
          }
        />
      ) : (
        <div className={styles.grid}>
          {projects?.map((project) => {
            const stats = projectStats?.[project.id]
            return (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={handleEdit}
                onDelete={handleDelete}
                articleCount={stats?.articleCount || 0}
                lastArticleDate={stats?.lastArticleDate || undefined}
              />
            )
          })}
        </div>
      )}

      {/* Create Wizard Modal */}
      <ProjectCreateWizard
        isOpen={isCreateWizardOpen || !!reinstallProject}
        onClose={() => {
          setIsCreateWizardOpen(false)
          setReinstallProject(null)
        }}
        onComplete={handleCreateComplete}
        isLoading={createMutation.isPending}
        currentProjectCount={totalBlogs}
        maxProjects={maxBlogs}
        existingProject={reinstallProject ? {
          id: reinstallProject.id,
          name: reinstallProject.name,
          domain: reinstallProject.domain || '',
          default_language: reinstallProject.default_language,
        } : null}
      />

      {/* Manage Project Modal */}
      <ProjectManageModal
        project={managingProject}
        isOpen={!!managingProject}
        onClose={() => setManagingProject(null)}
        onSave={handleManageSave}
        onDelete={() => {
          if (managingProject) {
            setDeletingProject(managingProject)
            setManagingProject(null)
          }
        }}
        onReinstallPlugin={() => {
          if (managingProject) {
            setReinstallProject(managingProject)
          }
        }}
        isLoading={updateMutation.isPending}
        articleCount={managingProjectStats?.articleCount || 0}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
        title="Excluir projeto"
        size="sm"
      >
        <p className={styles.deleteMessage}>
          Tem certeza que deseja excluir o projeto <strong>{deletingProject?.name}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <div className={styles.deleteActions}>
          <Button variant="outline" onClick={() => setDeletingProject(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            isLoading={deleteMutation.isPending}
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}
