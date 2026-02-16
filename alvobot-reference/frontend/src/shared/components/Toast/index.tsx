import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import styles from './Toast.module.css'

export interface ToastProviderProps {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  expand?: boolean
  richColors?: boolean
  duration?: number
}

export function ToastProvider({
  position = 'top-right',
  expand = false,
  richColors = true,
  duration = 4000,
}: ToastProviderProps) {
  return (
    <Toaster
      position={position}
      expand={expand}
      richColors={richColors}
      duration={duration}
      toastOptions={{
        className: styles.toast,
        classNames: {
          success: styles.success,
          error: styles.error,
          warning: styles.warning,
          info: styles.info,
        },
      }}
      closeButton
      icons={{
        success: <CheckCircle size={20} />,
        error: <AlertCircle size={20} />,
        warning: <AlertTriangle size={20} />,
        info: <Info size={20} />,
        close: <X size={16} />,
      }}
    />
  )
}

// Re-export toast functions for convenience
export { toast }

// Utility functions with consistent styling
export const showToast = {
  success: (message: string, options?: { description?: string; duration?: number }) => {
    toast.success(message, {
      description: options?.description,
      duration: options?.duration,
    })
  },
  error: (message: string, options?: { description?: string; duration?: number }) => {
    toast.error(message, {
      description: options?.description,
      duration: options?.duration,
    })
  },
  warning: (message: string, options?: { description?: string; duration?: number }) => {
    toast.warning(message, {
      description: options?.description,
      duration: options?.duration,
    })
  },
  info: (message: string, options?: { description?: string; duration?: number }) => {
    toast.info(message, {
      description: options?.description,
      duration: options?.duration,
    })
  },
  loading: (message: string, options?: { description?: string }) => {
    return toast.loading(message, {
      description: options?.description,
    })
  },
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: unknown) => string)
    }
  ) => {
    return toast.promise(promise, options)
  },
  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId)
  },
}
