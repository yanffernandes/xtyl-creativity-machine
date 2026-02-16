/**
 * AutomationList Component
 * T064-T065: List of automation rules with actions
 */

import { useState } from 'react'
import { Button, Card, Spinner } from '@/shared/components'
import styles from './AutomationList.module.css'
import type { AutomationRule, ConditionTree } from '../../types'

interface AutomationListProps {
  rules: AutomationRule[]
  isLoading?: boolean
  onEdit: (rule: AutomationRule) => void
  onDelete: (ruleId: string) => void
  onToggle: (ruleId: string) => void
  onTest: (ruleId: string) => void
  onCreate: () => void
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

// Format date for display
function formatDate(dateString?: string): string {
  if (!dateString) return 'Nunca'
  const date = new Date(dateString)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format frequency for display
function formatFrequency(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}d`
}

export function AutomationList({
  rules,
  isLoading = false,
  onEdit,
  onDelete,
  onToggle,
  onTest,
  onCreate,
}: AutomationListProps) {
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const handleDelete = (ruleId: string) => {
    if (confirmDeleteId === ruleId) {
      onDelete(ruleId)
      setConfirmDeleteId(null)
    } else {
      setConfirmDeleteId(ruleId)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <p>Carregando automações...</p>
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3>Nenhuma automação configurada</h3>
        <p>Crie sua primeira automação para otimizar suas campanhas automaticamente.</p>
        <Button onClick={onCreate}>Criar automação</Button>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <h3>{rules.length} {rules.length === 1 ? 'automação' : 'automações'}</h3>
        <Button onClick={onCreate}>Nova automação</Button>
      </div>

      <div className={styles.rules}>
        {rules.map((rule) => (
          <Card key={rule.id} className={styles.ruleCard}>
            <div className={styles.ruleHeader}>
              <div className={styles.ruleInfo}>
                <div className={styles.ruleTitleRow}>
                  <h4 className={styles.ruleName}>{rule.name}</h4>
                  <span
                    className={`${styles.statusBadge} ${
                      rule.isActive ? styles.active : styles.inactive
                    }`}
                  >
                    {rule.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                {rule.description && (
                  <p className={styles.ruleDescription}>{rule.description}</p>
                )}
              </div>

              <div className={styles.ruleActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggle(rule.id)}
                  title={rule.isActive ? 'Desativar' : 'Ativar'}
                >
                  {rule.isActive ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" fill="currentColor" />
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onTest(rule.id)}
                  title="Testar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(rule)}
                  title="Editar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Button>
                <Button
                  variant={confirmDeleteId === rule.id ? 'danger' : 'ghost'}
                  size="sm"
                  onClick={() => handleDelete(rule.id)}
                  title={confirmDeleteId === rule.id ? 'Confirmar exclusão' : 'Excluir'}
                >
                  {confirmDeleteId === rule.id ? (
                    'Confirmar'
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </Button>
              </div>
            </div>

            <div className={styles.ruleDetails}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Ação</span>
                <span className={styles.detailValue}>
                  {ACTION_LABELS[rule.actionType] || rule.actionType}
                  {rule.actionValue && (
                    <> ({rule.actionValue}{rule.actionValueType === 'percentage' ? '%' : ' R$'})</>
                  )}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Frequência</span>
                <span className={styles.detailValue}>
                  {formatFrequency(rule.checkFrequencyMinutes)}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Cooldown</span>
                <span className={styles.detailValue}>
                  {formatFrequency(rule.cooldownMinutes)}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Execuções</span>
                <span className={styles.detailValue}>
                  {rule.currentExecutions}
                  {rule.maxExecutions && `/${rule.maxExecutions}`}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Última execução</span>
                <span className={styles.detailValue}>
                  {formatDate(rule.lastExecutionAt)}
                </span>
              </div>
            </div>

            {/* Expandable conditions preview */}
            <button
              type="button"
              className={styles.expandButton}
              onClick={() =>
                setExpandedRuleId(expandedRuleId === rule.id ? null : rule.id)
              }
            >
              {expandedRuleId === rule.id ? 'Ocultar condições' : 'Ver condições'}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className={expandedRuleId === rule.id ? styles.rotated : ''}
              >
                <path
                  d="M19 9l-7 7-7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {expandedRuleId === rule.id && (
              <div className={styles.conditionsPreview}>
                <ConditionsPreview conditions={rule.conditions} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

// Simple conditions preview component
function ConditionsPreview({ conditions }: { conditions: ConditionTree }) {
  const renderNode = (node: ConditionTree): string => {
    if (node.type === 'condition') {
      const metricLabels: Record<string, string> = {
        impressions: 'Impressões',
        clicks: 'Cliques',
        ctr: 'CTR',
        cost: 'Custo',
        conversions: 'Conversões',
        cpa: 'CPA',
        roas: 'ROAS',
        budget_spent_percent: 'Orçamento gasto',
        runtime_hours: 'Tempo de execução',
      }
      return `${metricLabels[node.metric] || node.metric} ${node.operator} ${node.value}`
    }

    const childStrings = node.children.map(renderNode)
    const operator = node.operator === 'AND' ? ' E ' : ' OU '
    return `(${childStrings.join(operator)})`
  }

  return <code className={styles.conditionsCode}>{renderNode(conditions)}</code>
}

export default AutomationList
