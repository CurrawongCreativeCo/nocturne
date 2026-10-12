import 'server-only'

/**
 * Public origin of the site, for canonical URLs, the sitemap, robots.txt and structured data.
 *
 * 1. `NEXT_PUBLIC_SITE_URL` when set.
 * 2. On Vercel, the project's production domain (a system variable Vercel sets on every
 *    deployment), so previews also point search engines at production.
 * 3. Locally in development, http://localhost:3000.
 *
 * A production server with none of these throws instead of quietly telling search engines the
 * site lives at localhost.
 */
export const siteUrl = resolveSiteUrl()

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercelProduction) return `https://${vercelProduction}`

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Missing environment variable: NEXT_PUBLIC_SITE_URL (e.g. https://example.com). ' +
        'Without it, canonical URLs and the sitemap would point at localhost.',
    )
  }
  return 'http://localhost:3000'
}
