import { useId, useState } from 'react'
import { ArrowLeft, MapPin, Plus, Sparkles, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '@/shared/components'
import styles from './BulkLocationPage.module.css'

// Brazilian states data
const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
]

interface LocationItem {
  code: string
  name: string
  selected: boolean
  customBudget?: number
}

interface CampaignPreview {
  name: string
  location: string
  keywords: string[]
  budget: number
}

export function BulkLocationPage() {
  const navigate = useNavigate()
  const baseKeywordsId = useId()

  // Form state
  const [campaignBaseName, setCampaignBaseName] = useState('{{produto}} - {{location}}')
  const [baseKeywords, setBaseKeywords] = useState('')
  const [baseBudget, setBaseBudget] = useState(50)
  const [finalUrl, setFinalUrl] = useState('')
  const [productName, setProductName] = useState('')

  // Location state
  const [locations, setLocations] = useState<LocationItem[]>(
    BRAZILIAN_STATES.map(s => ({ ...s, selected: false }))
  )
  const [customLocationInput, setCustomLocationInput] = useState('')

  // Variation settings
  const [includeLocationInKeywords, setIncludeLocationInKeywords] = useState(true)
  const [includeLocationInAds, setIncludeLocationInAds] = useState(true)
  const [keywordTemplate, setKeywordTemplate] = useState('{{keyword}} em {{location}}')

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [previews, setPreviews] = useState<CampaignPreview[]>([])
  const [step, setStep] = useState<'config' | 'preview' | 'generating'>('config')

  const selectedLocations = locations.filter(l => l.selected)

  const handleToggleLocation = (code: string) => {
    setLocations(prev =>
      prev.map(l => (l.code === code ? { ...l, selected: !l.selected } : l))
    )
  }

  const handleSelectAll = () => {
    setLocations(prev => prev.map(l => ({ ...l, selected: true })))
  }

  const handleDeselectAll = () => {
    setLocations(prev => prev.map(l => ({ ...l, selected: false })))
  }

  const handleAddCustomLocation = () => {
    if (!customLocationInput.trim()) return
    const newLocation: LocationItem = {
      code: customLocationInput.toUpperCase().replace(/\s+/g, '_'),
      name: customLocationInput.trim(),
      selected: true,
    }
    setLocations(prev => [...prev, newLocation])
    setCustomLocationInput('')
  }

  const handleGeneratePreview = () => {
    if (selectedLocations.length === 0) return

    const keywords = baseKeywords.split('\n').filter(k => k.trim())

    const generatedPreviews: CampaignPreview[] = selectedLocations.map(location => {
      const campaignName = campaignBaseName
        .replace('{{produto}}', productName || 'Produto')
        .replace('{{location}}', location.name)

      const locationKeywords = includeLocationInKeywords
        ? keywords.flatMap(kw => [
            kw.trim(),
            keywordTemplate
              .replace('{{keyword}}', kw.trim())
              .replace('{{location}}', location.name),
          ])
        : keywords.map(kw => kw.trim())

      return {
        name: campaignName,
        location: location.name,
        keywords: locationKeywords,
        budget: location.customBudget || baseBudget,
      }
    })

    setPreviews(generatedPreviews)
    setStep('preview')
  }

  const handleCreateCampaigns = async () => {
    setStep('generating')
    setIsGenerating(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000))

    setIsGenerating(false)
    // TODO: Implement actual API integration
    navigate('/alvoads-google')
  }

  const handleBack = () => {
    if (step === 'preview') {
      setStep('config')
    } else {
      navigate('/alvoads-google')
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
          >
            <ArrowLeft size={20} />
          </button>
          <div className={styles.headerTitle}>
            <MapPin size={20} className={styles.headerIcon} />
            <h1>Campanhas por Localização</h1>
          </div>
        </div>
        <div className={styles.headerRight}>
          {step === 'config' && (
            <Button
              variant="primary"
              onClick={handleGeneratePreview}
              disabled={selectedLocations.length === 0 || !baseKeywords.trim()}
            >
              Gerar Preview ({selectedLocations.length} campanhas)
            </Button>
          )}
          {step === 'preview' && (
            <Button
              variant="primary"
              leftIcon={isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              onClick={handleCreateCampaigns}
              disabled={isGenerating}
            >
              {isGenerating ? 'Criando...' : `Criar ${previews.length} Campanhas`}
            </Button>
          )}
        </div>
      </header>

      {step === 'config' && (
        <main className={styles.content}>
          <div className={styles.grid}>
            {/* Left Column - Configuration */}
            <div className={styles.configSection}>
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Configuração Base</h2>

                <div className={styles.formGroup}>
                  <Input
                    label="Nome do Produto/Serviço"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ex: Advogado Trabalhista"
                  />
                </div>

                <div className={styles.formGroup}>
                  <Input
                    label="Template do Nome da Campanha"
                    value={campaignBaseName}
                    onChange={(e) => setCampaignBaseName(e.target.value)}
                    placeholder="{{produto}} - {{location}}"
                  />
                  <span className={styles.hint}>
                    Use {'{{produto}}'} e {'{{location}}'} como variáveis
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor={baseKeywordsId}>Palavras-chave Base (uma por linha)</label>
                  <textarea
                    id={baseKeywordsId}
                    className={styles.textarea}
                    value={baseKeywords}
                    onChange={(e) => setBaseKeywords(e.target.value)}
                    placeholder="advogado trabalhista&#10;advogado CLT&#10;processo trabalhista"
                    rows={6}
                  />
                </div>

                <div className={styles.formGroup}>
                  <Input
                    label="URL de Destino"
                    value={finalUrl}
                    onChange={(e) => setFinalUrl(e.target.value)}
                    placeholder="https://seusite.com.br"
                  />
                </div>

                <div className={styles.formGroup}>
                  <Input
                    label="Orçamento Diário (R$)"
                    type="number"
                    value={baseBudget}
                    onChange={(e) => setBaseBudget(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>

              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Variações</h2>

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={includeLocationInKeywords}
                    onChange={(e) => setIncludeLocationInKeywords(e.target.checked)}
                  />
                  <span>Incluir localização nas palavras-chave</span>
                </label>

                {includeLocationInKeywords && (
                  <div className={styles.formGroup}>
                    <Input
                      label="Template de Keyword"
                      value={keywordTemplate}
                      onChange={(e) => setKeywordTemplate(e.target.value)}
                      placeholder="{{keyword}} em {{location}}"
                    />
                  </div>
                )}

                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={includeLocationInAds}
                    onChange={(e) => setIncludeLocationInAds(e.target.checked)}
                  />
                  <span>Incluir localização nos anúncios</span>
                </label>
              </div>
            </div>

            {/* Right Column - Locations */}
            <div className={styles.locationsSection}>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Localizações</h2>
                  <div className={styles.sectionActions}>
                    <button type="button" className={styles.linkButton} onClick={handleSelectAll}>
                      Selecionar todos
                    </button>
                    <button type="button" className={styles.linkButton} onClick={handleDeselectAll}>
                      Limpar seleção
                    </button>
                  </div>
                </div>

                <div className={styles.selectedCount}>
                  {selectedLocations.length} localização(ões) selecionada(s)
                </div>

                <div className={styles.addLocation}>
                  <Input
                    value={customLocationInput}
                    onChange={(e) => setCustomLocationInput(e.target.value)}
                    placeholder="Adicionar cidade personalizada..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomLocation()}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddCustomLocation}>
                    <Plus size={16} />
                  </Button>
                </div>

                <div className={styles.locationsList}>
                  {locations.map(location => (
                    <label
                      key={location.code}
                      className={`${styles.locationItem} ${location.selected ? styles.selected : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={location.selected}
                        onChange={() => handleToggleLocation(location.code)}
                      />
                      <span className={styles.locationName}>{location.name}</span>
                      <span className={styles.locationCode}>{location.code}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {step === 'preview' && (
        <main className={styles.content}>
          <div className={styles.previewSection}>
            <div className={styles.previewHeader}>
              <h2 className={styles.sectionTitle}>Preview das Campanhas</h2>
              <p className={styles.previewSubtitle}>
                {previews.length} campanhas serão criadas
              </p>
            </div>

            <div className={styles.previewList}>
              {previews.map((preview, index) => (
                <div key={index} className={styles.previewCard}>
                  <div className={styles.previewCardHeader}>
                    <h3 className={styles.previewCardTitle}>{preview.name}</h3>
                    <span className={styles.previewBudget}>R$ {preview.budget}/dia</span>
                  </div>
                  <div className={styles.previewCardLocation}>
                    <MapPin size={14} />
                    {preview.location}
                  </div>
                  <div className={styles.previewKeywords}>
                    <span className={styles.keywordsLabel}>Keywords:</span>
                    <div className={styles.keywordTags}>
                      {preview.keywords.slice(0, 5).map((kw, i) => (
                        <span key={i} className={styles.keywordTag}>{kw}</span>
                      ))}
                      {preview.keywords.length > 5 && (
                        <span className={styles.keywordTag}>+{preview.keywords.length - 5} mais</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {step === 'generating' && (
        <main className={styles.content}>
          <div className={styles.generatingState}>
            <div className={styles.generatingIcon}>
              <Loader2 size={48} className="animate-spin" />
            </div>
            <h2 className={styles.generatingTitle}>Criando suas campanhas...</h2>
            <p className={styles.generatingSubtitle}>
              Isso pode levar alguns segundos
            </p>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} />
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
