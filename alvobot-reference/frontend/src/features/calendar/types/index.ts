export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  allDay?: boolean
  type: 'task' | 'article' | 'run' | 'custom'
  color?: string
  resourceId?: string | number
}

export interface CalendarFilters {
  start: string
  end: string
  types?: Array<CalendarEvent['type']>
}
