import { serviceIcons } from '@/assets/icons/services'
import styles from './RevenueSourceFilter.module.css'

export type RevenueSource = 'all' | 'ad_manager' | 'adsense'

interface RevenueSourceFilterProps {
  value: RevenueSource
  onChange: (source: RevenueSource) => void
  adManagerCount?: number
  adsenseCount?: number
  disabled?: boolean
  showLabel?: boolean
}

export function RevenueSourceFilter({
  value,
  onChange,
  adManagerCount = 0,
  adsenseCount = 0,
  disabled = false,
  showLabel = true,
}: RevenueSourceFilterProps) {
  const isAll = value === 'all'
  const isAdManager = value === 'ad_manager'
  const isAdSense = value === 'adsense'

  const handleSelect = (source: RevenueSource) => {
    if (!disabled) {
      onChange(source)
    }
  }

  return (
    <div className={styles.container}>
      {showLabel && <span className={styles.label}>Fonte:</span>}
      <div className={styles.pills}>
        <button
          type="button"
          className={`${styles.pill} ${isAdManager ? `${styles.active} ${styles.activeAdManager}` : ''}`}
          onClick={() => handleSelect('ad_manager')}
          disabled={disabled || adManagerCount === 0}
        >
          <img src={serviceIcons.ad_manager} alt="" className={styles.pillIcon} />
          Ad Manager
          {adManagerCount > 0 && (
            <span className={styles.count}>{adManagerCount}</span>
          )}
        </button>
        <button
          type="button"
          className={`${styles.pill} ${isAdSense ? `${styles.active} ${styles.activeAdSense}` : ''}`}
          onClick={() => handleSelect('adsense')}
          disabled={disabled || adsenseCount === 0}
        >
          <img src={serviceIcons.adsense} alt="" className={styles.pillIcon} />
          AdSense
          {adsenseCount > 0 && (
            <span className={styles.count}>{adsenseCount}</span>
          )}
        </button>
        <button
          type="button"
          className={`${styles.pill} ${isAll ? styles.active : ''}`}
          onClick={() => handleSelect('all')}
          disabled={disabled}
        >
          Ambos
        </button>
      </div>
    </div>
  )
}
