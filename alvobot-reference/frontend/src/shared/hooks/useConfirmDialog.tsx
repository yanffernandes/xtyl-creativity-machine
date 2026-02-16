import { useState } from 'react'
import { Modal, Button } from '@/shared/components'

interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
  })
  const [resolveCallback, setResolveCallback] = useState<((value: boolean) => void) | null>(null)

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setIsOpen(true)

    return new Promise((resolve) => {
      setResolveCallback(() => resolve)
    })
  }

  const handleConfirm = () => {
    if (resolveCallback) {
      resolveCallback(true)
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    if (resolveCallback) {
      resolveCallback(false)
    }
    setIsOpen(false)
  }

  const ConfirmDialog = () => (
    <Modal isOpen={isOpen} onClose={handleCancel} title={options.title}>
      <div style={{ marginBottom: '24px' }}>
        {options.message}
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <Button variant="outline" onClick={handleCancel}>
          {options.cancelText || 'Cancelar'}
        </Button>
        <Button
          variant={options.variant || 'primary'}
          onClick={handleConfirm}
        >
          {options.confirmText || 'Confirmar'}
        </Button>
      </div>
    </Modal>
  )

  return { confirm, ConfirmDialog }
}
