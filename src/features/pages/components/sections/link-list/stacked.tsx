import { buttonFeedback, ctaColours } from '@/components/ui/cta-link'
import { LinkArrow } from '@/components/ui/link-arrow'
import { SanityLink } from '@/components/ui/sanity-link'
import { servedThumbnail } from '@/lib/sanity/link-thumbnail-framing'
import { glassSurfaceLook, ringSurfaceLook } from '@/lib/sanity/surface-options'

import { GlassRow } from './glass-row'
import {
  LinkIcon,
  LinkItem,
  LinkText,
  LinkVisual,
  hasThumbnail,
  linkShadow,
  ownEyebrow,
  type OwnLinkText,
} from './link-design'
import { LinkListView } from './link-list-parts'
import { type LinkListLayout } from './link-list-types'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep `align` equal to the Minimal preset's.
const DEFAULTS = { container: 'max-w-md', spacing: 'compact', align: 'center' } as const

/** The profile picture at each size: Medium is the size this layout always drew. */
export const PICTURE = {
  box: { small: 'size-16', medium: 'size-24', large: 'size-32 sm:size-36' },
  height: { small: 'h-16', medium: 'h-24', large: 'h-32 sm:h-36' },
} as const

const THUMBNAIL = servedThumbnail({ layout: 'stacked' })

const BUTTON = `group relative flex w-full items-center justify-center rounded-button px-14 text-center ${buttonFeedback}`
// The shadow is added per link (`linkShadow`), so Depth and glow can replace it; the fill and border
// per link too (`ringSurfaceLook`), so Cards can change them.
const NORMAL = 'min-h-14 py-3 text-ink'
const NORMAL_SURFACE = {
  background: 'bg-surface hover:bg-surface-alt',
  border: 'ring-1 ring-inset ring-line',
}

/** The label, eyebrow and description: the large link's label is a step up. */
const text = (large: boolean): OwnLinkText => ({
  eyebrow: ownEyebrow('opacity-80'),
  label: { size: large ? 'text-lead' : 'text-body', weight: 'semibold' },
  description: { size: 'text-small', weight: 'regular', colour: 'opacity-80' },
})
// The icon sits bare in the left gutter; a chosen container is 40 px, the gutter's width.
const ICON = { shape: 'plain', background: '', border: '' } as const

const layout: LinkListLayout = {
  defaults: DEFAULTS,
  profile: { picture: PICTURE, name: 'text-h3' },
  listClassName: 'grid gap-3',
  renderLink: (link, context) => {
    const { surface, rowStyle, glassStrength, arrow, arrowStyle, design } = context
    if (rowStyle === 'glass') {
      // The glass draws its own shadow (`.glass-row`); a chosen one replaces it.
      const depth = linkShadow(context, 'glass')
      // A tint or border reaches the glass through variables the row inherits (globals.css).
      const look = glassSurfaceLook(design.surface, { strength: glassStrength })
      return (
        <LinkItem link={link} style={[depth.style, look.style]}>
          <GlassRow
            link={link}
            strength={glassStrength}
            arrow={arrow}
            arrowStyle={arrowStyle}
            design={design}
            className={depth.className}
          />
        </LinkItem>
      )
    }
    // The large link is a filled button with no shadow of its own; the others are cards.
    const depth = link.large
      ? linkShadow(context, 'none')
      : linkShadow(context, 'card', 'shadow-card')
    // The large link's own fill is the primary button's; a chosen fill takes the text colour with it.
    const filled = ctaColours(surface, 'primary')
    const tinted = design.surface.background !== undefined || design.surface.strength !== undefined
    const look = ringSurfaceLook(
      design.surface,
      link.large ? { background: filled, border: '', fill: 'var(--color-cta)' } : NORMAL_SURFACE,
    )
    return (
      <LinkItem link={link} style={[depth.style, look.style]}>
        <SanityLink
          link={link.link}
          className={`${BUTTON} ${link.large ? `min-h-20 py-4${tinted ? 'text-ink' : ''}` : NORMAL} ${look.className} ${depth.className}`}
        >
          <span className="absolute left-4 flex items-center">
            <LinkVisual
              link={link}
              thumbClass="size-10 rounded-control object-cover"
              served={THUMBNAIL}
              icon={
                <LinkIcon
                  link={link}
                  design={design.icon}
                  own={ICON}
                  box="size-10"
                  iconClass="size-5"
                />
              }
            />
          </span>
          <LinkText link={link} design={design} own={text(link.large)} />
          {/* In the right gutter, mirroring the picture on the left, so the label stays centred. */}
          {arrow !== 'none' && (
            <span
              className="absolute right-4 flex items-center opacity-70 group-hover:opacity-100"
              style={arrowStyle}
            >
              <LinkArrow
                arrow={arrow}
                external={link.kind === 'external'}
                className="size-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              />
            </span>
          )}
        </SanityLink>
      </LinkItem>
    )
  },
}

/**
 * Minimal: full-width buttons, one under the other. The featured link is a filled, larger button.
 * The Glass rows preset draws each link as a frosted row instead (glass-row.tsx).
 */
export function LinkListStacked(props: SectionProps<'linkList'>) {
  return <LinkListView {...props} layout={layout} />
}

export { hasThumbnail }
