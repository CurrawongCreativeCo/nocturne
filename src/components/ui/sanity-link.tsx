import Link from 'next/link'
import { stegaClean } from 'next-sanity'
import type { ReactNode } from 'react'

import { slugToPath } from '@/config/paths'

/** Structural shape of `linkFields`; CTAs, menu items and rich-text links all satisfy it. */
export interface LinkData {
  linkType?: string | null
  slug?: string | null
  url?: string | null
  openInNewTab?: boolean | null
}

/**
 * Renders a Sanity `link` object: <Link> for internal pages, <a> for external URLs.
 * Renders nothing when the link is incomplete (e.g. an unfinished draft).
 */
export function SanityLink({ link, className, children }: { link: LinkData | null | undefined; className?: string; children: ReactNode }) {
  if (!link) return null
  const newTab = link.openInNewTab ?? false

  if (stegaClean(link.linkType) === 'internal') {
    if (!link.slug) return null
    return (
      <Link href={slugToPath(stegaClean(link.slug))} className={className} {...(newTab && { target: '_blank' })}>
        {children}
      </Link>
    )
  }

  if (!link.url) return null
  return (
    <a href={stegaClean(link.url)} className={className} {...(newTab && { target: '_blank', rel: 'noopener noreferrer' })}>
      {children}
    </a>
  )
}
