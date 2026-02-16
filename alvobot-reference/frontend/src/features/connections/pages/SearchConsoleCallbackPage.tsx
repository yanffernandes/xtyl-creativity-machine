import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, RefreshCw, Globe } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/shared/components'
import styles from './AdSenseCallbackPage.module.css'

interface SitePreview {
  siteUrl: string
  permissionLevel: string
}

type CallbackState = 'loading' | 'success' | 'error'

// Map error codes to user-friendly messages in Portuguese
function getErrorMessage(error: string, errorDescription?: string): string {
  const errorMessages: Record<string, string> = {
    access_denied: 'Você negou a permissão de acesso ao Google Search Console. Por favor, tente novamente e autorize o acesso.',
    permission_denied: 'Permissão negada. Certifique-se de ter acesso ao Google Search Console.',
    no_sites: 'Nenhum site encontrado no Google Search Console. Adicione um site primeiro no Search Console.',
    invalid_scope: 'Escopo inválido solicitado. Entre em contato com o suporte.',
    exchange_failed: 'Falha ao completar a autenticação. Por favor, tente novamente.',
    missing_params: 'Parâmetros inválidos no callback. Por favor, tente novamente.',
    invalid_state: 'Estado inválido. A sessão pode ter expirado. Por favor, tente novamente.',
  }

  return errorMessages[error] || errorDescription || error || 'Erro desconhecido ao conectar com o Google Search Console.'
}

export function SearchConsoleCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [state, setState] = useState<CallbackState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [errorCode, setErrorCode] = useState<string>('')
  const [, setConnectionId] = useState<string | null>(null)
  const [sitesPreview, setSitesPreview] = useState<SitePreview[]>([])
  const [sitesCount, setSitesCount] = useState<number>(0)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const connId = searchParams.get('connection_id')
    const sitesPreviewParam = searchParams.get('sites_preview')
    const sitesCountParam = searchParams.get('sites_count')

    if (error) {
      setState('error')
      setErrorCode(error)
      setErrorMessage(getErrorMessage(error, errorDescription || undefined))
      return
    }

    if (success === 'true' && connId) {
      setConnectionId(connId)

      // Parse sites count
      if (sitesCountParam) {
        setSitesCount(parseInt(sitesCountParam, 10) || 0)
      }

      // Parse sites preview if available
      if (sitesPreviewParam) {
        try {
          const decoded = JSON.parse(
            atob(sitesPreviewParam.replace(/-/g, '+').replace(/_/g, '/'))
          )
          setSitesPreview(decoded)
        } catch {
          console.warn('Failed to parse sites preview')
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
      state: { message: 'Conexão com Google Search Console criada com sucesso!' },
    })
  }

  const handleRetry = () => {
    navigate('/connections', {
      state: { retrySearchConsole: true },
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
            Aguarde enquanto completamos a conexão com o Google Search Console.
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
            Sua conta do Google Search Console foi conectada com sucesso.
            {sitesCount > 0 && (
              <> Encontramos {sitesCount} site(s) disponíveis.</>
            )}
          </p>

          {sitesPreview.length > 0 && (
            <div className={styles.previewList}>
              <h3>Sites encontrados:</h3>
              <ul>
                {sitesPreview.map((site) => (
                  <li key={site.siteUrl}>
                    <Globe size={16} className={styles.adSenseIcon} />
                    {site.siteUrl}
                  </li>
                ))}
                {sitesCount > sitesPreview.length && (
                  <li className={styles.moreAccounts}>
                    ... e mais {sitesCount - sitesPreview.length} site(s)
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
