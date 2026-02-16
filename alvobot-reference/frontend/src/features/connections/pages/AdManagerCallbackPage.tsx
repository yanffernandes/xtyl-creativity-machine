import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/shared/components'
import styles from './MetaCallbackPage.module.css' // Reuse Meta styles

interface NetworkPreview {
  id: string
  name: string
  currencyCode: string
}

type CallbackState = 'loading' | 'success' | 'error'

export function AdManagerCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [state, setState] = useState<CallbackState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [, setConnectionId] = useState<string | null>(null)
  const [networksPreview, setNetworksPreview] = useState<NetworkPreview[]>([])

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const connId = searchParams.get('connection_id')
    const networksPreviewParam = searchParams.get('networks_preview')

    if (error) {
      setState('error')
      setErrorMessage(errorDescription || error || 'Erro desconhecido')
      return
    }

    if (success === 'true' && connId) {
      setConnectionId(connId)

      // Parse networks preview if available
      if (networksPreviewParam) {
        try {
          const decoded = JSON.parse(
            atob(networksPreviewParam.replace(/-/g, '+').replace(/_/g, '/'))
          )
          setNetworksPreview(decoded)
        } catch {
          console.warn('Failed to parse networks preview')
        }
      }

      setState('success')
    } else {
      setState('error')
      setErrorMessage('Parâmetros inválidos no callback')
    }
  }, [searchParams])

  const handleGoToConnections = () => {
    navigate('/connections', {
      state: { message: 'Conexão com Google Ad Manager criada com sucesso!' },
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
            Aguarde enquanto completamos a conexão com o Google Ad Manager.
          </p>
        </div>
      </div>
    )
  }

  // Render error state
  if (state === 'error') {
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
            <Button variant="primary" onClick={() => navigate('/connections')}>
              Tentar Novamente
            </Button>
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
            Sua conta do Google Ad Manager foi conectada com sucesso.
            {networksPreview.length > 0 && (
              <> Encontramos {networksPreview.length} rede(s) disponíveis.</>
            )}
          </p>

          {networksPreview.length > 0 && (
            <div className={styles.previewList}>
              <h3>Redes encontradas:</h3>
              <ul>
                {networksPreview.map((network) => (
                  <li key={network.id}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ color: '#34a853' }}
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                    {network.name} ({network.currencyCode})
                  </li>
                ))}
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
