import { eventPath } from '@/config/event-paths'
import type { IcsEvent, IcsStatus } from '@/lib/events/ics'
import { resolveTiming, type EventTimingInput } from '@/lib/events/recurrence'

import { locationText, type EventLocation } from './location'

/** The fields of an event the calendar files carry; the event query and the feed query both return them. */
export interface CalendarSource extends EventTimingInput {
  _id: string
  _updatedAt: string
  slug: string
  title?: string | null
  summary?: string | null
  status?: string | null
  category?: string | null
  location?: EventLocation | null
}

const STATUSES: readonly IcsStatus[] = ['scheduled', 'cancelled', 'soldOut']

/**
 * One event as an `IcsEvent`, or null when it has no usable start. `siteOrigin` makes the page
 * address absolute and gives the `UID` its domain, so the same event keeps the same identity
 * wherever it is subscribed.
 */
export function toIcsEvent(
  source: CalendarSource,
  siteOrigin: string,
  fallbackTimeZone?: string | null,
): IcsEvent | null {
  const timing = resolveTiming(source, fallbackTimeZone)
  if (!timing) return null

  const origin = new URL(siteOrigin)
  const where = locationText(source.location)
  const online = source.location?.kind === 'online' && source.location.url
  const modified = Date.parse(source._updatedAt)

  return {
    // A draft and its published version are the same event.
    uid: `${source._id.replace(/^drafts\./, '')}@${origin.hostname}`,
    title: source.title || 'Event',
    timing,
    description:
      [source.summary, online ? `Join online: ${source.location?.url}` : null]
        .filter(Boolean)
        .join('\n\n') || null,
    location: where,
    url: new URL(eventPath(source.slug), origin).toString(),
    status: STATUSES.find((status) => status === source.status) ?? 'scheduled',
    modified: Number.isFinite(modified) ? modified : timing.start,
    category: source.category,
  }
}
