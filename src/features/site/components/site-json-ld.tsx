import { JsonLd } from '@/components/ui/json-ld'
import { siteLanguage } from '@/config/env'
import { siteUrl } from '@/config/site-url'
import { DEFAULT_TIME_ZONE } from '@/lib/opening-hours'
import { urlFor } from '@/lib/sanity/image'
import { PUBLISHED } from '@/lib/sanity/live'

import { getSettings } from '../api/get-settings'
import { getToday } from '../api/get-today'
import { buildLocalBusinessJsonLd } from '../utils/business-json-ld'

/**
 * schema.org Organization + WebSite, built from Site settings, so search engines show the
 * right name and logo. With Business info filled in, the Organization becomes the chosen
 * LocalBusiness subtype (address, phone, hours...). Reuses the cached published settings entry: no extra request.
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
  const organizationId = `${url}#organization`
  const { business } = settings
  const organization = business
    ? buildLocalBusinessJsonLd(business, {
        url,
        id: organizationId,
        name: settings.title ?? '',
        logo,
        today: await getToday(business.timeZone ?? DEFAULT_TIME_ZONE),
      })
    : {
        '@type': 'Organization',
        '@id': organizationId,
        name: settings.title,
        url,
        ...(logo && { logo }),
      }
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        name: settings.title,
        url,
        ...(settings.description && { description: settings.description }),
        inLanguage: siteLanguage,
        publisher: { '@id': organizationId },
      },
    ],
  }

  return <JsonLd data={data} />
}
