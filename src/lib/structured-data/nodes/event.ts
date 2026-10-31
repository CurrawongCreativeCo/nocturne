import type { EventTiming, Occurrence } from '@/lib/events/recurrence'
import { isoWithOffset, localDateKey } from '@/lib/events/time-zone'

import { clean, trace } from '../graph'
import { documentKey, eventId, organizationId } from '../ids'
import type { Built } from '../types'

/** What the Event structured data is built from; the page passes cleaned (stega-free) values. */
export interface EventInput {
  origin: string
  /** The event's document `_id`: the `@id` keeps it when the slug changes. */
  id: string
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
}

const SCHEMA = 'https://schema.org/'

/**
 * schema.org `Event` for an event's page: dates with their offset, `eventStatus`, `location`, and
 * `offers` pointing at the registration URL. A cancelled event keeps its page and says so, with no
 * offer; a sold-out one keeps the offer with `SoldOut`. The offer carries no price (registration is
 * a link), so it makes no claim about cost.
 */
export function buildEvent(input: EventInput): Built {
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
        ? clean({
            '@type': 'Place',
            name: location.name,
            address: location.address?.replace(/\s*\n\s*/g, ', '),
          })
        : null

  const offer =
    input.registrationUrl && status !== 'cancelled'
      ? {
          '@type': 'Offer',
          url: input.registrationUrl,
          availability: `${SCHEMA}${status === 'soldOut' ? 'SoldOut' : 'InStock'}`,
        }
      : null

  const node = clean({
    '@type': 'Event',
    '@id': eventId(input.origin, input.id),
    url: input.url,
    name: input.title,
    description: input.summary,
    image: input.image ? [input.image] : undefined,
    ...dates,
    eventStatus: `${SCHEMA}${status === 'cancelled' ? 'EventCancelled' : 'EventScheduled'}`,
    eventAttendanceMode: `${SCHEMA}${location?.kind === 'online' ? 'OnlineEventAttendanceMode' : 'OfflineEventAttendanceMode'}`,
    location: place,
    offers: offer,
    organizer: { '@id': organizationId(input.origin) },
  })
  return {
    node,
    provenance: trace(node, documentKey(input.id), {
      name: 'title',
      description: 'summary',
      startDate: 'start',
      endDate: 'end',
      'location.name': 'location.name',
      'location.address': 'location.address',
      'offers.url': 'registration.link',
    }),
  }
}
