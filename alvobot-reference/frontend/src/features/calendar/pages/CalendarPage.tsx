import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, FileText, CheckSquare } from 'lucide-react'
import { Button, Spinner, Alert, Card } from '@/shared/components'
import { useDocumentTitle } from '@/shared/hooks'
import { useWorkspaceStore } from '@/features/workspace/stores/workspaceStore'
import styles from './CalendarPage.module.css'
import { useCalendarEvents } from '../api/useCalendarEvents'
import type { CalendarEvent } from '../types'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function CalendarPage() {
  useDocumentTitle('Calendário')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showTasks, setShowTasks] = useState(true)
  const [showArticles, setShowArticles] = useState(true)
  const workspaceId = useWorkspaceStore((state) => state.currentWorkspace?.id)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Calculate start and end of the month for fetching events
  const startOfMonth = new Date(year, month, 1)
  const endOfMonth = new Date(year, month + 1, 0)

  const { data: events, isLoading, error } = useCalendarEvents({
    start: startOfMonth.toISOString(),
    end: endOfMonth.toISOString(),
    types: [
      ...(showTasks ? ['task' as const] : []),
      ...(showArticles ? ['article' as const] : []),
    ],
  }, workspaceId)

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const startingDayOfWeek = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true,
      })
    }

    // Next month days to complete the grid
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      })
    }

    return days
  }, [year, month])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events?.forEach((event) => {
      const dateKey = new Date(event.start).toDateString()
      const existing = map.get(dateKey) || []
      map.set(dateKey, [...existing, event])
    })
    return map
  }, [events])

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return []
    return eventsByDate.get(selectedDate.toDateString()) || []
  }, [selectedDate, eventsByDate])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.titleIcon}>
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className={styles.title}>Calendário</h1>
            <p className={styles.subtitle}>Visualize suas atividades</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.calendarWrapper}>
          <div className={styles.calendarHeader}>
            <div className={styles.navigation}>
              <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft size={18} />
              </Button>
              <h2 className={styles.monthYear}>
                {MONTHS[month]} {year}
              </h2>
              <Button variant="ghost" size="sm" onClick={goToNextMonth}>
                <ChevronRight size={18} />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
          </div>

          <div className={styles.filters}>
            <label className={styles.filterLabel}>
              <input
                type="checkbox"
                checked={showTasks}
                onChange={(e) => setShowTasks(e.target.checked)}
              />
              <CheckSquare size={14} />
              Tarefas
            </label>
            <label className={styles.filterLabel}>
              <input
                type="checkbox"
                checked={showArticles}
                onChange={(e) => setShowArticles(e.target.checked)}
              />
              <FileText size={14} />
              Artigos
            </label>
          </div>

          {error && (
            <Alert variant="error" className={styles.alert}>
              Erro ao carregar eventos: {error.message}
            </Alert>
          )}

          {isLoading ? (
            <div className={styles.loading}>
              <Spinner size="lg" />
            </div>
          ) : (
            <div className={styles.calendar}>
              <div className={styles.weekDays}>
                {DAYS.map((day) => (
                  <div key={day} className={styles.weekDay}>
                    {day}
                  </div>
                ))}
              </div>

              <div className={styles.days}>
                {calendarDays.map(({ date, isCurrentMonth }, index) => {
                  const dateEvents = eventsByDate.get(date.toDateString()) || []
                  const hasEvents = dateEvents.length > 0

                  return (
                    <button
                      key={index}
                      className={`${styles.day} ${
                        !isCurrentMonth ? styles.otherMonth : ''
                      } ${isToday(date) ? styles.today : ''} ${
                        isSelected(date) ? styles.selected : ''
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span className={styles.dayNumber}>{date.getDate()}</span>
                      {hasEvents && (
                        <div className={styles.eventDots}>
                          {dateEvents.slice(0, 3).map((event, i) => (
                            <span
                              key={i}
                              className={styles.eventDot}
                              style={{ backgroundColor: event.color }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <aside className={styles.sidebar}>
          <Card className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>
              {selectedDate ? (
                <>
                  <CalendarIcon size={18} />
                  {selectedDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </>
              ) : (
                'Selecione uma data'
              )}
            </h3>

            {selectedDate && (
              <div className={styles.eventList}>
                {selectedDateEvents.length === 0 ? (
                  <p className={styles.noEvents}>Nenhum evento neste dia</p>
                ) : (
                  selectedDateEvents.map((event) => (
                    <div key={event.id} className={styles.eventItem}>
                      <div
                        className={styles.eventColor}
                        style={{ backgroundColor: event.color }}
                      />
                      <div className={styles.eventInfo}>
                        <span className={styles.eventTitle}>{event.title}</span>
                        <span className={styles.eventType}>
                          {event.type === 'task' ? 'Tarefa' : 'Artigo'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}
