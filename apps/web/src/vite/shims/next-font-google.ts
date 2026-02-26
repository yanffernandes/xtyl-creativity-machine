type FontConfig = {
  subsets?: string[]
  display?: string
  weight?: string[]
  variable?: string
}

export function Inter(config?: FontConfig) {
  return {
    className: '',
    variable: config?.variable || '',
  }
}
