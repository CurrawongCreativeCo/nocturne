import type { SectionDefaults } from '@/components/ui/section-style'
import { resolveCardDesign } from '@/lib/sanity/card-design'

import {
  DateBadge,
  EVENT_ROLES,
  EventPills,
  EventsView,
  EventSummary,
  EventTitle,
  WhenAndWhere,
  type EventsLayout,
} from './events-parts'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { tone: 'surface', container: 'max-w-content', align: 'start' }

function Chevron() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="mt-5 hidden size-6 shrink-0 text-ink-muted transition-transform duration-(--duration-fast) group-hover:translate-x-1 motion-reduce:transition-none sm:block"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

const layout: EventsLayout = {
  defaults: DEFAULTS,
  placeholderClassName: 'min-h-72 rounded-card bg-surface-alt motion-safe:animate-pulse',
  render: (entries, { level, cardDesign }) => {
    const look = resolveCardDesign(cardDesign, EVENT_ROLES)
    return (
      <ul className="divide-y divide-line border-y border-line">
        {entries.map((entry) => (
          <li
            key={`${entry.event._id}-${entry.occurrence.start}`}
            className="group relative flex items-start gap-4 px-2 py-6 transition-colors hover:bg-surface-alt sm:gap-6 sm:px-4"
          >
            <DateBadge entry={entry} />
            <div className="min-w-0 flex-1">
              <WhenAndWhere entry={entry} look={look} />
              <EventTitle
                entry={entry}
                level={level}
                className="mt-1 text-h4 font-semibold text-balance"
                look={look}
              />
              <EventSummary
                entry={entry}
                className="mt-2 max-w-measure text-pretty text-ink-muted"
                look={look}
              />
              <EventPills entry={entry} />
            </div>
            <Chevron />
          </li>
        ))}
      </ul>
    )
  },
}

/** List: the next events, a row each. A repeating event appears once, at its next date. */
export function EventsList(props: SectionProps<'events'>) {
  return <EventsView {...props} layout={layout} />
}
