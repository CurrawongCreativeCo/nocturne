import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

import { segmentsToSlug } from '@/config/paths'
import { getPage, getPageStaticParams } from '@/features/pages/api/get-page'
import { OG_TITLE_MAX_LINES, ogTitleFontSize } from '@/features/pages/utils/og-title'
import { getSettings } from '@/features/site/api/get-settings'
import { resolveDesignTokens } from '@/lib/color/resolve-design-tokens'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * Generated share image (1200x630 PNG) at /api/og/<page slug>, for pages that have neither their
 * own image nor a site default. getPageMetadata points `og:image` here in that case. Next.js can't
 * host an `opengraph-image` file under an optional catch-all, hence a plain route handler.
 * It reads the same cached page and settings entries as the page itself: no extra requests.
 */
const size = { width: 1200, height: 630 }

export const generateStaticParams = getPageStaticParams

// Satori (next/og) can't use next/font, so the brand font is a file read once at startup.
// Replace it together with the font in src/app/layout.tsx.
const font = await readFile(join(process.cwd(), 'src/assets/fonts/inter-latin-700-normal.woff'))

export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const [page, settings] = await Promise.all([
    getPage({ slug: segmentsToSlug((await params).slug), members: false, ...PUBLISHED }),
    getSettings(PUBLISHED),
  ])
  if (!page) return new Response('Not found', { status: 404 })

  // The accent pair: tokens.json's, or the Studio's Primary colour with its derived text colour.
  const { accent } = resolveDesignTokens(settings?.design)
  const siteName = settings?.title || 'Site'
  const title = page.seo?.metaTitle || page.title

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
    </div>,
    { ...size, fonts: [{ name: 'Inter', data: font, style: 'normal', weight: 700 }] },
  )
}
