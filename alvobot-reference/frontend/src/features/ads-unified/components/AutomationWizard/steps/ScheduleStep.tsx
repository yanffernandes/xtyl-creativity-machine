/**
 * ScheduleStep — Step 4 of AutomationWizard
 *
 * Collects:
 * - Schedule type: frequency (fixed interval) or custom (day/hour grid)
 * - Frequency interval selection
 * - DaypartingGrid (7 days × 24 hours)
 * - Timezone
 * - Optional date range
 * - Run once checkbox
 */

import { useCallback, useMemo } from 'react'
import { Clock, Grid3X3, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import { Input, Select, Checkbox, Button } from '@/shared/components'
import type { UseAutomationFormReturn } from '../../../hooks/useAutomationForm'
import type {
  Schedule,
  CheckInterval,
  CustomSlot,
} from '../../../types/automation'
import {
  CHECK_INTERVAL_OPTIONS,
  SCHEDULE_TYPE_OPTIONS,
  WEEKDAY_OPTIONS,
  type Weekday,
} from '../../../constants/enums'
import styles from '../AutomationWizard.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface ScheduleStepProps {
  form: UseAutomationFormReturn
}

// ============================================================================
// TIMEZONE OPTIONS
// ============================================================================

const TIMEZONE_OPTIONS = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT, UTC-3)' },
  { value: 'America/New_York', label: 'Nova York (EST, UTC-5)' },
  { value: 'America/Chicago', label: 'Chicago (CST, UTC-6)' },
  { value: 'America/Denver', label: 'Denver (MST, UTC-7)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST, UTC-8)' },
  { value: 'Europe/London', label: 'Londres (GMT, UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (CET, UTC+1)' },
  { value: 'Europe/Berlin', label: 'Berlim (CET, UTC+1)' },
  { value: 'Asia/Tokyo', label: 'Tóquio (JST, UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Xangai (CST, UTC+8)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT, UTC+11)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (BRT, UTC-3)' },
  { value: 'America/Manaus', label: 'Manaus (AMT, UTC-4)' },
  { value: 'America/Belem', label: 'Belém (BRT, UTC-3)' },
  { value: 'America/Cuiaba', label: 'Cuiabá (AMT, UTC-4)' },
  { value: 'America/Porto_Velho', label: 'Porto Velho (AMT, UTC-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (ACT, UTC-5)' },
]

const HOURS = Array.from({ length: 24 }, (_, i) => i)

// ============================================================================
// COMPONENT
// ============================================================================

export function ScheduleStep({ form }: ScheduleStepProps) {
  const { state, updateField } = form
  const schedule = state.schedule

  // ── Schedule update helper ──

  const updateSchedule = useCallback(
    (updates: Partial<Schedule>) => {
      updateField('schedule', { ...schedule, ...updates })
    },
    [schedule, updateField],
  )

  // ── Schedule type toggle ──

  const handleTypeChange = (type: 'frequency' | 'custom') => {
    if (type === 'frequency') {
      updateSchedule({
        type: 'frequency',
        checkInterval: schedule.checkInterval || ('1_hour' as CheckInterval),
        customSlots: undefined,
      })
    } else {
      updateSchedule({
        type: 'custom',
        checkInterval: undefined,
        customSlots: schedule.customSlots || [],
      })
    }
  }

  // ── Dayparting grid helpers ──

  const activeSlots = useMemo(() => {
    const map = new Map<string, Set<number>>()
    for (const slot of schedule.customSlots || []) {
      map.set(slot.day, new Set(slot.hours))
    }
    return map
  }, [schedule.customSlots])

  const isCellActive = (day: string, hour: number): boolean => {
    return activeSlots.get(day)?.has(hour) ?? false
  }

  const toggleCell = useCallback(
    (day: string, hour: number) => {
      const currentSlots = schedule.customSlots || []
      const daySlot = currentSlots.find((s) => s.day === day)

      let newSlots: CustomSlot[]

      if (daySlot) {
        const hours = new Set(daySlot.hours)
        if (hours.has(hour)) {
          hours.delete(hour)
        } else {
          hours.add(hour)
        }

        if (hours.size === 0) {
          newSlots = currentSlots.filter((s) => s.day !== day)
        } else {
          newSlots = currentSlots.map((s) =>
            s.day === day
              ? { ...s, hours: Array.from(hours).sort((a, b) => a - b) }
              : s,
          )
        }
      } else {
        newSlots = [
          ...currentSlots,
          { day: day as CustomSlot['day'], hours: [hour] },
        ]
      }

      updateSchedule({ customSlots: newSlots })
    },
    [schedule.customSlots, updateSchedule],
  )

  const selectAllDay = useCallback(
    (day: string) => {
      const currentSlots = schedule.customSlots || []
      const existing = currentSlots.find((s) => s.day === day)
      const allHours = Array.from({ length: 24 }, (_, i) => i)

      if (existing && existing.hours.length === 24) {
        // Deselect all
        return updateSchedule({
          customSlots: currentSlots.filter((s) => s.day !== day),
        })
      }

      // Select all hours
      const newSlots = currentSlots.filter((s) => s.day !== day)
      newSlots.push({ day: day as CustomSlot['day'], hours: allHours })
      updateSchedule({ customSlots: newSlots })
    },
    [schedule.customSlots, updateSchedule],
  )

  const selectAll = useCallback(() => {
    const allSlots: CustomSlot[] = WEEKDAY_OPTIONS.map((w) => ({
      day: w.value,
      hours: Array.from({ length: 24 }, (_, i) => i),
    }))
    updateSchedule({ customSlots: allSlots })
  }, [updateSchedule])

  const clearAll = useCallback(() => {
    updateSchedule({ customSlots: [] })
  }, [updateSchedule])

  return (
    <div>
      {/* ── Schedule Type Toggle ── */}
      <div className={styles.formSection}>
        <span className={styles.formSectionTitle}>Tipo de agendamento</span>
        <div className={styles.scheduleTypeToggle}>
          {SCHEDULE_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={clsx(
                styles.toggleButton,
                schedule.type === opt.value && styles.toggleActive,
              )}
              onClick={() => handleTypeChange(opt.value as 'frequency' | 'custom')}
              style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}
            >
              {opt.value === 'frequency' ? (
                <Clock size={16} />
              ) : (
                <Grid3X3 size={16} />
              )}
              <span style={{ fontWeight: 600 }}>{opt.label}</span>
              <span
                style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-tertiary)',
                }}
              >
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Frequency Interval ── */}
      {schedule.type === 'frequency' && (
        <div className={styles.formSection}>
          <div className={styles.formField}>
            <Select
              label="Intervalo de verificação"
              value={schedule.checkInterval || ''}
              onValueChange={(val) =>
                updateSchedule({ checkInterval: val as CheckInterval })
              }
              options={CHECK_INTERVAL_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              fullWidth
            />
            <span className={styles.fieldHint}>
              A cada intervalo, a regra verifica se as condições são atendidas
              e executa as ações configuradas.
            </span>
          </div>
        </div>
      )}

      {/* ── Dayparting Grid ── */}
      {schedule.type === 'custom' && (
        <div className={styles.formSection}>
          <span className={styles.formSectionTitle}>
            Horários de execução
          </span>
          <p
            style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Clique nas células para selecionar os horários em que a regra deve
            ser verificada. Cada célula representa 1 hora do dia.
          </p>

          <div className={styles.daypartingGrid}>
            <table className={styles.daypartingTable}>
              <thead>
                <tr>
                  <th className={styles.daypartingHeaderCell} />
                  {HOURS.map((h) => (
                    <th key={h} className={styles.daypartingHeaderCell}>
                      {h.toString().padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEKDAY_OPTIONS.map((day) => (
                  <tr key={day.value}>
                    <td
                      className={styles.daypartingDayLabel}
                      onClick={() => selectAllDay(day.value)}
                      style={{ cursor: 'pointer' }}
                      title={`Selecionar/desmarcar todo ${day.label}`}
                    >
                      {day.shortLabel}
                    </td>
                    {HOURS.map((h) => (
                      <td
                        key={h}
                        className={clsx(
                          styles.daypartingCell,
                          isCellActive(day.value, h) && styles.daypartingActive,
                        )}
                        onClick={() => toggleCell(day.value, h)}
                        title={`${day.shortLabel} ${h.toString().padStart(2, '0')}:00`}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.daypartingActions}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={selectAll}
            >
              Selecionar tudo
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
              leftIcon={<RotateCcw size={12} />}
            >
              Limpar
            </Button>
          </div>
        </div>
      )}

      {/* ── Timezone ── */}
      <div className={styles.formSection}>
        <div className={styles.formField}>
          <Select
            label="Fuso horário"
            value={state.timezone}
            onValueChange={(val) => updateField('timezone', val)}
            options={TIMEZONE_OPTIONS}
            fullWidth
          />
        </div>
      </div>

      {/* ── Optional Date Range ── */}
      <div className={styles.formSection}>
        <span className={styles.formSectionTitle}>
          Período de vigência (opcional)
        </span>
        <div className={styles.scheduleRow}>
          <div>
            <Input
              label="Data de início"
              type="date"
              value={schedule.dateRange?.start || ''}
              onChange={(e) =>
                updateSchedule({
                  dateRange: {
                    ...schedule.dateRange,
                    start: e.target.value || undefined,
                  },
                })
              }
              fullWidth
            />
          </div>
          <div>
            <Input
              label="Data de fim"
              type="date"
              value={schedule.dateRange?.end || ''}
              onChange={(e) =>
                updateSchedule({
                  dateRange: {
                    ...schedule.dateRange,
                    end: e.target.value || undefined,
                  },
                })
              }
              fullWidth
            />
          </div>
        </div>
        <span className={styles.fieldHint}>
          Deixe em branco para que a regra execute indefinidamente.
        </span>
      </div>

      {/* ── Run Once ── */}
      <div className={styles.runOnceCheckbox}>
        <Checkbox
          label="Executar apenas uma vez"
          description="A regra será pausada automaticamente após a primeira execução"
          checked={schedule.runOnce ?? false}
          onCheckedChange={(checked) =>
            updateSchedule({ runOnce: checked === true })
          }
        />
      </div>
    </div>
  )
}
