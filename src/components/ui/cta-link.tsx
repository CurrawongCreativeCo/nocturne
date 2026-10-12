import { stegaClean } from 'next-sanity'

import { SanityLink } from '@/components/ui/sanity-link'
import type { CtaData } from '@/types/sanity'

/**
 * Button styles per background: `dark` for hero/dark banners, `light` for white or gray sections.
 * Dark surfaces also switch the focus ring to white so it stays visible.
 */
const variants = {
  dark: {
    primary: 'bg-white text-gray-950 hover:bg-gray-200 focus-visible:outline-white',
    secondary:
      'ring-1 ring-inset ring-white/40 text-white hover:bg-white/10 focus-visible:outline-white',
  },
  light: {
    primary: 'bg-gray-950 text-white hover:bg-gray-800',
    secondary: 'ring-1 ring-inset ring-gray-300 text-gray-950 hover:bg-gray-100',
  },
} as const

const sizes = { md: 'px-6 py-3', sm: 'px-4 py-2' } as const

interface Props {
  /** `_key` is only needed in lists; a standalone CTA (e.g. the header button) has none. */
  cta: Omit<CtaData, '_key'>
  surface?: keyof typeof variants
  size?: keyof typeof sizes
  className?: string
}

export function CtaLink({ cta, surface = 'dark', size = 'md', className = '' }: Props) {
  return (
    <SanityLink
      link={cta.link}
      className={`inline-flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${sizes[size]} ${variants[surface][stegaClean(cta.variant)]} ${className}`}
    >
      {cta.label}
    </SanityLink>
  )
}

/** Renders up to two CTAs in a row; nothing when the list is empty. */
export function CtaGroup({
  ctas,
  surface,
  className = '',
}: { ctas: CtaData[] | null | undefined } & Omit<Props, 'cta' | 'size'>) {
  if (!ctas?.length) return null
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {ctas.map((cta) => (
        <CtaLink key={cta._key} cta={cta} surface={surface} />
      ))}
    </div>
  )
}
