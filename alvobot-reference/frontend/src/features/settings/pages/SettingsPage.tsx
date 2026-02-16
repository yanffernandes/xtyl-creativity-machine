import { useState, useEffect, useId } from 'react'
import { User, Bell, Shield, Palette, Globe, Plug, Settings } from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { BugReportSettings } from '@/features/bug-report/components'
import { useUpdateConnection } from '@/features/connections/api/mutations'
import { useConnections } from '@/features/connections/api/useConnections'
import { Button, Input, Card, Alert, Checkbox, Spinner, toast } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import type { UserSettingsUpdate } from '@/shared/types/database'
import { useUserSettings, useUpdateSettings } from '../api'
import styles from './SettingsPage.module.css'

type SettingsTab = 'profile' | 'notifications' | 'security' | 'appearance' | 'language' | 'integrations'

const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
  { id: 'profile', label: 'Perfil', icon: <User size={18} /> },
  { id: 'notifications', label: 'Notificações', icon: <Bell size={18} /> },
  { id: 'security', label: 'Segurança', icon: <Shield size={18} /> },
  { id: 'appearance', label: 'Aparência', icon: <Palette size={18} /> },
  { id: 'language', label: 'Idioma', icon: <Globe size={18} /> },
  { id: 'integrations', label: 'Integrações', icon: <Plug size={18} /> },
]

export function SettingsPage() {
  useDocumentTitle('Configurações')
  const { user } = useAuthStore()
  const { data: settings, isLoading: isLoadingSettings, error: settingsError } = useUserSettings()
  const updateSettings = useUpdateSettings()
  const { data: connections = [] } = useConnections({ platform: 'google', status: 'active' })
  const updateConnection = useUpdateConnection()
  const languageId = useId()

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

  // Profile state
  const [name, setName] = useState(user?.user_metadata?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')

  // Notification state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(true)

  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Appearance state
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  // Language state
  const [language, setLanguage] = useState('pt-BR')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')

  // Initialize form state from loaded settings
  useEffect(() => {
    if (settings) {
      setEmailNotifications(settings.email_notifications)
      setPushNotifications(settings.push_notifications)
      setWeeklyDigest(settings.weekly_digest)
      setTheme(settings.theme)
      setLanguage(settings.language)
      setTimezone(settings.timezone)
    }
  }, [settings])

  const searchConsoleConnections = connections.filter(
    (connection) =>
      connection.plataform_name?.toLowerCase() === 'google' &&
      (connection.metadata as { type?: string } | undefined)?.type === 'search_console'
  )

  const handleSave = async () => {
    const updates: UserSettingsUpdate = {}

    // Only include changed values based on current tab
    if (activeTab === 'notifications') {
      updates.email_notifications = emailNotifications
      updates.push_notifications = pushNotifications
      updates.weekly_digest = weeklyDigest
    } else if (activeTab === 'appearance') {
      updates.theme = theme
    } else if (activeTab === 'language') {
      updates.language = language
      updates.timezone = timezone
    }

    // Skip if no updates
    if (Object.keys(updates).length === 0) {
      toast.info('Nenhuma alteração para salvar')
      return
    }

    try {
      await updateSettings.mutateAsync(updates)
      toast.success('Configurações salvas com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar configurações')
      console.error('Failed to save settings:', error)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className={styles.tabContent}>
            <h2 className={styles.tabTitle}>Informações do perfil</h2>
            <p className={styles.tabDescription}>
              Atualize suas informações pessoais
            </p>

            <div className={styles.form}>
              <Input
                label="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                disabled
              />
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className={styles.tabContent}>
            <h2 className={styles.tabTitle}>Preferências de notificação</h2>
            <p className={styles.tabDescription}>
              Gerencie como você recebe notificações
            </p>

            <div className={styles.options}>
              <Checkbox
                label="Notificações por email"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
              <p className={styles.optionHint}>
                Receba atualizações importantes por email
              </p>

              <Checkbox
                label="Notificações push"
                checked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
              />
              <p className={styles.optionHint}>
                Receba notificações em tempo real no navegador
              </p>

              <Checkbox
                label="Resumo semanal"
                checked={weeklyDigest}
                onChange={(e) => setWeeklyDigest(e.target.checked)}
              />
              <p className={styles.optionHint}>
                Receba um resumo semanal das suas atividades
              </p>
            </div>
          </div>
        )

      case 'security':
        return (
          <div className={styles.tabContent}>
            <h2 className={styles.tabTitle}>Segurança</h2>
            <p className={styles.tabDescription}>
              Altere sua senha e configure a segurança da conta
            </p>

            <div className={styles.form}>
              <Input
                label="Senha atual"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
              />
              <Input
                label="Nova senha"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
              />
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className={styles.tabContent}>
            <h2 className={styles.tabTitle}>Aparência</h2>
            <p className={styles.tabDescription}>
              Personalize a aparência da interface
            </p>

            <div className={styles.themeOptions}>
              <button
                className={`${styles.themeOption} ${theme === 'light' ? styles.active : ''}`}
                onClick={() => setTheme('light')}
              >
                <div className={styles.themePreview} data-theme="light" />
                <span>Claro</span>
              </button>
              <button
                className={`${styles.themeOption} ${theme === 'dark' ? styles.active : ''}`}
                onClick={() => setTheme('dark')}
              >
                <div className={styles.themePreview} data-theme="dark" />
                <span>Escuro</span>
              </button>
            </div>
          </div>
        )

      case 'language':
        return (
          <div className={styles.tabContent}>
            <h2 className={styles.tabTitle}>Idioma e região</h2>
            <p className={styles.tabDescription}>
              Configure o idioma e formato de data/hora
            </p>

            <div className={styles.form}>
              <div className={styles.selectWrapper}>
                <label className={styles.label} htmlFor={languageId}>Idioma</label>
                <select
                  id={languageId}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={styles.select}
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 'integrations':
        return (
          <div className={styles.tabContent}>
            <h2 className={styles.tabTitle}>Integrações</h2>
            <p className={styles.tabDescription}>
              Configure integrações com serviços externos
            </p>

            <div className={styles.integrations}>
              <BugReportSettings />
              {searchConsoleConnections.length > 0 && (
                <div className={styles.integrationSection}>
                  <h3 className={styles.sectionTitle}>Search Console</h3>
                  <p className={styles.optionHint}>
                    Habilite o envio automático diário de indexação por conexão.
                  </p>
                  {searchConsoleConnections.map((connection) => {
                    const metadata = (connection.metadata as Record<string, unknown> | undefined) || {}
                    const searchConsoleMeta = (metadata.search_console as { auto_run_enabled?: boolean } | undefined) || {}
                    const current = searchConsoleMeta.auto_run_enabled !== false
                    return (
                      <Checkbox
                        key={connection.id}
                        label={`Auto-run diário: ${connection.connection_name || 'Conexão'}`}
                        checked={current}
                        onChange={(e) => {
                          const updated = {
                            ...metadata,
                            search_console: {
                              ...searchConsoleMeta,
                              auto_run_enabled: e.target.checked,
                            },
                          }
                          updateConnection.mutate({ id: connection.id, metadata: updated })
                        }}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Show loading state while fetching settings
  if (isLoadingSettings) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <Spinner size="lg" />
          <p>Carregando configurações...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (settingsError) {
    return (
      <div className={styles.container}>
        <Alert variant="error">
          Erro ao carregar configurações. Por favor, tente novamente.
        </Alert>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <Settings size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Configurações</h1>
            <p className={styles.subtitle}>Gerencie suas preferências</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <nav className={styles.sidebar}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <Card className={styles.main}>
          {renderTabContent()}

          <div className={styles.actions}>
            <Button onClick={handleSave} isLoading={updateSettings.isPending}>
              Salvar alterações
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
