import { create } from 'zustand'
import { workspaceDependentRegistry } from '@/shared/hooks/useWorkspaceChangeGuard'
import { getGeoTargetId, getLanguageId } from '../api/useGoogleCampaigns'
import { SEARCH_WIZARD_STEPS, DISPLAY_WIZARD_STEPS,
  type GoogleNetworkType,
  type GoogleWizardStep,
  type GoogleAccountData,
  type GoogleCampaignData,
  type GoogleAdGroupData,
  type GoogleExtensionsData,
  type ResponsiveSearchAd,
  type GoogleKeyword,
  type SourceArticleData,
  type GeneratedFromArticleData } from '../types/campaign'
import type { AutoPublishStep } from '../components/AutoPublishProgress'

export type PublishMode = 'auto' | 'semi-auto' | null

interface AutoPublishState {
  isActive: boolean
  currentStep: AutoPublishStep
  error: string | null
}

interface GoogleAdsWizardState {
  // Meta
  templateName: string
  networkType: GoogleNetworkType
  currentStep: GoogleWizardStep
  completedSteps: Set<GoogleWizardStep>

  // Source Article (optional - for auto-generation)
  // Legacy single selection (kept for backward compatibility)
  sourceArticle: SourceArticleData | null
  generatedFromArticle: GeneratedFromArticleData | null
  // Multi-select support
  sourceArticles: SourceArticleData[]

  // Publish Mode (auto/semi-auto)
  publishMode: PublishMode
  autoPublish: AutoPublishState
  showPublishModeModal: boolean

  // Step Data
  // Legacy single account (kept for backward compatibility)
  account: GoogleAccountData
  // Multi-select support
  accounts: GoogleAccountData[]
  campaign: GoogleCampaignData
  adGroups: GoogleAdGroupData[]
  extensions: GoogleExtensionsData

  // Actions
  setNetworkType: (type: GoogleNetworkType) => void
  setCurrentStep: (step: GoogleWizardStep) => void
  setTemplateName: (name: string) => void
  setAccountData: (data: Partial<GoogleAccountData>) => void
  setCampaignData: (data: Partial<GoogleCampaignData>) => void
  addAdGroup: () => void
  updateAdGroup: (index: number, data: Partial<GoogleAdGroupData>) => void
  removeAdGroup: (index: number) => void
  addKeywordToAdGroup: (adGroupIndex: number, keyword: GoogleKeyword) => void
  removeKeywordFromAdGroup: (adGroupIndex: number, keywordId: string) => void
  addAdToAdGroup: (adGroupIndex: number, ad: ResponsiveSearchAd) => void
  removeAdFromAdGroup: (adGroupIndex: number, adId: string) => void
  setExtensionsData: (data: Partial<GoogleExtensionsData>) => void
  markStepCompleted: (step: GoogleWizardStep) => void
  markStepIncomplete: (step: GoogleWizardStep) => void
  goToNextStep: () => void
  goToPreviousStep: () => void
  canGoToStep: (step: GoogleWizardStep) => boolean
  getStepOrder: () => GoogleWizardStep[]
  // Source Article actions
  setSourceArticle: (article: SourceArticleData | null) => void
  setGeneratedFromArticle: (data: GeneratedFromArticleData | null) => void
  clearSourceArticle: () => void
  hasGeneratedContent: () => boolean
  // Multi-select Source Articles actions
  addSourceArticle: (article: SourceArticleData) => void
  removeSourceArticle: (articleId: number) => void
  setSourceArticles: (articles: SourceArticleData[]) => void
  clearSourceArticles: () => void
  toggleSourceArticle: (article: SourceArticleData) => void
  isArticleSelected: (articleId: number) => boolean
  toggleArticlePreUrl: (articleId: number) => void
  getArticlePreUrlSetting: (articleId: number) => boolean
  // Multi-select Accounts actions
  addAccount: (account: GoogleAccountData) => void
  removeAccount: (customerId: string) => void
  setAccounts: (accounts: GoogleAccountData[]) => void
  clearAccounts: () => void
  toggleAccount: (account: GoogleAccountData) => void
  isAccountSelected: (customerId: string) => boolean
  // Bulk creation helpers
  getTotalCampaignsCount: () => number
  hasSelectedAccounts: () => boolean
  hasSelectedArticles: () => boolean
  // Publish Mode actions
  setPublishMode: (mode: PublishMode) => void
  setShowPublishModeModal: (show: boolean) => void
  setAutoPublishStep: (step: AutoPublishStep) => void
  setAutoPublishError: (error: string | null) => void
  startAutoPublish: () => void
  stopAutoPublish: () => void
  resetAutoPublish: () => void
  reset: () => void
}

const initialAccountData: GoogleAccountData = {
  connectionId: '',
  customerId: '',
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
}

const initialCampaignData: GoogleCampaignData = {
  // Hybrid format: article-slug_project|tID_wpID_DATE
  // Example: como-fazer-bolo_MeuBlog|t123_wp456_20241220
  name: '{{article_slug}}_{{project_name}}|t{{template_id}}_wp{{wp_post_id}}_{{date_short}}',
  networkType: 'search',
  budget: 50,
  budgetType: 'daily',
  biddingStrategy: 'MAXIMIZE_CLICKS',
  locations: ['2076'], // Brazil geo target ID
  languages: ['1014'], // Portuguese language criterion ID
  searchPartners: false,
  displayNetwork: false,
  status: 'ENABLED', // Default: publish as active (user can change to PAUSED)
}

const createEmptyAdGroup = (index = 1): GoogleAdGroupData => ({
  // Hybrid format: keyword-slug|agINDEX_Nads
  // Example: grupo-anuncios|ag1_0ads
  name: `grupo-anuncios|ag${index}_0ads`,
  keywords: [],
  negativeKeywords: [],
  ads: [],
})

const initialExtensionsData: GoogleExtensionsData = {
  sitelinks: [],
  callouts: [],
  structuredSnippets: [],
}

const initialAutoPublishState: AutoPublishState = {
  isActive: false,
  currentStep: 'mining_keywords',
  error: null,
}

export const useGoogleAdsWizardStore = create<GoogleAdsWizardState>((set, get) => ({
  // Initial state
  templateName: 'Template Google Ads',
  networkType: 'search',
  currentStep: 'account',
  completedSteps: new Set(),
  sourceArticle: null,
  generatedFromArticle: null,
  sourceArticles: [],
  publishMode: null,
  autoPublish: initialAutoPublishState,
  showPublishModeModal: false,
  account: initialAccountData,
  accounts: [],
  campaign: initialCampaignData,
  adGroups: [createEmptyAdGroup()],
  extensions: initialExtensionsData,

  // Actions
  setNetworkType: (type) => {
    set({
      networkType: type,
      currentStep: 'account',
      completedSteps: new Set(),
      campaign: { ...get().campaign, networkType: type },
    })
  },

  setCurrentStep: (step) => set({ currentStep: step }),

  setTemplateName: (name) => set({ templateName: name }),

  setAccountData: (data) => set((state) => ({
    account: { ...state.account, ...data }
  })),

  setCampaignData: (data) => set((state) => ({
    campaign: { ...state.campaign, ...data }
  })),

  addAdGroup: () => set((state) => {
    const newIndex = state.adGroups.length + 1
    return {
      adGroups: [...state.adGroups, createEmptyAdGroup(newIndex)]
    }
  }),

  updateAdGroup: (index, data) => set((state) => {
    const newAdGroups = [...state.adGroups]
    newAdGroups[index] = { ...newAdGroups[index], ...data }
    return { adGroups: newAdGroups }
  }),

  removeAdGroup: (index) => set((state) => {
    if (state.adGroups.length <= 1) return state
    return { adGroups: state.adGroups.filter((_, i) => i !== index) }
  }),

  addKeywordToAdGroup: (adGroupIndex, keyword) => set((state) => {
    const newAdGroups = [...state.adGroups]
    newAdGroups[adGroupIndex] = {
      ...newAdGroups[adGroupIndex],
      keywords: [...newAdGroups[adGroupIndex].keywords, keyword],
    }
    return { adGroups: newAdGroups }
  }),

  removeKeywordFromAdGroup: (adGroupIndex, keywordId) => set((state) => {
    const newAdGroups = [...state.adGroups]
    newAdGroups[adGroupIndex] = {
      ...newAdGroups[adGroupIndex],
      keywords: newAdGroups[adGroupIndex].keywords.filter(k => k.id !== keywordId),
    }
    return { adGroups: newAdGroups }
  }),

  addAdToAdGroup: (adGroupIndex, ad) => set((state) => {
    const newAdGroups = [...state.adGroups]
    newAdGroups[adGroupIndex] = {
      ...newAdGroups[adGroupIndex],
      ads: [...newAdGroups[adGroupIndex].ads, ad],
    }
    return { adGroups: newAdGroups }
  }),

  removeAdFromAdGroup: (adGroupIndex, adId) => set((state) => {
    const newAdGroups = [...state.adGroups]
    newAdGroups[adGroupIndex] = {
      ...newAdGroups[adGroupIndex],
      ads: newAdGroups[adGroupIndex].ads.filter(a => a.id !== adId),
    }
    return { adGroups: newAdGroups }
  }),

  setExtensionsData: (data) => set((state) => ({
    extensions: { ...state.extensions, ...data }
  })),

  markStepCompleted: (step) => set((state) => ({
    completedSteps: new Set([...state.completedSteps, step])
  })),

  markStepIncomplete: (step) => set((state) => {
    const newSet = new Set(state.completedSteps)
    newSet.delete(step)
    return { completedSteps: newSet }
  }),

  getStepOrder: () => {
    const { networkType } = get()
    return networkType === 'search' ? SEARCH_WIZARD_STEPS : DISPLAY_WIZARD_STEPS
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

    if (targetIndex <= currentIndex) return true

    for (let i = 0; i < targetIndex; i++) {
      if (!completedSteps.has(stepOrder[i])) return false
    }
    return true
  },

  // Source Article actions
  setSourceArticle: (article) => set((state) => {
    // Auto-update campaign language and location based on keyword_snapshot
    // Convert codes to criterion IDs for Google Ads API
    if (article?.keywordSnapshot) {
      const languageId = getLanguageId(article.keywordSnapshot.language)
      const geoTargetId = getGeoTargetId(article.keywordSnapshot.country)
      return {
        sourceArticle: article,
        campaign: {
          ...state.campaign,
          languages: languageId ? [languageId] : state.campaign.languages,
          locations: geoTargetId ? [geoTargetId] : state.campaign.locations,
        },
      }
    }
    // Fallback: use article.language if keywordSnapshot not available (legacy)
    if (article?.language) {
      const languageId = getLanguageId(article.language)
      return {
        sourceArticle: article,
        campaign: {
          ...state.campaign,
          languages: languageId ? [languageId] : state.campaign.languages,
        },
      }
    }
    return { sourceArticle: article }
  }),

  setGeneratedFromArticle: (data) => set({ generatedFromArticle: data }),

  clearSourceArticle: () => set({
    sourceArticle: null,
    generatedFromArticle: null,
  }),

  hasGeneratedContent: () => {
    const { generatedFromArticle, adGroups } = get()
    // Check if we have generated content from article or if adGroups have content
    if (generatedFromArticle) return true
    if (adGroups.some(ag => ag.keywords.length > 0 || ag.ads.length > 0)) return true
    return false
  },

  // Multi-select Source Articles actions
  addSourceArticle: (article) => set((state) => {
    // Avoid duplicates
    if (state.sourceArticles.some(a => a.articleId === article.articleId)) {
      return state
    }
    const newArticles = [...state.sourceArticles, article]
    // Auto-update campaign language and location based on first article's keyword_snapshot
    // Convert codes to criterion IDs for Google Ads API
    if (newArticles.length === 1 && article.keywordSnapshot) {
      const languageId = getLanguageId(article.keywordSnapshot.language)
      const geoTargetId = getGeoTargetId(article.keywordSnapshot.country)
      return {
        sourceArticles: newArticles,
        campaign: {
          ...state.campaign,
          languages: languageId ? [languageId] : state.campaign.languages,
          locations: geoTargetId ? [geoTargetId] : state.campaign.locations,
        },
      }
    }
    return { sourceArticles: newArticles }
  }),

  removeSourceArticle: (articleId) => set((state) => ({
    sourceArticles: state.sourceArticles.filter(a => a.articleId !== articleId)
  })),

  setSourceArticles: (articles) => set({ sourceArticles: articles }),

  clearSourceArticles: () => set({ sourceArticles: [], sourceArticle: null }),

  toggleSourceArticle: (article) => {
    const { sourceArticles, campaign } = get()
    const isSelected = sourceArticles.some(a => a.articleId === article.articleId)
    if (isSelected) {
      set({ sourceArticles: sourceArticles.filter(a => a.articleId !== article.articleId) })
    } else {
      const newArticles = [...sourceArticles, article]
      // Auto-update campaign language and location based on first article's keyword_snapshot
      // Convert codes to criterion IDs for Google Ads API
      if (newArticles.length === 1 && article.keywordSnapshot) {
        const languageId = getLanguageId(article.keywordSnapshot.language)
        const geoTargetId = getGeoTargetId(article.keywordSnapshot.country)
        set({
          sourceArticles: newArticles,
          campaign: {
            ...campaign,
            languages: languageId ? [languageId] : campaign.languages,
            locations: geoTargetId ? [geoTargetId] : campaign.locations,
          },
        })
      } else {
        set({ sourceArticles: newArticles })
      }
    }
  },

  isArticleSelected: (articleId) => {
    const { sourceArticles } = get()
    return sourceArticles.some(a => a.articleId === articleId)
  },

  toggleArticlePreUrl: (articleId) => set((state) => ({
    sourceArticles: state.sourceArticles.map(a =>
      a.articleId === articleId
        ? { ...a, usePreArticleUrl: !a.usePreArticleUrl }
        : a
    )
  })),

  getArticlePreUrlSetting: (articleId) => {
    const { sourceArticles } = get()
    const article = sourceArticles.find(a => a.articleId === articleId)
    return article?.usePreArticleUrl ?? false
  },

  // Multi-select Accounts actions
  addAccount: (account) => set((state) => {
    // Avoid duplicates
    if (state.accounts.some(a => a.customerId === account.customerId)) {
      return state
    }
    return { accounts: [...state.accounts, account] }
  }),

  removeAccount: (customerId) => set((state) => ({
    accounts: state.accounts.filter(a => a.customerId !== customerId)
  })),

  setAccounts: (accounts) => set({ accounts }),

  clearAccounts: () => set({ accounts: [], account: initialAccountData }),

  toggleAccount: (account) => {
    const { accounts } = get()
    const isSelected = accounts.some(a => a.customerId === account.customerId)
    if (isSelected) {
      set({ accounts: accounts.filter(a => a.customerId !== account.customerId) })
    } else {
      set({ accounts: [...accounts, account] })
    }
  },

  isAccountSelected: (customerId) => {
    const { accounts } = get()
    return accounts.some(a => a.customerId === customerId)
  },

  // Bulk creation helpers
  getTotalCampaignsCount: () => {
    const { accounts, sourceArticles } = get()
    const accountCount = accounts.length
    const articleCount = sourceArticles.length
    // If no articles selected, create 1 campaign per account
    // If articles selected, create accounts × articles campaigns
    if (articleCount === 0) {
      return accountCount
    }
    return accountCount * articleCount
  },

  hasSelectedAccounts: () => get().accounts.length > 0,

  hasSelectedArticles: () => get().sourceArticles.length > 0,

  // Publish Mode actions
  setPublishMode: (mode) => set({ publishMode: mode }),

  setShowPublishModeModal: (show) => set({ showPublishModeModal: show }),

  setAutoPublishStep: (step) => set((state) => ({
    autoPublish: { ...state.autoPublish, currentStep: step }
  })),

  setAutoPublishError: (error) => set((state) => ({
    autoPublish: { ...state.autoPublish, error }
  })),

  startAutoPublish: () => set({
    autoPublish: {
      isActive: true,
      currentStep: 'mining_keywords',
      error: null,
    }
  }),

  stopAutoPublish: () => set((state) => ({
    autoPublish: { ...state.autoPublish, isActive: false }
  })),

  resetAutoPublish: () => set({
    publishMode: null,
    autoPublish: initialAutoPublishState,
    showPublishModeModal: false,
  }),

  reset: () => set({
    templateName: 'Template Google Ads',
    networkType: 'search',
    currentStep: 'account',
    completedSteps: new Set(),
    sourceArticle: null,
    generatedFromArticle: null,
    sourceArticles: [],
    publishMode: null,
    autoPublish: initialAutoPublishState,
    showPublishModeModal: false,
    account: initialAccountData,
    accounts: [],
    campaign: { ...initialCampaignData },
    adGroups: [createEmptyAdGroup()],
    extensions: { ...initialExtensionsData },
  }),
}))

// Register as workspace-dependent (wizard holds account selections from specific workspace)
workspaceDependentRegistry.register('googleAdsWizard', {
  reset: () => useGoogleAdsWizardStore.getState().reset(),
  isDirty: () => {
    const state = useGoogleAdsWizardStore.getState()
    // Consider dirty if user has progressed beyond the first step
    return state.currentStep !== 'account' || state.sourceArticle !== null
  },
  dirtyMessage: 'Você tem uma campanha Google Ads em andamento.',
})
