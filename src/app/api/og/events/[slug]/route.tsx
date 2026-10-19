import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'
import { stegaClean } from 'next-sanity'

import { getEvent, getEventStaticParams } from '@/features/events/api/event'
import { OG_TITLE_MAX_LINES, ogTitleFontSize } from '@/features/pages/utils/og-title'
import { getSettings } from '@/features/site/api/get-settings'
import { resolveDesignTokens } from '@/lib/color/resolve-design-tokens'
import { formatTimeRange, formatWhen } from '@/lib/events/format'
import { expandOccurrences, repeatLabel, resolveTiming } from '@/lib/events/recurrence'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * Branded share image (1200x630 PNG) for an event, at /api/og/events/<slug>: the site name, the
 * title and when. A series shows its repeat ("Every week, 10:00 am – 12:00 pm") instead of a date,
 * since which date is next depends on today. Reads the same cached event and settings entries as
 * the page: no extra requests.
 */
const size = { width: 1200, height: 630 }

export const generateStaticParams = getEventStaticParams

// Satori (next/og) can't use next/font, so the brand font is a file read once at startup.
const font = await readFile(join(process.cwd(), 'src/assets/fonts/inter-latin-700-normal.woff'))

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [event, settings] = await Promise.all([
    getEvent({ slug, ...PUBLISHED }),
    getSettings(PUBLISHED),
  ])
  if (!event) return new Response('Not found', { status: 404 })

  const { accent } = resolveDesignTokens(settings?.design)
  const siteName = settings?.title || 'Site'
  const title = event.title

  const timing = resolveTiming(event, event.businessTimeZone)
  const first = timing && expandOccurrences(timing, { from: -Infinity, limit: 1 })[0]
  const series = timing && repeatLabel(timing.repeat)
  const when =
    timing && first
      ? series
        ? `${series}, ${formatTimeRange({ ...first, ...timing })}`
        : formatWhen({ ...first, ...timing }, true)
      : null
  const where = stegaClean(event.location?.kind) === 'online' ? 'Online' : event.location?.name

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: accent.background,
        color: accent.foreground,
        fontFamily: 'Inter',
      }}
    >
      <div style={{ display: 'flex', fontSize: 36, opacity: 0.9 }}>{siteName}</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {when && (
          <div style={{ display: 'flex', fontSize: 40, opacity: 0.9, marginBottom: 24 }}>
            {when}
          </div>
        )}
        <div
          style={{
            display: 'block',
            fontSize: ogTitleFontSize(title),
            lineHeight: 1.15,
            lineClamp: OG_TITLE_MAX_LINES,
          }}
        >
          {title}
        </div>
        {where && (
          <div style={{ display: 'flex', fontSize: 36, opacity: 0.85, marginTop: 24 }}>{where}</div>
        )}
      </div>
    </div>,
    { ...size, fonts: [{ name: 'Inter', data: font, style: 'normal', weight: 700 }] },
  )
}
