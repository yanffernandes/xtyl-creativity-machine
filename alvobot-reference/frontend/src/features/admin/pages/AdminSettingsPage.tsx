import { useState, useEffect } from 'react'
import { Save, Image as ImageIcon, AlertCircle } from 'lucide-react'
import { Button, Spinner, Alert, Select } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import styles from './AdminSettingsPage.module.css'
import { useUpdateSystemSetting, useLogAdminAction, useUpdateDefaultImageModel } from '../api/mutations'
import { useSystemSettings, useDefaultImageModel, useOpenRouterModels, useValidateOpenRouterKey } from '../api/queries'
import { useAdminStore } from '../stores/adminStore'
import type { SystemSetting, AIProvider } from '../types'

// OpenAI image models
const OPENAI_IMAGE_MODELS = [
  { id: 'dall-e-3', name: 'DALL-E 3' },
  { id: 'dall-e-2', name: 'DALL-E 2' },
]

// Google image models
const GOOGLE_IMAGE_MODELS = [
  { id: 'imagen-3.0-generate-002', name: 'Imagen 3' },
]

function ImageModelConfig({
  canEdit,
  onSave,
}: {
  canEdit: boolean
  onSave: () => void
}) {
  const { data: currentConfig, isLoading } = useDefaultImageModel()
  const { data: openRouterKey } = useValidateOpenRouterKey()
  const { data: openRouterModels, isLoading: loadingModels } = useOpenRouterModels(
    'image',
    openRouterKey?.valid === true
  )

  const updateImageModel = useUpdateDefaultImageModel()

  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai')
  const [selectedModel, setSelectedModel] = useState<string>('dall-e-3')
  const [hasChanges, setHasChanges] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync state with fetched config
  useEffect(() => {
    if (currentConfig) {
      setSelectedProvider(currentConfig.provider)
      setSelectedModel(currentConfig.model)
    }
  }, [currentConfig])

  const handleProviderChange = (provider: AIProvider) => {
    setSelectedProvider(provider)
    // Set default model for provider
    if (provider === 'openai') {
      setSelectedModel('dall-e-3')
    } else if (provider === 'google') {
      setSelectedModel('imagen-3.0-generate-002')
    } else if (provider === 'openrouter' && openRouterModels?.models?.length) {
      setSelectedModel(openRouterModels.models[0].id)
    }
    setHasChanges(true)
    setSaveError(null)
  }

  const handleModelChange = (model: string) => {
    setSelectedModel(model)
    setHasChanges(true)
    setSaveError(null)
  }

  const handleSave = async () => {
    try {
      setSaveError(null)
      await updateImageModel.mutateAsync({
        provider: selectedProvider,
        model: selectedModel,
      })
      setHasChanges(false)
      onSave()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Erro ao salvar configuracao')
    }
  }

  // Build available providers
  const availableProviders: Array<{ value: AIProvider; label: string }> = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'google', label: 'Google' },
  ]
  if (openRouterKey?.valid) {
    availableProviders.push({ value: 'openrouter', label: 'OpenRouter' })
  }

  // Build model options based on selected provider
  let modelOptions: Array<{ value: string; label: string }> = []
  if (selectedProvider === 'openai') {
    modelOptions = OPENAI_IMAGE_MODELS.map((m) => ({ value: m.id, label: m.name }))
  } else if (selectedProvider === 'google') {
    modelOptions = GOOGLE_IMAGE_MODELS.map((m) => ({ value: m.id, label: m.name }))
  } else if (selectedProvider === 'openrouter' && openRouterModels?.models) {
    modelOptions = openRouterModels.models.map((m) => ({ value: m.id, label: m.name }))
  }

  if (isLoading) {
    return (
      <div className={styles.imageModelLoading}>
        <Spinner size="sm" />
        <span>Carregando configuracao...</span>
      </div>
    )
  }

  return (
    <div className={styles.imageModelConfig}>
      <div className={styles.imageModelHeader}>
        <ImageIcon size={20} />
        <div>
          <h3 className={styles.imageModelTitle}>Modelo de Geracao de Imagem</h3>
          <p className={styles.imageModelDescription}>
            Configure o modelo padrao para geracao de imagens no AlvoAds Meta
          </p>
        </div>
      </div>

      {saveError && (
        <Alert variant="error" className={styles.imageModelAlert}>
          <AlertCircle size={16} />
          {saveError}
        </Alert>
      )}

      <div className={styles.imageModelForm}>
        <div className={styles.imageModelField}>
          <Select
            label="Provedor"
            value={selectedProvider}
            onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
            disabled={!canEdit}
            options={availableProviders}
          />
          {!openRouterKey?.valid && !openRouterKey?.configured && (
            <span className={styles.imageModelHint}>
              Configure OPENROUTER_API_KEY no backend para mais opcoes
            </span>
          )}
        </div>

        <div className={styles.imageModelField}>
          {selectedProvider === 'openrouter' && loadingModels ? (
            <div className={styles.inlineSpinner}>
              <Spinner size="sm" />
              <span>Carregando modelos...</span>
            </div>
          ) : (
            <Select
              label="Modelo"
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={!canEdit || modelOptions.length === 0}
              options={modelOptions}
            />
          )}
        </div>

        {hasChanges && canEdit && (
          <Button
            onClick={handleSave}
            isLoading={updateImageModel.isPending}
            className={styles.imageModelSaveBtn}
          >
            <Save size={16} />
            Salvar
          </Button>
        )}
      </div>

      {currentConfig?.updated_at && (
        <p className={styles.imageModelUpdated}>
          Ultima atualizacao: {new Date(currentConfig.updated_at).toLocaleString('pt-BR')}
        </p>
      )}
    </div>
  )
}

function SettingItem({
  setting,
  onSave,
  isSaving,
}: {
  setting: SystemSetting
  onSave: (id: string, value: unknown) => void
  isSaving: boolean
}) {
  const [localValue, setLocalValue] = useState(
    typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value)
  )
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    setHasChanges(true)
  }

  const handleSave = () => {
    let parsedValue: unknown
    try {
      parsedValue = JSON.parse(localValue)
    } catch {
      parsedValue = localValue
    }
    onSave(setting.id, parsedValue)
    setHasChanges(false)
  }

  const isBooleanSetting = localValue === 'true' || localValue === 'false'

  return (
    <div className={styles.settingItem}>
      <div className={styles.settingInfo}>
        <span className={styles.settingId}>{setting.id}</span>
        <span className={styles.settingDescription}>{setting.description}</span>
      </div>
      <div className={styles.settingControl}>
        {isBooleanSetting ? (
          <button
            className={`${styles.toggle} ${localValue === 'true' ? styles.on : ''}`}
            onClick={() => handleChange(localValue === 'true' ? 'false' : 'true')}
          >
            <span className={styles.toggleHandle} />
          </button>
        ) : (
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleChange(e.target.value)}
            className={styles.settingInput}
          />
        )}
        {hasChanges && (
          <Button size="sm" onClick={handleSave} isLoading={isSaving}>
            <Save size={14} />
          </Button>
        )}
      </div>
    </div>
  )
}

export function AdminSettingsPage() {
  useDocumentTitle('Admin - Configurações')
  const { hasPermission } = useAdminStore()
  const [savingId, setSavingId] = useState<string | null>(null)

  const { data: settings, isLoading, refetch } = useSystemSettings()
  const updateSetting = useUpdateSystemSetting()
  const logAction = useLogAdminAction()

  const handleSaveSetting = async (id: string, value: unknown) => {
    setSavingId(id)
    try {
      await updateSetting.mutateAsync({ id, value })
      await logAction.mutateAsync({
        action: 'setting_update',
        resource_type: 'setting',
        resource_id: id,
        details: { new_value: value },
      })
      refetch()
    } catch (error) {
      console.error('Error saving setting:', error)
    }
    setSavingId(null)
  }

  const canEditSettings = hasPermission('settings', 'edit')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Configuracoes</h1>
          <p className={styles.subtitle}>Gerencie as configuracoes gerais do sistema</p>
        </div>
      </div>

      {/* AI Configuration Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Configuracoes de IA</h2>

        {!canEditSettings && (
          <Alert variant="warning" className={styles.alert}>
            Voce tem permissao apenas para visualizar. Contate um super admin para fazer alteracoes.
          </Alert>
        )}

        <ImageModelConfig canEdit={canEditSettings} onSave={() => refetch()} />
      </div>

      {/* General Settings Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Configuracoes Gerais</h2>

        {isLoading ? (
          <div className={styles.loading}>
            <Spinner size="lg" />
          </div>
        ) : !settings || settings.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Nenhuma configuracao encontrada</p>
          </div>
        ) : (
          <div className={styles.settingsList}>
            {settings.map((setting) => (
              <SettingItem
                key={setting.id}
                setting={setting}
                onSave={canEditSettings ? handleSaveSetting : () => {}}
                isSaving={savingId === setting.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
