import type { EventTiming, Occurrence } from '@/lib/events/recurrence'
import { isoWithOffset, localDateKey } from '@/lib/events/time-zone'

/** What the Event structured data is built from; the page passes cleaned (stega-free) values. */
export interface EventJsonLdInput {
  /** The event's page, absolute. */
  url: string
  title: string
  summary?: string | null
  /** An absolute URL to a picture (the share image). */
  image?: string | null
  /** The occurrence being described: for a series, the next one. */
  occurrence: Occurrence
  timing: EventTiming
  status: 'scheduled' | 'cancelled' | 'soldOut'
  location?: {
    kind: 'venue' | 'online'
    name?: string | null
    address?: string | null
    url?: string | null
  } | null
  /** The registration button's destination, absolute, when it has one. */
  registrationUrl?: string | null
  /** The site's Organization `@id`, so the event names who runs it. */
  organizerId?: string | null
}

const SCHEMA = 'https://schema.org/'

/**
 * schema.org `Event` for an event's page: dates with their offset, `eventStatus`, `location`, and
 * `offers` pointing at the registration URL. A cancelled event keeps its page and says so, with no
 * offer; a sold-out one keeps the offer with `SoldOut`.
 */
export function buildEventJsonLd(input: EventJsonLdInput): Record<string, unknown> {
  const { timing, occurrence, status, location } = input

  const dates = timing.allDay
    ? {
        startDate: localDateKey(occurrence.start, timing.timeZone),
        // `end` is midnight after the last day.
        endDate: localDateKey(occurrence.end - 1, timing.timeZone),
      }
    : {
        startDate: isoWithOffset(occurrence.start, timing.timeZone),
        ...(occurrence.end > occurrence.start && {
          endDate: isoWithOffset(occurrence.end, timing.timeZone),
        }),
      }

  const place =
    location?.kind === 'online'
      ? location.url
        ? { '@type': 'VirtualLocation', url: location.url }
        : null
      : location?.name || location?.address
        ? {
            '@type': 'Place',
            ...(location.name && { name: location.name }),
            ...(location.address && { address: location.address.replace(/\s*\n\s*/g, ', ') }),
          }
        : null

  const offer =
    input.registrationUrl && status !== 'cancelled'
      ? {
          '@type': 'Offer',
          url: input.registrationUrl,
          availability: `${SCHEMA}${status === 'soldOut' ? 'SoldOut' : 'InStock'}`,
        }
      : null

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    '@id': `${input.url}#event`,
    url: input.url,
    name: input.title,
    ...(input.summary && { description: input.summary }),
    ...(input.image && { image: [input.image] }),
    ...dates,
    eventStatus: `${SCHEMA}${status === 'cancelled' ? 'EventCancelled' : 'EventScheduled'}`,
    eventAttendanceMode: `${SCHEMA}${location?.kind === 'online' ? 'OnlineEventAttendanceMode' : 'OfflineEventAttendanceMode'}`,
    ...(place && { location: place }),
    ...(offer && { offers: offer }),
    ...(input.organizerId && { organizer: { '@id': input.organizerId } }),
  }
}
