import { stegaClean } from 'next-sanity'

import { JsonLd } from '@/components/ui/json-ld'
import { siteLanguage } from '@/config/env'
import { siteUrl } from '@/config/site-url'
import { graph } from '@/lib/structured-data/graph'
import { buildWebPage } from '@/lib/structured-data/nodes/web-page'
import type { Source } from '@/lib/structured-data/types'

/**
 * The `WebPage` node every page carries (E2 §3.3): part of the website, about the page's main
 * entity, with its breadcrumb and language. `path` is the page's own path, with its query when the
 * query is part of the page (`/blog?page=2`), never a draft, preview or user-specific address. A
 * `noIndex` page (hidden from search engines, members-only) gets none: it makes no claim to be a
 * public page. Server only, no client JavaScript.
 */
export function WebPageJsonLd({
  path,
  name,
  nameSource,
  about,
  breadcrumb,
  noIndex,
}: {
  path: string
  name: string
  /** The field the name is entered in, e.g. `{ doc: page._id, field: 'title' }`. Omit for a name the template owns. */
  nameSource?: Source
  /** The `@id` of the page's main entity, when it has one. */
  about?: string
  /** True when the page also renders a breadcrumb trail. */
  breadcrumb?: boolean
  noIndex?: boolean
}) {
  if (noIndex) return null
  return (
    <JsonLd
      data={graph(
        buildWebPage({
          origin: siteUrl,
          url: new URL(path, siteUrl).toString(),
          name: stegaClean(name),
          nameSource: nameSource ?? { doc: 'template', field: path },
          language: siteLanguage,
          about,
          breadcrumb,
        }),
      )}
    />
  )
}
