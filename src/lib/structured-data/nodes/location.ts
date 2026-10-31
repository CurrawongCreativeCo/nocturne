import { parseAuPhone } from '@/lib/au-phone'

import { clean, trace } from '../graph'
import { documentKey, locationId, organizationId } from '../ids'
import type { Built } from '../types'
import { openingHoursSpecification, type BusinessInfoData } from './organization'

/** The fields of a `location` document that structured data reads (a query result, nulls included). */
export interface LocationInput {
  /** The production origin (`siteUrl`). */
  origin: string
  /** The location's document `_id`: the `@id` keeps it when the slug changes. */
  id: string
  /** The location's page, absolute. */
  url: string
  name: string
  kind: 'branch' | 'serviceArea'
  /** The schema.org type for a branch (`businessSchemaType` of the site's Business info). */
  businessType: string
  /** The area description the page shows. */
  summary?: string | null
  /** An absolute URL to a picture. */
  image?: string | null
  phone?: string | null
  publicEmail?: string | null
  address?: BusinessInfoData['address']
  geo?: BusinessInfoData['geo']
  openingHours?: BusinessInfoData['openingHours']
  specialHours?: BusinessInfoData['specialHours']
  /** Today in the location's time zone ("YYYY-MM-DD"): special days before it are left out. */
  today: string
}

/**
 * The node for a location's own page, from values the page shows and nothing else.
 *
 * - A **branch** is the site's business type with `parentOrganization` pointing at `#organization`,
 *   and its own address, phone, hours and coordinates. Business info stays the primary place: the
 *   branch never copies a fact from it.
 * - A **service area** is a bare `Place` (name, page, description): an area has no address, phone or
 *   hours, so none is emitted even if the document still holds some.
 *
 * Fields left empty are omitted, as in `buildLocalBusinessJsonLd`.
 */
export function buildLocation(input: LocationInput): Built {
  const { address, geo } = input
  const id = locationId(input.origin, input.id)

  if (input.kind === 'serviceArea') {
    const node = clean({
      '@type': 'Place',
      '@id': id,
      name: input.name,
      url: input.url,
      description: input.summary,
      image: input.image,
    })
    return {
      node,
      provenance: trace(node, documentKey(input.id), {
        name: 'name',
        description: 'summary',
        image: 'image',
      }),
    }
  }

  const phone = input.phone ? parseAuPhone(input.phone) : null
  const hasAddress = Boolean(address?.suburb || address?.street)
  const specification = openingHoursSpecification(input, input.today)
  const node = clean({
    '@type': input.businessType,
    '@id': id,
    name: input.name,
    url: input.url,
    description: input.summary,
    image: input.image,
    parentOrganization: { '@id': organizationId(input.origin) },
    telephone: phone?.telephone,
    email: input.publicEmail,
    address: hasAddress
      ? clean({
          '@type': 'PostalAddress',
          streetAddress: address?.street,
          addressLocality: address?.suburb,
          addressRegion: address?.state,
          postalCode: address?.postcode,
          addressCountry: 'AU',
        })
      : undefined,
    geo:
      typeof geo?.lat === 'number' && typeof geo.lng === 'number'
        ? { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng }
        : undefined,
    openingHoursSpecification: specification.length > 0 ? specification : undefined,
  })
  return {
    node,
    provenance: trace(node, documentKey(input.id), {
      name: 'name',
      description: 'summary',
      image: 'image',
      telephone: 'phone',
      email: 'publicEmail',
      'address.streetAddress': 'address.street',
      'address.addressLocality': 'address.suburb',
      'address.addressRegion': 'address.state',
      'address.postalCode': 'address.postcode',
      geo: 'geo',
      openingHoursSpecification: 'openingHours',
    }),
  }
}

/**
 * A short node for a location another page refers to (a service's `areaServed`): name and page, with
 * the type and `@id` of the full node, which the location's own page describes. Like a byline's
 * `Person`, it keeps every `@id` a page refers to defined on that page.
 */
export function buildLocationReference(
  input: Pick<LocationInput, 'origin' | 'id' | 'url' | 'name' | 'kind' | 'businessType'>,
): Built {
  const node = clean({
    '@type': input.kind === 'serviceArea' ? 'Place' : input.businessType,
    '@id': locationId(input.origin, input.id),
    name: input.name,
    url: input.url,
  })
  return { node, provenance: trace(node, documentKey(input.id), { name: 'name' }) }
}
