import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { VALIDATION_CHECKLIST, type BaseStructure, type ValidationChecklistItem  } from '../types'
import styles from './ValidationChecklist.module.css'

interface ValidationChecklistProps {
  structure: BaseStructure
}

export function ValidationChecklist({ structure }: ValidationChecklistProps) {
  const getCheckStatus = (item: ValidationChecklistItem) => {
    return item.check(structure)
  }

  const requiredItems = VALIDATION_CHECKLIST.filter((item) => item.required)
  const optionalItems = VALIDATION_CHECKLIST.filter((item) => !item.required)

  const requiredPassing = requiredItems.filter((item) => getCheckStatus(item)).length
  const allRequiredPassing = requiredPassing === requiredItems.length

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Checklist de Validação</h3>
        <span className={`${styles.status} ${allRequiredPassing ? styles.statusReady : styles.statusPending}`}>
          {allRequiredPassing ? (
            <>
              <CheckCircle size={16} />
              Pronto para aprovação
            </>
          ) : (
            <>
              <AlertCircle size={16} />
              {requiredPassing}/{requiredItems.length} requisitos
            </>
          )}
        </span>
      </div>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Obrigatórios</h4>
        <div className={styles.items}>
          {requiredItems.map((item) => {
            const passing = getCheckStatus(item)
            return (
              <div key={item.id} className={`${styles.item} ${passing ? styles.itemPassing : styles.itemFailing}`}>
                {passing ? (
                  <CheckCircle size={16} className={styles.iconSuccess} />
                ) : (
                  <XCircle size={16} className={styles.iconError} />
                )}
                <span>{item.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {optionalItems.length > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Recomendados</h4>
          <div className={styles.items}>
            {optionalItems.map((item) => {
              const passing = getCheckStatus(item)
              return (
                <div key={item.id} className={`${styles.item} ${passing ? styles.itemPassing : styles.itemOptional}`}>
                  {passing ? (
                    <CheckCircle size={16} className={styles.iconSuccess} />
                  ) : (
                    <AlertCircle size={16} className={styles.iconWarning} />
                  )}
                  <span>{item.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function canSubmitForApproval(structure: BaseStructure): boolean {
  return VALIDATION_CHECKLIST
    .filter((item) => item.required)
    .every((item) => item.check(structure))
}
