import { Globe, CheckCircle2 } from 'lucide-react'
import { Spinner } from '@/shared/components'
import type { Project } from '@/shared/types/entities'
import styles from './StepSelectProject.module.css'

interface StepSelectProjectProps {
  projects: Project[]
  selectedProjectId: number | null
  onSelect: (projectId: number) => void
  isLoading?: boolean
}

function getFaviconUrl(domain: string | undefined): string | null {
  if (!domain) return null
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`
}

export function StepSelectProject({
  projects,
  selectedProjectId,
  onSelect,
  isLoading,
}: StepSelectProjectProps) {
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Selecione o Projeto</h2>
        <p className={styles.description}>
          Escolha o blog para configurar a estrutura de base
        </p>
      </div>

      <div className={styles.projectList}>
        {projects.map((project) => {
          const faviconUrl = getFaviconUrl(project.domain)
          const isSelected = selectedProjectId === project.id

          return (
            <button
              key={project.id}
              type="button"
              className={`${styles.projectItem} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelect(project.id)}
            >
              <div className={styles.projectIcon}>
                {faviconUrl ? (
                  <>
                    {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
                    <img
                      src={faviconUrl}
                      alt=""
                      className={styles.favicon}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove(styles.hidden)
                      }}
                    />
                  </>
                ) : null}
                <Globe size={24} className={faviconUrl ? styles.hidden : ''} />
              </div>

              <div className={styles.projectInfo}>
                <span className={styles.projectName}>{project.name}</span>
                {project.domain && (
                  <span className={styles.projectDomain}>{project.domain}</span>
                )}
              </div>

              <div className={styles.projectStatus}>
                {project.status ? (
                  <span className={styles.statusActive}>
                    <span className={styles.statusDot} />
                    Ativo
                  </span>
                ) : (
                  <span className={styles.statusInactive}>Inativo</span>
                )}
              </div>

              {isSelected && (
                <div className={styles.selectedIndicator}>
                  <CheckCircle2 size={24} />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {projects.length === 0 && (
        <div className={styles.emptyState}>
          <Globe size={48} />
          <p>Nenhum projeto encontrado</p>
          <span>Crie um projeto primeiro na página de Projetos</span>
        </div>
      )}
    </div>
  )
}
