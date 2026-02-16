import * as React from 'react'
import { Select } from '@/shared/components'

export interface StatusOption {
  value: string
  label: string
  icon?: React.ReactNode
  color?: string
}

export interface StatusFilterProps {
  value: string
  onChange: (value: string) => void
  options: StatusOption[]
  placeholder?: string
  allLabel?: string
  className?: string
  disabled?: boolean
  /** Size variant: 'sm' (32px), 'md' (36px), 'lg' (44px, default) */
  size?: 'sm' | 'md' | 'lg'
}

export function StatusFilter({
  value,
  onChange,
  options,
  placeholder = 'Status',
  allLabel = 'Todos',
  className,
  disabled = false,
  size = 'lg',
}: StatusFilterProps) {
  // Add "all" option at the beginning and convert to Select options format
  const selectOptions = [
    { value: '', label: allLabel },
    ...options.map((opt) => ({ value: opt.value, label: opt.label })),
  ]

  return (
    <Select
      value={value}
      onValueChange={onChange}
      options={selectOptions}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      size={size}
    />
  )
}
