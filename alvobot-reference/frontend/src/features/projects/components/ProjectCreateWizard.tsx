import { useState, useEffect, useRef, useCallback } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Globe,
  Download,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { useGoogleLanguages } from '@/features/keywords/api/useKeywords'
import { Button, Input, Modal, SearchableSelect } from '@/shared/components'
import styles from './ProjectCreateWizard.module.css'
import { useUpdateProject } from '../api/mutations'
import { useProjects } from '../api/useProjects'
import { useTestWordPressConnection, useInstallSinglePlugin } from '../api/wordpress'
import type { CreateProjectInput } from '../types'

const step1Schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  domain: z.string().min(1, 'URL é obrigatória').url('URL inválida'),
  default_language: z.string().optional(),
})

type Step1Data = z.infer<typeof step1Schema>

interface ProjectCreateWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (data: CreateProjectInput) => void
  isLoading?: boolean
  currentProjectCount: number
  maxProjects: number
  /** When provided, wizard starts at Step 2 (plugin installation) for existing project */
  existingProject?: { id: number; name: string; domain: string; default_language?: string } | null
}

const ESSENTIAL_PLUGINS = [
  { name: 'Instant Indexing', slug: 'fast-indexing-api' },
  { name: 'Missed Schedule Posts', slug: 'missed-scheduled-posts-publisher' },
  { name: 'Rank Math', slug: 'seo-by-rank-math' },
  { name: 'JetPack', slug: 'jetpack' },
  { name: 'Widgets Clássicos', slug: 'classic-widgets' },
  { name: 'Cookie Notice', slug: 'cookie-notice' },
  { name: 'Site Kit by Google', slug: 'google-site-kit' },
  { name: 'Polylang', slug: 'polylang' },
]

const PLUGIN_DOWNLOAD_URL = 'https://github.com/alvobot/alvobot-plugin-manager/archive/refs/heads/main.zip'

export function ProjectCreateWizard({
  isOpen,
  onClose,
  onComplete,
  isLoading: _isLoading,
  currentProjectCount,
  maxProjects,
  existingProject,
}: ProjectCreateWizardProps) {
  void _isLoading // Unused but required by interface
  const [currentStep, setCurrentStep] = useState(1)
  const [projectData, setProjectData] = useState<Step1Data | null>(null)
  const isReinstallMode = !!existingProject
  const [waitingTimeout, setWaitingTimeout] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [pluginInstallationStatus, setPluginInstallationStatus] = useState<
    Array<{ slug: string; name: string; status: 'pending' | 'installing' | 'installed' | 'error' | 'already_installed'; error?: string }>
  >(ESSENTIAL_PLUGINS.map(p => ({ slug: p.slug, name: p.name, status: 'pending' })))
  const [isInstallingPlugins, setIsInstallingPlugins] = useState(false)
  const [installationComplete, setInstallationComplete] = useState(false)
  const pollingActiveRef = useRef(false)
  const installationStartedRef = useRef(false)
  const installationCompleteRef = useRef(false)

  const { refetch } = useProjects()
  const testConnectionMutation = useTestWordPressConnection()
  const installSinglePluginMutation = useInstallSinglePlugin()
  const updateProjectMutation = useUpdateProject()

  // Stable refs for values used inside polling useEffect to avoid dependency churn
  const refetchRef = useRef(refetch)
  const testConnectionMutationRef = useRef(testConnectionMutation)
  const installSinglePluginMutationRef = useRef(installSinglePluginMutation)
  const updateProjectMutationRef = useRef(updateProjectMutation)
  const handleCloseRef = useRef(onClose)

  // Keep refs in sync
  refetchRef.current = refetch
  testConnectionMutationRef.current = testConnectionMutation
  installSinglePluginMutationRef.current = installSinglePluginMutation
  updateProjectMutationRef.current = updateProjectMutation
  handleCloseRef.current = onClose
  const { data: languageOptions = [], isLoading: isLoadingLanguages } = useGoogleLanguages()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: '',
      domain: '',
      default_language: '',
    },
  })

  // Define handleClose early so it can be used in useEffect
  const handleClose = useCallback(() => {
    // Just close the modal - parent will set reinstallProject to null
    // which will trigger isOpen to become false
    onClose()
  }, [onClose])

  // Initialize wizard at Step 2 when existingProject is provided (reinstall mode)
  // Only run once when modal first opens - don't reset if already on Step 3 or completed
  useEffect(() => {
    if (isOpen && existingProject && currentStep === 1 && !installationCompleteRef.current) {
      setProjectData({
        name: existingProject.name,
        domain: existingProject.domain,
        default_language: existingProject.default_language || '',
      })
      setCurrentStep(2)
    }
  }, [isOpen, existingProject, currentStep])

  // Monitor for plugin connection in Step 3
  useEffect(() => {
    // Don't start polling if already complete or already polling
    if (currentStep !== 3 || !projectData?.domain || pollingActiveRef.current || installationComplete) {
      return
    }

    console.info('[Wizard] Starting polling for domain:', projectData.domain)
    setConnectionError(null)
    pollingActiveRef.current = true

    const checkConnection = async () => {
      // Early exit if installation is complete or already started
      if (installationCompleteRef.current || installationStartedRef.current) {
        console.info('[Wizard] Skipping check - installation complete or in progress')
        return
      }

      try {
        // Refetch projects to get the latest data (including token from plugin callback)
        const result = await refetchRef.current()

        // Normalize domain for comparison
        const normalizeDomain = (domain: string) =>
          domain.replace(/\/$/, '').toLowerCase().trim()

        const targetDomain = normalizeDomain(projectData.domain!)

        // Find the project we just created
        const project = result.data?.find((p) => {
          const projectDomain = p.domain ? normalizeDomain(p.domain) : ''
          return projectDomain === targetDomain
        })

        if (!project) {
          console.info('[Wizard] Project not found yet')
          return
        }

        console.info('[Wizard] Found project:', {
          id: project.id,
          name: project.name,
          domain: project.domain,
          token: project.token ? '***' : 'NOT SET',
          status: project.status,
        })

        // Check if project already has status=true (already completed)
        // In reinstall mode, we skip this check and proceed to reinstall plugins
        if (project.status === true && !isReinstallMode) {
          console.info('[Wizard] Project already connected!')
          pollingActiveRef.current = false
          handleCloseRef.current()
          return
        }

        // Check if we have a token (sent by the plugin)
        if (!project.token) {
          console.info('[Wizard] Waiting for plugin to send token...')
          return
        }

        // In reinstall mode with status=true, proceed directly to plugin installation
        if (isReinstallMode && project.status === true) {
          console.info('[Wizard] Reinstall mode - proceeding to reinstall plugins...')
        }

        // Check if installation has already started (prevent duplicate runs)
        if (installationStartedRef.current) {
          console.info('[Wizard] Installation already in progress, skipping...')
          return
        }

        console.info('[Wizard] Token received! Testing WordPress connection...')

        // Test WordPress connection using token as password
        const connectionResult = await testConnectionMutationRef.current.mutateAsync({
          domain: project.domain!,
          login: project.login || 'alvobot',
          password: project.token, // Use token as web password
        })

        if (!connectionResult.success) {
          console.error('[Wizard] Connection test failed:', connectionResult.message)
          setConnectionError(connectionResult.message)
          return
        }

        console.info('[Wizard] Connection test successful! Installing essential plugins one by one...')

        // Mark that installation has started (prevent duplicate calls)
        // eslint-disable-next-line require-atomic-updates
        installationStartedRef.current = true
        setIsInstallingPlugins(true)

        // Stop polling while installing
        pollingActiveRef.current = false

        // Install plugins one by one with real-time UI updates
        let installedCount = 0
        let failedCount = 0

        for (let i = 0; i < ESSENTIAL_PLUGINS.length; i++) {
          const plugin = ESSENTIAL_PLUGINS[i]

          // Mark current plugin as installing
          setPluginInstallationStatus(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'installing' as const } : p
          ))

          console.info(`[Wizard] Installing plugin ${i + 1}/${ESSENTIAL_PLUGINS.length}: ${plugin.name}`)

          try {
            const result = await installSinglePluginMutationRef.current.mutateAsync({
              projectId: project.id,
              pluginSlug: plugin.slug,
              token: project.token,
            })

            console.info(`[Wizard] Plugin ${plugin.name} result:`, result)

            // Update this plugin's status based on result
            setPluginInstallationStatus(prev => prev.map((p, idx) =>
              idx === i ? {
                ...p,
                status: result.status,
                error: result.error
              } : p
            ))

            if (result.status === 'installed' || result.status === 'already_installed') {
              installedCount++
            } else {
              failedCount++
            }
          } catch (pluginError: unknown) {
            console.error(`[Wizard] Error installing ${plugin.name}:`, pluginError)
            const errorMessage =
              pluginError instanceof Error ? pluginError.message : 'Erro ao instalar'

            // Mark plugin as error
            setPluginInstallationStatus(prev => prev.map((p, idx) =>
              idx === i ? {
                ...p,
                status: 'error' as const,
                error: errorMessage
              } : p
            ))
            failedCount++
          }
        }

        console.info(`[Wizard] Plugin installation complete. Installed: ${installedCount}, Failed: ${failedCount}`)

        // Update project status to true
        try {
          await updateProjectMutationRef.current.mutateAsync({
            id: project.id,
            status: true,
          })
          console.info('[Wizard] Project status updated to true. Setup complete!')
        } catch (updateError) {
          console.error('[Wizard] Error updating project status:', updateError)
        }

        // Show success state
        // eslint-disable-next-line require-atomic-updates
        installationCompleteRef.current = true
        setInstallationComplete(true)
        setIsInstallingPlugins(false)
        console.info('[Wizard] Installation complete - showing success screen')
      } catch (error: unknown) {
        console.error('[Wizard] Error during polling:', error)
        setConnectionError(error instanceof Error ? error.message : 'Erro ao configurar projeto')
      }
    }

    const checkInterval = setInterval(checkConnection, 3000)

    // Timeout after 180 seconds (3 minutes) - installation can take up to 2 minutes
    const timeout = setTimeout(() => {
      console.info('[Wizard] Timeout reached - no connection detected')
      setWaitingTimeout(true)
      pollingActiveRef.current = false
    }, 180000)

    // Elapsed time counter
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => {
      console.info('[Wizard] Cleaning up polling intervals')
      clearInterval(checkInterval)
      clearInterval(timeInterval)
      clearTimeout(timeout)
      pollingActiveRef.current = false
    }
   
  }, [
    currentStep,
    projectData?.domain,
    installationComplete,
    isReinstallMode,
  ])

  const handleStep1Submit = async (data: Step1Data) => {
    setProjectData(data)
    // Create project immediately after Step 1 so plugin can update it later
    await onComplete({
      name: data.name,
      domain: data.domain,
      default_language: data.default_language || 'pt',
    })
    setCurrentStep(2)
  }

  const handleDownloadPlugin = () => {
    window.open(PLUGIN_DOWNLOAD_URL, '_blank')
  }

  const handleOpenWordPress = () => {
    if (projectData?.domain) {
      const wpAdmin = `${projectData.domain.replace(/\/$/, '')  }/wp-admin/plugin-install.php`
      window.open(wpAdmin, '_blank')
    }
  }

  const handlePluginInstalled = () => {
    setWaitingTimeout(false)
    setElapsedTime(0)
    setCurrentStep(3)
  }

  const handleBackToStep2 = () => {
    setWaitingTimeout(false)
    setElapsedTime(0)
    setConnectionError(null)
    setIsInstallingPlugins(false)
    setInstallationComplete(false)
    setPluginInstallationStatus(ESSENTIAL_PLUGINS.map(p => ({ slug: p.slug, name: p.name, status: 'pending' })))
    installationStartedRef.current = false
    installationCompleteRef.current = false
    pollingActiveRef.current = false
    setCurrentStep(2)
  }

  // Reset all state when modal closes (isOpen becomes false)
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1)
      setProjectData(null)
      setWaitingTimeout(false)
      setElapsedTime(0)
      setConnectionError(null)
      setIsInstallingPlugins(false)
      setInstallationComplete(false)
      setPluginInstallationStatus(ESSENTIAL_PLUGINS.map(p => ({ slug: p.slug, name: p.name, status: 'pending' })))
      installationStartedRef.current = false
      installationCompleteRef.current = false
      pollingActiveRef.current = false
      reset()
    }
  }, [isOpen, reset])

  const steps = [
    { number: 1, label: 'Cadastrar Blog' },
    { number: 2, label: 'Instalar Plugin' },
    { number: 3, label: 'Aguardando Conexão' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" size="lg">
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isReinstallMode ? 'Refazer Instalação do Plugin' : 'Adicionar novo Projeto'}
          </h2>
          {isReinstallMode && projectData && (
            <p className={styles.subtitle}>Projeto: {projectData.name}</p>
          )}
        </div>

        {/* Stepper */}
        <div className={styles.stepper}>
          {steps.map((step, index) => {
            // In reinstall mode, Step 1 is always completed
            const isStepCompleted = currentStep > step.number || (isReinstallMode && step.number === 1)
            const isStepActive = currentStep === step.number

            return (
            <div key={step.number} className={styles.stepWrapper}>
              <div className={styles.stepItem}>
                <div
                  className={`${styles.stepNumber} ${
                    isStepActive
                      ? styles.active
                      : isStepCompleted
                        ? styles.completed
                        : ''
                  }`}
                >
                  {isStepCompleted ? <CheckCircle size={16} /> : step.number}
                </div>
                <span
                  className={`${styles.stepLabel} ${
                    currentStep === step.number ? styles.activeLabel : ''
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`${styles.stepLine} ${
                    isStepCompleted ? styles.completedLine : ''
                  }`}
                />
              )}
            </div>
          )})}

        </div>

        {/* Step Content */}
        <div className={styles.content}>
          {/* Step 1: Cadastrar Blog */}
          {currentStep === 1 && (
            <form onSubmit={handleSubmit(handleStep1Submit)} className={styles.form}>
              <div className={styles.field}>
                <Input
                  label="Digite o nome do seu projeto"
                  placeholder="Ex.: Meu Blog"
                  error={errors.name?.message}
                  fullWidth
                  {...register('name')}
                />
              </div>

              <div className={styles.field}>
                <div className={styles.hint}>
                  <Globe size={14} />
                  <span>Exemplo correto: https://meublog.com.br</span>
                </div>
                <Input
                  label="Digite a URL do seu projeto"
                  placeholder="Ex.: https://meublog.com.br"
                  error={errors.domain?.message}
                  fullWidth
                  {...register('domain')}
                />
              </div>

              <div className={styles.field}>
                <Controller
                  name="default_language"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      label="Selecione o idioma padrão do seu wordpress"
                      options={languageOptions}
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Selecione o idioma"
                      searchPlaceholder="Buscar idioma..."
                      isLoading={isLoadingLanguages}
                      fullWidth
                    />
                  )}
                />
              </div>

              <div className={styles.footer}>
                <span className={styles.projectCount}>
                  Projetos: {currentProjectCount}/{maxProjects}
                </span>
                <Button type="submit" className={styles.continueButton}>
                  Continuar
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Instalar Plugin */}
          {currentStep === 2 && (
            <div className={styles.step2Content}>
              <div className={styles.instruction}>
                <div className={styles.instructionNumber}>1</div>
                <div className={styles.instructionContent}>
                  <h4 className={styles.instructionTitle}>Baixe o plugin AlvoBot</h4>
                  <Button
                    variant="secondary"
                    onClick={handleDownloadPlugin}
                    leftIcon={<Download size={16} />}
                    fullWidth
                    className={styles.downloadButton}
                  >
                    Baixar Plugin AlvoBot
                  </Button>
                </div>
              </div>

              <div className={styles.instruction}>
                <div className={styles.instructionNumber}>2</div>
                <div className={styles.instructionContent}>
                  <h4 className={styles.instructionTitle}>Acesse seu WordPress</h4>
                  <Button
                    variant="outline"
                    onClick={handleOpenWordPress}
                    leftIcon={<ExternalLink size={16} />}
                    fullWidth
                  >
                    Abrir WordPress em nova aba
                  </Button>
                </div>
              </div>

              <div className={styles.instruction}>
                <div className={styles.instructionNumber}>3</div>
                <div className={styles.instructionContent}>
                  <h4 className={styles.instructionTitle}>Instale e ative o plugin</h4>
                  <ol className={styles.stepsList}>
                    <li>Vá em Plugins → Adicionar novo</li>
                    <li>Clique em "Enviar plugin"</li>
                    <li>Escolha o arquivo .zip que você baixou</li>
                    <li>Clique em "Instalar agora"</li>
                    <li>Ative o plugin</li>
                  </ol>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handlePluginInstalled}
                leftIcon={<CheckCircle size={16} />}
                fullWidth
                className={styles.confirmButton}
              >
                Já instalei e ativei o plugin
              </Button>

              <div className={styles.helpBox}>
                <HelpCircle size={16} />
                <span>
                  <strong>Precisa de ajuda?</strong> Entre em contato com nosso suporte para assistência
                  na instalação.
                </span>
              </div>
            </div>
          )}

          {/* Step 3: Aguardando Conexão */}
          {currentStep === 3 && (
            <div className={styles.step3Content}>
              {/* Success State - Installation Complete */}
              {installationComplete ? (
                <>
                  <div className={styles.successSection}>
                    <CheckCircle size={64} className={styles.successIcon} />
                    <h3 className={styles.successTitle}>Tudo pronto!</h3>
                    <p className={styles.successText}>
                      {isReinstallMode
                        ? 'Os plugins foram reinstalados com sucesso. Seu projeto está conectado e funcionando.'
                        : 'Seu projeto foi configurado com sucesso e todos os plugins essenciais foram instalados.'}
                    </p>
                  </div>

                  {/* Show plugin installation summary */}
                  <div className={styles.pluginsList}>
                    {pluginInstallationStatus.map((plugin) => (
                      <div key={plugin.slug} className={styles.pluginItem}>
                        <div className={styles.pluginIcon}>
                          {(plugin.status === 'installed' || plugin.status === 'already_installed') && (
                            <CheckCircle size={16} className={styles.pluginIconSuccess} />
                          )}
                          {plugin.status === 'error' && (
                            <AlertCircle size={16} className={styles.pluginIconError} />
                          )}
                        </div>
                        <div className={styles.pluginInfo}>
                          <span className={styles.pluginName}>{plugin.name}</span>
                        </div>
                        <div className={styles.pluginStatus}>
                          {plugin.status === 'installed' && (
                            <span className={styles.statusSuccess}>Instalado</span>
                          )}
                          {plugin.status === 'already_installed' && (
                            <span className={styles.statusSuccess}>Já instalado</span>
                          )}
                          {plugin.status === 'error' && (
                            <span className={styles.statusError}>Erro</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleClose}
                    fullWidth
                    className={styles.successButton}
                  >
                    Concluir
                  </Button>
                </>
              ) : !waitingTimeout ? (
                <>
                  <div className={styles.loadingSection}>
                    {!isInstallingPlugins ? (
                      <>
                        <Loader2 size={48} className={styles.spinner} />
                        <h3 className={styles.loadingTitle}>Aguardando conexão com WordPress...</h3>
                        <p className={styles.loadingText}>
                          Assim que o plugin AlvoBot for ativado, ele criará automaticamente as credenciais e
                          conectará seu blog ao AlvoBot.
                        </p>
                        <p className={styles.loadingText}>
                          <strong>Tempo decorrido:</strong> {elapsedTime} segundos
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className={styles.loadingTitle}>Instalando plugins essenciais...</h3>
                        <p className={styles.loadingText}>
                          Aguarde enquanto instalamos os plugins necessários para o seu projeto.
                        </p>
                      </>
                    )}
                    {connectionError && (
                      <div className={styles.errorBox}>
                        <AlertCircle size={16} />
                        <span><strong>Erro:</strong> {connectionError}</span>
                      </div>
                    )}
                  </div>

                  {/* Plugin Installation Progress */}
                  {isInstallingPlugins && (
                    <div className={styles.pluginsList}>
                      {pluginInstallationStatus.map((plugin) => (
                        <div key={plugin.slug} className={styles.pluginItem}>
                          <div className={styles.pluginIcon}>
                            {plugin.status === 'pending' && (
                              <div className={styles.pluginIconPending} />
                            )}
                            {plugin.status === 'installing' && (
                              <Loader2 size={16} className={styles.pluginIconSpinner} />
                            )}
                            {(plugin.status === 'installed' || plugin.status === 'already_installed') && (
                              <CheckCircle size={16} className={styles.pluginIconSuccess} />
                            )}
                            {plugin.status === 'error' && (
                              <AlertCircle size={16} className={styles.pluginIconError} />
                            )}
                          </div>
                          <div className={styles.pluginInfo}>
                            <span className={styles.pluginName}>{plugin.name}</span>
                            {plugin.status === 'error' && plugin.error && (
                              <span className={styles.pluginError}>{plugin.error}</span>
                            )}
                          </div>
                          <div className={styles.pluginStatus}>
                            {plugin.status === 'pending' && (
                              <span className={styles.statusPending}>Aguardando</span>
                            )}
                            {plugin.status === 'installing' && (
                              <span className={styles.statusInstalling}>Instalando...</span>
                            )}
                            {plugin.status === 'installed' && (
                              <span className={styles.statusSuccess}>Instalado</span>
                            )}
                            {plugin.status === 'already_installed' && (
                              <span className={styles.statusSuccess}>Já instalado</span>
                            )}
                            {plugin.status === 'error' && (
                              <span className={styles.statusError}>Erro</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isInstallingPlugins && (
                    <div className={styles.infoBox}>
                      <HelpCircle size={16} />
                      <span>
                        Verificando conexão a cada 3 segundos. Se demorar muito, clique no botão abaixo.
                      </span>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleBackToStep2}
                    leftIcon={<ArrowLeft size={16} />}
                    fullWidth
                    className={styles.backButton}
                  >
                    Voltar e verificar instalação
                  </Button>
                </>
              ) : (
                <>
                  <div className={styles.errorSection}>
                    <AlertCircle size={48} className={styles.errorIcon} />
                    <h3 className={styles.errorTitle}>Não detectamos a conexão</h3>
                    <p className={styles.errorText}>
                      Aguardamos por 3 minutos mas não conseguimos detectar a ativação do plugin AlvoBot.
                    </p>
                  </div>

                  <div className={styles.helpBox}>
                    <HelpCircle size={16} />
                    <div>
                      <strong>Verifique:</strong>
                      <ul className={styles.checklistUl}>
                        <li>O plugin foi instalado corretamente?</li>
                        <li>O plugin está ativo no WordPress?</li>
                        <li>O plugin está sem erros de ativação?</li>
                        <li>Seu site está acessível?</li>
                      </ul>
                    </div>
                  </div>

                  <div className={styles.timeoutActions}>
                    <Button
                      variant="outline"
                      onClick={handleBackToStep2}
                      leftIcon={<ArrowLeft size={16} />}
                      fullWidth
                    >
                      Voltar e verificar instalação
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handlePluginInstalled}
                      fullWidth
                      className={styles.retryButton}
                    >
                      Tentar novamente
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
