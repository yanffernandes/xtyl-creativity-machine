import { useState } from 'react'
import {
  AlertCircle,
  Loader2,
  Wand2,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react'
import { Button, Input } from '@/shared/components'
import styles from './WizardSteps.module.css'
import { useGenerateAdCopy, useGenerateHeadlines } from '../../api/mutations'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import { validateAdCopy, getCharacterCount, META_AD_LIMITS } from '../../utils/validation'
import type { MetaCTA } from '../../types/campaign'

const CTA_OPTIONS: Array<{ value: MetaCTA; label: string }> = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'BOOK_NOW', label: 'Reserve Agora' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'GET_OFFER', label: 'Ver Oferta' },
  { value: 'GET_QUOTE', label: 'Pedir Orçamento' },
  { value: 'SUBSCRIBE', label: 'Inscrever-se' },
  { value: 'SEND_MESSAGE', label: 'Enviar Mensagem' },
]

export function AdCopyStep() {
  const {
    adCopy,
    setAdCopy,
    templateName,
    markStepCompleted,
    markStepIncomplete,
  } = useMetaAdsWizardStore()

  const [productName, setProductName] = useState(templateName || '')
  const [productDescription, setProductDescription] = useState('')

  // AI generation mutations
  const generateCopyMutation = useGenerateAdCopy()
  const generateHeadlinesMutation = useGenerateHeadlines()

  const handleValidateAndComplete = () => {
    const validation = validateAdCopy(adCopy)
    if (validation.isValid) {
      markStepCompleted('ad_copy')
    } else {
      markStepIncomplete('ad_copy')
    }
  }

  const handleFieldChange = (field: keyof typeof adCopy, value: string) => {
    setAdCopy({ [field]: value })
    handleValidateAndComplete()
  }

  const handleGenerateCopy = async () => {
    if (!productName) return

    try {
      // The mutation returns the copies array directly (throws on error)
      const copies = await generateCopyMutation.mutateAsync({
        productName,
        productDescription,
      })

      if (copies && copies.length > 0) {
        const copy = copies[0]
        setAdCopy({
          primaryText: copy.primaryText,
          headline: copy.headline,
          description: copy.description,
        })
        handleValidateAndComplete()
      }
    } catch (error) {
      console.error('Error generating copy:', error)
    }
  }

  const handleGenerateHeadlines = async () => {
    if (!productName) return

    try {
      // The mutation returns the headlines array directly (throws on error)
      const headlines = await generateHeadlinesMutation.mutateAsync({
        productName,
        productDescription,
        count: 5,
      })

      if (headlines && headlines.length > 0) {
        // Use the first headline
        setAdCopy({ headline: headlines[0] })
        handleValidateAndComplete()
      }
    } catch (error) {
      console.error('Error generating headlines:', error)
    }
  }

  const validation = validateAdCopy(adCopy)
  const primaryTextCount = getCharacterCount(adCopy.primaryText, META_AD_LIMITS.primaryText)
  const headlineCount = getCharacterCount(adCopy.headline, META_AD_LIMITS.headline)
  const descriptionCount = getCharacterCount(adCopy.description, META_AD_LIMITS.description)

  return (
    <div className={styles.stepContent}>
      {/* AI Generation Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Wand2 size={20} />
          Gerar Copy com IA
        </h3>
        <p className={styles.sectionDescription}>
          Use inteligência artificial para gerar textos persuasivos para seus anúncios
        </p>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <Input
              label="Nome do Produto/Serviço"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Ex: Curso de Marketing Digital"
            />
          </div>
          <div className={styles.formGroup}>
            <Input
              label="Descrição (opcional)"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Ex: Curso completo com certificado"
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <Button
            variant="outline"
            onClick={handleGenerateCopy}
            disabled={!productName || generateCopyMutation.isPending}
          >
            {generateCopyMutation.isPending ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                Gerando...
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Gerar Copy Completa
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={handleGenerateHeadlines}
            disabled={!productName || generateHeadlinesMutation.isPending}
          >
            {generateHeadlinesMutation.isPending ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : (
              'Apenas Títulos'
            )}
          </Button>
        </div>
      </section>

      {/* Primary Text */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Texto Principal</h3>
        <p className={styles.sectionDescription}>
          O texto que aparece acima da imagem do anúncio
        </p>

        <div className={styles.formGroup}>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={adCopy.primaryText}
            onChange={(e) => handleFieldChange('primaryText', e.target.value)}
            placeholder="Escreva um texto envolvente que capture a atenção do seu público..."
            rows={4}
            maxLength={META_AD_LIMITS.primaryText + 50}
          />
          <div className={`${styles.characterCounter} ${primaryTextCount.isOver ? styles.over : ''}`}>
            {primaryTextCount.count}/{META_AD_LIMITS.primaryText}
          </div>
        </div>
      </section>

      {/* Headline */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Título</h3>
        <p className={styles.sectionDescription}>
          O título que aparece abaixo da imagem
        </p>

        <div className={styles.formGroup}>
          <Input
            value={adCopy.headline}
            onChange={(e) => handleFieldChange('headline', e.target.value)}
            placeholder="Ex: Aprenda Marketing Digital em 30 Dias"
            maxLength={META_AD_LIMITS.headline + 10}
          />
          <div className={`${styles.characterCounter} ${headlineCount.isOver ? styles.over : ''}`}>
            {headlineCount.count}/{META_AD_LIMITS.headline}
          </div>
        </div>
      </section>

      {/* Description */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Descrição</h3>
        <p className={styles.sectionDescription}>
          Texto adicional que aparece junto ao título
        </p>

        <div className={styles.formGroup}>
          <Input
            value={adCopy.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Ex: Certificado reconhecido. Acesso vitalício."
            maxLength={META_AD_LIMITS.description + 10}
          />
          <div className={`${styles.characterCounter} ${descriptionCount.isOver ? styles.over : ''}`}>
            {descriptionCount.count}/{META_AD_LIMITS.description}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Botão de Ação (CTA)</h3>
        <p className={styles.sectionDescription}>
          Escolha o texto do botão que as pessoas vão clicar
        </p>

        <div className={styles.optionsGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {CTA_OPTIONS.map((cta) => {
            const isSelected = adCopy.callToAction === cta.value

            return (
              <button
                key={cta.value}
                type="button"
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleFieldChange('callToAction', cta.value)}
                style={{ padding: 'var(--space-3)' }}
              >
                <span className={styles.optionLabel}>{cta.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Destination URL */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <LinkIcon size={20} />
          URL de Destino
        </h3>
        <p className={styles.sectionDescription}>
          Para onde as pessoas serão direcionadas ao clicar no anúncio
        </p>

        <div className={styles.formGroup}>
          <Input
            type="url"
            value={adCopy.destinationUrl}
            onChange={(e) => handleFieldChange('destinationUrl', e.target.value)}
            placeholder="https://seusite.com/pagina-destino"
            leftIcon={<ExternalLink size={16} />}
          />
          <span className={styles.hint}>
            Use uma URL com HTTPS para melhor desempenho
          </span>
        </div>

        {/* Display URL (optional) */}
        <div className={styles.formGroup} style={{ marginTop: 'var(--space-4)' }}>
          <Input
            label="URL de Exibição (opcional)"
            value={adCopy.displayUrl || ''}
            onChange={(e) => handleFieldChange('displayUrl', e.target.value)}
            placeholder="seusite.com"
          />
          <span className={styles.hint}>
            URL simplificada que aparece no anúncio (se diferente da URL de destino)
          </span>
        </div>
      </section>

      {/* Validation Errors */}
      {!validation.isValid && validation.errors.length > 0 && (
        <section className={styles.section}>
          <div className={styles.errorState} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <AlertCircle size={20} />
              <strong>Campos obrigatórios:</strong>
            </div>
            <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 'var(--space-6)' }}>
              {validation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}
