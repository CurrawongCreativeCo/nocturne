import { stegaClean } from 'next-sanity'

import { ActionIndicator } from '@/components/ui/action-indicator'
import { resolveLink } from '@/components/ui/resolve-link'
import { SanityLink } from '@/components/ui/sanity-link'
import { trackAttributes } from '@/lib/analytics/track-script'
import { resolveCardAction, type OwnAction } from '@/lib/sanity/card-action'
import type { CtaData } from '@/types/sanity'

import { ctaClassName, type ButtonSize, type ButtonSurface } from './button-style'

export { buttonFeedback, ctaClassName, ctaColours } from './button-style'

interface Props {
  /** `_key` is only needed in lists; a standalone CTA (e.g. the header button) has none. */
  cta: Omit<CtaData, '_key'>
  surface?: ButtonSurface
  size?: ButtonSize
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
