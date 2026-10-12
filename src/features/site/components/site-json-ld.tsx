import { siteUrl } from '@/config/env'
import { urlFor } from '@/lib/sanity/image'
import { PUBLISHED } from '@/lib/sanity/live'

import { getSettings } from '../api/get-settings'

/**
 * schema.org Organization + WebSite, built from Site settings, so search engines show the
 * right name and logo. Reuses the cached published settings entry: no extra request.
 */
export async function SiteJsonLd() {
  const settings = await getSettings(PUBLISHED)
  if (!settings) return null

  const url = new URL('/', siteUrl).toString()
  const logo = settings.logo?.asset
    ? urlFor({ asset: { _ref: settings.logo.asset._id } })
        .width(512)
        .url()
    : undefined
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${url}#organization`,
        name: settings.title,
        url,
        ...(logo && { logo }),
      },
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        name: settings.title,
        url,
        ...(settings.description && { description: settings.description }),
        publisher: { '@id': `${url}#organization` },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      // Escaping "<" keeps editor content from closing the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
