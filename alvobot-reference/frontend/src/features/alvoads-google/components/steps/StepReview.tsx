import { AlertCircle, CheckCircle, Layers, Building2, FileText } from 'lucide-react'
import { StepNavigation } from './StepNavigation'
import styles from './Steps.module.css'
import { useGoogleGeoTargets, useGoogleLanguages } from '../../api/useGoogleCampaigns'
import { useGoogleAdsWizardStore } from '../../stores/googleAdsWizardStore'
import {
  GOOGLE_BIDDING_STRATEGIES,
  type ResponsiveSearchAd,
} from '../../types/campaign'

// Helper to extract display URL (without UTM params) for preview
function getDisplayUrl(fullUrl: string, path1?: string, path2?: string): string {
  try {
    const url = new URL(fullUrl.split('?')[0]) // Remove query params
    let displayPath = url.hostname + url.pathname
    // Add path1/path2 if provided (Google Ads display path)
    if (path1) {
      displayPath = `${url.hostname  }/${  path1}`
      if (path2) {
        displayPath += `/${  path2}`
      }
    }
    return displayPath.replace(/\/$/, '') // Remove trailing slash
  } catch {
    return fullUrl.split('?')[0] // Fallback: just remove query params
  }
}

export function StepReview() {
  const {
    accounts,
    sourceArticles,
    campaign,
    adGroups,
    extensions,
    getTotalCampaignsCount,
  } = useGoogleAdsWizardStore()

  // Fetch geo targets and languages for display names
  const { data: geoTargets } = useGoogleGeoTargets()
  const { data: languages } = useGoogleLanguages()

  const biddingLabel = GOOGLE_BIDDING_STRATEGIES.find(b => b.value === campaign.biddingStrategy)?.label || campaign.biddingStrategy

  // Helper to get display name from ID
  const getLocationName = (id: string) => geoTargets?.find(t => t.id === id)?.name || id
  const getLanguageName = (id: string) => languages?.find(l => l.id === id)?.name || id

  // Multi-select counts
  const accountsCount = accounts.length
  const articlesCount = sourceArticles.length
  const totalCampaigns = getTotalCampaignsCount()

  // Count totals
  const totalKeywords = adGroups.reduce((sum, group) => sum + group.keywords.length, 0)
  const totalAds = adGroups.reduce((sum, group) => sum + group.ads.length, 0)
  const totalExtensions = extensions.sitelinks.length + extensions.callouts.length + extensions.structuredSnippets.length

  // Validation
  const hasAccounts = accountsCount > 0
  const hasKeywords = totalKeywords > 0
  const hasAds = totalAds > 0
  const hasExtensions = totalExtensions > 0

  const isValid = hasAccounts && hasKeywords && hasAds

  // Calculate estimated credits (per campaign)
  const creditsPerCampaign = 3 + (totalAds * 1) + (hasExtensions ? 1 : 0)
  const totalEstimatedCredits = creditsPerCampaign * totalCampaigns

  return (
    <div className={styles.stepContent}>
      <h2 className={styles.reviewTitle}>
        Revisao da Campanha
      </h2>

      {/* Bulk Creation Summary - Show when creating multiple campaigns */}
      {totalCampaigns > 1 && (
        <section className={styles.section} style={{ background: 'linear-gradient(135deg, var(--color-primary-alpha-10) 0%, var(--color-info-alpha-10) 100%)', border: '1px solid var(--color-primary-alpha-30)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Layers size={24} style={{ color: 'var(--color-primary)' }} />
            <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Criacao em Massa</h3>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Building2 size={18} style={{ color: 'var(--color-text-secondary)' }} />
              <span><strong>{accountsCount}</strong> {accountsCount === 1 ? 'conta' : 'contas'}</span>
            </div>

            {articlesCount > 0 && (
              <>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: '18px' }}>×</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <FileText size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  <span><strong>{articlesCount}</strong> {articlesCount === 1 ? 'artigo' : 'artigos'}</span>
                </div>
              </>
            )}

            <span style={{ color: 'var(--color-text-tertiary)', fontSize: '18px' }}>=</span>

            <div style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-primary)',
              borderRadius: 'var(--radius-full)',
              color: 'white',
              fontWeight: 600,
            }}>
              {totalCampaigns} {totalCampaigns === 1 ? 'campanha' : 'campanhas'}
            </div>
          </div>

          {/* List of accounts */}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contas selecionadas:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              {accounts.map((acc) => (
                <span key={acc.customerId} style={{
                  padding: 'var(--space-1) var(--space-3)',
                  background: 'var(--color-bg-primary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                }}>
                  {acc.customerName || acc.customerId}
                </span>
              ))}
            </div>
          </div>

          {/* List of articles */}
          {articlesCount > 0 && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Artigos selecionados:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                {sourceArticles.map((article) => (
                  <span key={article.articleId} style={{
                    padding: 'var(--space-1) var(--space-3)',
                    background: 'var(--color-bg-primary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                  }}>
                    {article.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Single Account Summary - Show when only one account selected */}
      {totalCampaigns === 1 && accountsCount === 1 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Conta Selecionada</h3>
          <div className={styles.summaryCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Building2 size={18} style={{ color: 'var(--color-text-secondary)' }} />
              <span><strong>{accounts[0].customerName || accounts[0].customerId}</strong></span>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: '12px' }}>
                ID: {accounts[0].customerId}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Validation Status */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Status</h3>
        <div className={styles.summaryGrid}>
          <div className={`${styles.summaryItem} ${hasAccounts ? '' : styles.error}`}>
            {hasAccounts ? <CheckCircle size={16} color="green" /> : <AlertCircle size={16} color="red" />}
            <span>{accountsCount} conta(s)</span>
          </div>
          <div className={`${styles.summaryItem} ${hasKeywords ? '' : styles.error}`}>
            {hasKeywords ? <CheckCircle size={16} color="green" /> : <AlertCircle size={16} color="red" />}
            <span>{totalKeywords} palavra(s)-chave</span>
          </div>
          <div className={`${styles.summaryItem} ${hasAds ? '' : styles.error}`}>
            {hasAds ? <CheckCircle size={16} color="green" /> : <AlertCircle size={16} color="red" />}
            <span>{totalAds} anuncio(s)</span>
          </div>
          <div className={styles.summaryItem}>
            {hasExtensions ? <CheckCircle size={16} color="green" /> : <AlertCircle size={16} color="orange" />}
            <span>{totalExtensions} extensao(oes)</span>
          </div>
        </div>

        {!isValid && (
          <div className={styles.warningBox}>
            <AlertCircle size={18} className={styles.warningIcon} />
            <div>
              <strong>Campanha incompleta</strong>
              <p>
                {!hasAccounts && 'Selecione pelo menos uma conta. '}
                {!hasKeywords && 'Adicione pelo menos uma palavra-chave. '}
                {!hasAds && 'Crie pelo menos um anuncio. '}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Account & Campaign Summary */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Configuracoes da Campanha</h3>
        <div className={styles.summaryCard}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Nome da Campanha</span>
              <span className={styles.summaryValue}>{campaign.name}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Orcamento</span>
              <span className={styles.summaryValue}>
                R$ {campaign.budget}/{campaign.budgetType === 'daily' ? 'dia' : 'total'}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Estrategia de Lance</span>
              <span className={styles.summaryValue}>{biddingLabel}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Localizacao</span>
              <span className={styles.summaryValue}>
                {campaign.locations.map(l => getLocationName(l)).join(', ')}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Idiomas</span>
              <span className={styles.summaryValue}>
                {campaign.languages.map(l => getLanguageName(l)).join(', ')}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Periodo</span>
              <span className={styles.summaryValue}>
                {campaign.startDate
                  ? `${new Date(campaign.startDate).toLocaleDateString('pt-BR')} - ${campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('pt-BR') : 'Sem fim'}`
                  : 'Continuo a partir da aprovacao'
                }
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ad Groups Summary */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Grupos de Anuncios ({adGroups.length})</h3>

        {adGroups.map((group, index) => (
          <div key={index} className={styles.summaryCard} style={{ marginBottom: '16px' }}>
            <h4 className={styles.sectionSubtitle}>{group.name}</h4>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Palavras-chave</span>
                <span className={styles.summaryValue}>
                  {group.keywords.length} ({group.negativeKeywords.length} negativas)
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Anuncios</span>
                <span className={styles.summaryValue}>{group.ads.length}</span>
              </div>
            </div>

            {group.keywords.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <span className={styles.summaryLabel}>Principais palavras-chave:</span>
                <div className={styles.keywordsList} style={{ marginTop: '8px' }}>
                  {group.keywords.slice(0, 5).map((kw) => (
                    <span key={kw.id} className={styles.keywordTag}>
                      {kw.matchType === 'PHRASE' ? `"${kw.text}"` : kw.matchType === 'EXACT' ? `[${kw.text}]` : kw.text}
                    </span>
                  ))}
                  {group.keywords.length > 5 && (
                    <span className={styles.keywordTag}>+{group.keywords.length - 5} mais</span>
                  )}
                </div>
              </div>
            )}

            {group.ads.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <span className={styles.summaryLabel}>Anuncios:</span>
                {group.ads.map((ad) => {
                  const rsaAd = ad as ResponsiveSearchAd
                  return (
                    <div key={rsaAd.id} className={styles.adPreview} style={{ marginTop: '8px' }}>
                      <div className={styles.adPreviewSponsor}>Patrocinado</div>
                      <div className={styles.adPreviewUrl}>
                        {getDisplayUrl(rsaAd.finalUrl, rsaAd.path1, rsaAd.path2)}
                      </div>
                      <div className={styles.adPreviewHeadline}>
                        {rsaAd.headlines.filter(h => h.trim()).slice(0, 3).join(' | ')}
                      </div>
                      <div className={styles.adPreviewDescription}>
                        {rsaAd.descriptions.filter(d => d.trim())[0] || ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Extensions Summary */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Extensoes</h3>
        <div className={styles.summaryCard}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Sitelinks</span>
              <span className={styles.summaryValue}>{extensions.sitelinks.length}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Frases de Destaque</span>
              <span className={styles.summaryValue}>{extensions.callouts.length}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Snippets</span>
              <span className={styles.summaryValue}>{extensions.structuredSnippets.length}</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Chamada</span>
              <span className={styles.summaryValue}>
                {extensions.callExtension ? extensions.callExtension.phoneNumber : 'Nao configurado'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Estimate */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Custo de Creditos</h3>
        <div className={styles.summaryCard}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Publicacao por campanha</span>
              <span className={styles.summaryValue}>3 creditos</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Anuncios ({totalAds}) por campanha</span>
              <span className={styles.summaryValue}>{totalAds} credito(s)</span>
            </div>
            {hasExtensions && (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Extensoes por campanha</span>
                <span className={styles.summaryValue}>1 credito</span>
              </div>
            )}
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Custo por campanha</span>
              <span className={styles.summaryValue}>{creditsPerCampaign} creditos</span>
            </div>
            {totalCampaigns > 1 && (
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Numero de campanhas</span>
                <span className={styles.summaryValue}>{totalCampaigns}</span>
              </div>
            )}
            <div className={styles.summaryItem} style={{ gridColumn: '1 / -1', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-2)' }}>
              <span className={styles.summaryLabel}><strong>TOTAL ESTIMADO</strong></span>
              <span className={styles.summaryValue} style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
                <strong>{totalEstimatedCredits} creditos</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to publish */}
      {isValid && (
        <div className={styles.infoBox}>
          <CheckCircle size={18} color="green" />
          <span>
            {totalCampaigns === 1
              ? 'Sua campanha esta pronta para ser publicada! Clique em "Publicar" para enviar ao Google Ads.'
              : `Suas ${totalCampaigns} campanhas estao prontas! Clique em "Publicar Todas" para enviar ao Google Ads.`
            }
          </span>
        </div>
      )}

      {/* Step Navigation */}
      <StepNavigation />
    </div>
  )
}
