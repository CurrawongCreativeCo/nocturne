import type { SectionDefaults } from '@/components/ui/section-style'
import { resolveCardDesign } from '@/lib/sanity/card-design'

import {
  DateBadge,
  EVENT_ROLES,
  EventIndicator,
  EventPills,
  EventsView,
  EventSummary,
  EventTitle,
  OWN_LIST_ACTION,
  WhenAndWhere,
  type EventsLayout,
} from './events-parts'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { tone: 'surface', container: 'max-w-content', align: 'start' }

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
            {/* Small screens keep the row without it, as before the shared indicator. */}
            <EventIndicator
              cardDesign={cardDesign}
              own={OWN_LIST_ACTION}
              legacyChevron
              className="mt-5 hidden text-ink-muted sm:block"
            />
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
