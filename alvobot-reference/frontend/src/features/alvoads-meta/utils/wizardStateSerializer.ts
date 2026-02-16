/**
 * Wizard State Serializer/Deserializer
 *
 * Converts the Zustand store state (which uses Map/Set) to/from
 * plain JSON objects suitable for JSONB persistence in Supabase.
 *
 * Fields marked as "transient" are excluded from serialization
 * because they represent ephemeral UI state (loading spinners,
 * progress bars, etc.) that shouldn't persist.
 */

import type { AdCopyApplyMode, GreetingConfig, GeneratedAdCopy } from '../types/creative'
import type { MetaWizardStep } from '../types/campaign'

// ========================
// Serialized Snapshot Type
// ========================

/**
 * The shape of the wizard state when persisted as JSONB.
 * Maps become Record<string, T> and Sets become T[].
 */
export interface WizardStateSnapshot {
  // Template
  templateName: string
  currentStep: MetaWizardStep
  completedSteps: MetaWizardStep[]

  // Articles
  selectedArticles: unknown[]

  // AdSets
  adSetsConfig: unknown

  // Connection
  connectionId: string

  // Accounts
  accounts: unknown[]

  // Pixel
  selectedPixel: unknown | null
  pixelAccountId: string | null

  // Pages
  pages: unknown[]

  // Instagram
  instagramAccount: unknown | null
  includeInstagram: boolean

  // Objective & Destination
  objective: string
  destinationType: string
  optimizationGoal: string
  conversionEvent: string | null
  customEventStr: string | null
  specialAdCategories: string[]

  // Targeting
  targeting: unknown

  // Budget
  budget: unknown

  // Creative Mode
  creativeMode: string
  driveImages: unknown[]
  aiGeneratedImages: unknown[]
  selectedImages: unknown[]
  driveFolderUrl: string

  // Ad Copy
  adCopy: unknown
  adCopyApplyMode: AdCopyApplyMode
  sharedAdCopy: GeneratedAdCopy | null

  // Greeting / Ice Breakers
  greetingApplyMode: AdCopyApplyMode
  sharedGreeting: GreetingConfig | null
  greetingMap: Record<string, GreetingConfig>

  // Messenger
  messenger: unknown | null
  messageConfig: unknown | null

  // Publish status preference
  publishStatus: string

  // AI Creative Generation
  imageConfig: unknown
  generatedImages: unknown[]
  approvedImages: unknown[]
  rejectedImageIds: string[]
  adCopyMap: Record<string, GeneratedAdCopy>

  // Andromeda Diversity
  generationSessionId: string | null
  detectedNiche: unknown | null
  diversityMetrics: unknown | null
  usedConcepts: string[]
  usedBackgrounds: string[]
  usedModels: string[]

  // Metadata
  _serializedAt: string
  _version: number
}

// Current serialization version (bump if schema changes)
const SERIALIZATION_VERSION = 1

// ========================
// Serialize: Store -> JSONB
// ========================

/**
 * Serialize the Zustand store state into a plain JSON object
 * suitable for JSONB persistence.
 *
 * @param state - The full Zustand store state (get from useMetaAdsWizardStore.getState())
 * @returns A plain JSON-serializable object
 */
export function serializeWizardState(state: Record<string, unknown>): WizardStateSnapshot {
  return {
    // Template
    templateName: state.templateName as string,
    currentStep: state.currentStep as MetaWizardStep,
    completedSteps: Array.from((state.completedSteps as Set<MetaWizardStep>) || new Set()),

    // Articles
    selectedArticles: (state.selectedArticles as unknown[]) || [],

    // AdSets
    adSetsConfig: state.adSetsConfig,

    // Connection
    connectionId: (state.connectionId as string) || '',

    // Accounts
    accounts: (state.accounts as unknown[]) || [],

    // Pixel
    selectedPixel: state.selectedPixel ?? null,
    pixelAccountId: (state.pixelAccountId as string) ?? null,

    // Pages
    pages: (state.pages as unknown[]) || [],

    // Instagram
    instagramAccount: state.instagramAccount ?? null,
    includeInstagram: (state.includeInstagram as boolean) ?? true,

    // Objective & Destination
    objective: (state.objective as string) || 'OUTCOME_TRAFFIC',
    destinationType: (state.destinationType as string) || 'WEBSITE',
    optimizationGoal: (state.optimizationGoal as string) || 'LINK_CLICKS',
    conversionEvent: (state.conversionEvent as string) ?? null,
    customEventStr: (state.customEventStr as string) ?? null,
    specialAdCategories: (state.specialAdCategories as string[]) || [],

    // Targeting
    targeting: state.targeting,

    // Budget
    budget: state.budget,

    // Creative Mode
    creativeMode: (state.creativeMode as string) || 'google_drive',
    driveImages: (state.driveImages as unknown[]) || [],
    aiGeneratedImages: (state.aiGeneratedImages as unknown[]) || [],
    selectedImages: (state.selectedImages as unknown[]) || [],
    driveFolderUrl: (state.driveFolderUrl as string) || '',

    // Ad Copy
    adCopy: state.adCopy,
    adCopyApplyMode: (state.adCopyApplyMode as AdCopyApplyMode) || 'shared',
    sharedAdCopy: (state.sharedAdCopy as GeneratedAdCopy) ?? null,

    // Greeting
    greetingApplyMode: (state.greetingApplyMode as AdCopyApplyMode) || 'shared',
    sharedGreeting: (state.sharedGreeting as GreetingConfig) ?? null,
    greetingMap: Object.fromEntries((state.greetingMap as Map<string, GreetingConfig>) || new Map()),

    // Messenger
    messenger: state.messenger ?? null,
    messageConfig: state.messageConfig ?? null,

    // Publish status
    publishStatus: (state.publishStatus as string) || 'PAUSED',

    // AI Creative Generation
    imageConfig: state.imageConfig,
    generatedImages: (state.generatedImages as unknown[]) || [],
    approvedImages: (state.approvedImages as unknown[]) || [],
    rejectedImageIds: Array.from((state.rejectedImageIds as Set<string>) || new Set()),
    adCopyMap: Object.fromEntries((state.adCopyMap as Map<string, GeneratedAdCopy>) || new Map()),

    // Andromeda Diversity
    generationSessionId: (state.generationSessionId as string) ?? null,
    detectedNiche: state.detectedNiche ?? null,
    diversityMetrics: state.diversityMetrics ?? null,
    usedConcepts: (state.usedConcepts as string[]) || [],
    usedBackgrounds: (state.usedBackgrounds as string[]) || [],
    usedModels: (state.usedModels as string[]) || [],

    // Metadata
    _serializedAt: new Date().toISOString(),
    _version: SERIALIZATION_VERSION,
  }
}

// ========================
// Deserialize: JSONB -> Store
// ========================

/**
 * Deserialize a JSONB snapshot back into a partial store state,
 * converting Arrays back to Maps/Sets as needed.
 *
 * @param snapshot - The JSONB object from Supabase
 * @returns A partial store state ready to be passed to store.setState()
 */
export function deserializeWizardState(snapshot: WizardStateSnapshot): Record<string, unknown> {
  if (!snapshot) return {}

  return {
    // Template
    templateName: snapshot.templateName,
    currentStep: snapshot.currentStep,
    completedSteps: new Set(snapshot.completedSteps || []),

    // Articles
    selectedArticles: snapshot.selectedArticles || [],

    // AdSets
    adSetsConfig: snapshot.adSetsConfig,

    // Connection
    connectionId: snapshot.connectionId || '',

    // Accounts
    accounts: snapshot.accounts || [],

    // Pixel
    selectedPixel: snapshot.selectedPixel ?? null,
    pixelAccountId: snapshot.pixelAccountId ?? null,

    // Pages
    pages: snapshot.pages || [],

    // Instagram
    instagramAccount: snapshot.instagramAccount ?? null,
    includeInstagram: snapshot.includeInstagram ?? true,

    // Objective & Destination
    objective: snapshot.objective || 'OUTCOME_TRAFFIC',
    destinationType: snapshot.destinationType || 'WEBSITE',
    optimizationGoal: snapshot.optimizationGoal || 'LINK_CLICKS',
    conversionEvent: snapshot.conversionEvent ?? null,
    customEventStr: snapshot.customEventStr ?? null,
    specialAdCategories: snapshot.specialAdCategories || [],

    // Targeting
    targeting: snapshot.targeting,

    // Budget
    budget: snapshot.budget,

    // Creative Mode
    creativeMode: snapshot.creativeMode || 'google_drive',
    driveImages: snapshot.driveImages || [],
    aiGeneratedImages: snapshot.aiGeneratedImages || [],
    selectedImages: snapshot.selectedImages || [],
    driveFolderUrl: snapshot.driveFolderUrl || '',

    // Ad Copy
    adCopy: snapshot.adCopy,
    adCopyApplyMode: snapshot.adCopyApplyMode || 'shared',
    sharedAdCopy: snapshot.sharedAdCopy ?? null,

    // Greeting - convert Record back to Map
    greetingApplyMode: snapshot.greetingApplyMode || 'shared',
    sharedGreeting: snapshot.sharedGreeting ?? null,
    greetingMap: new Map(Object.entries(snapshot.greetingMap || {})),

    // Messenger
    messenger: snapshot.messenger ?? null,
    messageConfig: snapshot.messageConfig ?? null,

    // Publish status
    publishStatus: snapshot.publishStatus || 'PAUSED',

    // AI Creative Generation - convert Record/Array back to Map/Set
    imageConfig: snapshot.imageConfig,
    generatedImages: snapshot.generatedImages || [],
    approvedImages: snapshot.approvedImages || [],
    rejectedImageIds: new Set(snapshot.rejectedImageIds || []),
    adCopyMap: new Map(Object.entries(snapshot.adCopyMap || {})),

    // Andromeda Diversity
    generationSessionId: snapshot.generationSessionId ?? null,
    detectedNiche: snapshot.detectedNiche ?? null,
    diversityMetrics: snapshot.diversityMetrics ?? null,
    usedConcepts: snapshot.usedConcepts || [],
    usedBackgrounds: snapshot.usedBackgrounds || [],
    usedModels: snapshot.usedModels || [],
  }
}
