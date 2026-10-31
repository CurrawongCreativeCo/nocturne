import { clean, trace } from '../graph'
import { breadcrumbId, organizationId, webPageId, websiteId } from '../ids'
import type { Built, Source } from '../types'

export interface WebPageInput {
  origin: string
  /** The page's absolute URL. */
  url: string
  /** The page's title, as its <title> and heading show it. */
  name: string
  /** Where `name` came from, e.g. the page document's `title`. */
  nameSource: Source
  language: string
  /** The `@id` of the page's main entity (a service, a person, an article...), when it has one. */
  about?: string
  /** True when the page also carries a `BreadcrumbList` node (`breadcrumbId(url)`). */
  breadcrumb?: boolean
}

/** The `WebPage` node every page carries: part of the website, about its main entity. */
export function buildWebPage(input: WebPageInput): Built {
  const node = clean({
    '@type': 'WebPage',
    '@id': webPageId(input.url),
    url: input.url,
    name: input.name,
    isPartOf: { '@id': websiteId(input.origin) },
    ...(input.about && { about: { '@id': input.about } }),
    ...(input.breadcrumb && { breadcrumb: { '@id': breadcrumbId(input.url) } }),
    inLanguage: input.language,
    publisher: { '@id': organizationId(input.origin) },
  })
  return { node, provenance: trace(node, input.nameSource.doc, { name: input.nameSource.field }) }
}
