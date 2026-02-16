import { create } from 'zustand'
import { workspaceDependentRegistry } from '@/shared/hooks/useWorkspaceChangeGuard'
import { META_WIZARD_STEPS, DEFAULT_ADSETS_CONFIG, SPECIAL_AD_CATEGORY_RESTRICTIONS,
  META_DESTINATION_BY_OBJECTIVE,
  getDefaultOptimizationGoal,
  type MetaWizardStep,
  type MetaObjective,
  type MetaDestinationType,
  type MetaOptimizationGoal,
  type MetaConversionEvent,
  type MetaAdAccount,
  type MetaPage,
  type MetaPixel,
  type MetaInstagramAccount,
  type MetaTargeting,
  type MetaBudget,
  type MetaAdCopy,
  type MetaMessengerConfig,
  type MetaPublishStep,
  type MetaCreativeImage,
  type DriveFile,
  type AiGeneratedImage,
  type CreativeSourceType,
  type MetaSelectedArticle,
  type MetaAdSetsConfig,
  type CreativeDuplication,
  type MetaMessageConfig,
  type MetaMessageDestination,
  type MetaMessageOptimization,
  type MetaPublishStatus,
  type MetaSpecialAdCategory } from '../types/campaign'
import type {
  GeneratedImage,
  ImageGenerationConfig,
  GeneratedAdCopy,
  CreativeStatus,
  GenerationMode,
  ConceptSelection,
  DiversityMetrics,
  CreativeNiche,
  AdCopyApplyMode,
  GreetingConfig,
} from '../types/creative'

// ========================
// State Interface
// ========================

interface PublishState {
  isActive: boolean
  currentStep: MetaPublishStep
  error: string | null
}

interface MetaAdsWizardState {
  // Meta
  templateId: string | null
  templateName: string
  currentStep: MetaWizardStep
  completedSteps: Set<MetaWizardStep>

  // Articles Selection (NOVO - primeiro passo)
  selectedArticles: MetaSelectedArticle[]

  // AdSets Configuration (NOVO - segundo passo)
  adSetsConfig: MetaAdSetsConfig

  // Connection
  connectionId: string

  // Account Selection (multi-select)
  accounts: MetaAdAccount[]

  // Pixel (optional)
  selectedPixel: MetaPixel | null
  pixelAccountId: string | null

  // Page Selection (multi-select)
  pages: MetaPage[]

  // Instagram
  instagramAccount: MetaInstagramAccount | null
  includeInstagram: boolean

  // Objective
  objective: MetaObjective

  // Destination Type (local de conversão - ODAX)
  destinationType: MetaDestinationType

  // Optimization Goal (meta de desempenho - ODAX)
  optimizationGoal: MetaOptimizationGoal

  // Conversion Event (evento de conversão do Pixel)
  conversionEvent: MetaConversionEvent | null
  customEventStr: string | null // Para eventos customizados

  // Special Ad Categories
  specialAdCategories: MetaSpecialAdCategory[]

  // Targeting
  targeting: MetaTargeting

  // Budget
  budget: MetaBudget

  // Creative Mode
  creativeMode: CreativeSourceType
  driveImages: DriveFile[]
  aiGeneratedImages: AiGeneratedImage[]
  selectedImages: MetaCreativeImage[]
  driveFolderUrl: string

  // Ad Copy
  adCopy: MetaAdCopy
  /** Mode for applying ad copy: 'shared' = one copy for all, 'individual' = one per creative */
  adCopyApplyMode: AdCopyApplyMode
  /** Shared ad copy (used when adCopyApplyMode = 'shared') */
  sharedAdCopy: GeneratedAdCopy | null

  // Greeting / Ice Breakers (Message Ads)
  /** Mode for applying greeting: 'shared' = one for all, 'individual' = one per creative */
  greetingApplyMode: AdCopyApplyMode
  /** Shared greeting config (used when greetingApplyMode = 'shared') */
  sharedGreeting: GreetingConfig | null
  /** Per-image greeting configs (used when greetingApplyMode = 'individual') */
  greetingMap: Map<string, GreetingConfig>

  // Messenger (for MESSAGES objective)
  messenger: MetaMessengerConfig | null

  // Message Configuration (for MESSAGES objective)
  messageConfig: MetaMessageConfig | null

  // Publish
  publish: PublishState
  publishStatus: MetaPublishStatus // ACTIVE or PAUSED when publishing

  // AI Creative Generation (NEW)
  imageConfig: ExtendedImageGenerationConfig
  generatedImages: GeneratedImage[]
  approvedImages: GeneratedImage[]
  rejectedImageIds: Set<string>
  adCopyMap: Map<string, GeneratedAdCopy> // Map of imageId -> ad copy
  isGeneratingImages: boolean
  generationProgress: { current: number; total: number }
  generationError: string | null

  // Andromeda Creative Diversity (T017)
  generationSessionId: string | null
  detectedNiche: CreativeNiche | null
  diversityMetrics: DiversityMetrics | null
  usedConcepts: string[] // Tracking for diversity window
  usedBackgrounds: string[] // Tracking for background diversity
  usedModels: string[] // Tracking for model rotation

  // ========================
  // Actions
  // ========================

  // Step Navigation
  setCurrentStep: (step: MetaWizardStep) => void
  markStepCompleted: (step: MetaWizardStep) => void
  markStepIncomplete: (step: MetaWizardStep) => void
  goToStep: (step: MetaWizardStep) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  canGoToStep: (step: MetaWizardStep) => boolean
  getStepOrder: () => MetaWizardStep[]

  // Template
  setTemplateId: (id: string | null) => void
  setTemplateName: (name: string) => void

  // Articles Selection
  addArticle: (article: MetaSelectedArticle) => void
  removeArticle: (articleId: number) => void
  setSelectedArticles: (articles: MetaSelectedArticle[]) => void
  clearArticles: () => void
  toggleArticle: (article: MetaSelectedArticle) => void
  isArticleSelected: (articleId: number) => boolean

  // AdSets Configuration
  setAdSetsConfig: (config: Partial<MetaAdSetsConfig>) => void
  setAdSetsPerCampaign: (count: number) => void
  setCreativeDuplication: (duplication: CreativeDuplication) => void

  // Connection
  setConnectionId: (id: string) => void

  // Account Actions (multi-select)
  addAccount: (account: MetaAdAccount) => void
  removeAccount: (accountId: string) => void
  setAccounts: (accounts: MetaAdAccount[]) => void
  clearAccounts: () => void
  toggleAccount: (account: MetaAdAccount) => void
  isAccountSelected: (accountId: string) => boolean

  // Pixel
  setPixel: (pixel: MetaPixel) => void
  clearPixel: () => void

  // Page Actions (multi-select)
  addPage: (page: MetaPage) => void
  removePage: (pageId: string) => void
  setPages: (pages: MetaPage[]) => void
  clearPages: () => void
  togglePage: (page: MetaPage) => void
  isPageSelected: (pageId: string) => boolean

  // Instagram
  setInstagramAccount: (account: MetaInstagramAccount | null) => void
  setIncludeInstagram: (include: boolean) => void

  // Objective
  setObjective: (objective: MetaObjective) => void

  // Destination Type
  setDestinationType: (destinationType: MetaDestinationType) => void

  // Optimization Goal
  setOptimizationGoal: (optimizationGoal: MetaOptimizationGoal) => void

  // Conversion Event
  setConversionEvent: (event: MetaConversionEvent | null) => void
  setCustomEventStr: (eventStr: string | null) => void

  // Special Ad Categories
  setSpecialAdCategories: (categories: MetaSpecialAdCategory[]) => void
  toggleSpecialAdCategory: (category: MetaSpecialAdCategory) => void
  clearSpecialAdCategories: () => void
  hasSpecialAdCategory: () => boolean

  // Targeting
  setTargeting: (targeting: Partial<MetaTargeting>) => void

  // Budget
  setBudget: (budget: Partial<MetaBudget>) => void

  // Creative
  setCreativeMode: (mode: CreativeSourceType) => void
  setDriveFolderUrl: (url: string) => void
  setDriveImages: (images: DriveFile[]) => void
  addAiImage: (image: AiGeneratedImage) => void
  removeAiImage: (imageId: string) => void
  clearAiImages: () => void
  approveAiImage: (imageId: string) => void
  setSelectedImages: (images: MetaCreativeImage[]) => void
  addSelectedImage: (image: MetaCreativeImage) => void
  removeSelectedImage: (imageId: string) => void

  // Ad Copy
  setAdCopy: (adCopy: Partial<MetaAdCopy>) => void
  setAdCopyApplyMode: (mode: AdCopyApplyMode) => void
  /** Sets BOTH adCopyApplyMode and greetingApplyMode. When switching shared→individual, copies shared data to all image slots. */
  setContentApplyMode: (mode: AdCopyApplyMode) => void
  setSharedAdCopy: (adCopy: GeneratedAdCopy | null) => void
  updateSharedAdCopy: (updates: Partial<GeneratedAdCopy>) => void

  // Greeting / Ice Breakers (Message Ads)
  setGreetingApplyMode: (mode: AdCopyApplyMode) => void
  setSharedGreeting: (config: GreetingConfig | null) => void
  updateSharedGreeting: (updates: Partial<GreetingConfig>) => void
  setImageGreeting: (imageId: string, config: GreetingConfig) => void
  updateImageGreeting: (imageId: string, updates: Partial<GreetingConfig>) => void
  clearGreetingMap: () => void

  // Messenger
  setMessenger: (config: MetaMessengerConfig | null) => void

  // Message Configuration (for MESSAGES objective)
  setMessageConfig: (config: MetaMessageConfig | null) => void
  setMessageDestination: (destination: MetaMessageDestination) => void
  setMessageOptimization: (optimization: MetaMessageOptimization) => void
  setWhatsappNumber: (number: string) => void
  setGreetingMessage: (message: string) => void

  // Publish
  startPublish: () => void
  setPublishStep: (step: MetaPublishStep) => void
  setPublishError: (error: string | null) => void
  resetPublish: () => void
  setPublishStatus: (status: MetaPublishStatus) => void

  // AI Creative Generation (NEW)
  setImageConfig: (config: Partial<ImageGenerationConfig> & { generationMode?: GenerationMode; conceptSelections?: ConceptSelection[] }) => void
  setGeneratedImages: (images: GeneratedImage[]) => void
  addGeneratedImage: (image: GeneratedImage) => void
  updateGeneratedImage: (id: string, updates: Partial<GeneratedImage>) => void
  approveImage: (imageId: string) => void
  rejectImage: (imageId: string) => void
  markForRegenerate: (imageId: string) => void
  setApprovedImages: (images: GeneratedImage[]) => void
  clearGeneratedImages: () => void
  setIsGeneratingImages: (isGenerating: boolean) => void
  setGenerationProgress: (current: number, total: number) => void
  setGenerationError: (error: string | null) => void
  setImageAdCopy: (imageId: string, adCopy: GeneratedAdCopy) => void
  updateAdCopy: (imageId: string, updates: Partial<GeneratedAdCopy>) => void
  getAdCopy: (imageId: string) => GeneratedAdCopy | undefined
  clearAdCopyMap: () => void
  getRequiredImageCount: () => number
  hasAllRequiredApprovals: () => boolean

  // Andromeda Creative Diversity (T017, T033, T034)
  setGenerationMode: (mode: GenerationMode) => void
  setConceptSelections: (selections: ConceptSelection[]) => void
  addConceptSelection: (selection: ConceptSelection) => void
  removeConceptSelection: (conceptId: string) => void
  updateConceptQuantity: (conceptId: string, quantity: number) => void
  validateConceptSelections: () => boolean
  getTotalConceptQuantity: () => number
  setGenerationSessionId: (sessionId: string | null) => void
  setDetectedNiche: (niche: CreativeNiche | null) => void
  setDiversityMetrics: (metrics: DiversityMetrics | null) => void
  trackUsedConcept: (conceptId: string) => void
  trackUsedBackground: (backgroundSlug: string) => void
  trackUsedModel: (modelId: string) => void
  clearDiversityTracking: () => void

  // Reset
  reset: () => void
}

// ========================
// Initial Values
// ========================

const initialTargeting: MetaTargeting = {
  ageMin: 18,
  ageMax: 65,
  genders: [0], // All genders
  countries: ['BR'],
  languages: [{ key: 'pt', name: 'Português' }],
}

const initialBudget: MetaBudget = {
  type: 'daily',
  amount: 1000, // R$10 em centavos
  bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
}

const initialAdCopy: MetaAdCopy = {
  primaryText: '',
  headline: '',
  description: '',
  callToAction: 'LEARN_MORE',
  destinationUrl: '',
}

const initialPublishState: PublishState = {
  isActive: false,
  currentStep: 'validating',
  error: null,
}

// Extended image config with diversity fields (T013, T017)
interface ExtendedImageGenerationConfig extends ImageGenerationConfig {
  generationMode: GenerationMode
  conceptSelections: ConceptSelection[]
}

const initialImageConfig: ExtendedImageGenerationConfig = {
  model: 'dall-e-3',
  format: '1:1',
  userDirections: '',
  generationMode: 'free', // Default to free mode (AI decides)
  conceptSelections: [],
}

// ========================
// Store
// ========================

export const useMetaAdsWizardStore = create<MetaAdsWizardState>((set, get) => ({
  // Initial State
  templateId: null,
  templateName: 'Nova Campanha Meta',
  currentStep: 'articles', // Começa na seleção de artigos
  completedSteps: new Set(),
  selectedArticles: [],
  adSetsConfig: { ...DEFAULT_ADSETS_CONFIG },
  connectionId: '',
  accounts: [],
  selectedPixel: null,
  pixelAccountId: null,
  pages: [],
  instagramAccount: null,
  includeInstagram: true,
  objective: 'OUTCOME_TRAFFIC',
  destinationType: 'WEBSITE',
  optimizationGoal: 'LINK_CLICKS',
  conversionEvent: null,
  customEventStr: null,
  specialAdCategories: [],
  targeting: initialTargeting,
  budget: initialBudget,
  creativeMode: 'google_drive',
  driveImages: [],
  aiGeneratedImages: [],
  selectedImages: [],
  driveFolderUrl: '',
  adCopy: initialAdCopy,
  adCopyApplyMode: 'shared' as AdCopyApplyMode,
  sharedAdCopy: null,
  greetingApplyMode: 'shared' as AdCopyApplyMode,
  sharedGreeting: null,
  greetingMap: new Map(),
  messenger: null,
  messageConfig: null,
  publish: initialPublishState,
  publishStatus: 'PAUSED' as MetaPublishStatus, // Default to PAUSED for safety

  // AI Creative Generation (NEW)
  imageConfig: { ...initialImageConfig },
  generatedImages: [],
  approvedImages: [],
  rejectedImageIds: new Set(),
  adCopyMap: new Map(),
  isGeneratingImages: false,
  generationProgress: { current: 0, total: 0 },
  generationError: null,

  // Andromeda Creative Diversity (T017)
  generationSessionId: null,
  detectedNiche: null,
  diversityMetrics: null,
  usedConcepts: [],
  usedBackgrounds: [],
  usedModels: [],

  // ========================
  // Step Navigation
  // ========================

  setCurrentStep: (step) => set({ currentStep: step }),

  markStepCompleted: (step) =>
    set((state) => ({
      completedSteps: new Set([...state.completedSteps, step]),
    })),

  markStepIncomplete: (step) =>
    set((state) => {
      const newSet = new Set(state.completedSteps)
      newSet.delete(step)
      return { completedSteps: newSet }
    }),

  getStepOrder: () => META_WIZARD_STEPS,

  goToStep: (step) => {
    const { canGoToStep } = get()
    if (canGoToStep(step)) {
      set({ currentStep: step })
    }
  },

  goToNextStep: () => {
    const { currentStep, getStepOrder } = get()
    const stepOrder = getStepOrder()
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      set({ currentStep: stepOrder[currentIndex + 1] })
    }
  },

  goToPreviousStep: () => {
    const { currentStep, getStepOrder } = get()
    const stepOrder = getStepOrder()
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      set({ currentStep: stepOrder[currentIndex - 1] })
    }
  },

  canGoToStep: (step) => {
    const { completedSteps, currentStep, getStepOrder } = get()
    const stepOrder = getStepOrder()
    const targetIndex = stepOrder.indexOf(step)
    const currentIndex = stepOrder.indexOf(currentStep)

    // Can always go back
    if (targetIndex <= currentIndex) return true

    // Can only go forward if all previous steps are completed
    for (let i = 0; i < targetIndex; i++) {
      if (!completedSteps.has(stepOrder[i])) return false
    }
    return true
  },

  // ========================
  // Template
  // ========================

  setTemplateId: (id) => set({ templateId: id }),
  setTemplateName: (name) => set({ templateName: name }),

  // ========================
  // Articles Selection
  // ========================

  addArticle: (article) =>
    set((state) => {
      if (state.selectedArticles.some((a) => a.id === article.id)) {
        return state
      }
      return { selectedArticles: [...state.selectedArticles, article] }
    }),

  removeArticle: (articleId) =>
    set((state) => ({
      selectedArticles: state.selectedArticles.filter((a) => a.id !== articleId),
    })),

  setSelectedArticles: (articles) => set({ selectedArticles: articles }),

  clearArticles: () => set({ selectedArticles: [] }),

  toggleArticle: (article) => {
    const { selectedArticles } = get()
    const isSelected = selectedArticles.some((a) => a.id === article.id)
    if (isSelected) {
      set({ selectedArticles: selectedArticles.filter((a) => a.id !== article.id) })
    } else {
      set({ selectedArticles: [...selectedArticles, article] })
    }
  },

  isArticleSelected: (articleId) => {
    const { selectedArticles } = get()
    return selectedArticles.some((a) => a.id === articleId)
  },

  // ========================
  // AdSets Configuration
  // ========================

  setAdSetsConfig: (config) =>
    set((state) => ({
      adSetsConfig: { ...state.adSetsConfig, ...config },
    })),

  setAdSetsPerCampaign: (count) =>
    set((state) => ({
      adSetsConfig: { ...state.adSetsConfig, adSetsPerCampaign: count },
    })),

  setCreativeDuplication: (duplication) =>
    set((state) => ({
      adSetsConfig: { ...state.adSetsConfig, creativeDuplication: duplication },
    })),

  // ========================
  // Connection
  // ========================

  setConnectionId: (id) => set({ connectionId: id }),

  // ========================
  // Account Actions (multi-select)
  // ========================

  addAccount: (account) =>
    set((state) => {
      if (state.accounts.some((a) => a.id === account.id)) {
        return state
      }
      return { accounts: [...state.accounts, account] }
    }),

  removeAccount: (accountId) =>
    set((state) => {
      const accounts = state.accounts.filter((a) => a.id !== accountId)
      const shouldClearPixel =
        state.pixelAccountId === accountId || accounts.length === 0
      return {
        accounts,
        ...(shouldClearPixel ? { selectedPixel: null, pixelAccountId: null } : {}),
      }
    }),

  setAccounts: (accounts) =>
    set((state) => {
      const shouldClearPixel =
        state.pixelAccountId !== null &&
        !accounts.some((account) => account.id === state.pixelAccountId)
      return {
        accounts,
        ...(shouldClearPixel ? { selectedPixel: null, pixelAccountId: null } : {}),
      }
    }),

  clearAccounts: () => set({ accounts: [], selectedPixel: null, pixelAccountId: null }),

  toggleAccount: (account) => {
    const { accounts } = get()
    const isSelected = accounts.some((a) => a.id === account.id)
    if (isSelected) {
      const nextAccounts = accounts.filter((a) => a.id !== account.id)
      const { pixelAccountId } = get()
      const shouldClearPixel =
        pixelAccountId === account.id || nextAccounts.length === 0
      set({
        accounts: nextAccounts,
        ...(shouldClearPixel ? { selectedPixel: null, pixelAccountId: null } : {}),
      })
    } else {
      set({ accounts: [...accounts, account] })
    }
  },

  isAccountSelected: (accountId) => {
    const { accounts } = get()
    return accounts.some((a) => a.id === accountId)
  },

  // ========================
  // Pixel
  // ========================

  setPixel: (pixel) =>
    set((state) => ({
      selectedPixel: pixel,
      pixelAccountId: state.accounts[0]?.id || null,
    })),

  clearPixel: () => set({ selectedPixel: null, pixelAccountId: null }),

  // ========================
  // Page Actions (multi-select)
  // ========================

  addPage: (page) =>
    set((state) => {
      if (state.pages.some((p) => p.id === page.id)) {
        return state
      }
      return { pages: [...state.pages, page] }
    }),

  removePage: (pageId) =>
    set((state) => ({
      pages: state.pages.filter((p) => p.id !== pageId),
    })),

  setPages: (pages) => set({ pages }),

  clearPages: () => set({ pages: [], instagramAccount: null }),

  togglePage: (page) => {
    const { pages } = get()
    const isSelected = pages.some((p) => p.id === page.id)
    if (isSelected) {
      set({ pages: pages.filter((p) => p.id !== page.id) })
    } else {
      set({ pages: [...pages, page] })
    }
  },

  isPageSelected: (pageId) => {
    const { pages } = get()
    return pages.some((p) => p.id === pageId)
  },

  // ========================
  // Instagram
  // ========================

  setInstagramAccount: (account) => set({ instagramAccount: account }),
  setIncludeInstagram: (include) => set({ includeInstagram: include }),

  // ========================
  // Objective
  // ========================

  setObjective: (objective) =>
    set((state) => {
      // Get the first available destination for this objective
      const destinations = META_DESTINATION_BY_OBJECTIVE[objective] || []
      const defaultDest = destinations[0]?.value || 'WEBSITE'
      const defaultOpt = getDefaultOptimizationGoal(objective, defaultDest)

      // Check if the destination is a messaging type
      const isMessaging = ['MESSENGER', 'WHATSAPP', 'INSTAGRAM_DIRECT'].includes(defaultDest)

      return {
        objective,
        destinationType: defaultDest,
        optimizationGoal: defaultOpt,
        conversionEvent: null,
        customEventStr: null,
        // Clear messenger config if not a messaging destination
        messenger: isMessaging ? state.messenger : null,
        // Initialize or clear messageConfig based on destination
        messageConfig: isMessaging
          ? state.messageConfig || { destination: defaultDest as MetaMessageDestination, optimization: 'CONVERSATIONS' }
          : null,
      }
    }),

  // ========================
  // Destination Type
  // ========================

  setDestinationType: (destinationType) =>
    set((state) => {
      const defaultOpt = getDefaultOptimizationGoal(state.objective, destinationType)
      const isMessaging = ['MESSENGER', 'WHATSAPP', 'INSTAGRAM_DIRECT'].includes(destinationType)

      return {
        destinationType,
        optimizationGoal: defaultOpt,
        conversionEvent: null,
        customEventStr: null,
        // Update messageConfig based on new destination
        messageConfig: isMessaging
          ? {
              destination: destinationType as MetaMessageDestination,
              optimization: 'CONVERSATIONS',
              whatsappNumber: state.messageConfig?.whatsappNumber,
              greetingMessage: state.messageConfig?.greetingMessage,
            }
          : null,
      }
    }),

  // ========================
  // Optimization Goal
  // ========================

  setOptimizationGoal: (optimizationGoal) =>
    set((state) => {
      // If switching away from a pixel-requiring optimization, clear conversion event
      const pixelOptimizations = ['OFFSITE_CONVERSIONS', 'VALUE']
      const wasPixelOpt = pixelOptimizations.includes(state.optimizationGoal)
      const isPixelOpt = pixelOptimizations.includes(optimizationGoal)
      const shouldClearEvent = wasPixelOpt && !isPixelOpt

      return {
        optimizationGoal,
        // Only clear conversion event if moving away from pixel-based optimization
        ...(shouldClearEvent ? { conversionEvent: null, customEventStr: null } : {}),
      }
    }),

  // ========================
  // Conversion Event
  // ========================

  setConversionEvent: (conversionEvent) => set({ conversionEvent }),
  setCustomEventStr: (customEventStr) => set({ customEventStr }),

  // ========================
  // Special Ad Categories
  // ========================

  setSpecialAdCategories: (categories) =>
    set((state) => {
      const hasCategories = categories.length > 0
      // When special categories are active, force targeting restrictions
      if (hasCategories) {
        return {
          specialAdCategories: categories,
          targeting: {
            ...state.targeting,
            ageMin: SPECIAL_AD_CATEGORY_RESTRICTIONS.ageMin,
            ageMax: SPECIAL_AD_CATEGORY_RESTRICTIONS.ageMax,
            genders: [...SPECIAL_AD_CATEGORY_RESTRICTIONS.genders],
          },
        }
      }
      return { specialAdCategories: categories }
    }),

  toggleSpecialAdCategory: (category) =>
    set((state) => {
      const isSelected = state.specialAdCategories.includes(category)
      const newCategories = isSelected
        ? state.specialAdCategories.filter((c) => c !== category)
        : [...state.specialAdCategories, category]

      const hasCategories = newCategories.length > 0
      // Apply or remove targeting restrictions
      if (hasCategories) {
        return {
          specialAdCategories: newCategories,
          targeting: {
            ...state.targeting,
            ageMin: SPECIAL_AD_CATEGORY_RESTRICTIONS.ageMin,
            ageMax: SPECIAL_AD_CATEGORY_RESTRICTIONS.ageMax,
            genders: [...SPECIAL_AD_CATEGORY_RESTRICTIONS.genders],
          },
        }
      }
      return { specialAdCategories: newCategories }
    }),

  clearSpecialAdCategories: () => set({ specialAdCategories: [] }),

  hasSpecialAdCategory: () => {
    const { specialAdCategories } = get()
    return specialAdCategories.length > 0
  },

  // ========================
  // Targeting
  // ========================

  setTargeting: (targeting) =>
    set((state) => ({
      targeting: { ...state.targeting, ...targeting },
    })),

  // ========================
  // Budget
  // ========================

  setBudget: (budget) =>
    set((state) => ({
      budget: { ...state.budget, ...budget },
    })),

  // ========================
  // Creative
  // ========================

  setCreativeMode: (mode) => set({ creativeMode: mode }),

  setDriveFolderUrl: (url) => set({ driveFolderUrl: url }),

  setDriveImages: (images) => set({ driveImages: images }),

  addAiImage: (image) =>
    set((state) => ({
      aiGeneratedImages: [...state.aiGeneratedImages, image],
    })),

  removeAiImage: (imageId) =>
    set((state) => ({
      aiGeneratedImages: state.aiGeneratedImages.filter((i) => i.id !== imageId),
    })),

  clearAiImages: () => set({ aiGeneratedImages: [] }),

  approveAiImage: (imageId) =>
    set((state) => ({
      aiGeneratedImages: state.aiGeneratedImages.map((i) =>
        i.id === imageId ? { ...i, approved: true } : i
      ),
    })),

  setSelectedImages: (images) => set({ selectedImages: images }),

  addSelectedImage: (image) =>
    set((state) => {
      if (state.selectedImages.some((i) => i.id === image.id)) {
        return state
      }
      return { selectedImages: [...state.selectedImages, image] }
    }),

  removeSelectedImage: (imageId) =>
    set((state) => ({
      selectedImages: state.selectedImages.filter((i) => i.id !== imageId),
    })),

  // ========================
  // Ad Copy
  // ========================

  setAdCopy: (adCopy) =>
    set((state) => ({
      adCopy: { ...state.adCopy, ...adCopy },
    })),

  setAdCopyApplyMode: (mode) => set({ adCopyApplyMode: mode }),

  setContentApplyMode: (mode) =>
    set((state) => {
      // When switching from shared → individual, copy shared data to all image slots
      if (mode === 'individual' && state.adCopyApplyMode === 'shared') {
        let newAdCopyMap = state.adCopyMap
        let newGreetingMap = state.greetingMap

        if (state.sharedAdCopy) {
          newAdCopyMap = new Map(state.adCopyMap)
          for (const img of state.approvedImages) {
            if (!newAdCopyMap.has(img.id)) {
              newAdCopyMap.set(img.id, {
                ...state.sharedAdCopy,
                imageId: img.id,
              })
            }
          }
        }

        if (state.sharedGreeting) {
          newGreetingMap = new Map(state.greetingMap)
          for (const img of state.approvedImages) {
            if (!newGreetingMap.has(img.id)) {
              newGreetingMap.set(img.id, { ...state.sharedGreeting })
            }
          }
        }

        return {
          adCopyApplyMode: mode,
          greetingApplyMode: mode,
          adCopyMap: newAdCopyMap,
          greetingMap: newGreetingMap,
        }
      }

      return {
        adCopyApplyMode: mode,
        greetingApplyMode: mode,
      }
    }),

  setSharedAdCopy: (adCopy) => set({ sharedAdCopy: adCopy }),

  updateSharedAdCopy: (updates) =>
    set((state) => ({
      sharedAdCopy: state.sharedAdCopy
        ? { ...state.sharedAdCopy, ...updates }
        : null,
    })),

  // ========================
  // Greeting / Ice Breakers
  // ========================

  setGreetingApplyMode: (mode) => set({ greetingApplyMode: mode }),

  setSharedGreeting: (config) => set({ sharedGreeting: config }),

  updateSharedGreeting: (updates) =>
    set((state) => ({
      sharedGreeting: state.sharedGreeting
        ? { ...state.sharedGreeting, ...updates }
        : null,
    })),

  setImageGreeting: (imageId, config) =>
    set((state) => {
      const newMap = new Map(state.greetingMap)
      newMap.set(imageId, config)
      return { greetingMap: newMap }
    }),

  updateImageGreeting: (imageId, updates) =>
    set((state) => {
      const existing = state.greetingMap.get(imageId)
      if (!existing) return state
      const newMap = new Map(state.greetingMap)
      newMap.set(imageId, { ...existing, ...updates })
      return { greetingMap: newMap }
    }),

  clearGreetingMap: () => set({ greetingMap: new Map() }),

  // ========================
  // Messenger
  // ========================

  setMessenger: (config) => set({ messenger: config }),

  // ========================
  // Message Configuration
  // ========================

  setMessageConfig: (config) => set({ messageConfig: config }),

  setMessageDestination: (destination) =>
    set((state) => ({
      messageConfig: state.messageConfig
        ? { ...state.messageConfig, destination }
        : { destination, optimization: 'CONVERSATIONS' },
    })),

  setMessageOptimization: (optimization) =>
    set((state) => ({
      messageConfig: state.messageConfig
        ? { ...state.messageConfig, optimization }
        : { destination: 'MESSENGER', optimization },
    })),

  setWhatsappNumber: (whatsappNumber) =>
    set((state) => ({
      messageConfig: state.messageConfig
        ? { ...state.messageConfig, whatsappNumber }
        : { destination: 'WHATSAPP', optimization: 'CONVERSATIONS', whatsappNumber },
    })),

  setGreetingMessage: (greetingMessage) =>
    set((state) => ({
      messageConfig: state.messageConfig
        ? { ...state.messageConfig, greetingMessage }
        : { destination: 'MESSENGER', optimization: 'CONVERSATIONS', greetingMessage },
    })),

  // ========================
  // Publish
  // ========================

  startPublish: () =>
    set({
      publish: {
        isActive: true,
        currentStep: 'validating',
        error: null,
      },
    }),

  setPublishStep: (step) =>
    set((state) => ({
      publish: { ...state.publish, currentStep: step },
    })),

  setPublishError: (error) =>
    set((state) => ({
      publish: { ...state.publish, currentStep: 'error', error },
    })),

  resetPublish: () => set({ publish: initialPublishState }),

  setPublishStatus: (status) => set({ publishStatus: status }),

  // ========================
  // AI Creative Generation (NEW)
  // ========================

  setImageConfig: (config) =>
    set((state) => ({
      imageConfig: { ...state.imageConfig, ...config },
    })),

  setGeneratedImages: (images) => set({ generatedImages: images }),

  addGeneratedImage: (image) =>
    set((state) => ({
      generatedImages: [...state.generatedImages, image],
    })),

  updateGeneratedImage: (id, updates) =>
    set((state) => ({
      generatedImages: state.generatedImages.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      ),
    })),

  approveImage: (imageId) =>
    set((state) => {
      const image = state.generatedImages.find((img) => img.id === imageId)
      if (!image) return state

      const updatedImage = { ...image, status: 'approved' as CreativeStatus }
      const newRejectedIds = new Set(state.rejectedImageIds)
      newRejectedIds.delete(imageId)

      return {
        generatedImages: state.generatedImages.map((img) =>
          img.id === imageId ? updatedImage : img
        ),
        approvedImages: [...state.approvedImages.filter((img) => img.id !== imageId), updatedImage],
        rejectedImageIds: newRejectedIds,
      }
    }),

  rejectImage: (imageId) =>
    set((state) => {
      const newRejectedIds = new Set(state.rejectedImageIds)
      newRejectedIds.add(imageId)

      return {
        generatedImages: state.generatedImages.map((img) =>
          img.id === imageId ? { ...img, status: 'rejected' as CreativeStatus } : img
        ),
        approvedImages: state.approvedImages.filter((img) => img.id !== imageId),
        rejectedImageIds: newRejectedIds,
      }
    }),

  markForRegenerate: (imageId) =>
    set((state) => ({
      generatedImages: state.generatedImages.map((img) =>
        img.id === imageId ? { ...img, status: 'pending' as CreativeStatus } : img
      ),
    })),

  setApprovedImages: (images) => set({ approvedImages: images }),

  clearGeneratedImages: () =>
    set({
      generatedImages: [],
      approvedImages: [],
      rejectedImageIds: new Set(),
      generationProgress: { current: 0, total: 0 },
      generationError: null,
    }),

  setIsGeneratingImages: (isGenerating) => set({ isGeneratingImages: isGenerating }),

  setGenerationProgress: (current, total) =>
    set({ generationProgress: { current, total } }),

  setGenerationError: (error) => set({ generationError: error }),

  setImageAdCopy: (imageId, adCopy) =>
    set((state) => {
      const newMap = new Map(state.adCopyMap)
      newMap.set(imageId, adCopy)
      return { adCopyMap: newMap }
    }),

  updateAdCopy: (imageId, updates) =>
    set((state) => {
      const existing = state.adCopyMap.get(imageId)
      if (!existing) return state

      const newMap = new Map(state.adCopyMap)
      newMap.set(imageId, { ...existing, ...updates })
      return { adCopyMap: newMap }
    }),

  getAdCopy: (imageId) => {
    const { adCopyMap } = get()
    return adCopyMap.get(imageId)
  },

  clearAdCopyMap: () => set({ adCopyMap: new Map() }),

  // ========================
  // Andromeda Creative Diversity (T017, T033, T034)
  // ========================

  setGenerationMode: (mode: GenerationMode) =>
    set((state) => ({
      imageConfig: { ...state.imageConfig, generationMode: mode },
      // Clear concept selections when switching to free mode
      ...(mode === 'free' ? { imageConfig: { ...state.imageConfig, generationMode: mode, conceptSelections: [] } } : {}),
    })),

  setConceptSelections: (selections: ConceptSelection[]) =>
    set((state) => ({
      imageConfig: { ...state.imageConfig, conceptSelections: selections },
    })),

  addConceptSelection: (selection: ConceptSelection) =>
    set((state) => {
      const existing = state.imageConfig.conceptSelections.filter(
        (s) => s.conceptId !== selection.conceptId
      )
      return {
        imageConfig: {
          ...state.imageConfig,
          conceptSelections: [...existing, selection],
        },
      }
    }),

  removeConceptSelection: (conceptId: string) =>
    set((state) => ({
      imageConfig: {
        ...state.imageConfig,
        conceptSelections: state.imageConfig.conceptSelections.filter(
          (s) => s.conceptId !== conceptId
        ),
      },
    })),

  updateConceptQuantity: (conceptId: string, quantity: number) =>
    set((state) => ({
      imageConfig: {
        ...state.imageConfig,
        conceptSelections: state.imageConfig.conceptSelections.map((s) =>
          s.conceptId === conceptId ? { ...s, quantity } : s
        ),
      },
    })),

  validateConceptSelections: () => {
    const { imageConfig, getRequiredImageCount } = get()
    const totalSelected = imageConfig.conceptSelections.reduce(
      (sum, s) => sum + s.quantity,
      0
    )
    return totalSelected === getRequiredImageCount()
  },

  getTotalConceptQuantity: () => {
    const { imageConfig } = get()
    return imageConfig.conceptSelections.reduce((sum, s) => sum + s.quantity, 0)
  },

  setGenerationSessionId: (sessionId: string | null) =>
    set({ generationSessionId: sessionId }),

  setDetectedNiche: (niche: CreativeNiche | null) =>
    set({ detectedNiche: niche }),

  setDiversityMetrics: (metrics: DiversityMetrics | null) =>
    set({ diversityMetrics: metrics }),

  trackUsedConcept: (conceptId: string) =>
    set((state) => ({
      usedConcepts: [...state.usedConcepts, conceptId],
    })),

  trackUsedBackground: (backgroundSlug: string) =>
    set((state) => ({
      usedBackgrounds: [...state.usedBackgrounds, backgroundSlug],
    })),

  trackUsedModel: (modelId: string) =>
    set((state) => ({
      usedModels: [...state.usedModels, modelId],
    })),

  clearDiversityTracking: () =>
    set({
      generationSessionId: null,
      detectedNiche: null,
      diversityMetrics: null,
      usedConcepts: [],
      usedBackgrounds: [],
      usedModels: [],
    }),

  getRequiredImageCount: () => {
    const { selectedArticles, adSetsConfig } = get()
    // 1 image per AdSet, adSetsPerCampaign AdSets per article
    return selectedArticles.length * adSetsConfig.adSetsPerCampaign
  },

  hasAllRequiredApprovals: () => {
    const { approvedImages, getRequiredImageCount } = get()
    return approvedImages.length >= getRequiredImageCount()
  },

  // ========================
  // Reset
  // ========================

  reset: () =>
    set({
      templateId: null,
      templateName: 'Nova Campanha Meta',
      currentStep: 'articles', // Começa na seleção de artigos
      completedSteps: new Set(),
      selectedArticles: [],
      adSetsConfig: { ...DEFAULT_ADSETS_CONFIG },
      connectionId: '',
      accounts: [],
      selectedPixel: null,
      pixelAccountId: null,
      pages: [],
      instagramAccount: null,
      includeInstagram: true,
      objective: 'OUTCOME_TRAFFIC',
      destinationType: 'WEBSITE',
      optimizationGoal: 'LINK_CLICKS',
      conversionEvent: null,
      customEventStr: null,
      specialAdCategories: [],
      targeting: { ...initialTargeting },
      budget: { ...initialBudget },
      creativeMode: 'google_drive',
      driveImages: [],
      aiGeneratedImages: [],
      selectedImages: [],
      driveFolderUrl: '',
      adCopy: { ...initialAdCopy },
      adCopyApplyMode: 'shared' as AdCopyApplyMode,
      sharedAdCopy: null,
      greetingApplyMode: 'shared' as AdCopyApplyMode,
      sharedGreeting: null,
      greetingMap: new Map(),
      messenger: null,
      messageConfig: null,
      publish: { ...initialPublishState },
      publishStatus: 'PAUSED',
      // AI Creative Generation reset
      imageConfig: { ...initialImageConfig },
      generatedImages: [],
      approvedImages: [],
      rejectedImageIds: new Set(),
      adCopyMap: new Map(),
      isGeneratingImages: false,
      generationProgress: { current: 0, total: 0 },
      generationError: null,
      // Andromeda Creative Diversity reset
      generationSessionId: null,
      detectedNiche: null,
      diversityMetrics: null,
      usedConcepts: [],
      usedBackgrounds: [],
      usedModels: [],
    }),
}))

// Register as workspace-dependent (wizard holds account/page/pixel selections from specific workspace)
workspaceDependentRegistry.register('metaAdsWizard', {
  reset: () => useMetaAdsWizardStore.getState().reset(),
  isDirty: () => {
    const state = useMetaAdsWizardStore.getState()
    // Consider dirty if user has progressed beyond the first step
    return state.currentStep !== 'articles' || state.selectedArticles.length > 0
  },
  dirtyMessage: 'Você tem uma campanha Meta Ads em andamento.',
})
