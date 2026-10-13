import { HOME_SLUG } from '@/config/paths'

export interface PageRef {
  _id: string
  slug?: string | null
}

export interface PageTree {
  /** Published ids of pages listed directly under "Pages": single-segment slugs, home, no slug. */
  topLevelIds: string[]
  /** First slug segments that have at least one child ("services" for "services/web-design"). */
  folders: string[]
}

/**
 * Groups pages for the desk tree. A draft and its published version count once, pages without a
 * slug stay top level so editors can still find them, and folders are sorted alphabetically.
 */
export function groupPagePaths(pages: readonly PageRef[]): PageTree {
  const topLevel = new Set<string>()
  const folders = new Set<string>()
  for (const { _id, slug } of pages) {
    const id = _id.replace(/^drafts\./, '')
    const [segment, ...rest] = slug && slug !== HOME_SLUG ? slug.split('/') : []
    if (segment && rest.length > 0) folders.add(segment)
    else topLevel.add(id)
  }
  return { topLevelIds: [...topLevel], folders: [...folders].sort((a, b) => a.localeCompare(b)) }
}
