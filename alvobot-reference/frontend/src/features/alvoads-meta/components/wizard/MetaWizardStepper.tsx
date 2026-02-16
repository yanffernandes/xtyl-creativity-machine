import {
  Building2,
  FileText,
  Instagram,
  Target,
  Users,
  DollarSign,
  Image,
  Type,
  CheckCircle2,
  Check,
  CheckSquare,
  Newspaper,
  Settings2,
  Aperture,
} from 'lucide-react'
import styles from './MetaWizardStepper.module.css'
import { useMetaAdsWizardStore } from '../../stores/metaAdsWizardStore'
import type { MetaWizardStep } from '../../types/campaign'

const STEPS: Array<{
  key: MetaWizardStep
  label: string
  shortLabel: string
  icon: React.ReactNode
}> = [
  { key: 'articles', label: 'Artigos', shortLabel: 'Art', icon: <Newspaper size={18} /> },
  { key: 'adsets_config', label: 'Configuração', shortLabel: 'Config', icon: <Settings2 size={18} /> },
  { key: 'account', label: 'Conta', shortLabel: 'Conta', icon: <Building2 size={18} /> },
  { key: 'pixel', label: 'Pixel', shortLabel: 'Pixel', icon: <Aperture size={18} /> },
  { key: 'page', label: 'Página', shortLabel: 'Página', icon: <FileText size={18} /> },
  { key: 'instagram', label: 'Instagram', shortLabel: 'Insta', icon: <Instagram size={18} /> },
  { key: 'objective', label: 'Objetivo', shortLabel: 'Obj', icon: <Target size={18} /> },
  { key: 'targeting', label: 'Segmentação', shortLabel: 'Seg', icon: <Users size={18} /> },
  { key: 'budget', label: 'Orçamento', shortLabel: 'Orça', icon: <DollarSign size={18} /> },
  { key: 'creative_ai', label: 'Criativos', shortLabel: 'Cria', icon: <Image size={18} /> },
  { key: 'creative_approval', label: 'Aprovação', shortLabel: 'Aprov', icon: <CheckSquare size={18} /> },
  { key: 'ad_copy', label: 'Texto', shortLabel: 'Texto', icon: <Type size={18} /> },
  { key: 'review', label: 'Revisão', shortLabel: 'Rev', icon: <CheckCircle2 size={18} /> },
]

export function MetaWizardStepper() {
  const { currentStep, completedSteps, goToStep } = useMetaAdsWizardStore()

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className={styles.stepper}>
      <div className={styles.stepperTrack}>
        {STEPS.map((step, index) => {
          const isActive = step.key === currentStep
          const isCompleted = completedSteps.has(step.key)
          const isPast = index < currentIndex
          const canNavigate = isCompleted || isPast || index === currentIndex

          return (
            <button
              key={step.key}
              type="button"
              className={`${styles.step} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''} ${isPast ? styles.past : ''}`}
              onClick={() => canNavigate && goToStep(step.key)}
              disabled={!canNavigate}
              title={step.label}
            >
              <div className={styles.stepIcon}>
                {step.icon}
                {isCompleted && !isActive && (
                  <span className={styles.completedBadge}>
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
              <span className={styles.stepLabelShort}>{step.shortLabel}</span>
            </button>
          )
        })}
      </div>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${((currentIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  )
}
