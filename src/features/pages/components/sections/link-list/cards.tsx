import { buttonFeedback } from '@/components/ui/cta-link'
import { LinkArrow } from '@/components/ui/link-arrow'
import { SanityLink } from '@/components/ui/sanity-link'
import { ringSurfaceLook } from '@/lib/sanity/surface-options'

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
import { PICTURE } from './stacked'
import type { SectionProps } from '../../../types'

// How this section looks without a style. Keep `align` equal to the Cards preset's.
const DEFAULTS = { container: 'max-w-3xl', align: 'center' } as const

// The shadow is added per link (`linkShadow`), so Depth and glow can replace it; the fill and border
// per link too (`ringSurfaceLook`).
const CARD = `group flex h-full w-full rounded-card p-3 text-left ${buttonFeedback}`
const SURFACE = {
  background: 'bg-surface',
  border: 'ring-1 ring-inset ring-line hover:ring-line-strong',
}
// The featured card's stronger outline, unless the card's border is chosen.
const FEATURED_BORDER = 'ring-2! ring-ink!'
// The tile that holds a picture or an icon, so cards in a row stay the same shape.
const TILE = 'grid place-items-center overflow-hidden rounded-control bg-surface-alt text-ink-muted'
const ICON = {
  shape: 'rounded',
  background: 'bg-surface-alt',
  border: '',
  colour: 'text-ink-muted',
} as const

const text = (large: boolean): OwnLinkText => ({
  eyebrow: ownEyebrow('text-ink-muted'),
  label: { size: large ? 'text-h4' : 'text-body', weight: 'semibold' },
  description: { size: 'text-small', weight: 'regular', colour: 'text-ink-muted' },
  labelClass: 'text-balance',
  descriptionClass: 'mt-0.5 text-pretty',
})

const layout: LinkListLayout = {
  defaults: DEFAULTS,
  profile: { picture: PICTURE, name: 'text-h3' },
  listClassName: 'grid gap-4 md:grid-cols-2',
  renderLink: (link, context) => {
    const { thumbnailSize, arrow, arrowStyle, design } = context
    const large = thumbnailSize === 'large'
    const depth = linkShadow(context, 'card', 'shadow-card')
    const look = ringSurfaceLook(design.surface, SURFACE)
    const ownBorder =
      design.surface.border === undefined && design.surface.borderColour === undefined
    const thumbnail = hasThumbnail(link)
    // Small cards: the icon's container is the tile itself. Large ones keep their picture-shaped tile
    // and put a chosen container inside it.
    const icon = large ? (
      <LinkIcon
        link={link}
        design={design.icon}
        own={{ ...ICON, shape: 'plain', colour: '' }}
        box="size-20"
        iconClass="size-10"
      />
    ) : (
      <LinkIcon
        link={link}
        design={design.icon}
        own={ICON}
        box="size-16 overflow-hidden"
        iconClass="size-6"
        keepBox
      />
    )
    return (
      <LinkItem
        link={link}
        className={link.large ? 'md:col-span-2' : undefined}
        style={[depth.style, look.style]}
      >
        <SanityLink
          link={link.link}
          className={`${CARD} ${look.className} ${depth.className} ${large ? 'flex-col gap-3' : 'items-center gap-4'} ${link.large && ownBorder ? FEATURED_BORDER : ''}`}
        >
          {large && (thumbnail || link.item.icon) ? (
            <span className={`${TILE} w-full ${link.large ? 'aspect-video' : 'aspect-[4/3]'}`}>
              <LinkVisual
                link={link}
                thumbClass="size-full object-cover"
                sizes="(min-width: 768px) 384px, 100vw"
                icon={icon}
              />
            </span>
          ) : thumbnail ? (
            <span className={`${TILE} size-16 shrink-0`}>
              <LinkVisual
                link={link}
                thumbClass="size-full object-cover"
                sizes="64px"
                icon={null}
              />
            </span>
          ) : (
            icon
          )}
          <span
            className={`flex min-w-0 items-center gap-3 ${large ? 'w-full px-1 pb-1' : 'flex-1'}`}
          >
            <LinkText link={link} design={design} own={text(link.large)} className="flex-1" />
            <span className="text-ink-muted group-hover:text-ink" style={arrowStyle}>
              <LinkArrow
                arrow={arrow}
                external={link.kind === 'external'}
                className="size-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              />
            </span>
          </span>
        </SanityLink>
      </LinkItem>
    )
  },
}

/**
 * Cards: a thumbnail (or icon) and the text on each, two across from tablet width. The Image-focused
 * preset sets `thumbnailSize` to large, so a big picture leads each card. The featured link spans both columns.
 */
export function LinkListCards(props: SectionProps<'linkList'>) {
  return <LinkListView {...props} layout={layout} />
}
