import { CardSurface } from '@/components/ui/card-surface'
import { SanityImage } from '@/components/ui/sanity-image'
import type { SectionDefaults } from '@/components/ui/section-style'
import { resolveCardAction } from '@/lib/sanity/card-action'
import { resolveCardDesign } from '@/lib/sanity/card-design'
import {
  CARD_SHADOW_CLASS,
  OWN_SHADOW,
  resolveCardDepth,
  resolveCardLift,
} from '@/lib/sanity/depth-options'

import {
  DateBadge,
  EVENT_ROLES,
  EventIndicator,
  EventPills,
  isEventLinked,
  OWN_FEATURED_ACTION,
  EventsView,
  EventSummary,
  EventTitle,
  WhenAndWhere,
  type EventsLayout,
} from './events-parts'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep it equal to the initial style in its schema.
const DEFAULTS: SectionDefaults = { tone: 'surface', container: 'max-w-content', align: 'start' }

/** The card's own surface: the whole card links, so a chosen fill has no hover shade. */
const OWN_SURFACE = { background: 'bg-surface', border: 'ring-1 ring-line', still: true }

const layout: EventsLayout = {
  defaults: DEFAULTS,
  placeholderClassName: 'min-h-96 rounded-card bg-surface-alt motion-safe:animate-pulse',
  render: ([first, ...rest], { level, cardDesign, tone }) => {
    if (!first) return null
    const look = resolveCardDesign(cardDesign, EVENT_ROLES)
    const hasPicture = Boolean(first.event.image?.asset)
    // Nothing is drawn, and no group is needed, unless Cards › Indicator chooses one.
    const indicated = resolveCardAction(cardDesign, OWN_FEATURED_ACTION).glyph !== 'none'
    const group = (entry: typeof first) => (indicated && isEventLinked(entry) ? ' group' : '')
    const indicator = (entry: typeof first, className: string) =>
      indicated && isEventLinked(entry) ? (
        <EventIndicator cardDesign={cardDesign} own={OWN_FEATURED_ACTION} className={className} />
      ) : null
    return (
      <div className={rest.length > 0 ? 'grid items-start gap-8 lg:grid-cols-[3fr_2fr]' : ''}>
        <CardSurface
          as="article"
          className={`relative flex flex-col overflow-hidden rounded-card bg-surface ${CARD_SHADOW_CLASS.shadowed} ring-1 ring-line${group(first)}`}
          own={OWN_SURFACE}
          shadow={CARD_SHADOW_CLASS.shadowed}
          lift={resolveCardLift([cardDesign]) === 'lift' && isEventLinked(first)}
          depth={resolveCardDepth([cardDesign], OWN_SHADOW.siteCard)}
          design={look.surface}
          mark={{ input: cardDesign?.mark, scope: 'card', tone, levels: [cardDesign] }}
        >
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
            <WhenAndWhere entry={first} look={look} />
            <EventTitle
              entry={first}
              level={level}
              className="mt-2 text-h3 font-semibold text-balance"
              own={{ size: 'text-h3', weight: 'semibold' }}
              look={look}
            />
            <EventSummary
              entry={first}
              className="mt-3 max-w-measure text-pretty text-ink-muted"
              look={look}
            />
            <EventPills entry={first} />
            {indicator(first, 'mt-4')}
          </div>
        </CardSurface>
        {rest.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {rest.map((entry) => (
              <li
                key={`${entry.event._id}-${entry.occurrence.start}`}
                className={`relative flex items-start gap-4 px-2 py-5 transition-colors hover:bg-surface-alt${group(entry)}`}
              >
                <DateBadge entry={entry} className="size-14" />
                <div className="min-w-0 flex-1">
                  <WhenAndWhere entry={entry} look={look} />
                  <EventTitle
                    entry={entry}
                    level={level}
                    className="mt-1 text-lead font-semibold text-balance"
                    own={{ size: 'text-lead', weight: 'semibold' }}
                    look={look}
                  />
                  <EventPills entry={entry} />
                </div>
                {indicator(entry, 'mt-4')}
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
