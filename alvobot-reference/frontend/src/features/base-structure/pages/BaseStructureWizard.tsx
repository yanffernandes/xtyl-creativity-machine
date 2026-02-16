import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Check, Layers } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProjects } from '@/features/projects/api/useProjects'
import { Button, Spinner, Alert } from '@/shared/components'
import { useSaveStructure } from '../api/mutations'
import {
  Stepper,
  StepSelectProject,
  StepGenerateNiches,
  StepSelectCategories,
  StepInstallationType,
  StepSelectArticles,
} from '../components'
import styles from './BaseStructureWizard.module.css'

const STEPS = [
  { number: 1, label: 'Projeto' },
  { number: 2, label: 'Nicho' },
  { number: 3, label: 'Categorias' },
  { number: 4, label: 'Instalação' },
  { number: 5, label: 'Artigos' },
]

type InstallationType = 'fast' | 'custom'

interface InstallationConfig {
  createAuthors: boolean
  createLogo: boolean
  updateTitle: boolean
}

interface ArticleData {
  id: string
  title: string
  category: string
}

export function BaseStructureWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Project selection
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  // Step 2: Niche selection
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null)

  // Step 3: Category selection
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Step 4: Installation type
  const [installationType, setInstallationType] = useState<InstallationType>('fast')
  const [installationConfig, setInstallationConfig] = useState<InstallationConfig>({
    createAuthors: true,
    createLogo: true,
    updateTitle: true,
  })

  // Step 5: Article selection
  const [selectedArticles, setSelectedArticles] = useState<string[]>([])
  // Store the actual article data from the generated titles
  const articlesDataRef = useRef<Map<string, ArticleData>>(new Map())

  // Submission state
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [saveResult, setSaveResult] = useState<{ articlesCreated: number; categoriesCreated: number } | null>(null)

  // Mutations
  const saveStructureMutation = useSaveStructure()

  // Queries
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects()

  const selectedProject = projects?.find(p => p.id === selectedProjectId)
  const isSubmitting = saveStructureMutation.isPending

  // Load existing niche when project is selected
  useEffect(() => {
    if (selectedProject?.niche_selected) {
      setSelectedNiche(selectedProject.niche_selected)
    }
  }, [selectedProject])

  // Validation for each step
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return selectedProjectId !== null
      case 2:
        return selectedNiche !== null
      case 3:
        return selectedCategories.length >= 3
      case 4:
        return true // Installation type always valid
      case 5:
        return selectedArticles.length >= 30
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 5 && canProceed()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (step: number) => {
    // Only allow going back, not forward
    if (step < currentStep) {
      setCurrentStep(step)
    }
  }

  const handleSubmit = async () => {
    setSubmitError(null)

    if (!selectedProjectId || !selectedNiche) {
      setSubmitError('Dados do projeto incompletos.')
      return
    }

    // Get the actual article data from the ref
    const articles = selectedArticles
      .map(id => articlesDataRef.current.get(id))
      .filter((article): article is ArticleData => article !== undefined)

    if (articles.length === 0) {
      setSubmitError('Nenhum artigo selecionado.')
      return
    }

    // Determine toggle values based on installation type
    // Fast installation: all toggles true
    // Custom installation: use individual config values
    const isFastInstall = installationType === 'fast'
    const authorToggle = isFastInstall || installationConfig.createAuthors
    const logoToggle = isFastInstall || installationConfig.createLogo
    const titleToggle = isFastInstall || installationConfig.updateTitle

    try {
      const result = await saveStructureMutation.mutateAsync({
        projectId: selectedProjectId,
        niche: selectedNiche,
        categories: selectedCategories,
        articles,
        installationType,
        authorToggle,
        logoToggle,
        titleToggle,
      })

      setSaveResult({
        articlesCreated: result.articlesCreated,
        categoriesCreated: result.categoriesCreated,
      })
      setIsComplete(true)
    } catch (error) {
      console.error('Failed to save structure:', error)
      setSubmitError('Erro ao criar estrutura de base. Tente novamente.')
    }
  }

  const handleReset = () => {
    setCurrentStep(1)
    setSelectedProjectId(null)
    setSelectedNiche(null)
    setSelectedCategories([])
    setInstallationType('fast')
    setInstallationConfig({
      createAuthors: true,
      createLogo: true,
      updateTitle: true,
    })
    setSelectedArticles([])
    articlesDataRef.current.clear()
    setIsComplete(false)
    setSubmitError(null)
    setSaveResult(null)
  }

  // Callback to store article data when titles are generated
  const handleArticlesGenerated = (articles: Array<{ id: string; title: string; category: string }>) => {
    articlesDataRef.current.clear()
    articles.forEach(article => {
      articlesDataRef.current.set(article.id, {
        id: article.id,
        title: article.title,
        category: article.category,
      })
    })
  }

  // Complete screen
  if (isComplete) {
    return (
      <div className={styles.container}>
        <div className={styles.completeScreen}>
          <div className={styles.completeIcon}>
            <Check size={48} />
          </div>
          <h1>Estrutura Criada com Sucesso!</h1>
          <p>
            A estrutura de base para <strong>{selectedProject?.name}</strong> foi configurada.
          </p>
          <div className={styles.completeSummary}>
            <div className={styles.summaryItem}>
              <span>Nicho:</span>
              <strong>{selectedNiche}</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Categorias Criadas:</span>
              <strong>{saveResult?.categoriesCreated ?? selectedCategories.length}</strong>
            </div>
            <div className={styles.summaryItem}>
              <span>Artigos Criados:</span>
              <strong>{saveResult?.articlesCreated ?? selectedArticles.length}</strong>
            </div>
          </div>
          <div className={styles.completeActions}>
            <Button variant="outline" onClick={handleReset}>
              Configurar Outro Projeto
            </Button>
            <Button variant="primary" onClick={() => navigate('/')}>
              Ver Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <Layers size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Estrutura de Base</h1>
            <p className={styles.subtitle}>Configure as 4 camadas do seu blog em 5 passos simples</p>
          </div>
        </div>
      </div>

      <div className={styles.stepperWrapper}>
        <Stepper
          steps={STEPS}
          currentStep={currentStep}
          onStepClick={handleStepClick}
        />
      </div>

      {projectsError && (
        <Alert variant="error" className={styles.alert}>
          Erro ao carregar projetos: {projectsError.message}
        </Alert>
      )}

      {submitError && (
        <Alert variant="error" className={styles.alert}>
          {submitError}
        </Alert>
      )}

      <div className={styles.content}>
        {currentStep === 1 && (
          <StepSelectProject
            projects={projects || []}
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
            isLoading={projectsLoading}
          />
        )}

        {currentStep === 2 && (
          <StepGenerateNiches
            selectedNiche={selectedNiche}
            onSelect={setSelectedNiche}
            projectDomain={selectedProject?.domain}
            existingNiche={selectedProject?.niche_selected}
          />
        )}

        {currentStep === 3 && (
          <StepSelectCategories
            selectedCategories={selectedCategories}
            onSelect={setSelectedCategories}
            niche={selectedNiche}
            projectId={selectedProjectId}
            minRequired={3}
            maxAllowed={8}
          />
        )}

        {currentStep === 4 && (
          <StepInstallationType
            installationType={installationType}
            config={installationConfig}
            onTypeChange={setInstallationType}
            onConfigChange={setInstallationConfig}
          />
        )}

        {currentStep === 5 && (
          <StepSelectArticles
            selectedArticles={selectedArticles}
            onSelect={setSelectedArticles}
            onArticlesGenerated={handleArticlesGenerated}
            categories={selectedCategories}
            niche={selectedNiche}
            requiredCount={30}
          />
        )}
      </div>

      <div className={styles.footer}>
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 1}
          leftIcon={<ArrowLeft size={18} />}
        >
          Voltar
        </Button>

        <div className={styles.footerInfo}>
          Passo {currentStep} de {STEPS.length}
        </div>

        {currentStep < 5 ? (
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={!canProceed()}
            rightIcon={<ArrowRight size={18} />}
          >
            Próximo
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting}
            leftIcon={isSubmitting ? <Spinner size="sm" /> : <Check size={18} />}
          >
            {isSubmitting ? 'Criando...' : 'Criar Estrutura'}
          </Button>
        )}
      </div>
    </div>
  )
}
