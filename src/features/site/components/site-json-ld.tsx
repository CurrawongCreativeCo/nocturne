import { JsonLd } from '@/components/ui/json-ld'
import { siteLanguage } from '@/config/env'
import { siteUrl } from '@/config/site-url'
import { DEFAULT_TIME_ZONE } from '@/lib/opening-hours'
import { urlFor } from '@/lib/sanity/image'
import { PUBLISHED } from '@/lib/sanity/live'
import { graph } from '@/lib/structured-data/graph'
import { buildOrganization } from '@/lib/structured-data/nodes/organization'
import { buildWebSite } from '@/lib/structured-data/nodes/website'

import { getSettings } from '../api/get-settings'
import { getToday } from '../api/get-today'

/**
 * schema.org Organization + WebSite, built from Site settings, so search engines show the
 * right name and logo. With Business info filled in, the Organization becomes the chosen
 * LocalBusiness subtype (address, phone, hours...). Reuses the cached published settings entry: no extra request.
 */
export async function SiteJsonLd() {
  const settings = await getSettings(PUBLISHED)
  if (!settings) return null

  const logo = settings.logo?.asset
    ? urlFor({ asset: { _ref: settings.logo.asset._id } })
        .width(512)
        .url()
    : undefined
  const { business } = settings

  return (
    <JsonLd
      data={graph(
        buildOrganization({
          origin: siteUrl,
          identity: settings,
          business,
          logo,
          today: business ? await getToday(business.timeZone ?? DEFAULT_TIME_ZONE) : '',
        }),
        buildWebSite({
          origin: siteUrl,
          name: settings.title,
          description: settings.description,
          language: siteLanguage,
        }),
      )}
    />
  )
}
