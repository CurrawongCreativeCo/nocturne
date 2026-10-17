import type { SectionDefaults } from '@/components/ui/section-style'
import { formatDayOf, formatTimeRange } from '@/lib/events/format'

import {
  EventPills,
  EventsView,
  EventTitle,
  whereOf,
  type Entry,
  type EventsLayout,
} from './events-parts'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { tone: 'surface', container: 'max-w-content', align: 'start' }

interface Day {
  date: string
  label: string
  entries: Entry[]
}

/** The entries in order, gathered under the day they start on (in their own time zone). */
function groupByDay(entries: Entry[]): Day[] {
  const days: Day[] = []
  for (const entry of entries) {
    const { start, date } = entry.occurrence
    const day = days.find((candidate) => candidate.date === date)
    if (day) day.entries.push(entry)
    else
      days.push({ date, label: formatDayOf(start, entry.timing.timeZone, true), entries: [entry] })
  }
  return days
}

const layout: EventsLayout = {
  defaults: DEFAULTS,
  placeholderClassName: 'min-h-72 rounded-card bg-surface-alt motion-safe:animate-pulse',
  render: (entries, { level }) => {
    const Day = level
    const entryLevel = level === 'h2' ? 'h3' : 'h4'
    return (
      <ol className="space-y-10">
        {groupByDay(entries).map((day) => (
          <li key={day.date}>
            <Day className="border-b border-line-strong pb-3 text-h4 font-semibold text-balance">
              <time dateTime={day.date}>{day.label}</time>
            </Day>
            <ul className="divide-y divide-line">
              {day.entries.map((entry) => {
                const where = whereOf(entry.event)
                return (
                  <li
                    key={`${entry.event._id}-${entry.occurrence.start}`}
                    className="relative grid gap-1 px-2 py-5 transition-colors hover:bg-surface-alt sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8 sm:px-4"
                  >
                    <p className="text-small font-medium text-ink-muted sm:pt-1">
                      {formatTimeRange({ ...entry.occurrence, ...entry.timing })}
                    </p>
                    <div className="min-w-0">
                      <EventTitle entry={entry} level={entryLevel} />
                      {where && <p className="mt-1 text-small text-ink-muted">{where}</p>}
                      {entry.event.summary && (
                        <p className="mt-2 max-w-measure text-pretty text-ink-muted">
                          {entry.event.summary}
                        </p>
                      )}
                      <EventPills entry={entry} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    )
  },
}

/** Agenda: grouped by day with times in a column. A repeating event shows each of its next dates. */
export function EventsAgenda(props: SectionProps<'events'>) {
  return <EventsView {...props} layout={layout} />
}
