import { stegaClean } from 'next-sanity'

import { slugToPath } from '@/config/paths'

/** Structural shape of `linkFields`; CTAs, menu items and rich-text links all satisfy it. */
export interface LinkData {
  linkType?: string | null
  slug?: string | null
  url?: string | null
  openInNewTab?: boolean | null
  anchor?: string | null
  panel?: { id: string; title?: string | null } | null
  /** Where a panel button goes without JavaScript (Advanced). */
  fallbackUrl?: string | null
  /** Booking link override; empty uses the site's booking settings (task 95). */
  bookingUrl?: string | null
}

/** A link that goes somewhere. Split from the panel and booking cases so client components stay small. */
export type BasicLink =
  | { kind: 'page'; href: string; newTab: boolean }
  | { kind: 'external'; href: string; newTab: boolean }
  | { kind: 'anchor'; href: string }

/** Page, section and website links. A missing or unknown type is a website URL, as it always was. */
export function resolveDestination(link: LinkData): BasicLink | null {
  const newTab = link.openInNewTab ?? false

  switch (stegaClean(link.linkType)) {
    case 'internal':
      return link.slug ? { kind: 'page', href: slugToPath(stegaClean(link.slug)), newTab } : null
    case 'anchor': {
      const id = link.anchor ? stegaClean(link.anchor).trim().replace(/^#/, '') : ''
      return id ? { kind: 'anchor', href: `#${id}` } : null
    }
    default:
      return link.url ? { kind: 'external', href: stegaClean(link.url), newTab } : null
  }
}
