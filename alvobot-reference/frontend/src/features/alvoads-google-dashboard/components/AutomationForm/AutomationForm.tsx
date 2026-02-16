/**
 * AutomationForm Component
 * T061-T063: Form for creating and editing automation rules
 */

import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { Button, Input, Select } from '@/shared/components'
import { Card, CardHeader, CardBody } from '@/shared/components/Card'
import { ConditionBuilder } from '../ConditionBuilder'
import styles from './AutomationForm.module.css'
import type {
  AutomationRule,
  CreateAutomationRuleInput,
  ConditionTree,
  ActionType,
  ActionValueType,
} from '../../types'

// Helper to handle optional number fields (valueAsNumber returns NaN for empty inputs)
const optionalNumber = z.preprocess(
  (val) => (val === '' || val === undefined || Number.isNaN(val) ? undefined : val),
  z.number().optional()
)

const optionalNumberMin = (min: number) => z.preprocess(
  (val) => (val === '' || val === undefined || Number.isNaN(val) ? undefined : val),
  z.number().min(min).optional()
)

// Form validation schema
const automationFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  scope_type: z.enum(['all', 'filter']),
  scope_filters: z.object({
    nameContains: z.string().optional(),
    nameNotContains: z.string().optional(),
    status: z.enum(['ENABLED', 'PAUSED']).optional(),
    minBudget: optionalNumber,
    maxBudget: optionalNumber,
    biddingStrategyType: z.string().optional(),
  }).optional(),
  action_type: z.enum([
    'pause',
    'enable',
    'increase_budget',
    'decrease_budget',
    'increase_bid',
    'decrease_bid',
    'increase_target_cpa',
    'decrease_target_cpa',
    'increase_target_roas',
    'decrease_target_roas',
  ]),
  action_value: optionalNumber,
  action_value_type: z.enum(['absolute', 'percentage']).optional(),
  action_limit: optionalNumber,
  check_frequency_minutes: z.number().min(15).max(1440),
  cooldown_minutes: z.number().min(0).max(10080),
  max_executions: optionalNumberMin(1),
})

type AutomationFormData = z.infer<typeof automationFormSchema>

interface AutomationFormProps {
  connectionId: string
  initialData?: AutomationRule
  onSubmit: (data: CreateAutomationRuleInput) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

// Action type options
const ACTION_OPTIONS = [
  { value: 'pause', label: 'Pausar campanha' },
  { value: 'enable', label: 'Ativar campanha' },
  { value: 'increase_budget', label: 'Aumentar orçamento' },
  { value: 'decrease_budget', label: 'Diminuir orçamento' },
  { value: 'increase_bid', label: 'Aumentar lance (CPC máximo)' },
  { value: 'decrease_bid', label: 'Diminuir lance (CPC máximo)' },
  { value: 'increase_target_cpa', label: 'Aumentar CPA alvo' },
  { value: 'decrease_target_cpa', label: 'Diminuir CPA alvo' },
  { value: 'increase_target_roas', label: 'Aumentar ROAS alvo' },
  { value: 'decrease_target_roas', label: 'Diminuir ROAS alvo' },
]

// Bidding strategy options for scope filter
const BIDDING_STRATEGY_OPTIONS = [
  { value: '', label: 'Qualquer estratégia' },
  { value: 'TARGET_CPA', label: 'CPA alvo' },
  { value: 'TARGET_ROAS', label: 'ROAS alvo' },
  { value: 'MAXIMIZE_CONVERSIONS', label: 'Maximizar conversões' },
  { value: 'MAXIMIZE_CONVERSION_VALUE', label: 'Maximizar valor de conversões' },
  { value: 'TARGET_SPEND', label: 'Maximizar cliques' },
  { value: 'MANUAL_CPC', label: 'CPC manual' },
]

// Frequency options (minimum 15 minutes per backend validation)
const FREQUENCY_OPTIONS = [
  { value: '15', label: 'A cada 15 minutos' },
  { value: '30', label: 'A cada 30 minutos' },
  { value: '60', label: 'A cada hora' },
  { value: '360', label: 'A cada 6 horas' },
  { value: '720', label: 'A cada 12 horas' },
  { value: '1440', label: 'Uma vez por dia' },
]

// Cooldown options
const COOLDOWN_OPTIONS = [
  { value: '60', label: '1 hora' },
  { value: '180', label: '3 horas' },
  { value: '360', label: '6 horas' },
  { value: '720', label: '12 horas' },
  { value: '1440', label: '24 horas' },
  { value: '4320', label: '3 dias' },
  { value: '10080', label: '7 dias' },
]

export function AutomationForm({
  connectionId,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: AutomationFormProps) {
  const [conditions, setConditions] = useState<ConditionTree>(
    initialData?.conditions || {
      type: 'group',
      operator: 'AND',
      children: [
        { type: 'condition', metric: 'impressions', operator: '>', value: 0 },
      ],
    }
  )

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(automationFormSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      scope_type: initialData?.scopeType || 'all',
      scope_filters: initialData?.scopeFilters || {},
      action_type: initialData?.actionType || 'pause',
      action_value: initialData?.actionValue,
      action_value_type: initialData?.actionValueType || 'percentage',
      action_limit: initialData?.actionLimit,
      check_frequency_minutes: initialData?.checkFrequencyMinutes || 60,
      cooldown_minutes: initialData?.cooldownMinutes || 360,
      max_executions: initialData?.maxExecutions,
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const actionType = watch('action_type')
  const scopeType = watch('scope_type')
  const actionValueType = watch('action_value_type')

  const needsActionValue = [
    'increase_budget',
    'decrease_budget',
    'increase_bid',
    'decrease_bid',
    'increase_target_cpa',
    'decrease_target_cpa',
    'increase_target_roas',
    'decrease_target_roas',
  ].includes(actionType)

  const handleFormSubmit = async (data: AutomationFormData) => {
    // Helper to convert NaN to undefined for optional numbers
    const cleanNumber = (val: number | undefined): number | undefined => {
      if (val === undefined || Number.isNaN(val)) return undefined
      return val
    }

    const input: CreateAutomationRuleInput = {
      connection_id: connectionId,
      name: data.name,
      description: data.description || undefined,
      scope_type: data.scope_type,
      scope_filters: data.scope_type === 'filter' ? data.scope_filters : undefined,
      conditions,
      action_type: data.action_type as ActionType,
      action_value: needsActionValue ? cleanNumber(data.action_value) : undefined,
      action_value_type: needsActionValue ? data.action_value_type as ActionValueType : undefined,
      action_limit: cleanNumber(data.action_limit),
      check_frequency_minutes: data.check_frequency_minutes,
      cooldown_minutes: data.cooldown_minutes,
      max_executions: cleanNumber(data.max_executions),
    }

    await onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={styles.form}>
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <h3>Informações básicas</h3>
        </CardHeader>
        <CardBody>
          <div className={styles.field}>
            <Input
              label="Nome da automação"
              placeholder="Ex: Pausar campanhas sem conversões"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          <div className={styles.field}>
            <Input
              label="Descrição (opcional)"
              placeholder="Descreva o que esta automação faz"
              error={errors.description?.message}
              {...register('description')}
            />
          </div>
        </CardBody>
      </Card>

      {/* Scope */}
      <Card>
        <CardHeader>
          <h3>Escopo</h3>
          <p className={styles.cardDescription}>
            Defina quais campanhas serão afetadas
          </p>
        </CardHeader>
        <CardBody>
          <div className={styles.field}>
            <Controller
              name="scope_type"
              control={control}
              render={({ field }) => (
                <Select
                  label="Aplicar a"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={[
                    { value: 'all', label: 'Todas as campanhas' },
                    { value: 'filter', label: 'Campanhas filtradas' },
                  ]}
                />
              )}
            />
          </div>

          {scopeType === 'filter' && (
            <div className={styles.filterFields}>
              <div className={styles.field}>
                <Input
                  label="Nome contém"
                  placeholder="Ex: Remarketing"
                  {...register('scope_filters.nameContains')}
                />
              </div>
              <div className={styles.field}>
                <Input
                  label="Nome não contém"
                  placeholder="Ex: Teste"
                  {...register('scope_filters.nameNotContains')}
                />
              </div>
              <div className={styles.field}>
                <Controller
                  name="scope_filters.status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Status"
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={[
                        { value: '', label: 'Qualquer status' },
                        { value: 'ENABLED', label: 'Ativas' },
                        { value: 'PAUSED', label: 'Pausadas' },
                      ]}
                    />
                  )}
                />
              </div>
              <div className={styles.field}>
                <Controller
                  name="scope_filters.biddingStrategyType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Estratégia de lance"
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      options={BIDDING_STRATEGY_OPTIONS}
                    />
                  )}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <h3>Condições</h3>
          <p className={styles.cardDescription}>
            Defina quando a automação deve ser executada
          </p>
        </CardHeader>
        <CardBody>
          <ConditionBuilder
            initialConditions={conditions}
            onChange={setConditions}
          />
        </CardBody>
      </Card>

      {/* Action */}
      <Card>
        <CardHeader>
          <h3>Ação</h3>
          <p className={styles.cardDescription}>
            O que fazer quando as condições forem atendidas
          </p>
        </CardHeader>
        <CardBody>
          <div className={styles.field}>
            <Controller
              name="action_type"
              control={control}
              render={({ field }) => (
                <Select
                  label="Ação"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={ACTION_OPTIONS}
                />
              )}
            />
          </div>

          {needsActionValue && (
            <div className={styles.actionValueFields}>
              <div className={styles.field}>
                <Controller
                  name="action_value_type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Tipo de valor"
                      value={field.value || 'percentage'}
                      onValueChange={field.onChange}
                      options={[
                        { value: 'percentage', label: 'Porcentagem (%)' },
                        { value: 'absolute', label: 'Valor absoluto (R$)' },
                      ]}
                    />
                  )}
                />
              </div>
              <div className={styles.field}>
                <Input
                  label={actionValueType === 'percentage' ? 'Porcentagem' : 'Valor'}
                  type="number"
                  step={actionValueType === 'percentage' ? '1' : '0.01'}
                  placeholder={actionValueType === 'percentage' ? '10' : '5.00'}
                  {...register('action_value', { valueAsNumber: true })}
                />
              </div>
              <div className={styles.field}>
                <Input
                  label="Limite (opcional)"
                  type="number"
                  step="0.01"
                  placeholder={actionType.includes('increase') ? 'Máximo' : 'Mínimo'}
                  {...register('action_limit', { valueAsNumber: true })}
                />
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <h3>Frequência</h3>
          <p className={styles.cardDescription}>
            Configure quando e com que frequência verificar
          </p>
        </CardHeader>
        <CardBody>
          <div className={styles.scheduleFields}>
            <div className={styles.field}>
              <Controller
                name="check_frequency_minutes"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Frequência de verificação"
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    options={FREQUENCY_OPTIONS}
                  />
                )}
              />
            </div>
            <div className={styles.field}>
              <Controller
                name="cooldown_minutes"
                control={control}
                render={({ field }) => (
                  <Select
                    label="Intervalo entre execuções"
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(parseInt(val))}
                    options={COOLDOWN_OPTIONS}
                  />
                )}
              />
            </div>
            <div className={styles.field}>
              <Input
                label="Máximo de execuções (opcional)"
                type="number"
                min="1"
                placeholder="Ilimitado"
                {...register('max_executions', { valueAsNumber: true })}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Form Actions */}
      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : initialData ? 'Atualizar' : 'Criar automação'}
        </Button>
      </div>
    </form>
  )
}

export default AutomationForm
