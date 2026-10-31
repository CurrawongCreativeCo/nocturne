import { stegaClean } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { WebPageJsonLd } from '@/components/ui/web-page-json-ld'
import { servicePath } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { urlFor } from '@/lib/sanity/image'
import { graph } from '@/lib/structured-data/graph'
import { serviceId } from '@/lib/structured-data/ids'
import { buildFaqPage } from '@/lib/structured-data/nodes/faq-page'
import { buildService } from '@/lib/structured-data/nodes/service'

import type { ServiceData } from '../types'
import { serviceQuestions } from '../utils/questions'

/**
 * The page's WebPage (about the Service), the Service node, and the FAQPage node when the page
 * shows questions. The nodes come from `src/lib/structured-data/`; this cleans the page's values of
 * stega, resolves the picture and passes only what `ServiceView` renders.
 */
export function ServiceJsonLd({ service }: { service: ServiceData }) {
  const { image } = service
  const path = servicePath(stegaClean(service.slug))
  const url = new URL(path, siteUrl).toString()
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
  const questions = serviceQuestions(service.faqs)

  return (
    <>
      <WebPageJsonLd
        path={path}
        name={service.name}
        nameSource={{ doc: service._id, field: 'name' }}
        about={serviceId(siteUrl, service._id)}
      />
      <JsonLd
        data={graph(
          buildService({
            origin: siteUrl,
            id: service._id,
            url,
            name: stegaClean(service.name),
            summary: stegaClean(service.summary),
            image: shareImage,
            audience: stegaClean(service.audience),
            price:
              typeof priceFrom === 'number' && priceUnit
                ? { amount: priceFrom, unit: priceUnit }
                : null,
          }),
          // When a FAQ section below carries questions, the first one adds them to this same node
          // (one FAQPage per page, one id): see `PageContext.leadingQuestions`.
          questions.length > 0 &&
            !service.hasFaqSections &&
            buildFaqPage({ url, doc: service._id, questions }),
        )}
      />
    </>
  )
}
