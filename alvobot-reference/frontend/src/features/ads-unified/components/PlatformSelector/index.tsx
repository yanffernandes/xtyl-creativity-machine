import { serviceIcons } from '@/assets/icons/services'
import styles from './PlatformSelector.module.css'
import type { AdsPlatform } from '../../types'

type SelectionMode = 'single' | 'both'

interface PlatformSelectorProps {
  selected: AdsPlatform[]
  onChange: (platforms: AdsPlatform[]) => void
  showLabel?: boolean
}

export function PlatformSelector({
  selected,
  onChange,
  showLabel = true,
}: PlatformSelectorProps) {
  const isGoogle = selected.includes('google')
  const isMeta = selected.includes('meta')
  const isBoth = isGoogle && isMeta

  const handleSelect = (mode: SelectionMode | AdsPlatform) => {
    if (mode === 'both') {
      onChange(['google', 'meta'])
    } else if (mode === 'google') {
      onChange(['google'])
    } else if (mode === 'meta') {
      onChange(['meta'])
    }
  }

  return (
    <div className={styles.container}>
      {showLabel && <span className={styles.label}>Fonte:</span>}
      <div className={styles.pills}>
        <button
          type="button"
          className={`${styles.pill} ${isGoogle && !isBoth ? `${styles.active} ${styles.activeGoogle}` : ''}`}
          onClick={() => handleSelect('google')}
        >
          <img src={serviceIcons.ads} alt="" className={styles.pillIcon} />
          Google Ads
        </button>
        <button
          type="button"
          className={`${styles.pill} ${isMeta && !isBoth ? `${styles.active} ${styles.activeMeta}` : ''}`}
          onClick={() => handleSelect('meta')}
        >
          <img src={serviceIcons.meta} alt="" className={styles.pillIcon} />
          Meta Ads
        </button>
        <button
          type="button"
          className={`${styles.pill} ${isBoth ? styles.active : ''}`}
          onClick={() => handleSelect('both')}
        >
          Ambos
        </button>
      </div>
    </div>
  )
}
