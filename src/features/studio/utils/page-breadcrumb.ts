import { HOME_SLUG } from '@/config/paths'

export interface BreadcrumbPage {
  _id: string
  slug?: string | null
}

export interface BreadcrumbSegment {
  /** What is shown: the slug segment, "Home" for the home page. */
  label: string
  /** Published id of the page this ancestor is, when it exists; plain text otherwise. */
  id?: string
  current?: boolean
}

/**
 * The segments of a page's place in the site, below the "Pages" root: one per slug segment, each
 * ancestor linked when a page owns that path ("services" for "services/web-design"). A draft and its
 * published version count once. Null when the page has no slug yet, so nothing is shown.
 */
export function buildBreadcrumb(
  slug: string | null | undefined,
  pages: readonly BreadcrumbPage[],
): BreadcrumbSegment[] | null {
  if (!slug) return null
  if (slug === HOME_SLUG) return [{ label: 'Home', current: true }]
  const idsByPath = new Map<string, string>()
  for (const page of pages) {
    if (!page.slug) continue
    const id = page._id.replace(/^drafts\./, '')
    if (!idsByPath.has(page.slug)) idsByPath.set(page.slug, id)
  }
  const parts = slug.split('/').filter(Boolean)
  return parts.map((label, index) => {
    if (index === parts.length - 1) return { label, current: true }
    const id = idsByPath.get(parts.slice(0, index + 1).join('/'))
    return id ? { label, id } : { label }
  })
}
