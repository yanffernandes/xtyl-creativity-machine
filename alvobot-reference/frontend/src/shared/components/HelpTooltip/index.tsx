import { HelpCircle } from 'lucide-react'
import { Tooltip } from '../Tooltip'
import styles from './HelpTooltip.module.css'

export interface HelpTooltipProps {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: number
  className?: string
}

/**
 * HelpTooltip - Contextual help icon with tooltip
 *
 * Use this component to provide inline help and documentation
 * following Nielsen's Heuristic #10: Help and Documentation
 *
 * @example
 * <label>
 *   Agrupar por
 *   <HelpTooltip content="Escolha como organizar os dados na tabela" />
 * </label>
 */
export function HelpTooltip({
  content,
  position = 'top',
  size = 14,
  className,
}: HelpTooltipProps) {
  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        className={`${styles.helpButton} ${className || ''}`}
        aria-label="Ajuda"
        tabIndex={0}
      >
        <HelpCircle size={size} />
      </button>
    </Tooltip>
  )
}
