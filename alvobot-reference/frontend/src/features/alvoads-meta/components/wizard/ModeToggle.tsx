/**
 * ModeToggle - Component for switching between Preset and Free generation modes
 * T028: Created for Andromeda Creative Diversity System
 */

import { Wand2, Sliders } from 'lucide-react'
import styles from './ModeToggle.module.css'
import type { GenerationMode } from '../../types/creative'

interface ModeToggleProps {
  value: GenerationMode
  onChange: (mode: GenerationMode) => void
  disabled?: boolean
}

const MODE_OPTIONS: Array<{
  value: GenerationMode
  label: string
  description: string
  icon: typeof Wand2
}> = [
  {
    value: 'free',
    label: 'Modo Livre',
    description: 'A IA escolhe os melhores conceitos automaticamente',
    icon: Wand2,
  },
  {
    value: 'preset',
    label: 'Modo Preset',
    description: 'Você escolhe os conceitos e quantidades',
    icon: Sliders,
  },
]

export function ModeToggle({ value, onChange, disabled }: ModeToggleProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Modo de Geração</h4>
        <p className={styles.subtitle}>
          Escolha como os conceitos visuais serão selecionados
        </p>
      </div>

      <div className={styles.options}>
        {MODE_OPTIONS.map((option) => {
          const Icon = option.icon
          const isActive = value === option.value

          return (
            <button
              key={option.value}
              type="button"
              className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
              onClick={() => onChange(option.value)}
              disabled={disabled}
            >
              <div className={styles.optionIcon}>
                <Icon size={20} />
              </div>
              <div className={styles.optionContent}>
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.optionDescription}>
                  {option.description}
                </span>
              </div>
              <div className={styles.optionIndicator}>
                <div
                  className={`${styles.radio} ${isActive ? styles.radioActive : ''}`}
                />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
