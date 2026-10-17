import { siteUrl } from '@/config/site-url'
import { getEventsFeed } from '@/features/events/api/event'
import { toIcsEvent } from '@/features/events/utils/to-ics'
import { getSettings } from '@/features/site/api/get-settings'
import { buildCalendar } from '@/lib/events/ics'
import { hasUpcoming, resolveTiming } from '@/lib/events/recurrence'
import { requestTime } from '@/lib/request-time'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * The subscribable calendar of every upcoming event, served at /events/feed.ics (next.config.ts
 * rewrites to here). It renders per request, because which events are upcoming depends on the
 * date; the events themselves come from the same cached, tagged query as everything else, so it
 * costs no extra request. Events that have finished are left out.
 */
export async function GET() {
  const now = await requestTime()
  const [feed, settings] = await Promise.all([getEventsFeed(), getSettings(PUBLISHED)])
  if (!feed) return new Response('Not found', { status: 404 })

  const events = feed.events.flatMap((event) => {
    const timing = resolveTiming(event, feed.businessTimeZone)
    if (!timing || !hasUpcoming(timing, now)) return []
    return toIcsEvent(event, siteUrl, feed.businessTimeZone) ?? []
  })

  const ics = buildCalendar({ name: `${settings?.title || 'Site'} events`, events })
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="events.ics"',
      // Calendars poll on their own schedule; a shared cache can answer many of them at once.
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
    },
  })
}
