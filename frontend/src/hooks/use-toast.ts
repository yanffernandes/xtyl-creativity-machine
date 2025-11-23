import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

let toastCallback: ((toast: Omit<Toast, 'id'>) => void) | null = null

export function toast(props: Omit<Toast, 'id'>) {
  if (toastCallback) {
    toastCallback(props)
  } else {
    // Fallback to alert if toast system not initialized
    alert(props.title + (props.description ? '\n' + props.description : ''))
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...props, id }
    setToasts(prev => [...prev, newToast])

    // Auto dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  // Register callback
  toastCallback = addToast

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return {
    toast: addToast,
    toasts,
    dismiss,
  }
}
