import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { serviceIcons } from '@/assets/icons/services'
import { Button } from '@/shared/components'
import styles from './MetaCallbackPage.module.css' // Reuse Meta styles

type GoogleServiceType = 'adsense' | 'ad_manager' | 'analytics' | 'search_console' | 'ads' | 'unknown'
type CallbackState = 'loading' | 'success' | 'error'

interface ResourcePreview {
  id?: string
  name?: string
  displayName?: string
  currencyCode?: string
  accountId?: string
  siteUrl?: string
  permissionLevel?: string
}

// Service-specific configuration
const serviceConfigs: Record<GoogleServiceType, {
  label: string
  resourceLabel: string
  resourceLabelSingular: string
  previewKeys: string[]
  countKey: string
}> = {
  adsense: {
    label: 'Google AdSense',
    resourceLabel: 'contas',
    resourceLabelSingular: 'conta',
    previewKeys: ['accounts_preview'],
    countKey: 'accounts_count',
  },
  ad_manager: {
    label: 'Google Ad Manager',
    resourceLabel: 'redes',
    resourceLabelSingular: 'rede',
    previewKeys: ['networks_preview'],
    countKey: 'networks_count',
  },
  analytics: {
    label: 'Google Analytics',
    resourceLabel: 'propriedades',
    resourceLabelSingular: 'propriedade',
    previewKeys: ['properties_preview'],
    countKey: 'properties_count',
  },
  search_console: {
    label: 'Google Search Console',
    resourceLabel: 'sites',
    resourceLabelSingular: 'site',
    previewKeys: ['sites_preview'],
    countKey: 'sites_count',
  },
  ads: {
    label: 'Google Ads',
    resourceLabel: 'contas',
    resourceLabelSingular: 'conta',
    previewKeys: ['accounts_preview'],
    countKey: 'accounts_count',
  },
  unknown: {
    label: 'Google',
    resourceLabel: 'recursos',
    resourceLabelSingular: 'recurso',
    previewKeys: ['resources_preview'],
    countKey: 'resources_count',
  },
}

// Error messages in Portuguese
function getErrorMessage(error: string, errorDescription?: string, serviceType?: GoogleServiceType): string {
  const serviceLabel = serviceConfigs[serviceType || 'unknown']?.label || 'Google'

  const errorMessages: Record<string, string> = {
    access_denied: `Você negou a permissão de acesso ao ${serviceLabel}. Por favor, tente novamente e autorize o acesso.`,
    permission_denied: `Permissão negada. Certifique-se de ter uma conta do ${serviceLabel} ativa.`,
    invalid_scope: 'Escopo inválido solicitado. Entre em contato com o suporte.',
    exchange_failed: 'Falha ao completar a autenticação. Por favor, tente novamente.',
    missing_params: 'Parâmetros inválidos no callback. Por favor, tente novamente.',
    invalid_state: 'Estado inválido. A sessão pode ter expirado. Por favor, tente novamente.',
  }

  return errorMessages[error] || errorDescription || error || `Erro desconhecido ao conectar com o ${serviceLabel}.`
}

// Get display name for a resource item
function getResourceDisplayName(item: ResourcePreview): string {
  if (item.siteUrl) return item.siteUrl
  if (item.displayName) return item.displayName
  if (item.name) return item.name
  return item.id || 'Desconhecido'
}

// Get secondary info for a resource item
function getResourceSecondaryInfo(item: ResourcePreview): string | null {
  if (item.currencyCode) return item.currencyCode
  if (item.permissionLevel) return item.permissionLevel
  if (item.accountId) return `Conta: ${item.accountId}`
  return null
}

export function GoogleCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [state, setState] = useState<CallbackState>('loading')
  const [serviceType, setServiceType] = useState<GoogleServiceType>('unknown')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [errorCode, setErrorCode] = useState<string>('')
  const [resourcesPreview, setResourcesPreview] = useState<ResourcePreview[]>([])
  const [resourcesCount, setResourcesCount] = useState<number>(0)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const connId = searchParams.get('connection_id')
    const service = (searchParams.get('service') || 'unknown') as GoogleServiceType

    // Debug log
    console.info('[GoogleCallbackPage] URL params:', {
      success,
      error,
      errorDescription,
      connId,
      service,
      fullUrl: window.location.href,
    })

    setServiceType(service)

    if (error) {
      setState('error')
      setErrorCode(error)
      setErrorMessage(getErrorMessage(error, errorDescription || undefined, service))
      return
    }

    if (success === 'true' && connId) {
      const config = serviceConfigs[service]

      // Parse resources count
      const countParam = searchParams.get(config.countKey)
      if (countParam) {
        setResourcesCount(parseInt(countParam, 10) || 0)
      }

      // Parse resources preview - try each preview key
      for (const previewKey of config.previewKeys) {
        const previewParam = searchParams.get(previewKey)
        if (previewParam) {
          try {
            const decoded = JSON.parse(
              atob(previewParam.replace(/-/g, '+').replace(/_/g, '/'))
            )
            setResourcesPreview(decoded)
            break
          } catch {
            console.warn(`Failed to parse ${previewKey}`)
          }
        }
      }

      setState('success')
    } else {
      setState('error')
      setErrorCode('missing_params')
      setErrorMessage(getErrorMessage('missing_params', undefined, service))
    }
  }, [searchParams])

  const config = serviceConfigs[serviceType]

  const handleGoToConnections = () => {
    navigate('/connections', {
      state: { message: `Conexão com ${config.label} criada com sucesso!` },
    })
  }

  const handleRetry = () => {
    navigate('/connections', {
      state: { retry: serviceType },
    })
  }

  // Render loading state
  if (state === 'loading') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconWrapper}>
            <Loader2 className={styles.loadingIcon} size={48} />
          </div>
          <h1 className={styles.title}>Processando...</h1>
          <p className={styles.description}>
            Aguarde enquanto completamos a conexão com o {config.label}.
          </p>
        </div>
      </div>
    )
  }

  // Render error state
  if (state === 'error') {
    const canRetry = ['access_denied', 'permission_denied', 'exchange_failed', 'invalid_state'].includes(errorCode)

    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={`${styles.iconWrapper} ${styles.errorIcon}`}>
            <XCircle size={48} />
          </div>
          <h1 className={styles.title}>Erro na Conexão</h1>
          <p className={styles.description}>{errorMessage}</p>
          <div className={styles.actions}>
            <Button variant="outline" onClick={() => navigate('/connections')}>
              Voltar para Conexões
            </Button>
            {canRetry && (
              <Button variant="primary" onClick={handleRetry}>
                <RefreshCw size={16} style={{ marginRight: '8px' }} />
                Tentar Novamente
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Render success state
  if (state === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={`${styles.iconWrapper} ${styles.successIcon}`}>
            <CheckCircle size={48} />
          </div>
          <h1 className={styles.title}>Conexão Realizada!</h1>
          <p className={styles.description}>
            Sua conta do {config.label} foi conectada com sucesso.
            {resourcesCount > 0 && (
              <> Encontramos {resourcesCount} {resourcesCount === 1 ? config.resourceLabelSingular : config.resourceLabel}.</>
            )}
          </p>

          {resourcesPreview.length > 0 && (
            <div className={styles.previewList}>
              <h3>{config.resourceLabel.charAt(0).toUpperCase() + config.resourceLabel.slice(1)} encontradas:</h3>
              <ul>
                {resourcesPreview.map((item, index) => {
                  const displayName = getResourceDisplayName(item)
                  const secondaryInfo = getResourceSecondaryInfo(item)

                  return (
                    <li key={item.id || index}>
                      <img src={serviceIcons.ads} alt="" width={16} height={16} />
                      {displayName}
                      {secondaryInfo && <span style={{ color: '#6B7280', marginLeft: '4px' }}>({secondaryInfo})</span>}
                    </li>
                  )
                })}
                {resourcesCount > resourcesPreview.length && (
                  <li className={styles.moreAccounts}>
                    ... e mais {resourcesCount - resourcesPreview.length} {config.resourceLabel}
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className={styles.actions}>
            <Button variant="primary" onClick={handleGoToConnections}>
              Ir para Conexões
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
