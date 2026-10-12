import type { MetadataRoute } from 'next'

import { studioUrl } from '@/config/env'
import { siteUrl } from '@/config/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: [studioUrl, '/api/'] },
    sitemap: new URL('/sitemap.xml', siteUrl).toString(),
  }
}
