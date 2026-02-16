import { useEffect } from 'react'
import { AlertCircle, Loader2, Instagram, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './WizardSteps.module.css'
import { useMetaInstagramAccounts } from '../../api/queries'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'

export function InstagramStep() {
  const {
    pages,
    instagramAccount,
    setInstagramAccount,
    markStepCompleted,
    completedSteps,
    goToNextStep,
  } = useMetaAdsWizardStore()

  // Track if user has made a choice (step is completed means choice was made)
  const hasUserMadeChoice = completedSteps.has('instagram')

  // Get first selected page ID
  const pageId = pages[0]?.id

  // Fetch Instagram account for the page
  const {
    data: instagramData,
    isLoading: loadingInstagram,
    error: instagramError,
  } = useMetaInstagramAccounts(pageId)

  // Mark step as complete when user explicitly makes a choice
  // We do NOT auto-select Instagram - user must choose
  useEffect(() => {
    if (!loadingInstagram && !instagramData && !instagramAccount) {
      // No Instagram found - auto-complete since there's no choice to make
      markStepCompleted('instagram')
    }
    // If Instagram is available, wait for user to make a choice
  }, [instagramData, instagramAccount, loadingInstagram, markStepCompleted])

  // Handler for explicit "Continue" or "Skip" buttons - marks complete and navigates
  const handleSkipAndContinue = () => {
    setInstagramAccount(null)
    markStepCompleted('instagram')
    goToNextStep()
  }

  // Handler for "Facebook only" card selection - marks complete and navigates
  const handleSelectFacebookOnly = () => {
    setInstagramAccount(null)
    markStepCompleted('instagram')
    goToNextStep()
  }

  // Handler for "Facebook + Instagram" card selection - marks complete and navigates
  const handleSelectInstagram = () => {
    if (instagramData) {
      setInstagramAccount({
        id: instagramData.id,
        username: instagramData.username,
        name: instagramData.name,
        profilePictureUrl: instagramData.profilePictureUrl,
        followersCount: instagramData.followersCount,
      })
      markStepCompleted('instagram')
      goToNextStep()
    }
  }

  const formatFollowers = (count?: number) => {
    if (!count) return ''
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M seguidores`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K seguidores`
    return `${count} seguidores`
  }

  if (!pageId) {
    return (
      <div className={styles.stepContent}>
        <section className={styles.section}>
          <div className={styles.emptyState}>
            <AlertCircle size={32} className={styles.emptyIcon} />
            <h4>Selecione uma página primeiro</h4>
            <p>Você precisa selecionar pelo menos uma página do Facebook na etapa anterior.</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.stepContent}>
      {/* Instagram Account */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Instagram size={24} style={{ color: '#E1306C' }} />
          Conta do Instagram (Opcional)
        </h3>
        <p className={styles.sectionDescription}>
          Se sua página do Facebook estiver vinculada a uma conta comercial do Instagram,
          seus anúncios também poderão aparecer no Instagram.
        </p>

        {loadingInstagram ? (
          <div className={styles.loadingState}>
            <Loader2 size={24} className={styles.spinner} />
            <span>Buscando conta do Instagram...</span>
          </div>
        ) : instagramError ? (
          <div className={styles.emptyState}>
            <AlertCircle size={32} className={styles.emptyIcon} />
            <h4>Erro ao buscar conta do Instagram</h4>
            <p>Não foi possível verificar se há uma conta do Instagram vinculada.</p>
            <Button
              variant="outline"
              onClick={handleSkipAndContinue}
              rightIcon={<ArrowRight size={16} />}
            >
              Pular esta etapa
            </Button>
          </div>
        ) : !instagramData ? (
          <div className={styles.emptyState}>
            <Instagram size={32} className={styles.emptyIcon} />
            <h4>Nenhuma conta do Instagram vinculada</h4>
            <p>
              A página selecionada não possui uma conta comercial do Instagram vinculada.
              Seus anúncios aparecerão apenas no Facebook.
            </p>
            <Button
              variant="outline"
              onClick={handleSkipAndContinue}
              rightIcon={<ArrowRight size={16} />}
            >
              Continuar
            </Button>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
              Encontramos uma conta do Instagram vinculada à sua página. Escolha onde deseja veicular seus anúncios:
            </p>

            {/* Two options side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', maxWidth: '600px' }}>
              {/* Option 1: Facebook only */}
              <button
                type="button"
                className={`${styles.optionCard} ${hasUserMadeChoice && !instagramAccount ? styles.selected : ''}`}
                onClick={handleSelectFacebookOnly}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-full)',
                    background: hasUserMadeChoice && !instagramAccount ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill={hasUserMadeChoice && !instagramAccount ? 'white' : 'var(--color-text-secondary)'}>
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                    </svg>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span className={styles.optionLabel} style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
                      Só Facebook
                    </span>
                    <span className={styles.optionDescription}>
                      Seus anúncios aparecerão apenas no Facebook
                    </span>
                  </div>
                  {hasUserMadeChoice && !instagramAccount && (
                    <Check size={20} style={{ color: 'var(--color-success)' }} />
                  )}
                </div>
              </button>

              {/* Option 2: Facebook + Instagram */}
              <button
                type="button"
                className={`${styles.optionCard} ${instagramAccount ? styles.selected : ''}`}
                onClick={handleSelectInstagram}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-full)',
                      background: instagramAccount ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill={instagramAccount ? 'white' : 'var(--color-text-secondary)'}>
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                      </svg>
                    </div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-full)',
                      background: instagramAccount ? 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' : 'var(--color-bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Instagram size={24} style={{ color: instagramAccount ? 'white' : 'var(--color-text-secondary)' }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span className={styles.optionLabel} style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
                      Facebook + Instagram
                    </span>
                    <span className={styles.optionDescription}>
                      @{instagramData.username}
                      {instagramData.followersCount && (
                        <> • {formatFollowers(instagramData.followersCount)}</>
                      )}
                    </span>
                  </div>
                  {instagramAccount && (
                    <Check size={20} style={{ color: 'var(--color-success)' }} />
                  )}
                </div>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Info about Instagram placements */}
      <section className={styles.section}>
        <h4 className={styles.sectionSubtitle}>Sobre anúncios no Instagram</h4>
        <p className={styles.sectionDescription}>
          Quando você vincula uma conta do Instagram, seus anúncios podem aparecer em:
        </p>
        <ul style={{ listStyle: 'disc', paddingLeft: 'var(--space-6)', color: 'var(--color-text-secondary)' }}>
          <li>Feed do Instagram</li>
          <li>Stories do Instagram</li>
          <li>Reels do Instagram</li>
          <li>Explorar do Instagram</li>
        </ul>
      </section>
    </div>
  )
}
