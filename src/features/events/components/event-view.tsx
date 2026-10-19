import { notFound } from 'next/navigation'
import { stegaClean } from 'next-sanity'
import { Suspense } from 'react'

import { CtaLink } from '@/components/ui/cta-link'
import { JsonLd } from '@/components/ui/json-ld'
import { PlainText } from '@/components/ui/plain-text'
import { resolveLink } from '@/components/ui/resolve-link'
import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'
import { eventIcsPath, eventPath } from '@/config/event-paths'
import { siteUrl } from '@/config/site-url'
import { googleCalendarUrl, outlookCalendarUrl } from '@/lib/events/calendar-links'
import { formatDayOf, formatWhen, timeAttribute } from '@/lib/events/format'
import {
  expandOccurrences,
  repeatLabel,
  resolveTiming,
  type EventTiming,
  type Occurrence,
} from '@/lib/events/recurrence'
import { zoneAbbreviation } from '@/lib/events/time-zone'
import { requestTime } from '@/lib/request-time'
import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { getEvent } from '../api/event'
import type { EventData } from '../types'
import { buildEventJsonLd } from '../utils/json-ld'
import { directionsUrl, locationText } from '../utils/location'
import { registrationUrl } from '../utils/registration-url'

const linkClass = 'font-medium text-ink underline underline-offset-4 hover:text-accent'
const pill = 'inline-flex items-center rounded-pill px-3 py-1 text-small font-medium'

/** How many upcoming dates of a series the page lists. */
const SERIES_DATES = 5

type Status = 'scheduled' | 'cancelled' | 'soldOut'

const statusOf = (event: EventData): Status => {
  const status = stegaClean(event.status)
  return status === 'cancelled' || status === 'soldOut' ? status : 'scheduled'
}

export async function EventView({ slug, ...mode }: { slug: string } & FetchMode) {
  const event = await getEvent({ slug, ...mode })
  if (!event) notFound()

  const timing = resolveTiming(event, event.businessTimeZone)
  const status = statusOf(event)
  const first = timing && expandOccurrences(timing, { from: -Infinity, limit: 1 })[0]

  return (
    <article className="mx-auto max-w-content px-gutter py-section-compact">
      <header className="max-w-measure">
        <Pills event={event} timing={timing} status={status} />
        <h1 className="mt-3 text-h1 font-semibold text-balance">{event.title}</h1>
        <PlainText text={event.summary} className="mt-5 text-lead text-pretty text-ink-muted" />
        {status === 'cancelled' && (
          <p
            role="status"
            className="mt-6 rounded-control border border-danger bg-danger-surface p-4 text-danger-ink"
          >
            This event has been cancelled.
          </p>
        )}
      </header>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-14">
        <aside
          aria-labelledby="event-details-heading"
          className="rounded-card bg-surface p-6 shadow-card ring-1 ring-line lg:order-2"
        >
          <h2 id="event-details-heading" className="text-h4 font-semibold">
            Event details
          </h2>
          {timing && first ? (
            timing.repeat === 'none' ? (
              <Details event={event} timing={timing} occurrences={[first]} status={status} />
            ) : (
              // A series shows its next dates: today's date is only known when someone asks.
              <Suspense fallback={<DetailsFallback />}>
                <SeriesDetails event={event} timing={timing} status={status} />
              </Suspense>
            )
          ) : (
            <p className="mt-4 text-ink-muted">The date for this event is still to come.</p>
          )}
        </aside>

        <div className="min-w-0 lg:order-1">
          {event.image?.asset && (
            <SanityImage
              image={event.image}
              width={1200}
              height={675}
              preload
              sizes="(min-width: 1024px) 720px, 100vw"
              className="aspect-video w-full rounded-card object-cover"
            />
          )}
          {event.body && event.body.length > 0 && (
            <RichText
              value={event.body}
              className={`max-w-measure text-lead text-ink ${event.image?.asset ? 'mt-10' : ''}`}
            />
          )}
        </div>
      </div>
    </article>
  )
}

function Pills({
  event,
  timing,
  status,
}: {
  event: EventData
  timing: EventTiming | null
  status: Status
}) {
  const repeat = timing ? repeatLabel(timing.repeat) : null
  if (status === 'scheduled' && !event.category && !repeat) return null
  return (
    <ul className="flex flex-wrap gap-2" aria-label="About this event">
      {status === 'cancelled' && (
        <li>
          <span className={`${pill} bg-danger-surface text-danger-ink`}>Cancelled</span>
        </li>
      )}
      {status === 'soldOut' && (
        <li>
          <span className={`${pill} bg-highlight text-highlight-ink`}>Sold out</span>
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

function DetailsFallback() {
  return (
    <div
      role="status"
      className="mt-4 min-h-72 rounded-control bg-surface-alt motion-safe:animate-pulse"
    >
      <span className="sr-only">Loading the dates…</span>
    </div>
  )
}

/** The next dates of a repeating event, once the time is known (the page is cached; the clock can't be read in it). */
async function SeriesDetails({
  event,
  timing,
  status,
}: {
  event: EventData
  timing: EventTiming
  status: Status
}) {
  const now = await requestTime()
  const upcoming = expandOccurrences(timing, { from: now, limit: SERIES_DATES })
  // A series that has finished shows its last date, so the page still says when it was.
  const occurrences =
    upcoming.length > 0 ? upcoming : expandOccurrences(timing, { from: -Infinity }).slice(-1)
  return (
    <Details
      event={event}
      timing={timing}
      occurrences={occurrences}
      status={status}
      finished={upcoming.length === 0}
    />
  )
}

function Details({
  event,
  timing,
  occurrences,
  status,
  finished = false,
}: {
  event: EventData
  timing: EventTiming
  occurrences: Occurrence[]
  status: Status
  /** A one-off event that is over can't know it without the clock; only a finished series says so. */
  finished?: boolean
}) {
  const [next] = occurrences
  if (!next) return null

  const pageUrl = new URL(eventPath(event.slug), siteUrl).toString()
  const where = locationText(event.location)
  const directions = directionsUrl(event.location)
  const isOnline = stegaClean(event.location?.kind) === 'online'
  const joinUrl = isOnline ? stegaClean(event.location?.url) : null
  const occurrence = { ...next, allDay: timing.allDay, timeZone: timing.timeZone }
  const isSeries = timing.repeat !== 'none'
  const registration = status === 'scheduled' ? event.registration : null
  const resolved = resolveLink(event.registration?.link)

  const calendar = {
    title: stegaClean(event.title),
    details: [stegaClean(event.summary), pageUrl].filter(Boolean).join('\n\n'),
    location: where,
    ...occurrence,
  }

  return (
    <>
      <JsonLd
        data={buildEventJsonLd({
          url: pageUrl,
          title: stegaClean(event.title),
          summary: stegaClean(event.summary),
          image: new URL(`/api/og/events/${event.slug}`, siteUrl).toString(),
          occurrence: next,
          timing,
          status,
          location: event.location && {
            kind: isOnline ? 'online' : 'venue',
            name: stegaClean(event.location.name),
            address: stegaClean(event.location.address),
            url: stegaClean(event.location.url),
          },
          registrationUrl: registrationUrl(resolved, siteUrl),
          organizerId: `${new URL('/', siteUrl).toString()}#organization`,
        })}
      />
      <dl className="mt-5 space-y-5">
        <div>
          <dt className="text-small font-semibold text-ink-muted">
            {isSeries ? (finished ? 'Last date' : 'Next date') : 'When'}
          </dt>
          <dd className="mt-1">
            <time dateTime={timeAttribute(next.start, timing.allDay, timing.timeZone)}>
              {formatWhen(occurrence, true)}
            </time>
            {!timing.allDay && (
              <span className="block text-small text-ink-muted">
                {zoneAbbreviation(next.start, timing.timeZone)} (times are in the event’s time zone)
              </span>
            )}
          </dd>
        </div>

        {isSeries && (
          <div>
            <dt className="text-small font-semibold text-ink-muted">Repeats</dt>
            <dd className="mt-1">
              {repeatLabel(timing.repeat)}
              {timing.until ? `, until ${untilText(timing)}` : ''}
              {!finished && occurrences.length > 1 && (
                <>
                  <span className="mt-3 block text-small font-semibold text-ink-muted">
                    Coming up
                  </span>
                  <ul className="mt-1 space-y-1">
                    {occurrences.map((date) => (
                      <li key={date.start}>
                        <time dateTime={timeAttribute(date.start, timing.allDay, timing.timeZone)}>
                          {formatDayOf(date.start, timing.timeZone)}
                        </time>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </dd>
          </div>
        )}

        {(where || joinUrl) && (
          <div>
            <dt className="text-small font-semibold text-ink-muted">Where</dt>
            <dd className="mt-1">
              {isOnline ? (
                <>
                  Online
                  {joinUrl && (
                    <span className="block">
                      <a href={joinUrl} rel="noopener noreferrer" className={linkClass}>
                        Link to join
                      </a>
                    </span>
                  )}
                </>
              ) : (
                <>
                  {event.location?.name && <span className="block">{event.location.name}</span>}
                  {event.location?.address && (
                    <span className="block whitespace-pre-line text-ink-muted">
                      {event.location.address}
                    </span>
                  )}
                  {directions && (
                    <a
                      href={directions}
                      rel="noopener noreferrer"
                      className={`mt-1 inline-block ${linkClass}`}
                    >
                      Get directions
                    </a>
                  )}
                </>
              )}
            </dd>
          </div>
        )}

        {event.capacityNote && (
          <div>
            <dt className="text-small font-semibold text-ink-muted">Places</dt>
            <dd className="mt-1">{event.capacityNote}</dd>
          </div>
        )}
      </dl>

      {status === 'soldOut' && (
        <p className="mt-6 rounded-control bg-highlight p-3 font-medium text-highlight-ink">
          This event is sold out.
        </p>
      )}
      {registration && (
        <div className="mt-6">
          <CtaLink cta={registration} surface="light" className="w-full" />
        </div>
      )}

      {status !== 'cancelled' && !finished && (
        <section
          aria-labelledby="add-to-calendar-heading"
          className="mt-8 border-t border-line pt-6"
        >
          <h3 id="add-to-calendar-heading" className="text-small font-semibold text-ink-muted">
            Add to calendar
          </h3>
          <ul className="mt-3 space-y-2">
            <li>
              <a
                href={googleCalendarUrl(calendar)}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Add to Google Calendar
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href={outlookCalendarUrl(calendar)}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Add to Outlook
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              {/* A plain link to the file, which Apple Calendar and most others open. */}
              <a href={eventIcsPath(event.slug)} download className={linkClass}>
                Download for Apple Calendar and others (.ics)
              </a>
              {isSeries && (
                <span className="block text-small text-ink-muted">
                  The file has every date; Google and Outlook add the next one.
                </span>
              )}
            </li>
          </ul>
        </section>
      )}
    </>
  )
}

function untilText(timing: EventTiming) {
  // `until` is a local date: format it as the zone's own day, at noon so no offset can move it.
  const noon = Date.parse(`${timing.until}T12:00:00Z`)
  return formatDayOf(noon, 'UTC', true)
}

/** Reads draft-mode cookies, so it must render inside <Suspense>. */
export async function DraftEventView({ slug }: { slug: string }) {
  return <EventView slug={slug} {...await getDraftFetchMode()} />
}
