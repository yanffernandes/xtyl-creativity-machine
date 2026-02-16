import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/shared/components'
import styles from './AdSenseCallbackPage.module.css'

interface AccountPreview {
  id: string
  displayName: string
  currencyCode: string
  state?: string
}

type CallbackState = 'loading' | 'success' | 'error'

// Map error codes to user-friendly messages in Portuguese
function getErrorMessage(error: string, errorDescription?: string): string {
  const errorMessages: Record<string, string> = {
    access_denied: 'Você negou a permissão de acesso ao Google AdSense. Por favor, tente novamente e autorize o acesso.',
    permission_denied: 'Permissão negada. Certifique-se de ter uma conta do Google AdSense ativa.',
    no_adsense_account: 'Nenhuma conta do Google AdSense encontrada. Certifique-se de que sua conta Google tem acesso ao AdSense.',
    invalid_scope: 'Escopo inválido solicitado. Entre em contato com o suporte.',
    exchange_failed: 'Falha ao completar a autenticação. Por favor, tente novamente.',
    missing_params: 'Parâmetros inválidos no callback. Por favor, tente novamente.',
    invalid_state: 'Estado inválido. A sessão pode ter expirado. Por favor, tente novamente.',
  }

  return errorMessages[error] || errorDescription || error || 'Erro desconhecido ao conectar com o Google AdSense.'
}

export function AdSenseCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [state, setState] = useState<CallbackState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [errorCode, setErrorCode] = useState<string>('')
  const [, setConnectionId] = useState<string | null>(null)
  const [accountsPreview, setAccountsPreview] = useState<AccountPreview[]>([])
  const [accountsCount, setAccountsCount] = useState<number>(0)

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const connId = searchParams.get('connection_id')
    const accountsPreviewParam = searchParams.get('accounts_preview')
    const accountsCountParam = searchParams.get('accounts_count')

    if (error) {
      setState('error')
      setErrorCode(error)
      setErrorMessage(getErrorMessage(error, errorDescription || undefined))
      return
    }

    if (success === 'true' && connId) {
      setConnectionId(connId)

      // Parse accounts count
      if (accountsCountParam) {
        setAccountsCount(parseInt(accountsCountParam, 10) || 0)
      }

      // Parse accounts preview if available
      if (accountsPreviewParam) {
        try {
          const decoded = JSON.parse(
            atob(accountsPreviewParam.replace(/-/g, '+').replace(/_/g, '/'))
          )
          setAccountsPreview(decoded)
        } catch {
          console.warn('Failed to parse accounts preview')
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
      state: { message: 'Conexão com Google AdSense criada com sucesso!' },
    })
  }

  const handleRetry = () => {
    navigate('/connections', {
      state: { retryAdSense: true },
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
            Aguarde enquanto completamos a conexão com o Google AdSense.
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
            Sua conta do Google AdSense foi conectada com sucesso.
            {accountsCount > 0 && (
              <> Encontramos {accountsCount} conta(s) disponíveis.</>
            )}
          </p>

          {accountsPreview.length > 0 && (
            <div className={styles.previewList}>
              <h3>Contas encontradas:</h3>
              <ul>
                {accountsPreview.map((account) => (
                  <li key={account.id}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={styles.adSenseIcon}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {account.displayName} ({account.currencyCode})
                    {account.state && account.state !== 'STATE_UNSPECIFIED' && (
                      <span style={{
                        marginLeft: 8,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 500,
                        backgroundColor: account.state === 'READY' ? 'rgba(16,185,129,0.1)' :
                          account.state === 'NEEDS_ATTENTION' ? 'rgba(245,158,11,0.1)' :
                          'rgba(239,68,68,0.1)',
                        color: account.state === 'READY' ? '#10B981' :
                          account.state === 'NEEDS_ATTENTION' ? '#F59E0B' :
                          '#EF4444',
                      }}>
                        {account.state === 'READY' ? 'Pronta' :
                          account.state === 'NEEDS_ATTENTION' ? 'Requer Atenção' :
                          'Encerrada'}
                      </span>
                    )}
                  </li>
                ))}
                {accountsCount > accountsPreview.length && (
                  <li className={styles.moreAccounts}>
                    ... e mais {accountsCount - accountsPreview.length} conta(s)
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
