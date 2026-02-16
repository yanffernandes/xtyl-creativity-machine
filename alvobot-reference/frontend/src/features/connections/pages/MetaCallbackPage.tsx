import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, Facebook } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Spinner } from '@/shared/components'
import { api } from '@/shared/utils/api'
import styles from './MetaCallbackPage.module.css'

interface PagePreview {
  id: string
  name: string
}

interface FacebookPage {
  id: string
  name: string
  category?: string
  hasMessagingPermission?: boolean
  accessToken?: string
  pictureUrl?: string | null
}

interface RefreshPagesResponse {
  success: boolean
  pages: FacebookPage[]
}

type CallbackState = 'loading' | 'success' | 'error' | 'selecting_pages'

export function MetaCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [state, setState] = useState<CallbackState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [pagesPreview, setPagesPreview] = useState<PagePreview[]>([])
  const [availablePages, setAvailablePages] = useState<FacebookPage[]>([])
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set())
  const [isSavingPages, setIsSavingPages] = useState(false)
  const [isLoadingPages, setIsLoadingPages] = useState(false)

  useEffect(() => {
    const processCallback = async () => {
      // Check if this is a direct response from Facebook (has code and state)
      const code = searchParams.get('code')
      const state = searchParams.get('state')

      // Check if this is already processed (has success/error)
      const success = searchParams.get('success')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      const connId = searchParams.get('connection_id')
      const pagesPreviewParam = searchParams.get('pages_preview')

      // Handle errors
      if (error) {
        setState('error')
        setErrorMessage(errorDescription || error || 'Erro desconhecido')
        return
      }

      // If we have code and state from Facebook, exchange it via backend
      if (code && state) {
        try {
          setState('loading')
          const response = await api.get<{
            success: boolean
            connection_id: string
            pages_preview?: string
            error?: string
            error_description?: string
          }>(`/meta/oauth/exchange?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`)

          if (response.success && response.connection_id) {
            setConnectionId(response.connection_id)

            // Parse pages preview if available
            if (response.pages_preview) {
              try {
                const decoded = JSON.parse(atob(response.pages_preview.replace(/-/g, '+').replace(/_/g, '/')))
                setPagesPreview(decoded)
              } catch {
                console.warn('Failed to parse pages preview')
              }
            }

            setState('success')
          } else {
            setState('error')
            setErrorMessage(response.error_description || response.error || 'Erro ao processar callback')
          }
        } catch (err) {
          console.error('Failed to exchange code:', err)
          setState('error')
          setErrorMessage('Erro ao conectar com o servidor. Tente novamente.')
        }
        return
      }

      // Handle already processed callback (redirected from backend)
      if (success === 'true' && connId) {
        setConnectionId(connId)

        // Parse pages preview if available
        if (pagesPreviewParam) {
          try {
            const decoded = JSON.parse(atob(pagesPreviewParam.replace(/-/g, '+').replace(/_/g, '/')))
            setPagesPreview(decoded)
          } catch {
            console.warn('Failed to parse pages preview')
          }
        }

        setState('success')
      } else if (!code && !state) {
        // Only show error if we don't have code/state (which means we're not processing)
        setState('error')
        setErrorMessage('Parâmetros inválidos no callback')
      }
    }

    processCallback()
  }, [searchParams])

  const handleLoadPages = async () => {
    if (!connectionId) return

    setIsLoadingPages(true)
    try {
      const response = await api.post<RefreshPagesResponse>(
        `/meta/connections/${connectionId}/pages/refresh`,
        {}
      )

      if (response.success && response.pages) {
        setAvailablePages(response.pages)
        // Pre-select all pages by default
        setSelectedPageIds(new Set(response.pages.map(p => p.id)))
        setState('selecting_pages')
      }
    } catch (err) {
      console.error('Failed to load pages:', err)
      setErrorMessage('Erro ao carregar páginas. Tente novamente.')
    } finally {
      setIsLoadingPages(false)
    }
  }

  const handleTogglePage = (pageId: string) => {
    setSelectedPageIds(prev => {
      const next = new Set(prev)
      if (next.has(pageId)) {
        next.delete(pageId)
      } else {
        next.add(pageId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedPageIds(new Set(availablePages.map(p => p.id)))
  }

  const handleDeselectAll = () => {
    setSelectedPageIds(new Set())
  }

  const handleSavePages = async () => {
    if (!connectionId || selectedPageIds.size === 0) return

    setIsSavingPages(true)
    try {
      const pagesToSave = availablePages
        .filter(p => selectedPageIds.has(p.id))
        .map(p => ({
          pageId: p.id,
          pageName: p.name,
          accessToken: p.accessToken || '',
        }))

      await api.post(`/meta/connections/${connectionId}/pages`, {
        pages: pagesToSave,
      })

      // Navigate to connections page with success message
      navigate('/connections', {
        state: { message: `${pagesToSave.length} página(s) habilitada(s) com sucesso!` },
      })
    } catch (err) {
      console.error('Failed to save pages:', err)
      setErrorMessage('Erro ao salvar páginas. Tente novamente.')
    } finally {
      setIsSavingPages(false)
    }
  }

  const handleSkipPages = () => {
    navigate('/connections', {
      state: { message: 'Conexão criada com sucesso! Você pode habilitar páginas depois.' },
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
            Aguarde enquanto completamos a conexão com o Facebook.
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

  // Render success state (before selecting pages)
  if (state === 'success') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={`${styles.iconWrapper} ${styles.successIcon}`}>
            <CheckCircle size={48} />
          </div>
          <h1 className={styles.title}>Conexão Realizada!</h1>
          <p className={styles.description}>
            Sua conta do Facebook foi conectada com sucesso.
            {pagesPreview.length > 0 && (
              <> Encontramos {pagesPreview.length} página(s) disponíveis.</>
            )}
          </p>

          {pagesPreview.length > 0 && (
            <div className={styles.previewList}>
              <h3>Páginas encontradas:</h3>
              <ul>
                {pagesPreview.map(page => (
                  <li key={page.id}>
                    <Facebook size={16} />
                    {page.name}
                  </li>
                ))}
                {pagesPreview.length < 5 && (
                  <li className={styles.morePages}>...e mais</li>
                )}
              </ul>
            </div>
          )}

          <div className={styles.actions}>
            <Button variant="outline" onClick={handleSkipPages}>
              Pular por agora
            </Button>
            <Button
              variant="primary"
              onClick={handleLoadPages}
              disabled={isLoadingPages}
              leftIcon={isLoadingPages ? <Spinner size="sm" /> : undefined}
            >
              {isLoadingPages ? 'Carregando...' : 'Selecionar Páginas'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Render page selection state
  if (state === 'selecting_pages') {
    return (
      <div className={styles.container}>
        <div className={styles.cardWide}>
          <div className={styles.header}>
            <Facebook size={32} className={styles.metaIcon} />
            <div>
              <h1 className={styles.title}>Selecione as Páginas</h1>
              <p className={styles.description}>
                Escolha quais páginas você deseja habilitar para uso no sistema.
              </p>
            </div>
          </div>

          <div className={styles.selectionControls}>
            <span>{selectedPageIds.size} de {availablePages.length} selecionada(s)</span>
            <div>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                Selecionar todas
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
                Limpar seleção
              </Button>
            </div>
          </div>

          <div className={styles.pagesList}>
            {availablePages.map(page => (
              <label
                key={page.id}
                className={`${styles.pageItem} ${selectedPageIds.has(page.id) ? styles.selected : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedPageIds.has(page.id)}
                  onChange={() => handleTogglePage(page.id)}
                />
                {page.pictureUrl ? (
                  <img
                    src={page.pictureUrl}
                    alt={page.name}
                    className={styles.pageAvatar}
                  />
                ) : (
                  <div className={styles.pageAvatarPlaceholder}>
                    <Facebook size={24} />
                  </div>
                )}
                <div className={styles.pageInfo}>
                  <span className={styles.pageName}>{page.name}</span>
                  <div className={styles.pageMeta}>
                    {page.category && (
                      <span className={styles.pageCategory}>{page.category}</span>
                    )}
                    {page.hasMessagingPermission && (
                      <span className={styles.badge}>Mensagens ativo</span>
                    )}
                  </div>
                </div>
              </label>
            ))}

            {availablePages.length === 0 && (
              <div className={styles.emptyState}>
                <p>Nenhuma página encontrada.</p>
                <p>Certifique-se de que você é administrador de pelo menos uma página do Facebook.</p>
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <Button variant="outline" onClick={handleSkipPages}>
              Pular por agora
            </Button>
            <Button
              variant="primary"
              onClick={handleSavePages}
              disabled={selectedPageIds.size === 0 || isSavingPages}
              leftIcon={isSavingPages ? <Spinner size="sm" /> : undefined}
            >
              {isSavingPages
                ? 'Salvando...'
                : `Habilitar ${selectedPageIds.size} Página(s)`}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
