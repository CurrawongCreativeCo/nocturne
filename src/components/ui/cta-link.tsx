import Link from 'next/link'
import { stegaClean } from 'next-sanity'

import { slugToPath } from '@/config/paths'
import type { CtaData, LinkData } from '@/types/sanity'

/** Resolves a `link` object to an href; null when incomplete (e.g. unfinished draft). */
export function resolveHref(link: LinkData | null | undefined): string | null {
  if (!link) return null
  if (stegaClean(link.linkType) === 'internal') return link.slug ? slugToPath(stegaClean(link.slug)) : null
  return link.url ? stegaClean(link.url) : null
}

const variants = {
  primary: 'bg-white text-gray-950 hover:bg-gray-200',
  secondary: 'ring-1 ring-inset ring-white/40 text-white hover:bg-white/10',
} as const

export function CtaLink({ cta, className = '' }: { cta: CtaData; className?: string }) {
  const href = resolveHref(cta.link)
  if (!href) return null

  const external = stegaClean(cta.link.linkType) === 'external'
  const newTab = cta.link.openInNewTab ?? false
  const classes = `inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold transition-colors ${variants[stegaClean(cta.variant)]} ${className}`

  if (external) {
    return (
      <a href={href} className={classes} {...(newTab && { target: '_blank', rel: 'noopener noreferrer' })}>
        {cta.label}
      </a>
    )
  }
  return (
    <Link href={href} className={classes} {...(newTab && { target: '_blank' })}>
      {cta.label}
    </Link>
  )
}
