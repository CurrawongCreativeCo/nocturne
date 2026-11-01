import { stegaClean } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { WebPageJsonLd } from '@/components/ui/web-page-json-ld'
import { locationPath } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { urlFor } from '@/lib/sanity/image'
import { graph } from '@/lib/structured-data/graph'
import { locationId } from '@/lib/structured-data/ids'
import { buildLocation } from '@/lib/structured-data/nodes/location'

import type { LocationData } from '../types'

/**
 * The page's WebPage (about the location) and the location's own node: a branch (the site's
 * business type, with the organisation as its parent) or a service area (a Place). The node comes
 * from `src/lib/structured-data/`; this cleans the page's values of stega, resolves the picture and
 * passes only what `LocationView` renders.
 */
export function LocationJsonLd({
  location,
  businessType,
  today,
}: {
  location: LocationData
  /** The schema.org type of the site's business (`businessSchemaType` of Business info). */
  businessType: string
  /** Today in the location's time zone, for dropping special days that have passed. */
  today: string
}) {
  const { image } = location
  const path = locationPath(stegaClean(location.slug))
  const shareImage = image?.asset
    ? urlFor({
        asset: { _ref: image.asset._id },
        crop: image.crop ?? undefined,
        hotspot: image.hotspot ?? undefined,
      })
        .width(1200)
        .url()
    : undefined
  // Hours, phone and coordinates are data, so draft mode's click-to-edit characters must not reach them.
  const place = stegaClean(location)

  return (
    <>
      <WebPageJsonLd
        path={path}
        name={location.name}
        nameSource={{ doc: location._id, field: 'name' }}
        about={locationId(siteUrl, location._id)}
      />
      <JsonLd
        data={graph(
          buildLocation({
            origin: siteUrl,
            id: location._id,
            url: new URL(path, siteUrl).toString(),
            name: place.name,
            kind: place.kind,
            businessType,
            summary: place.summary,
            image: shareImage,
            phone: place.phone,
            publicEmail: place.publicEmail,
            address: place.address,
            geo: place.geo,
            openingHours: place.openingHours,
            specialHours: place.specialHours,
            today,
          }),
        )}
      />
    </>
  )
}
