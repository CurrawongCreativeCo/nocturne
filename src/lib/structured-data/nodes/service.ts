import { clean, trace } from '../graph'
import { documentKey, organizationId, serviceId, webPageId } from '../ids'
import type { Built } from '../types'

export interface ServiceInput {
  origin: string
  /** The service's document `_id`: the `@id` keeps it when the slug changes. */
  id: string
  /** The service's page, absolute. */
  url: string
  name: string
  summary?: string | null
  /** An absolute URL to a picture. */
  image?: string | null
  /** The audience, as the page's "Who it's for" shows it. */
  audience?: string | null
  /** The "From" price the page shows, in dollars, with its unit. Both must be shown. */
  price?: { amount: number; unit: string } | null
}

/** Every price on the site is AUD. */
export const SERVICE_CURRENCY = 'AUD'

/**
 * The `Service` node for a service's own page, from values the page shows and nothing else: no
 * `areaServed`, rating or review, and an `Offer` only when the page shows a price with its unit.
 * The provider is the site's Organization and `mainEntityOfPage` is the page's WebPage, both by
 * `@id`; the page's `WebPageJsonLd` defines the WebPage.
 */
export function buildService(input: ServiceInput): Built {
  const { price } = input
  const node = clean({
    '@type': 'Service',
    '@id': serviceId(input.origin, input.id),
    url: input.url,
    name: input.name,
    description: input.summary,
    image: input.image,
    audience: input.audience ? { '@type': 'Audience', audienceType: input.audience } : undefined,
    provider: { '@id': organizationId(input.origin) },
    offers: price
      ? {
          '@type': 'Offer',
          price: price.amount,
          priceCurrency: SERVICE_CURRENCY,
          priceSpecification: {
            '@type': 'PriceSpecification',
            minPrice: price.amount,
            priceCurrency: SERVICE_CURRENCY,
            unitText: price.unit,
          },
        }
      : undefined,
    mainEntityOfPage: { '@id': webPageId(input.url) },
  })
  return {
    node,
    provenance: trace(node, documentKey(input.id), {
      name: 'name',
      description: 'summary',
      image: 'image',
      'audience.audienceType': 'audience',
      'offers.price': 'priceFrom',
      'offers.priceSpecification.unitText': 'priceUnit',
    }),
  }
}
