import Link from 'next/link'
import { stegaClean } from 'next-sanity'

import type { CtaData } from '@/types/sanity'
import { isExternal, resolveHref } from '@/utils/links'

/** Button styles per background: `dark` for hero/dark banners, `light` for white or gray sections. */
const variants = {
  dark: {
    primary: 'bg-white text-gray-950 hover:bg-gray-200',
    secondary: 'ring-1 ring-inset ring-white/40 text-white hover:bg-white/10',
  },
  light: {
    primary: 'bg-gray-950 text-white hover:bg-gray-800',
    secondary: 'ring-1 ring-inset ring-gray-300 text-gray-950 hover:bg-gray-100',
  },
} as const

interface Props {
  /** `_key` is only needed in lists; a standalone CTA (e.g. the header button) has none. */
  cta: Omit<CtaData, '_key'>
  surface?: keyof typeof variants
  className?: string
}

export function CtaLink({ cta, surface = 'dark', className = '' }: Props) {
  const href = resolveHref(cta.link)
  if (!href) return null

  const newTab = cta.link.openInNewTab ?? false
  const classes = `inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold transition-colors ${variants[surface][stegaClean(cta.variant)]} ${className}`

  if (isExternal(cta.link)) {
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

/** Renders up to two CTAs in a row; nothing when the list is empty. */
export function CtaGroup({ ctas, surface, className = '' }: { ctas: CtaData[] | null | undefined } & Omit<Props, 'cta'>) {
  if (!ctas?.length) return null
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {ctas.map((cta) => (
        <CtaLink key={cta._key} cta={cta} surface={surface} />
      ))}
    </div>
  )
}
