import { Badge } from '@/shared/components'
import type { Project } from '../types'

interface ConnectionStatusBadgeProps {
  status: Project['connection_status']
  errorMessage?: string
}

export function ConnectionStatusBadge({ status, errorMessage }: ConnectionStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          label: 'Conectado',
          variant: 'success' as const,
        }
      case 'error':
        return {
          label: 'Erro',
          variant: 'error' as const,
          title: errorMessage || 'Erro de conexão',
        }
      case 'testing':
        return {
          label: 'Testando...',
          variant: 'warning' as const,
        }
      case 'not_configured':
      default:
        return {
          label: 'Não conectado',
          variant: 'default' as const,
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge variant={config.variant} dot size="sm" title={config.title}>
      {config.label}
    </Badge>
  )
}
