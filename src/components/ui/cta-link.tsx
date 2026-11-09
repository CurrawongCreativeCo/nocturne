import { stegaClean } from 'next-sanity'

import { ActionIndicator } from '@/components/ui/action-indicator'
import { resolveLink } from '@/components/ui/resolve-link'
import { SanityLink } from '@/components/ui/sanity-link'
import { trackAttributes } from '@/lib/analytics/track-script'
import { resolveCardAction, type OwnAction } from '@/lib/sanity/card-action'
import type { CtaData } from '@/types/sanity'

/**
 * Button styles per background: `dark` for hero/dark banners, `light` for surface or surface-alt sections.
 * The light primary button uses the `cta` colour: near-black by default, the Primary brand colour once
 * the Studio's Design settings set one.
 * Dark surfaces also switch the focus ring to the inverse ink so it stays visible.
 *
 * The site-wide button style (Brand colours → Buttons, task 148) rides on hook classes whose rules are
 * in globals.css: `cta-fill` (Brand gradient and its text colour) and `cta-soft` (the secondary's Soft
 * fill) in the colours below, and `cta-primary-depth` (shadow and glow, main button only) in the full
 * class list. They do nothing until the style is chosen.
 */
const variants = {
  dark: {
    primary:
      'bg-ink-inverse text-surface-inverse hover:bg-ink-inverse/85 active:bg-ink-inverse/70 focus-visible:outline-ink-inverse cta-fill',
    secondary:
      'ring-1 ring-inset ring-ink-inverse/40 text-ink-inverse hover:bg-ink-inverse/10 active:bg-ink-inverse/20 focus-visible:outline-ink-inverse cta-soft',
  },
  light: {
    primary: 'bg-cta text-cta-ink hover:bg-cta/85 active:bg-cta/70 cta-fill',
    secondary: 'ring-1 ring-inset ring-line text-ink hover:bg-surface-alt active:bg-line cta-soft',
  },
} as const

/** One short transition (motion tokens) and a small press. None of it under reduced motion. */
export const buttonFeedback =
  'transition-[color,background-color,transform] duration-(--duration-fast) ease-out motion-safe:active:scale-[0.98] motion-reduce:transition-none'

const sizes = { md: 'px-6 py-3', sm: 'px-4 py-2' } as const

/** Just the colours of a button style, for a button that has its own shape (a link list's featured link). */
export function ctaColours(
  surface: keyof typeof variants,
  variant: keyof (typeof variants)['dark'] = 'primary',
) {
  return variants[surface][variant]
}

/** The button classes of a CTA, for a plain `<a>` or `<button>` that isn't a Sanity link (e.g. Google Maps directions). */
export function ctaClassName(
  surface: keyof typeof variants,
  variant: keyof (typeof variants)['dark'] = 'primary',
  size: keyof typeof sizes = 'md',
) {
  // Depth and glow are the main button's alone; the secondary never gets the hook.
  const depth = variant === 'primary' ? ' cta-primary-depth' : ''
  return `inline-flex items-center justify-center rounded-button text-small font-semibold ${buttonFeedback} ${sizes[size]} ${ctaColours(surface, variant)}${depth}`
}

interface Props {
  /** `_key` is only needed in lists; a standalone CTA (e.g. the header button) has none. */
  cta: Omit<CtaData, '_key'>
  surface?: keyof typeof variants
  size?: keyof typeof sizes
  className?: string
}

/** What a button draws at the end with nothing chosen: no indicator. */
const NO_INDICATOR: OwnAction = { glyph: 'none', motion: 'none' }

/** Where a CTA goes, for the `cta_click` event: its address, or what it opens (`panel:<id>`, `booking`). */
function ctaDestination(link: Props['cta']['link']) {
  const resolved = resolveLink(link)
  if (!resolved) return ''
  if (resolved.kind === 'panel') return `panel:${resolved.panelId}`
  if (resolved.kind === 'booking') return 'booking'
  return resolved.href
}

/**
 * Clicks send `cta_click` (label and destination) once the visitor has accepted analytics. The
 * wrapper is `display: contents`, so it changes neither layout nor markup semantics.
 */
export function CtaLink({ cta, surface = 'dark', size = 'md', className = '' }: Props) {
  // The indicator at the end of the label (task 148): none until the button's own Indicator fields
  // choose one, so a stored button without them renders exactly as before. The link is the `group`
  // the indicator's hover and focus motion follows; it only becomes one when there is an indicator.
  const action = resolveCardAction(cta, NO_INDICATOR)
  const indicated = action.glyph !== 'none'
  return (
    <span
      className="contents"
      {...trackAttributes('cta_click', {
        label: stegaClean(cta.label),
        destination: ctaDestination(cta.link),
      })}
    >
      <SanityLink
        link={cta.link}
        className={[
          ctaClassName(surface, stegaClean(cta.variant), size),
          indicated && 'group gap-2',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {cta.label}
        {indicated && (
          <ActionIndicator
            glyph={action.glyph}
            external={resolveLink(cta.link)?.kind === 'external'}
            motion={action.motion}
            distance={action.distance}
            colour={action.colour}
            className="-mr-1"
          />
        )}
      </SanityLink>
    </span>
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
