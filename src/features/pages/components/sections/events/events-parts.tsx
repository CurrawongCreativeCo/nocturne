import Link from 'next/link'
import { stegaClean } from 'next-sanity'
import { Suspense, type ReactNode } from 'react'

import { ActionIndicator } from '@/components/ui/action-indicator'
import { ctaClassName } from '@/components/ui/cta-link'
import { PlainText } from '@/components/ui/plain-text'
import { resolveLink } from '@/components/ui/resolve-link'
import { SanityLink } from '@/components/ui/sanity-link'
import { SectionFrame } from '@/components/ui/section-frame'
import { SectionHeader } from '@/components/ui/section-header'
import { ctaSurfaceFor, sectionTraits, type SectionDefaults } from '@/components/ui/section-style'
import { EVENTS_FEED_PATH, eventPath } from '@/config/event-paths'
import { hasEvents } from '@/config/profile'
import { dayBadge, formatWhen, timeAttribute } from '@/lib/events/format'
import { repeatLabel } from '@/lib/events/recurrence'
import { requestTime } from '@/lib/request-time'
import { resolveCardAction, type OwnAction } from '@/lib/sanity/card-action'
import { type resolveCardDesign } from '@/lib/sanity/card-design'
import { sectionTitle } from '@/lib/sanity/section-title'
import { resolveTextRoles, textRoleProps } from '@/lib/sanity/text-role'
import type { OwnText } from '@/lib/sanity/text-style-options'

import type { SectionProps } from '../../../types'
import { eventsLimit, upcomingEntries, type UpcomingEntry } from '../../../utils/events'

export type EventsData = SectionProps<'events'>['data']
export type EventCard = NonNullable<EventsData['events']>[number]
export type Entry = UpcomingEntry<EventCard>

const HEADER_ROLES = ['eyebrow', 'heading', 'intro'] as const

/** How a layout looks and what it draws for the entries that are still to come. */
export interface EventsLayout {
  defaults: SectionDefaults
  /** Classes holding the place of the list while it streams in, so the page doesn't jump. */
  placeholderClassName: string
  render: (entries: Entry[], context: EventsContext) => ReactNode
}

export interface EventsContext {
  /** The heading level of the events themselves (or of the days, in the agenda). */
  level: 'h2' | 'h3'
  /** The section's Cards box: the text roles for every layout, and the Featured card's fill and mark. */
  cardDesign?: EventsData['cardDesign']
  /** The section's tone, which the Featured card's mark is measured against. */
  tone?: string
  /** The section's `pictureDepthDesign`: a shadow and glow on the Featured card's picture (task 147). */
  pictureDepth?: EventsData['pictureDepthDesign']
}

/** The text roles every layout draws (events-capabilities.ts). */
export const EVENT_ROLES = ['title', 'meta', 'body'] as const
export type EventLook = ReturnType<typeof resolveCardDesign<(typeof EVENT_ROLES)[number]>>

/** What each role draws with nothing chosen: its size and weight, so the steps move from them. */
export const OWN_META = { size: 'text-small', weight: 'regular', colour: 'text-ink-muted' } as const
export const OWN_META_MEDIUM = { ...OWN_META, weight: 'medium' } as const
export const OWN_BODY = { size: 'text-body', weight: 'regular', colour: 'text-ink-muted' } as const

export const OWN_TITLE_H4 = { size: 'text-h4', weight: 'semibold' } as const

const linkClass = 'font-medium text-ink underline underline-offset-4 hover:text-accent'

/** "Online" or the venue's name; nothing when the event gives neither. */
export function whereOf(event: EventCard): string | null {
  if (stegaClean(event.location?.kind) === 'online') return 'Online'
  return event.location?.name ?? null
}

/** The label for an event that is not simply on, or null. */
export function statusLabel(event: EventCard): { text: string; className: string } | null {
  switch (stegaClean(event.status)) {
    case 'cancelled':
      return { text: 'Cancelled', className: 'bg-danger-surface text-danger-ink' }
    case 'soldOut':
      return { text: 'Sold out', className: 'bg-highlight text-highlight-ink' }
    default:
      return null
  }
}

const pill = 'inline-flex items-center rounded-pill px-3 py-1 text-small font-medium'

/** Status, category and repeat pills; nothing when the event has none of them. */
export function EventPills({ entry }: { entry: Entry }) {
  const { event, timing } = entry
  const status = statusLabel(event)
  const repeat = repeatLabel(timing.repeat)
  if (!status && !event.category && !repeat) return null

  return (
    <ul className="mt-3 flex flex-wrap gap-2" aria-label="About this event">
      {status && (
        <li>
          <span className={`${pill} ${status.className}`}>{status.text}</span>
        </li>
      )}
      {event.category && (
        <li>
          <span className={`${pill} border border-line text-ink`}>{event.category}</span>
        </li>
      )}
      {repeat && (
        <li>
          <span className={`${pill} border border-line text-ink-muted`}>{repeat}</span>
        </li>
      )}
    </ul>
  )
}

/** The date as a small square: weekday, day, month. Decorative: the full date is in the text beside it. */
export function DateBadge({ entry, className = 'size-16' }: { entry: Entry; className?: string }) {
  const { weekday, day, month } = dayBadge(entry.occurrence.start, entry.timing.timeZone)
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 flex-col items-center justify-center rounded-card bg-surface-alt text-center leading-none ring-1 ring-line ${className}`}
    >
      <span className="text-small font-semibold text-accent-text uppercase">{weekday}</span>
      <span className="mt-1 text-h4 font-semibold text-ink">{day}</span>
      <span className="mt-1 text-small text-ink-muted uppercase">{month}</span>
    </div>
  )
}

/** "Sat 14 Mar, 10:00 am – 12:00 pm" in a `<time>` for machines, then the venue. */
export function WhenAndWhere({ entry, look }: { entry: Entry; look: EventLook }) {
  const { event, timing, occurrence } = entry
  const where = whereOf(event)
  const occurrenceTiming = { ...occurrence, allDay: timing.allDay, timeZone: timing.timeZone }
  return (
    <p {...textRoleProps('meta', 'text-small text-ink-muted', OWN_META, look.text.meta)}>
      <time dateTime={timeAttribute(occurrence.start, timing.allDay, timing.timeZone)}>
        {formatWhen(occurrenceTiming)}
      </time>
      {where && <span> · {where}</span>}
    </p>
  )
}

/** The event's summary, in the body role. `className` is what the layout draws with nothing chosen. */
export function EventSummary({
  entry,
  className,
  look,
}: {
  entry: Entry
  className: string
  look: EventLook
}) {
  const body = textRoleProps('body', className, OWN_BODY, look.text.body)
  return (
    <PlainText
      text={entry.event.summary}
      className={body.className}
      style={body.style}
      textRole="body"
    />
  )
}

/** Whether the event has a page its card links to (the title link is stretched over the card). */
export function isEventLinked(entry: Entry): boolean {
  return Boolean(stegaClean(entry.event.slug)) && hasEvents()
}

/** What each layout draws at the end of a linked card until Cards › Indicator says otherwise. */
export const OWN_LIST_ACTION: OwnAction = {
  glyph: 'chevron',
  motion: 'nudge',
  distance: 'legacy-large',
}
export const OWN_FEATURED_ACTION: OwnAction = { glyph: 'none', motion: 'nudge' }

/**
 * The indicator at the end of a linked event card or row (components/ui/action-indicator.tsx). The
 * card is the one link, so this is decoration; `className` is the layout's own placement, which keeps
 * the List's chevron out of small screens.
 */
export function EventIndicator({
  cardDesign,
  own,
  className,
  legacyChevron = false,
}: {
  cardDesign: EventsContext['cardDesign']
  own: OwnAction
  className?: string
  legacyChevron?: boolean
}) {
  const action = resolveCardAction(cardDesign, own)
  return (
    <ActionIndicator
      glyph={action.glyph}
      external={false}
      motion={action.motion}
      distance={action.distance}
      colour={action.colour}
      legacyChevron={legacyChevron}
      className={className}
    />
  )
}

/** The event's title as a heading with the link stretched over its whole card or row. */
export function EventTitle({
  entry,
  level: Heading,
  className = 'text-h4 font-semibold text-balance',
  own = OWN_TITLE_H4,
  look,
}: {
  entry: Entry
  level: 'h2' | 'h3' | 'h4'
  /** The classes with nothing chosen, and the `own` size and weight they hold. */
  className?: string
  own?: OwnText
  look: EventLook
}) {
  const slug = stegaClean(entry.event.slug)
  return (
    <Heading {...textRoleProps('title', className, own, look.text.title)}>
      {slug && hasEvents() ? (
        <Link href={eventPath(slug)} className="after:absolute after:inset-0">
          {entry.event.title}
        </Link>
      ) : (
        entry.event.title
      )}
    </Heading>
  )
}

function Header({ data, block, text }: { data: EventsData; block: string; text: string }) {
  const title = sectionTitle(data)
  return (
    <SectionHeader
      as="div"
      spacing="mb-12 max-w-measure-narrow"
      eyebrow={data.eyebrow}
      title={title}
      heading={data.heading}
      intro={data.text}
      // With no title above it, the intro needs no margin.
      introClass={title ? undefined : 'text-lead text-pretty text-ink-muted'}
      design={resolveTextRoles(data.headerDesign, HEADER_ROLES)}
      block={block}
      text={text}
    />
  )
}

/** "See all events" and the calendar feed, below the list. Part of the prerendered page. */
function Footer({
  data,
  surface,
  justify,
}: {
  data: EventsData
  surface: 'dark' | 'light'
  justify: string
}) {
  const seeAll = resolveLink(data.seeAllLink) ? data.seeAllLink : null
  // The feed lists every event, so a section filtered to one category doesn't offer it.
  const feed = hasEvents() && !data.hasCategoryFilter
  if (!seeAll && !feed) return null

  return (
    <div className={`mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 ${justify}`}>
      {seeAll && (
        <SanityLink link={seeAll} className={ctaClassName(surface, 'secondary')}>
          {data.seeAllLabel || 'See all events'}
        </SanityLink>
      )}
      {feed && (
        <a href={EVENTS_FEED_PATH} className={linkClass}>
          Subscribe to the calendar
        </a>
      )}
    </div>
  )
}

function Placeholder({ className }: { className: string }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">Loading events…</span>
    </div>
  )
}

/**
 * The entries that are still to come, once the time is known. Pages are cached, so the clock is
 * read here, at request time, in a boundary of its own: the rest of the page stays prerendered and
 * only this streams in. Past events are dropped here.
 */
async function Upcoming({
  data,
  layout,
  context,
}: {
  data: EventsData
  layout: EventsLayout
  context: EventsContext
}) {
  const now = await requestTime()
  const entries = upcomingEntries(data.events, {
    now,
    variant: data.variant,
    limit: eventsLimit(data.variant, data.count),
    fallbackTimeZone: data.businessTimeZone,
  })

  if (entries.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line-strong p-8 text-center text-ink-muted">
        No upcoming events right now. Check back soon.
      </p>
    )
  }
  return layout.render(entries, context)
}

/** The section every layout shares: title, the upcoming events (per request), then the links. */
export function EventsView({
  data,
  isFirst,
  layout,
}: SectionProps<'events'> & { layout: EventsLayout }) {
  const { block, text, justify, tone } = sectionTraits(data.style, layout.defaults)
  const context: EventsContext = {
    level: sectionTitle(data) ? 'h3' : 'h2',
    cardDesign: data.cardDesign,
    tone,
    pictureDepth: data.pictureDepthDesign,
  }

  return (
    <SectionFrame style={data.style} defaults={layout.defaults} isFirst={isFirst}>
      <Header data={data} block={block} text={text} />
      <Suspense fallback={<Placeholder className={layout.placeholderClassName} />}>
        <Upcoming data={data} layout={layout} context={context} />
      </Suspense>
      <Footer data={data} surface={ctaSurfaceFor(tone)} justify={justify} />
    </SectionFrame>
  )
}
