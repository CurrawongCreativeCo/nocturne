import { stegaClean } from 'next-sanity'

import { SanityLink } from '@/components/ui/sanity-link'
import type { CtaData } from '@/types/sanity'

/**
 * Button styles per background: `dark` for hero/dark banners, `light` for surface or surface-alt sections.
 * The light primary button uses the `cta` colour: near-black by default, the Primary brand colour once
 * the Studio's Design settings set one.
 * Dark surfaces also switch the focus ring to the inverse ink so it stays visible.
 */
const variants = {
  dark: {
    primary:
      'bg-ink-inverse text-surface-inverse hover:bg-ink-inverse/85 active:bg-ink-inverse/70 focus-visible:outline-ink-inverse',
    secondary:
      'ring-1 ring-inset ring-ink-inverse/40 text-ink-inverse hover:bg-ink-inverse/10 active:bg-ink-inverse/20 focus-visible:outline-ink-inverse',
  },
  light: {
    primary: 'bg-cta text-cta-ink hover:bg-cta/85 active:bg-cta/70',
    secondary: 'ring-1 ring-inset ring-line text-ink hover:bg-surface-alt active:bg-line',
  },
} as const

/** One short transition (motion tokens) and a small press. None of it under reduced motion. */
const feedback =
  'transition-[color,background-color,transform] duration-(--duration-fast) ease-out motion-safe:active:scale-[0.98] motion-reduce:transition-none'

const sizes = { md: 'px-6 py-3', sm: 'px-4 py-2' } as const

/** The button classes of a CTA, for a plain `<a>` or `<button>` that isn't a Sanity link (e.g. Google Maps directions). */
export function ctaClassName(
  surface: keyof typeof variants,
  variant: keyof (typeof variants)['dark'] = 'primary',
  size: keyof typeof sizes = 'md',
) {
  return `inline-flex items-center justify-center rounded-button text-small font-semibold ${feedback} ${sizes[size]} ${variants[surface][variant]}`
}

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
      className={`${ctaClassName(surface, stegaClean(cta.variant), size)} ${className}`}
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
