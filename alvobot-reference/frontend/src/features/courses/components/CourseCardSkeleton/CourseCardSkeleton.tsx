import styles from './CourseCardSkeleton.module.css'

export function CourseCardSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.thumbnail} />
      <div className={styles.content}>
        <div className={styles.title} />
        <div className={styles.description}>
          <div className={styles.line} />
          <div className={styles.lineShort} />
        </div>
        <div className={styles.footer}>
          <div className={styles.stats} />
          <div className={styles.progress} />
        </div>
      </div>
    </div>
  )
}
