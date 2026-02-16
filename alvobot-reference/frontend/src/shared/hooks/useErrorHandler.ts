import { showToast } from '@/shared/components/Toast'
import { getErrorMessage } from '@/shared/utils/errorMessages'

export function useErrorHandler() {
  const handleError = (error: unknown, customMessage?: string) => {
    if (customMessage) {
      showToast.error(customMessage)
    } else {
      const errorMsg = getErrorMessage(error)
      const fullMessage = errorMsg.suggestion
        ? `${errorMsg.message}\n${errorMsg.suggestion}`
        : errorMsg.message
      showToast.error(fullMessage)
    }
    console.error('Error:', error)
  }

  return { handleError }
}
