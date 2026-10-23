import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { buttonFeedback } from '@/components/ui/cta-link'
import { LinkArrow } from '@/components/ui/link-arrow'
import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink } from '@/components/ui/sanity-link'
import type { GlassStrength } from '@/lib/color/glass-contrast'
import { hotspotObjectPosition } from '@/lib/sanity/image-focus'
import { isFramed, visibleArea } from '@/lib/sanity/image-framing'
import type { LinkArrowStyle } from '@/lib/sanity/link-arrow-options'
import { servedThumbnail } from '@/lib/sanity/link-thumbnail-framing'
import type { SanityImageData } from '@/types/sanity'

import { LinkIcon, LinkText, hasThumbnail, ownEyebrow, type OwnLinkText } from './link-design'
import { type ListLink } from './link-list-types'
import type { LinkCardDesign } from '../../../utils/link-card-design'

// The glass itself (blur, surface, border, shadow) is `.glass-row` in globals.css, from the glass tokens;
// the strength is a modifier class that tokens.generated.css defines.
const STRENGTH: Record<GlassStrength, string> = {
  light: 'glass-row-light',
  medium: '',
  strong: 'glass-row-strong',
}
// The strip's ratio follows the row's text: see thumbnailSpot. CSS places the served area on the
// hotspot, or the centre when there is none.
const thumbnailFor = (featured: boolean, framed: boolean) =>
  servedThumbnail({ layout: 'stacked', rowStyle: 'glass', featured, framed })
const ROW = `glass-row group flex w-full items-stretch overflow-hidden rounded-card text-left text-ink ${buttonFeedback}`
// Round badges on the glass: opaque, so they read the same over any photo. The arrow's is fixed; the
// icon's is the card's icon design over this.
const BADGE =
  'grid size-10 shrink-0 place-items-center rounded-full bg-surface-alt text-ink ring-1 ring-inset ring-line'
const ICON = {
  shape: 'circle',
  background: 'bg-surface-alt',
  border: 'ring-1 ring-inset ring-line',
  colour: 'text-ink',
} as const

/** Title and description are both the text colour, which the glass contrast check measures. */
const text = (large: boolean): OwnLinkText => ({
  eyebrow: ownEyebrow(),
  label: { size: large ? 'text-lead' : 'text-body', weight: 'semibold' },
  description: { size: 'text-small', weight: 'regular' },
  labelClass: 'text-balance',
  descriptionClass: 'text-pretty',
})
/**
 * One Glass rows link: a flush thumbnail the height of the row (clipped to the row's outer corners),
 * a round icon badge, the title and description, and a round badge holding the section's arrow style
 * (a chevron unless Design › Links says otherwise; none draws no badge). The whole row is the one link. Title and description are both `text-ink`: the contrast check measures that colour
 * over the glass (src/lib/color/glass-contrast.ts), and `text-ink-muted` would not reach 4.5:1.
 */
export function GlassRow({
  link,
  strength,
  arrow,
  arrowStyle,
  design,
  className = '',
}: {
  link: ListLink
  strength: GlassStrength
  arrow: LinkArrowStyle
  arrowStyle?: CSSProperties
  /** The card's design: its text and icon (its tint and border reach the glass from the list item). */
  design: LinkCardDesign
  /** A shadow class from Design › Depth and glow, in place of the glass's own. */
  className?: string
}) {
  const thumbnail = link.item.thumbnail as SanityImageData | null | undefined
  const served = thumbnailFor(link.large, isFramed(thumbnail))
  const dimensions = stegaClean(thumbnail?.asset?.metadata?.dimensions)
  const area =
    thumbnail && dimensions
      ? visibleArea(served, {
          asset: dimensions,
          crop: stegaClean(thumbnail.crop),
          hotspot: stegaClean(thumbnail.hotspot),
        })
      : null
  return (
    <SanityLink
      link={link.link}
      className={`${ROW} ${STRENGTH[strength]} ${link.large ? 'min-h-20' : 'min-h-14'} ${className}`}
    >
      {hasThumbnail(link) && thumbnail && (
        <span className="relative w-[30%] max-w-32 shrink-0 bg-surface-alt">
          <SanityImage
            image={thumbnail}
            alt=""
            width={served.width}
            height={served.height}
            placement={served}
            sizes={served.sizes}
            className="absolute inset-0 size-full object-cover"
            style={{
              objectPosition:
                dimensions && area
                  ? hotspotObjectPosition(stegaClean(thumbnail), { asset: dimensions, area })
                  : undefined,
            }}
          />
        </span>
      )}
      <span className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
        <LinkIcon
          link={link}
          design={design.icon}
          own={ICON}
          box="size-10"
          iconClass="size-5"
          keepBox
        />
        <LinkText link={link} design={design} own={text(link.large)} className="flex-1" />
        {arrow !== 'none' && (
          <span className={BADGE} style={arrowStyle}>
            <LinkArrow
              arrow={arrow}
              external={link.kind === 'external'}
              className="size-4! motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
            />
          </span>
        )}
      </span>
    </SanityLink>
  )
}
