/**
 * AutomationsPage
 * T066-T067: Main page for managing automation rules
 */

import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useConnections } from '@/features/connections/api/useConnections'
import { Button, Alert, Select, Spinner } from '@/shared/components'
import {
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  useToggleAutomationRule,
} from '../api'
import { AutomationList, AutomationForm, TestAutomationModal } from '../components'
import styles from './AutomationsPage.module.css'
import type { AutomationRule, CreateAutomationRuleInput } from '../types'

type ViewMode = 'list' | 'create' | 'edit'

export function AutomationsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    searchParams.get('connectionId') || ''
  )
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null)
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Queries
  const { data: connections = [], isLoading: isLoadingConnections } = useConnections()
  const googleConnections = connections.filter((c) => c.plataform_name === 'google')

  const {
    data: rules = [],
    isLoading: isLoadingRules,
    refetch: refetchRules,
  } = useAutomationRules({
    connectionId: selectedConnectionId || undefined,
  })

  // Mutations
  const createMutation = useCreateAutomationRule()
  const updateMutation = useUpdateAutomationRule()
  const deleteMutation = useDeleteAutomationRule()
  const toggleMutation = useToggleAutomationRule()

  // Auto-select first connection if none selected
  if (!selectedConnectionId && googleConnections.length > 0 && !isLoadingConnections) {
    setSelectedConnectionId(googleConnections[0].id)
  }

  // Handlers
  const handleConnectionChange = useCallback((connectionId: string) => {
    setSelectedConnectionId(connectionId)
    setSearchParams({ connectionId })
  }, [setSearchParams])

  const handleCreate = useCallback(() => {
    setSelectedRule(null)
    setViewMode('create')
  }, [])

  const handleEdit = useCallback((rule: AutomationRule) => {
    setSelectedRule(rule)
    setViewMode('edit')
  }, [])

  const handleCancel = useCallback(() => {
    setSelectedRule(null)
    setViewMode('list')
  }, [])

  const handleSubmit = useCallback(async (data: CreateAutomationRuleInput) => {
    try {
      if (selectedRule) {
        await updateMutation.mutateAsync({ ruleId: selectedRule.id, ...data })
        setAlert({ type: 'success', message: 'Automação atualizada com sucesso!' })
      } else {
        await createMutation.mutateAsync(data)
        setAlert({ type: 'success', message: 'Automação criada com sucesso!' })
      }
      setViewMode('list')
      setSelectedRule(null)
      refetchRules()
    } catch (error) {
      setAlert({
        type: 'error',
        message: `Erro ao ${selectedRule ? 'atualizar' : 'criar'} automação: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`,
      })
    }
  }, [selectedRule, createMutation, updateMutation, refetchRules])

  const handleDelete = useCallback(async (ruleId: string) => {
    try {
      await deleteMutation.mutateAsync(ruleId)
      setAlert({ type: 'success', message: 'Automação excluída com sucesso!' })
      refetchRules()
    } catch (error) {
      setAlert({
        type: 'error',
        message: `Erro ao excluir automação: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`,
      })
    }
  }, [deleteMutation, refetchRules])

  const handleToggle = useCallback(async (ruleId: string) => {
    try {
      await toggleMutation.mutateAsync(ruleId)
      refetchRules()
    } catch (error) {
      setAlert({
        type: 'error',
        message: `Erro ao alterar status da automação: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`,
      })
    }
  }, [toggleMutation, refetchRules])

  const handleTest = useCallback((ruleId: string) => {
    setTestingRuleId(ruleId)
  }, [])

  // Loading state
  if (isLoadingConnections) {
    return (
      <div className={styles.loading}>
        <Spinner size="lg" />
        <p>Carregando conexões...</p>
      </div>
    )
  }

  // No Google connections
  if (googleConnections.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyConnections}>
          <h2>Nenhuma conexão Google encontrada</h2>
          <p>
            Você precisa conectar uma conta Google Ads para criar automações.
          </p>
          <Button onClick={() => navigate('/connections')}>
            Ir para Conexões
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/alvoads-google')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5m0 0l7 7m-7-7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voltar
          </Button>
          <h1 className={styles.title}>Automações</h1>
          <p className={styles.subtitle}>
            Configure regras para otimizar suas campanhas automaticamente
          </p>
        </div>

        {viewMode === 'list' && (
          <div className={styles.headerRight}>
            <Select
              value={selectedConnectionId}
              onChange={(e) => handleConnectionChange(e.target.value)}
              options={googleConnections.map((c) => ({
                value: c.id,
                label: c.connection_name || `Conta Google ${c.id.slice(0, 8)}`,
              }))}
              className={styles.connectionSelect}
            />
          </div>
        )}
      </div>

      {/* Alert */}
      {alert && (
        <Alert
          variant={alert.type}
          onClose={() => setAlert(null)}
          className={styles.alert}
        >
          {alert.message}
        </Alert>
      )}

      {/* Content */}
      <div className={styles.content}>
        {viewMode === 'list' && (
          <AutomationList
            rules={rules as AutomationRule[]}
            isLoading={isLoadingRules}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onTest={handleTest}
            onCreate={handleCreate}
          />
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <Button variant="ghost" onClick={handleCancel}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5m0 0l7 7m-7-7l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Voltar
              </Button>
              <h2>{viewMode === 'create' ? 'Nova automação' : 'Editar automação'}</h2>
            </div>

            <AutomationForm
              connectionId={selectedConnectionId}
              initialData={selectedRule || undefined}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}
      </div>

      {/* Test Modal */}
      <TestAutomationModal
        rule={(rules as AutomationRule[]).find(r => r.id === testingRuleId) || null}
        isOpen={!!testingRuleId}
        onClose={() => setTestingRuleId(null)}
        onExecuted={refetchRules}
      />
    </div>
  )
}

export default AutomationsPage
