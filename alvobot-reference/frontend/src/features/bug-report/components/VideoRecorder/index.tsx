import { Video } from 'lucide-react'
import styles from './VideoRecorder.module.css'

/**
 * VideoRecorder component - Currently disabled with "Coming Soon" state
 *
 * Note: Full video recording functionality is implemented but temporarily
 * disabled because the modal-based UX doesn't support recording while
 * navigating the app. When the user starts recording and closes the modal
 * to navigate, the recording is lost.
 *
 * Future implementation should use a global state (Zustand) to maintain
 * recording across modal open/close, with a floating indicator.
 */
export function VideoRecorder() {
  return (
    <div className={styles.container}>
      <div className={styles.comingSoon}>
        <Video size={32} className={styles.disabledIcon} />
        <span className={styles.comingSoonText}>Gravar tela</span>
        <span className={styles.comingSoonHint}>
          Grave sua tela enquanto navega
        </span>
        <span className={styles.comingSoonBadge}>Em breve</span>
      </div>
    </div>
  )
}
