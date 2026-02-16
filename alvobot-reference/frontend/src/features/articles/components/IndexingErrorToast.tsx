import { Alert } from '@/shared/components'

interface IndexingErrorToastProps {
  message: string
  onClose?: () => void
}

export function IndexingErrorToast({ message, onClose }: IndexingErrorToastProps) {
  return (
    <Alert variant="error" onClose={onClose}>
      {message}
    </Alert>
  )
}
