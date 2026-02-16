import { useState } from 'react'
import { ArrowLeft, Copy, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '@/shared/components'
import styles from './DuplicateCampaignPage.module.css'

// Mock existing campaigns
const MOCK_CAMPAIGNS = [
  { id: '1', name: 'Campanha Leads - Marketing Digital', budget: 50, status: 'active' },
  { id: '2', name: 'Remarketing - Visitantes Site', budget: 30, status: 'paused' },
  { id: '3', name: 'Vendas - Produto X', budget: 100, status: 'active' },
]

export function DuplicateCampaignPage() {
  const navigate = useNavigate()

  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [copies, setCopies] = useState(3)
  const [suffixTemplate, setSuffixTemplate] = useState(' - Cópia {{n}}')
  const [adjustBudget, setAdjustBudget] = useState(false)
  const [budgetMultiplier, setBudgetMultiplier] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  const selectedCampaignData = MOCK_CAMPAIGNS.find(c => c.id === selectedCampaign)

  const getPreviewNames = () => {
    if (!selectedCampaignData) return []
    return Array.from({ length: copies }, (_, i) =>
      selectedCampaignData.name + suffixTemplate.replace('{{n}}', String(i + 1))
    )
  }

  const handleCreate = async () => {
    setIsCreating(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsCreating(false)
    navigate('/alvoads-google')
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.backButton} onClick={() => navigate('/alvoads-google')}>
            <ArrowLeft size={20} />
          </button>
          <div className={styles.headerTitle}>
            <Copy size={20} className={styles.headerIcon} />
            <h1>Duplicar Campanha</h1>
          </div>
        </div>
        <div className={styles.headerRight}>
          {selectedCampaign && (
            <Button
              variant="primary"
              leftIcon={isCreating ? <Loader2 size={16} className="animate-spin" /> : undefined}
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? 'Criando...' : `Criar ${copies} Cópias`}
            </Button>
          )}
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.grid}>
          {/* Left - Campaign Selection */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Selecione a Campanha</h2>
            <p className={styles.sectionDescription}>
              Escolha a campanha que deseja duplicar
            </p>

            <div className={styles.campaignList}>
              {MOCK_CAMPAIGNS.map(campaign => (
                <label
                  key={campaign.id}
                  className={`${styles.campaignItem} ${selectedCampaign === campaign.id ? styles.selected : ''}`}
                  aria-label={campaign.name}
                >
                  <input
                    type="radio"
                    name="campaign"
                    value={campaign.id}
                    checked={selectedCampaign === campaign.id}
                    onChange={() => setSelectedCampaign(campaign.id)}
                  />
                  <div className={styles.campaignInfo}>
                    <span className={styles.campaignName}>{campaign.name}</span>
                    <span className={styles.campaignMeta}>
                      R$ {campaign.budget}/dia • {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Right - Configuration */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Configurações</h2>

            <div className={styles.formGroup}>
              <Input
                label="Número de cópias"
                type="number"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(20, Number(e.target.value))))}
                min={1}
                max={20}
              />
            </div>

            <div className={styles.formGroup}>
              <Input
                label="Sufixo do nome"
                value={suffixTemplate}
                onChange={(e) => setSuffixTemplate(e.target.value)}
                placeholder=" - Cópia {{n}}"
              />
              <span className={styles.hint}>Use {'{{n}}'} para o número da cópia</span>
            </div>

            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={adjustBudget}
                onChange={(e) => setAdjustBudget(e.target.checked)}
              />
              <span>Ajustar orçamento</span>
            </label>

            {adjustBudget && (
              <div className={styles.formGroup}>
                <Input
                  label="Multiplicador de orçamento"
                  type="number"
                  value={budgetMultiplier}
                  onChange={(e) => setBudgetMultiplier(Number(e.target.value))}
                  min={0.1}
                  max={10}
                  step={0.1}
                />
                <span className={styles.hint}>
                  {selectedCampaignData && (
                    <>Novo orçamento: R$ {(selectedCampaignData.budget * budgetMultiplier).toFixed(2)}/dia</>
                  )}
                </span>
              </div>
            )}

            {selectedCampaign && (
              <div className={styles.preview}>
                <h3 className={styles.previewTitle}>Preview</h3>
                <div className={styles.previewList}>
                  {getPreviewNames().map((name, i) => (
                    <div key={i} className={styles.previewItem}>
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
