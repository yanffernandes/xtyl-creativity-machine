/**
 * TestAutomationModal Component
 * Modal to test automation rules (dry run) and execute them
 */

import { useState } from 'react'
import { Button, Modal, Spinner, Alert } from '@/shared/components'
import { api } from '@/shared/utils/api'
import styles from './TestAutomationModal.module.css'
import { useTestAutomationRule } from '../../api/queries'
import type { AutomationRule } from '../../types'

interface TestAutomationModalProps {
  rule: AutomationRule | null
  isOpen: boolean
  onClose: () => void
  onExecuted?: () => void
}

// Action type labels
const ACTION_LABELS: Record<string, string> = {
  pause: 'Pausar',
  enable: 'Ativar',
  increase_budget: 'Aumentar orçamento',
  decrease_budget: 'Diminuir orçamento',
  increase_bid: 'Aumentar lance',
  decrease_bid: 'Diminuir lance',
}

export function TestAutomationModal({
  rule,
  isOpen,
  onClose,
  onExecuted,
}: TestAutomationModalProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executeResult, setExecuteResult] = useState<{
    success: boolean
    message: string
    executedCount?: number
  } | null>(null)

  // Fetch test results when modal is open and rule is set
  const {
    data: testResult,
    isLoading: isLoadingTest,
    isFetching: isFetchingTest,
    error: testError,
    refetch: refetchTest,
  } = useTestAutomationRule(rule?.id || '', isOpen && !!rule)

  const handleExecute = async () => {
    if (!rule) return

    setIsExecuting(true)
    setExecuteResult(null)

    try {
      const result = await api.post<{ success: boolean; executedCount: number }>(
        `/google/automations/rules/${rule.id}/execute`,
        {}
      )

      setExecuteResult({
        success: true,
        message: `Automação executada com sucesso!`,
        executedCount: result.executedCount,
      })

      // Refetch test results to show updated state
      refetchTest()

      // Notify parent
      if (onExecuted) {
        onExecuted()
      }
    } catch (error) {
      setExecuteResult({
        success: false,
        message: `Erro ao executar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleClose = () => {
    setExecuteResult(null)
    onClose()
  }

  const matchingCount = testResult?.matchingCampaigns?.filter(c => c.wouldExecute).length || 0
  const totalMatching = testResult?.totalMatching || 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Testar: ${rule?.name || 'Automação'}`}
      description="Verificar quais campanhas correspondem às condições"
      size="lg"
    >
      <div className={styles.content}>
        {/* Rule summary */}
        {rule && (
          <div className={styles.ruleSummary}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Ação:</span>
              <span className={styles.summaryValue}>
                {ACTION_LABELS[rule.actionType] || rule.actionType}
                {rule.actionValue && (
                  <> ({rule.actionValue}{rule.actionValueType === 'percentage' ? '%' : ' R$'})</>
                )}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Escopo:</span>
              <span className={styles.summaryValue}>
                {rule.scopeType === 'all' ? 'Todas as campanhas' : 'Campanhas filtradas'}
              </span>
            </div>
          </div>
        )}

        {/* Execute result alert */}
        {executeResult && (
          <Alert
            variant={executeResult.success ? 'success' : 'error'}
            className={styles.alert}
          >
            {executeResult.message}
            {executeResult.executedCount !== undefined && (
              <> ({executeResult.executedCount} campanhas afetadas)</>
            )}
          </Alert>
        )}

        {/* Loading state */}
        {isLoadingTest && (
          <div className={styles.loading}>
            <Spinner size="md" />
            <p>Analisando campanhas...</p>
          </div>
        )}

        {/* Error state */}
        {testError && (
          <Alert variant="error" className={styles.alert}>
            Erro ao testar automação: {testError instanceof Error ? testError.message : 'Erro desconhecido'}
          </Alert>
        )}

        {/* Results */}
        {testResult && !isLoadingTest && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              <h4>Resultado do teste</h4>
              <p className={styles.resultsSummary}>
                <strong>{matchingCount}</strong> de <strong>{totalMatching}</strong> campanhas
                seriam executadas
              </p>
            </div>

            {testResult.matchingCampaigns.length === 0 ? (
              <div className={styles.emptyResults}>
                <p>Nenhuma campanha corresponde às condições configuradas.</p>
              </div>
            ) : (
              <div className={styles.campaignList}>
                {testResult.matchingCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className={`${styles.campaignItem} ${
                      campaign.wouldExecute ? styles.wouldExecute : styles.blocked
                    }`}
                  >
                    <div className={styles.campaignInfo}>
                      <span className={styles.campaignName}>{campaign.name}</span>
                      <span className={styles.campaignStatus}>
                        {campaign.wouldExecute ? (
                          <span className={styles.statusExecute}>Será executada</span>
                        ) : (
                          <span className={styles.statusBlocked}>Bloqueada</span>
                        )}
                      </span>
                    </div>
                    <div className={styles.campaignReason}>
                      {campaign.reason}
                    </div>
                    <div className={styles.campaignMetrics}>
                      {campaign.currentMetrics.impressions !== undefined && (
                        <span>Impressões: {campaign.currentMetrics.impressions?.toLocaleString()}</span>
                      )}
                      {campaign.currentMetrics.clicks !== undefined && (
                        <span>Cliques: {campaign.currentMetrics.clicks?.toLocaleString()}</span>
                      )}
                      {campaign.currentMetrics.cost !== undefined && (
                        <span>Custo: R$ {campaign.currentMetrics.cost?.toFixed(2)}</span>
                      )}
                      {campaign.currentMetrics.conversions !== undefined && (
                        <span>Conversões: {campaign.currentMetrics.conversions}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className={styles.testedAt}>
              Testado em: {new Date(testResult.testedAt).toLocaleString('pt-BR')}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose}>
            Fechar
          </Button>
          <Button
            variant="ghost"
            onClick={() => refetchTest()}
            disabled={isFetchingTest}
          >
            {isFetchingTest && !isLoadingTest ? (
              <>
                <Spinner size="sm" />
                Atualizando...
              </>
            ) : (
              'Atualizar'
            )}
          </Button>
          {matchingCount > 0 && (
            <Button
              onClick={handleExecute}
              disabled={isExecuting || isFetchingTest}
            >
              {isExecuting ? (
                <>
                  <Spinner size="sm" />
                  Executando...
                </>
              ) : (
                `Executar agora (${matchingCount})`
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default TestAutomationModal
