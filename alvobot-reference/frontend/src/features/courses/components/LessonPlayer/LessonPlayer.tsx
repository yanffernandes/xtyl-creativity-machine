import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/shared/components'
import styles from './LessonPlayer.module.css'
import { useMarkLessonCompleted, useUnmarkLessonCompleted, useUpdateLessonProgress } from '../../api'
import { getEmbedUrl } from '../../utils/youtube'
import type { Lesson, LessonProgress } from '../../types'

interface LessonPlayerProps {
  lesson: Lesson
  progress: LessonProgress | null
  onComplete?: () => void
}

export function LessonPlayer({ lesson, progress, onComplete }: LessonPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const markCompleted = useMarkLessonCompleted()
  const unmarkCompleted = useUnmarkLessonCompleted()
  const updateProgress = useUpdateLessonProgress()

  const isCompleted = !!progress?.completed_at

  // Track watch time every 5 seconds while playing
  useEffect(() => {
    if (isPlaying) {
      let watchTime = progress?.watch_time_seconds || 0

      progressIntervalRef.current = setInterval(() => {
        watchTime += 5
        updateProgress.mutate({
          lessonId: lesson.id,
          watchTimeSeconds: watchTime,
        })

        // Auto-complete at 90% of video duration
        if (
          lesson.duration_minutes &&
          watchTime >= (lesson.duration_minutes * 60 * 0.9) &&
          !isCompleted
        ) {
          markCompleted.mutate(lesson.id)
          onComplete?.()
        }
      }, 5000)
    } else if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [
    isPlaying,
    lesson.id,
    lesson.duration_minutes,
    isCompleted,
    markCompleted,
    onComplete,
    progress?.watch_time_seconds,
    updateProgress,
  ])

  // Listen for YouTube player events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return

      try {
        const data = JSON.parse(event.data)
        if (data.event === 'onStateChange') {
          // 1 = playing, 2 = paused, 0 = ended
          setIsPlaying(data.info === 1)

          if (data.info === 0) {
            // Video ended
            if (!isCompleted) {
              markCompleted.mutate(lesson.id)
              onComplete?.()
            }
          }
        }
      } catch {
        // Not a YouTube API message
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [lesson.id, isCompleted, markCompleted, onComplete])

  const handleToggleComplete = () => {
    if (isCompleted) {
      unmarkCompleted.mutate(lesson.id)
    } else {
      markCompleted.mutate(lesson.id)
      onComplete?.()
    }
  }

  if (!lesson.youtube_video_id) {
    return (
      <div className={styles.error}>
        <p>Vídeo não disponível</p>
      </div>
    )
  }

  const embedUrl = getEmbedUrl(lesson.youtube_video_id, {
    autoplay: false,
    enablejsapi: true,
    modestbranding: true,
    rel: false,
  })

  return (
    <div className={styles.container}>
      <div className={styles.playerWrapper}>
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={lesson.title}
          className={styles.iframe}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <div className={styles.lessonInfo}>
        <div className={styles.lessonHeader}>
          <h1 className={styles.lessonTitle}>{lesson.title}</h1>
          <Button
            variant={isCompleted ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleToggleComplete}
            isLoading={markCompleted.isPending || unmarkCompleted.isPending}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 size={16} />
                Concluída
              </>
            ) : (
              <>
                <Circle size={16} />
                Marcar como concluída
              </>
            )}
          </Button>
        </div>

        {lesson.description && (
          <div className={styles.lessonDescription}>
            <p>{lesson.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
