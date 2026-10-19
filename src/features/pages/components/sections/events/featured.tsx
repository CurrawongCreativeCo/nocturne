import { PlainText } from '@/components/ui/plain-text'
import { SanityImage } from '@/components/ui/sanity-image'
import type { SectionDefaults } from '@/components/ui/section-style'

import {
  DateBadge,
  EventPills,
  EventsView,
  EventTitle,
  WhenAndWhere,
  type EventsLayout,
} from './events-parts'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { tone: 'surface', container: 'max-w-content', align: 'start' }

const layout: EventsLayout = {
  defaults: DEFAULTS,
  placeholderClassName: 'min-h-96 rounded-card bg-surface-alt motion-safe:animate-pulse',
  render: ([first, ...rest], { level }) => {
    if (!first) return null
    const hasPicture = Boolean(first.event.image?.asset)
    return (
      <div className={rest.length > 0 ? 'grid items-start gap-8 lg:grid-cols-[3fr_2fr]' : ''}>
        <article className="relative flex flex-col overflow-hidden rounded-card bg-surface shadow-card ring-1 ring-line">
          {hasPicture ? (
            <SanityImage
              image={first.event.image}
              width={1200}
              height={675}
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-surface-alt">
              <DateBadge entry={first} className="size-28" />
            </div>
          )}
          <div className="p-6 sm:p-8">
            <WhenAndWhere entry={first} />
            <EventTitle
              entry={first}
              level={level}
              className="mt-2 text-h3 font-semibold text-balance"
            />
            <PlainText
              text={first.event.summary}
              className="mt-3 max-w-measure text-pretty text-ink-muted"
            />
            <EventPills entry={first} />
          </div>
        </article>
        {rest.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {rest.map((entry) => (
              <li
                key={`${entry.event._id}-${entry.occurrence.start}`}
                className="relative flex items-start gap-4 px-2 py-5 transition-colors hover:bg-surface-alt"
              >
                <DateBadge entry={entry} className="size-14" />
                <div className="min-w-0 flex-1">
                  <WhenAndWhere entry={entry} />
                  <EventTitle
                    entry={entry}
                    level={level}
                    className="mt-1 text-lead font-semibold text-balance"
                  />
                  <EventPills entry={entry} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
}

/** Featured: the next event large, with its picture, and the ones after it beside it. */
export function EventsFeatured(props: SectionProps<'events'>) {
  return <EventsView {...props} layout={layout} />
}
