import type { NextConfig } from 'next'
import { sanity } from 'next-sanity/live/cache-life'

const nextConfig: NextConfig = {
  /**
   * Cache Components: pages prerender as static shells and `sanityFetch` results
   * are cached with `cacheTag`s derived from Content Lake sync tags. <SanityLive />
   * expires exactly those tags when content changes — no webhooks, no time-based ISR.
   */
  cacheComponents: true,
  cacheLife: {
    // Cache "forever"; Sanity Live is the invalidation mechanism.
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
    formats: ['image/avif', 'image/webp'],
  },

  // Full URLs for Content Lake requests in dev logs — invaluable when debugging cache hits.
  logging: { fetches: { fullUrl: true } },
}

export default nextConfig
