import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, RefreshCw, BarChart3 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/shared/components'
import styles from './AdSenseCallbackPage.module.css'

interface PropertyPreview {
  id: string
  displayName: string
  accountId: string
}

type CallbackState = 'loading' | 'success' | 'error'

// Map error codes to user-friendly messages in Portuguese
function getErrorMessage(error: string, errorDescription?: string): string {
  const errorMessages: Record<string, string> = {
    access_denied: 'Você negou a permissão de acesso ao Google Analytics. Por favor, tente novamente e autorize o acesso.',
    permission_denied: 'Permissão negada. Certifique-se de ter acesso ao Google Analytics.',
    no_properties: 'Nenhuma propriedade encontrada no Google Analytics. Crie uma propriedade primeiro no Analytics.',
    invalid_scope: 'Escopo inválido solicitado. Entre em contato com o suporte.',
    exchange_failed: 'Falha ao completar a autenticação. Por favor, tente novamente.',
    missing_params: 'Parâmetros inválidos no callback. Por favor, tente novamente.',
    invalid_state: 'Estado inválido. A sessão pode ter expirado. Por favor, tente novamente.',
  }

  return errorMessages[error] || errorDescription || error || 'Erro desconhecido ao conectar com o Google Analytics.'
}

export function AnalyticsCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [state, setState] = useState<CallbackState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [errorCode, setErrorCode] = useState<string>('')
  const [, setConnectionId] = useState<string | null>(null)
  const [propertiesPreview, setPropertiesPreview] = useState<PropertyPreview[]>([])
  const [propertiesCount, setPropertiesCount] = useState<number>(0)
  const [accountsCount, setAccountsCount] = useState<number>(0)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const connId = searchParams.get('connection_id')
    const propertiesPreviewParam = searchParams.get('properties_preview')
    const propertiesCountParam = searchParams.get('properties_count')
    const accountsCountParam = searchParams.get('accounts_count')

    if (error) {
      setState('error')
      setErrorCode(error)
      setErrorMessage(getErrorMessage(error, errorDescription || undefined))
      return
    }

    if (success === 'true' && connId) {
      setConnectionId(connId)

      // Parse counts
      if (propertiesCountParam) {
        setPropertiesCount(parseInt(propertiesCountParam, 10) || 0)
      }
      if (accountsCountParam) {
        setAccountsCount(parseInt(accountsCountParam, 10) || 0)
      }

      // Parse properties preview if available
      if (propertiesPreviewParam) {
        try {
          const decoded = JSON.parse(
            atob(propertiesPreviewParam.replace(/-/g, '+').replace(/_/g, '/'))
          )
          setPropertiesPreview(decoded)
        } catch {
          console.warn('Failed to parse properties preview')
        }
      }

      setState('success')
    } else {
      setState('error')
      setErrorCode('missing_params')
      setErrorMessage(getErrorMessage('missing_params'))
    }
  }, [searchParams])

  const handleGoToConnections = () => {
    navigate('/connections', {
      state: { message: 'Conexão com Google Analytics criada com sucesso!' },
    })
  }

  const handleRetry = () => {
    navigate('/connections', {
      state: { retryAnalytics: true },
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
            Aguarde enquanto completamos a conexão com o Google Analytics.
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
            Sua conta do Google Analytics foi conectada com sucesso.
            {accountsCount > 0 && propertiesCount > 0 && (
              <> Encontramos {accountsCount} conta(s) e {propertiesCount} propriedade(s).</>
            )}
          </p>

          {propertiesPreview.length > 0 && (
            <div className={styles.previewList}>
              <h3>Propriedades encontradas:</h3>
              <ul>
                {propertiesPreview.map((property) => (
                  <li key={property.id}>
                    <BarChart3 size={16} className={styles.adSenseIcon} />
                    {property.displayName}
                  </li>
                ))}
                {propertiesCount > propertiesPreview.length && (
                  <li className={styles.moreAccounts}>
                    ... e mais {propertiesCount - propertiesPreview.length} propriedade(s)
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
