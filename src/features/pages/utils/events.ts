import { stegaClean } from 'next-sanity'

import {
  expandOccurrences,
  resolveTiming,
  type EventTimingInput,
  type Occurrence,
  type EventTiming,
} from '@/lib/events/recurrence'

/** The most an editor can ask an Events section to show. */
export const EVENTS_MAX_COUNT = 24

/** What each layout shows when the section sets no count. */
const DEFAULT_COUNT = { list: 6, agenda: 10, featured: 4 } as const

type EventsVariant = keyof typeof DEFAULT_COUNT

export function eventsVariant(variant: string | null | undefined): EventsVariant {
  const clean = stegaClean(variant)
  return clean === 'agenda' || clean === 'featured' ? clean : 'list'
}

/** How many entries a section shows: its own count, else the layout's. */
export function eventsLimit(
  variant: string | null | undefined,
  count: number | null | undefined,
): number {
  return count && count > 0
    ? Math.min(count, EVENTS_MAX_COUNT)
    : DEFAULT_COUNT[eventsVariant(variant)]
}

/** A repeating event can fill the agenda; show at most this many dates of one series. */
const AGENDA_PER_EVENT = 8

export interface UpcomingEntry<T> {
  event: T
  timing: EventTiming
  occurrence: Occurrence
}

/**
 * The entries a section shows at the time `now`: what has not ended yet, soonest first, up to
 * `limit`. The list and featured layouts show each event once, at its next date; the agenda shows
 * every date, a series for at most `AGENDA_PER_EVENT`. Hidden: events with no usable start.
 * Past events fall away here, at request time, because the cached query result can't know the date.
 */
export function upcomingEntries<T extends EventTimingInput>(
  events: readonly T[],
  {
    now,
    variant,
    limit,
    fallbackTimeZone,
  }: {
    now: number
    variant: string | null | undefined
    limit: number
    fallbackTimeZone?: string | null
  },
): UpcomingEntry<T>[] {
  const everyDate = eventsVariant(variant) === 'agenda'
  const entries: UpcomingEntry<T>[] = []

  for (const event of events) {
    const timing = resolveTiming(event, fallbackTimeZone)
    if (!timing) continue
    const occurrences = expandOccurrences(timing, {
      from: now,
      limit: everyDate ? Math.min(limit, AGENDA_PER_EVENT) : 1,
    })
    for (const occurrence of occurrences) entries.push({ event, timing, occurrence })
  }

  return entries
    .sort((a, b) => a.occurrence.start - b.occurrence.start || a.occurrence.end - b.occurrence.end)
    .slice(0, limit)
}
