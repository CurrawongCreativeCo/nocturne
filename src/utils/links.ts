import { stegaClean } from 'next-sanity'

import { slugToPath } from '@/config/paths'

/** Structural shape of `linkFields`; CTAs, nav items and rich-text links all satisfy it. */
export interface LinkLike {
  linkType?: string | null
  slug?: string | null
  url?: string | null
  openInNewTab?: boolean | null
}

/** Resolves a `link` object to an href; null when incomplete (e.g. unfinished draft). */
export function resolveHref(link: LinkLike | null | undefined): string | null {
  if (!link) return null
  if (stegaClean(link.linkType) === 'internal') return link.slug ? slugToPath(stegaClean(link.slug)) : null
  return link.url ? stegaClean(link.url) : null
}

export function isExternal(link: LinkLike | null | undefined): boolean {
  return stegaClean(link?.linkType) === 'external'
}
