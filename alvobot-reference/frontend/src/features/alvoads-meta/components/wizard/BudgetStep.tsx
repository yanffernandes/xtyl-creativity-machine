import { useEffect, useId } from 'react'
import { AlertCircle, Check, DollarSign, Target, Zap, TrendingUp } from 'lucide-react'
import styles from './WizardSteps.module.css'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import { validateBudget, formatCurrency } from '../../utils/validation'
import type { MetaBidStrategy } from '../../types/campaign'

const BID_STRATEGIES: Array<{
  value: MetaBidStrategy
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    value: 'LOWEST_COST_WITHOUT_CAP',
    label: 'Menor Custo',
    description: 'Meta busca o maior volume pelo menor custo (recomendado)',
    icon: <Zap size={20} />,
  },
  {
    value: 'COST_CAP',
    label: 'Custo por Resultado',
    description: 'Define um custo-alvo por conversão',
    icon: <Target size={20} />,
  },
  {
    value: 'LOWEST_COST_WITH_BID_CAP',
    label: 'Limite de Lance',
    description: 'Define um teto para o lance em cada leilão',
    icon: <DollarSign size={20} />,
  },
  {
    value: 'LOWEST_COST_WITH_MIN_ROAS',
    label: 'ROAS Mínimo',
    description: 'Define um retorno mínimo sobre investimento em anúncios',
    icon: <TrendingUp size={20} />,
  },
]

export function BudgetStep() {
  const {
    budget,
    setBudget,
    markStepCompleted,
    markStepIncomplete,
  } = useMetaAdsWizardStore()

  const handleValidateAndComplete = () => {
    const validation = validateBudget(budget)
    if (validation.isValid) {
      markStepCompleted('budget')
    } else {
      markStepIncomplete('budget')
    }
  }

  // Validate on mount and when budget changes
  useEffect(() => {
    const validation = validateBudget(budget)
    if (validation.isValid) {
      markStepCompleted('budget')
    } else {
      markStepIncomplete('budget')
    }
  }, [budget, markStepCompleted, markStepIncomplete])

  const handleBudgetTypeChange = (type: 'daily' | 'lifetime') => {
    setBudget({ type })
    handleValidateAndComplete()
  }

  const handleAmountChange = (valueInReais: string) => {
    // Convert from R$ string to cents
    const cleaned = valueInReais.replace(/[^\d,]/g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100)
    setBudget({ amount: cents })
    handleValidateAndComplete()
  }

  const handleBidStrategyChange = (strategy: MetaBidStrategy) => {
    setBudget({ bidStrategy: strategy })
    handleValidateAndComplete()
  }

  const handleCostPerResultChange = (valueInReais: string) => {
    const cleaned = valueInReais.replace(/[^\d,]/g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100)
    setBudget({ costPerResult: cents })
    handleValidateAndComplete()
  }

  const handleBidCapChange = (valueInReais: string) => {
    const cleaned = valueInReais.replace(/[^\d,]/g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    const cents = isNaN(parsed) ? 0 : Math.round(parsed * 100)
    setBudget({ bidCap: cents })
    handleValidateAndComplete()
  }

  const handleMinRoasChange = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    setBudget({ minRoas: isNaN(parsed) ? undefined : parsed })
    handleValidateAndComplete()
  }

  const amountInReais = (budget.amount / 100).toFixed(2).replace('.', ',')
  const costPerResultInReais = budget.costPerResult
    ? (budget.costPerResult / 100).toFixed(2).replace('.', ',')
    : ''
  const bidCapInReais = budget.bidCap
    ? (budget.bidCap / 100).toFixed(2).replace('.', ',')
    : ''
  const minRoasStr = budget.minRoas !== undefined && budget.minRoas !== null
    ? budget.minRoas.toFixed(2).replace('.', ',')
    : ''

  const validation = validateBudget(budget)
  const costPerResultId = useId()
  const bidCapId = useId()
  const minRoasId = useId()

  return (
    <div className={styles.stepContent}>
      {/* Budget Type */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Tipo de Orçamento</h3>
        <p className={styles.sectionDescription}>
          Escolha como você deseja gerenciar seu orçamento de campanha
        </p>

        <div className={styles.optionsGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <button
            type="button"
            className={`${styles.optionCard} ${budget.type === 'daily' ? styles.selected : ''}`}
            onClick={() => handleBudgetTypeChange('daily')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <div className={`${styles.checkboxIndicator} ${budget.type === 'daily' ? styles.checked : ''}`}>
                {budget.type === 'daily' && <Check size={14} />}
              </div>
              <div>
                <span className={styles.optionLabel}>Orçamento Diário</span>
                <span className={styles.optionDescription}>
                  Gasta em média esse valor por dia
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            className={`${styles.optionCard} ${budget.type === 'lifetime' ? styles.selected : ''}`}
            onClick={() => handleBudgetTypeChange('lifetime')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
              <div className={`${styles.checkboxIndicator} ${budget.type === 'lifetime' ? styles.checked : ''}`}>
                {budget.type === 'lifetime' && <Check size={14} />}
              </div>
              <div>
                <span className={styles.optionLabel}>Orçamento Total</span>
                <span className={styles.optionDescription}>
                  Gasta esse valor ao longo da campanha
                </span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* Budget Amount */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Valor do Orçamento</h3>
        <p className={styles.sectionDescription}>
          {budget.type === 'daily'
            ? 'Quanto você deseja gastar por dia em média'
            : 'Quanto você deseja gastar no total da campanha'}
        </p>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            Orçamento {budget.type === 'daily' ? 'Diário' : 'Total'}
          </label>
          <div className={styles.budgetInput}>
            <span className={styles.currencyPrefix}>R$</span>
            <input
              type="text"
              className={styles.input}
              value={amountInReais}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="10,00"
              style={{ maxWidth: '200px' }}
            />
          </div>
          <span className={styles.hint}>
            Mínimo: R$ 1,00 por dia
          </span>
        </div>

        {/* Budget Preview */}
        {budget.amount > 0 && (
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-4)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {budget.type === 'daily' ? 'Por dia:' : 'Total:'}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {formatCurrency(budget.amount)}
              </span>
            </div>
            {budget.type === 'daily' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Por semana (estimado):</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    {formatCurrency(budget.amount * 7)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Por mês (estimado):</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    {formatCurrency(budget.amount * 30)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Bid Strategy */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Estratégia de Lances</h3>
        <p className={styles.sectionDescription}>
          Escolha como o Meta vai otimizar seus lances nos leilões.
          Corresponde ao campo <code>bid_strategy</code> da API.
        </p>

        <div className={styles.optionsGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          {BID_STRATEGIES.map((strategy) => {
            const isSelected = budget.bidStrategy === strategy.value

            return (
              <button
                key={strategy.value}
                type="button"
                className={`${styles.optionCard} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleBidStrategyChange(strategy.value)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
                  <div style={{
                    padding: 'var(--space-2)',
                    background: isSelected ? 'var(--color-primary)' : 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    color: isSelected ? 'white' : 'var(--color-text-secondary)',
                  }}>
                    {strategy.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className={styles.optionLabel}>{strategy.label}</span>
                      {isSelected && <Check size={20} style={{ color: 'var(--color-success)' }} />}
                    </div>
                    <span className={styles.optionDescription}>{strategy.description}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Cost Per Result (if COST_CAP is selected) */}
      {budget.bidStrategy === 'COST_CAP' && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Custo por Resultado</h3>
          <p className={styles.sectionDescription}>
            Defina quanto você está disposto a pagar por cada resultado
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={costPerResultId}>Custo máximo por resultado</label>
            <div className={styles.budgetInput}>
              <span className={styles.currencyPrefix}>R$</span>
              <input
                id={costPerResultId}
                type="text"
                className={styles.input}
                value={costPerResultInReais}
                onChange={(e) => handleCostPerResultChange(e.target.value)}
                placeholder="5,00"
                style={{ maxWidth: '200px' }}
              />
            </div>
            <span className={styles.hint}>
              O Meta tentará manter o custo por resultado abaixo deste valor
            </span>
          </div>
        </section>
      )}

      {/* Bid Amount (if BID_CAP / Limite de Lance is selected) */}
      {budget.bidStrategy === 'LOWEST_COST_WITH_BID_CAP' && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Limite de Lance</h3>
          <p className={styles.sectionDescription}>
            Defina o valor máximo que você pagará por cada leilão
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={bidCapId}>Lance máximo por leilão</label>
            <div className={styles.budgetInput}>
              <span className={styles.currencyPrefix}>R$</span>
              <input
                id={bidCapId}
                type="text"
                className={styles.input}
                value={bidCapInReais}
                onChange={(e) => handleBidCapChange(e.target.value)}
                placeholder="2,00"
                style={{ maxWidth: '200px' }}
              />
            </div>
            <span className={styles.hint}>
              O Meta nunca pagará mais que este valor em cada leilão. Lances muito baixos podem reduzir a entrega.
            </span>
          </div>

          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3)',
            background: 'var(--color-warning-alpha-10)',
            border: '1px solid var(--color-warning)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-2)',
          }}>
            <AlertCircle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>Limite de Lance</strong> dá controle total sobre quanto você paga,
              mas pode limitar a entrega se o valor for muito baixo para o leilão.
              Recomendado para usuários avançados.
            </div>
          </div>
        </section>
      )}

      {/* Min ROAS (if LOWEST_COST_WITH_MIN_ROAS is selected) */}
      {budget.bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS' && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>ROAS Mínimo</h3>
          <p className={styles.sectionDescription}>
            Defina o retorno mínimo sobre investimento em anúncios (ROAS).
            Por exemplo, 2.00 significa que para cada R$1 gasto, você espera R$2 de retorno.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor={minRoasId}>ROAS mínimo</label>
            <div className={styles.budgetInput}>
              <span className={styles.currencyPrefix} style={{ fontWeight: 600 }}>×</span>
              <input
                id={minRoasId}
                type="text"
                className={styles.input}
                value={minRoasStr}
                onChange={(e) => handleMinRoasChange(e.target.value)}
                placeholder="2,00"
                style={{ maxWidth: '200px' }}
              />
            </div>
            <span className={styles.hint}>
              Valor multiplicador. Ex: 2,00 = 200% de retorno (para cada R$1 gasto, espera R$2 de receita)
            </span>
          </div>

          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3)',
            background: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-2)',
          }}>
            <TrendingUp size={18} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>ROAS Mínimo</strong> requer que o Pixel esteja configurado
              com o evento <strong>Purchase</strong> e valores de conversão. Ideal para e-commerce com acompanhamento de valor.
            </div>
          </div>
        </section>
      )}

      {/* Validation Errors */}
      {!validation.isValid && validation.errors.length > 0 && (
        <section className={styles.section}>
          <div className={styles.errorState} style={{ flexDirection: 'row', gap: 'var(--space-2)' }}>
            <AlertCircle size={20} />
            <div>
              {validation.errors.map((error, i) => (
                <p key={i}>{error}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
