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

  // generateSitemaps serves files at /sitemap/<id>.xml; keep the conventional /sitemap.xml for the first.
  rewrites: () => Promise.resolve([{ source: '/sitemap.xml', destination: '/sitemap/0.xml' }]),

  // Full URLs for Content Lake requests in dev logs — invaluable when debugging cache hits.
  logging: { fetches: { fullUrl: true } },
}

export default nextConfig
