import { createPortal } from 'react-dom'
import styles from './RecordingIndicator.module.css'

interface RecordingIndicatorProps {
  duration: number
  isPaused: boolean
}

/**
 * Format seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Floating indicator shown at the top of the screen during recording
 * Shows only status and timer - controls are in the VideoRecorder component
 */
export function RecordingIndicator({ duration, isPaused }: RecordingIndicatorProps) {
  const indicator = (
    <div
      className={`${styles.indicator} ${isPaused ? styles.paused : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.status}>
        <span className={styles.recordingDot} aria-hidden="true" />
        <span className={styles.statusText}>
          {isPaused ? 'Pausado' : 'Gravando'}
        </span>
      </div>

      <div className={styles.timer} aria-label={`Tempo: ${formatDuration(duration)}`}>
        {formatDuration(duration)}
      </div>
    </div>
  )

  // Render in a portal so it's always on top
  return createPortal(indicator, document.body)
}
