export function cookies() {
  return {
    get: (key: string) => {
      if (typeof document === 'undefined') return undefined
      const value = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${key}=`))
        ?.split('=')[1]
      return value ? { value } : undefined
    },
  }
}
