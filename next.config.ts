import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'
import { sanity } from 'next-sanity/live/cache-life'

/**
 * Security headers for every response. No full Content-Security-Policy: the embedded Studio
 * needs inline styles and scripts that a strict CSP would block, and a loose one adds little.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
  },
]

/**
 * Clickjacking protection for the public site. Same-origin framing stays allowed so Studio's
 * Presentation tool can preview pages. `/studio` is left out: it requires a login, and Sanity
 * tooling may embed it.
 */
const siteFrameHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // One SENTRY_DSN configures the server and the browser (see src/lib/sentry/config.ts).
  env: {
    NEXT_PUBLIC_SENTRY_DSN: process.env.SENTRY_DSN ?? '',
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE ?? '',
    // Inlined into server code at build; /api/site-info reports it. Not a NEXT_PUBLIC_ name: browsers don't need it.
    BUILT_AT: new Date().toISOString(),
  },
  headers: () =>
    Promise.resolve([
      { source: '/:path*', headers: securityHeaders },
      // Everything except /studio and /studio/*; a page like /studios still gets the headers.
      { source: '/((?!studio(?:/|$)).*)', headers: siteFrameHeaders },
    ]),

  /**
   * Cache Components: pages prerender as static shells and `sanityFetch` results
   * are cached with `cacheTag`s derived from Content Lake sync tags. <SanityLive /> (or the
   * webhook in webhook mode) expires them when content changes; no time-based ISR.
   */
  cacheComponents: true,
  cacheLife: {
    // Cache "forever"; content changes are the invalidation mechanism.
    default: sanity,
  },

  images: {
    /**
     * Sanity images render through `next-sanity/image`, whose loader builds Sanity CDN
     * transform URLs (w, q, auto=format) directly, so the Next.js optimizer (and its
     * per-image billing) is bypassed. This pattern is the fallback for any plain
     * `next/image` usage pointing at the Sanity CDN.
     */
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io', pathname: '/images/**' }],
  },

  rewrites: () =>
    Promise.resolve([
      // generateSitemaps serves files at /sitemap/<id>.xml; keep the conventional /sitemap.xml for the first.
      { source: '/sitemap.xml', destination: '/sitemap/0.xml' },
      // Calendar files live under /api/events; the feed first, so `feed` is not read as an event's slug.
      { source: '/events/feed.ics', destination: '/api/events/feed' },
      { source: '/events/:slug.ics', destination: '/api/events/:slug/ics' },
      // IndexNow key file at /<key>.txt (8-128 letters, digits, dashes); the route 404s unless it's INDEXNOW_KEY.
      { source: '/:key([A-Za-z0-9-]{8,128}).txt', destination: '/api/indexnow/:key' },
    ]),

  // Full URLs for Content Lake requests in dev logs — invaluable when debugging cache hits.
  logging: { fetches: { fullUrl: true } },
}

/**
 * Source maps go to Sentry only when SENTRY_AUTH_TOKEN is set (a CI secret), so local builds and
 * the end-to-end suite build exactly what they did before Sentry. The maps are deleted from the
 * build output after upload so they aren't served.
 */
export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      telemetry: false,
      widenClientFileUpload: true,
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : nextConfig
