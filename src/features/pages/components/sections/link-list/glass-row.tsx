import { stegaClean } from 'next-sanity'
import type { CSSProperties } from 'react'

import { BadgeIcon } from '@/components/ui/badge-icon'
import { buttonFeedback } from '@/components/ui/cta-link'
import { LinkArrow } from '@/components/ui/link-arrow'
import { SanityImage } from '@/components/ui/sanity-image'
import { SanityLink } from '@/components/ui/sanity-link'
import type { GlassStrength } from '@/lib/color/glass-contrast'
import type { LinkArrowStyle } from '@/lib/sanity/link-arrow-options'
import type { SanityImageData } from '@/types/sanity'

import { LinkDescription, hasThumbnail, type ListLink } from './link-list-parts'

// The glass itself (blur, surface, border, shadow) is `.glass-row` in globals.css, from the glass tokens;
// the strength is a modifier class that tokens.generated.css defines.
const STRENGTH: Record<GlassStrength, string> = {
  light: 'glass-row-light',
  medium: '',
  strong: 'glass-row-strong',
}
const ROW = `glass-row group flex w-full items-stretch overflow-hidden rounded-card text-left text-ink ${buttonFeedback}`
// Round badges on the glass: opaque, so they read the same over any photo.
const BADGE =
  'grid size-10 shrink-0 place-items-center rounded-full bg-surface-alt text-ink ring-1 ring-inset ring-line'

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
  iconStyle,
  className = '',
}: {
  link: ListLink
  strength: GlassStrength
  arrow: LinkArrowStyle
  arrowStyle?: CSSProperties
  iconStyle?: CSSProperties
  /** A shadow class from Design › Depth and glow, in place of the glass's own. */
  className?: string
}) {
  const thumbnail = link.item.thumbnail as SanityImageData | null | undefined
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
            width={600}
            height={450}
            sizes="128px"
            className="absolute inset-0 size-full object-cover"
          />
        </span>
      )}
      <span className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5">
        {link.item.icon && (
          <span className={BADGE} style={iconStyle}>
            <BadgeIcon name={stegaClean(link.item.icon)} className="size-5" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`${link.large ? 'text-lead' : 'text-body'} font-semibold text-balance`}>
            {link.label}
          </span>
          <LinkDescription text={link.item.description} className="text-small text-pretty" />
        </span>
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
