import { clean, trace } from '../graph'
import { organizationId, websiteId } from '../ids'
import type { Built } from '../types'

export interface WebSiteInput {
  origin: string
  /** The site title (`siteIdentity.title`). */
  name?: string | null
  /** The site description (`siteIdentity.description`), also the default meta description. */
  description?: string | null
  language: string
}

/** The `#website` node: the site, published by the `#organization`. */
export function buildWebSite(input: WebSiteInput): Built {
  const node = clean({
    '@type': 'WebSite',
    '@id': websiteId(input.origin),
    name: input.name,
    url: `${input.origin.replace(/\/+$/, '')}/`,
    description: input.description,
    inLanguage: input.language,
    publisher: { '@id': organizationId(input.origin) },
  })
  return {
    node,
    provenance: trace(node, 'siteIdentity', { name: 'title', description: 'description' }),
  }
}
