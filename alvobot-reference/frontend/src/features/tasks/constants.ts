import type { ImportPhase } from './types'

export const IMPORT_PHASES: Array<{ value: ImportPhase; label: string }> = [
  { value: 'seu_blog_no_ar', label: 'Seu Blog no Ar' },
  { value: 'mineracao', label: 'Mineração' },
  { value: 'escala', label: 'Escala' },
] as const
