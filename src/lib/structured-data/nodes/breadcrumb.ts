import { breadcrumbId } from '../ids'
import type { Built } from '../types'

export interface BreadcrumbInput {
  /** The page the trail is for: the last item's absolute URL. */
  url: string
  items: readonly { name: string; url: string }[]
}

/** The `BreadcrumbList` node, keyed by the page it belongs to. */
export function buildBreadcrumb({ url, items }: BreadcrumbInput): Built {
  return {
    node: {
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId(url),
      itemListElement: items.map(({ name, url: item }, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
        item,
      })),
    },
    // Trail names come from the page index (each page's title), shown in the visible trail.
    provenance: {},
  }
}
