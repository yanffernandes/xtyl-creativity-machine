import { getEmbedUrl } from '@/features/courses/utils/youtube'
import styles from './YouTubePreview.module.css'

interface YouTubePreviewProps {
  videoId: string
}

export function YouTubePreview({ videoId }: YouTubePreviewProps) {
  const embedUrl = getEmbedUrl(videoId, { autoplay: false })

  return (
    <div className={styles.container}>
      <iframe
        src={embedUrl}
        title="YouTube video preview"
        className={styles.iframe}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}
