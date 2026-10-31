import { stegaClean } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { servicePath } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { urlFor } from '@/lib/sanity/image'

import type { ServiceData } from '../types'
import { buildServiceFaqJsonLd, buildServiceJsonLd } from '../utils/json-ld'

/**
 * The Service node, and the FAQPage node when the page shows questions. Both are built from the
 * fields the page renders (`../utils/json-ld.ts` has the rules); this only cleans them of stega
 * and resolves the picture.
 */
export function ServiceJsonLd({ service }: { service: ServiceData }) {
  const { image } = service
  const origin = new URL('/', siteUrl).toString().replace(/\/$/, '')
  const url = new URL(servicePath(stegaClean(service.slug)), siteUrl).toString()
  const faqs = (service.faqs ?? []).map(({ question, answer }) => ({
    question: stegaClean(question),
    answer: stegaClean(answer),
  }))
  const shareImage = image.asset
    ? urlFor({
        asset: { _ref: image.asset._id },
        crop: image.crop ?? undefined,
        hotspot: image.hotspot ?? undefined,
      })
        .width(1200)
        .url()
    : undefined
  const priceFrom = service.priceFrom
  const priceUnit = stegaClean(service.priceUnit)

  const faqNode = buildServiceFaqJsonLd({ url, faqs })
  return (
    <>
      <JsonLd
        data={buildServiceJsonLd({
          documentId: stegaClean(service._id),
          origin,
          url,
          name: stegaClean(service.name),
          summary: stegaClean(service.summary),
          image: shareImage,
          price:
            typeof priceFrom === 'number' && priceUnit
              ? { amount: priceFrom, unit: priceUnit }
              : null,
          faqs,
        })}
      />
      {faqNode && <JsonLd data={faqNode} />}
    </>
  )
}
