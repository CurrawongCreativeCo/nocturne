import { siteUrl } from '@/config/site-url'
import { getEvent, getEventStaticParams } from '@/features/events/api/event'
import { toIcsEvent } from '@/features/events/utils/to-ics'
import { getSettings } from '@/features/site/api/get-settings'
import { buildCalendar } from '@/lib/events/ics'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * The add-to-calendar file of one event, served at /events/<slug>.ics (next.config.ts rewrites to
 * here). A repeating event is one entry with a repeat rule, so a calendar keeps the whole series.
 * Prerendered at build and refreshed with the cached event, like its page: it reads no clock.
 */
export const generateStaticParams = getEventStaticParams

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [event, settings] = await Promise.all([
    getEvent({ slug, ...PUBLISHED }),
    getSettings(PUBLISHED),
  ])
  const entry = event && toIcsEvent(event, siteUrl, event.businessTimeZone)
  if (!event || !entry) return new Response('Not found', { status: 404 })

  const ics = buildCalendar({ name: `${settings?.title || 'Site'} events`, events: [entry] })
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
    },
  })
}
