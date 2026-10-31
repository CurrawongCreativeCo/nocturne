import { SERVICE_CURRENCY } from './price'

/** What the Service structured data is built from; the page passes cleaned (stega-free) values. */
export interface ServiceJsonLdInput {
  /** The document `_id`: it keys the `@id`, so the id survives a change of slug. */
  documentId: string
  /** The site's origin, no trailing slash: `https://example.com.au`. */
  origin: string
  /** The service's page, absolute. */
  url: string
  name: string
  summary?: string | null
  /** An absolute URL to a picture. */
  image?: string | null
  price?: { amount: number; unit: string } | null
  faqs?: readonly { question: string; answer: string }[]
}

/**
 * The published `_id` with the `drafts.` and `versions.<release>.` prefixes removed, so a draft or
 * release preview never puts its own id into markup. The key of a persistent entity's `@id`
 * (docs/nocturne/NOCTURNE_CONTENT_CONTRACT_V2_NOTE.md, section 2).
 */
export function publishedKey(documentId: string): string {
  return documentId.replace(/^drafts\./, '').replace(/^versions\.[^.]+\./, '')
}

/**
 * schema.org `Service` for a service's own page, from fields the page shows and nothing else: no
 * `areaServed`, rating or review, and an `Offer` only when the page shows a price. The provider is
 * the site's Organization, referenced by `@id` (site-json-ld.tsx describes it once). The nested
 * WebPage points at that WebSite and Organization too (tests/e2e/structured-data.spec.ts checks).
 */
export function buildServiceJsonLd(input: ServiceJsonLdInput): Record<string, unknown> {
  const { origin, url, price } = input
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${origin}/#service-${publishedKey(input.documentId)}`,
    name: input.name,
    url,
    ...(input.summary && { description: input.summary }),
    ...(input.image && { image: input.image }),
    provider: { '@id': `${origin}/#organization` },
    ...(price && {
      offers: {
        '@type': 'Offer',
        priceSpecification: {
          '@type': 'PriceSpecification',
          minPrice: price.amount,
          priceCurrency: SERVICE_CURRENCY,
          unitText: price.unit,
        },
      },
    }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      isPartOf: { '@id': `${origin}/#website` },
      publisher: { '@id': `${origin}/#organization` },
    },
  }
}

/**
 * schema.org `FAQPage` for the questions the service page shows: one node per page, keyed by the
 * page's URL. It describes the visible questions and answers so machines read the page accurately;
 * it is not a rich-result tactic. Null when the page shows no questions.
 */
export function buildServiceFaqJsonLd(
  input: Pick<ServiceJsonLdInput, 'url' | 'faqs'>,
): Record<string, unknown> | null {
  const faqs = input.faqs ?? []
  if (faqs.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${input.url}#faq`,
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}
