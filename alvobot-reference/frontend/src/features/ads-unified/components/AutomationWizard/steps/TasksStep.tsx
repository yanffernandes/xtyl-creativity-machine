/**
 * TasksStep — Step 3 of AutomationWizard
 *
 * Manages multiple tasks, each with:
 * - ConditionBuilder ("SE" / conditions)
 * - ActionConfigurator ("ENTÃO" / action + frequency cap)
 *
 * Supports adding/removing tasks.
 */

import { Plus, Copy, Trash2 } from 'lucide-react'
import { Button } from '@/shared/components'
import type { UseAutomationFormReturn } from '../../../hooks/useAutomationForm'
import type {
  ConditionGroup,
  AutomationActionType,
  ActionParams,
  FrequencyCap,
} from '../../../types/automation'
import { ConditionBuilder } from '../../ConditionBuilder'
import { ActionConfigurator } from '../../ActionConfigurator'
import styles from '../AutomationWizard.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface TasksStepProps {
  form: UseAutomationFormReturn
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TasksStep({ form }: TasksStepProps) {
  const { state, addTask, duplicateTask, removeTask, updateTask } = form

  return (
    <div>
      {state.tasks.map((task, index) => (
        <div key={index} className={styles.taskCard}>
          {/* ── Task Header ── */}
          <div className={styles.taskHeader}>
            <span className={styles.taskTitle}>Task {index + 1}</span>
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => duplicateTask(index)}
                aria-label={`Duplicar task ${index + 1}`}
                title="Duplicar task"
              >
                <Copy size={14} />
              </Button>
              {state.tasks.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeTask(index)}
                  aria-label={`Remover task ${index + 1}`}
                  title="Remover task"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>

          {/* ── Task Body ── */}
          <div className={styles.taskBody}>
            {/* ── Conditions ("SE") ── */}
            <div className={styles.taskSectionLabel + ' ' + styles.taskSectionCondition}>
              SE
            </div>

            <ConditionBuilder
              platform={state.platform}
              root={task.conditions}
              onChange={(root: ConditionGroup) =>
                updateTask(index, { conditions: root })
              }
            />

            <hr className={styles.taskDivider} />

            {/* ── Action ("ENTÃO") ── */}
            <div className={styles.taskSectionLabel + ' ' + styles.taskSectionAction}>
              ENTÃO
            </div>

            <ActionConfigurator
              platform={state.platform}
              level={state.level}
              action={task.action}
              params={task.params}
              frequencyCap={task.frequencyCap}
              onActionChange={(action: AutomationActionType) =>
                updateTask(index, {
                  action,
                  // Reset params when action changes
                  params: {} as ActionParams,
                })
              }
              onParamsChange={(params: ActionParams) =>
                updateTask(index, { params })
              }
              onFrequencyCapChange={(cap: FrequencyCap) =>
                updateTask(index, { frequencyCap: cap })
              }
            />
          </div>
        </div>
      ))}

      {/* ── Add Task button ── */}
      <Button
        type="button"
        variant="secondary"
        onClick={addTask}
        leftIcon={<Plus size={14} />}
      >
        Adicionar Task
      </Button>
    </div>
  )
}
