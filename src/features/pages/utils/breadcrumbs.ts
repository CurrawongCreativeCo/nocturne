import { HOME_SLUG, slugToPath, slugTrail } from '@/config/paths'

export interface Breadcrumb {
  name: string
  path: string
}

interface IndexedPage {
  slug: string
  title: string | null
}

/**
 * Trail for a nested page: Home, each ancestor, then the page itself. Slug segments without a
 * page (or a title) are skipped. Top-level pages and Home have no trail.
 */
export function buildBreadcrumbs(slug: string, pages: IndexedPage[]): Breadcrumb[] {
  const trail = slugTrail(slug)
  if (trail.length < 2) return []

  const titles = new Map(pages.map((page) => [page.slug, page.title]))
  return [HOME_SLUG, ...trail].flatMap((slug) => {
    const name = titles.get(slug)
    return name ? [{ name, path: slugToPath(slug) }] : []
  })
}
