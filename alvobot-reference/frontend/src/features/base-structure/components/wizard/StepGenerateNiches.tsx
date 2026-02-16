import { useState, useEffect } from 'react'
import { Sparkles, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { Button, Spinner, Alert } from '@/shared/components'
import styles from './StepGenerateNiches.module.css'
import { useGenerateNiches } from '../../api/mutations'

interface NicheSuggestion {
  id: string
  name: string
  isExisting?: boolean
}

interface StepGenerateNichesProps {
  selectedNiche: string | null
  onSelect: (niche: string) => void
  projectDomain?: string
  existingNiche?: string | null
}

export function StepGenerateNiches({
  selectedNiche,
  onSelect,
  projectDomain,
  existingNiche,
}: StepGenerateNichesProps) {
  const [niches, setNiches] = useState<NicheSuggestion[]>([])
  const generateNichesMutation = useGenerateNiches()

  // Generate niches on mount
  useEffect(() => {
    handleGenerateNew()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerateNew = async () => {
    try {
      const response = await generateNichesMutation.mutateAsync({
        language: 'pt',
        domain: projectDomain,
      })

      const generatedNiches = response.niches
        .filter(name => name !== existingNiche) // Remove duplicates
        .map((name, index) => ({
          id: String(index + 1),
          name,
        }))

      // If there's an existing niche, add it at the top
      if (existingNiche) {
        setNiches([
          { id: 'existing', name: existingNiche, isExisting: true },
          ...generatedNiches,
        ])
      } else {
        setNiches(generatedNiches)
      }
    } catch (error) {
      console.error('Failed to generate niches:', error)
    }
  }

  const isGenerating = generateNichesMutation.isPending

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Sparkles size={24} />
        </div>
        <div>
          <h2 className={styles.title}>
            {existingNiche ? 'Confirme ou Altere o Nicho' : 'Gere Ideias de Nicho'}
          </h2>
          <p className={styles.description}>
            {existingNiche
              ? 'Este projeto já possui um nicho definido. Mantenha ou escolha um novo.'
              : `Nossa IA analisou seu domínio${projectDomain ? ` (${projectDomain})` : ''} e sugeriu os melhores nichos para seu blog`
            }
          </p>
        </div>
      </div>

      {generateNichesMutation.isError && (
        <Alert variant="error" className={styles.alert}>
          <AlertCircle size={18} />
          <span>Erro ao gerar nichos. Verifique sua conexão e tente novamente.</span>
        </Alert>
      )}

      <div className={styles.content}>
        {isGenerating ? (
          <div className={styles.generating}>
            <Spinner size="lg" />
            <p>Gerando novas sugestões com IA...</p>
          </div>
        ) : (
          <div className={styles.nicheList}>
            {niches.map((niche) => {
              const isSelected = selectedNiche === niche.name

              return (
                <button
                  key={niche.id}
                  type="button"
                  className={`${styles.nicheCard} ${isSelected ? styles.selected : ''} ${niche.isExisting ? styles.existing : ''}`}
                  onClick={() => onSelect(niche.name)}
                >
                  {niche.isExisting && (
                    <span className={styles.existingBadge}>Nicho atual</span>
                  )}
                  <div className={styles.nicheHeader}>
                    <span className={styles.nicheName}>{niche.name}</span>
                    {isSelected && (
                      <div className={styles.checkmark}>
                        <Check size={16} />
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className={styles.actions}>
          <Button
            variant="outline"
            onClick={handleGenerateNew}
            disabled={isGenerating}
            leftIcon={<RefreshCw size={18} className={isGenerating ? styles.spinning : ''} />}
          >
            Gerar Novos
          </Button>
        </div>
      </div>
    </div>
  )
}
