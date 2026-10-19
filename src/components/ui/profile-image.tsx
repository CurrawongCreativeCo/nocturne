import type { CSSProperties } from 'react'

import type {
  ProfileImageShape,
  ProfileImageSize,
  ResolvedProfileImage,
} from '@/lib/sanity/profile-image-options'
import type { SanityImageData } from '@/types/sanity'

import { ImageFrame } from './image-frames'
import { SanityImage } from './sanity-image'

/** A layout's three sizes, as full class names so Tailwind's scanner sees them. */
export interface ProfileImageScale {
  /** `size-*` for the square shapes. */
  box: Record<ProfileImageSize, string>
  /** `h-*` for a logo drawn at its own proportions. */
  height: Record<ProfileImageSize, string>
}

/** The `sizes` hint and the width asked of the image CDN, per size (2x the largest drawn width). */
const SIZES: Record<ProfileImageSize, { sizes: string; request: number }> = {
  small: { sizes: '80px', request: 192 },
  medium: { sizes: '128px', request: 256 },
  large: { sizes: '160px', request: 384 },
}

const SHAPE_RADIUS: Record<ProfileImageShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-card',
  natural: 'rounded-control',
}

/**
 * A small portrait or logo with an optional ring or decorative frame, drawn with CSS only.
 *
 * - Circle and Rounded square crop to a square on the hotspot; Logo, uncropped keeps the upload's
 *   proportions at the size's height (for marks and wordmarks with transparent backgrounds).
 * - A ring is one decorative layer (`.image-ring` in globals.css): a solid colour or a gradient,
 *   masked to a band, with a see-through gap so it works over a photo or glass. The wrapper pads by
 *   the ring's width and gap, so the ring never overlaps the picture or the text below.
 * - A frame is an approved SVG (Design > Image frames) masked in a theme colour, as Image design
 *   draws it. The picture shrinks inside the size's box to make room, so the layout doesn't move.
 *
 * Renders nothing without an asset, so a missing picture leaves no empty circle.
 */
export function ProfileImage({
  image,
  design,
  scale,
  colour,
  preload,
  className = '',
}: {
  image: SanityImageData | null | undefined
  design: ResolvedProfileImage
  scale: ProfileImageScale
  /** The ring or frame colour, as CSS (a theme-colour field); Primary when unset. */
  colour?: string
  preload?: boolean
  /** Placement classes: alignment and the space below. */
  className?: string
}) {
  if (!image?.asset) return null
  const { size, shape, border } = design
  const radius = SHAPE_RADIUS[shape]
  const natural = shape === 'natural'
  const { sizes, request } = SIZES[size]
  const imageClass = natural
    ? `w-auto max-w-full object-contain ${scale.height[size]}`
    : `object-cover ${scale.box[size]}`

  const picture = (extra = '') => (
    <SanityImage
      image={image}
      {...(natural ? { height: request } : { width: request, height: request })}
      sizes={sizes}
      preload={preload}
      className={`block ${radius} ${extra || imageClass}`.trim()}
    />
  )

  if (border?.kind === 'frame') {
    return (
      <span
        data-profile-image={shape}
        data-profile-border="frame"
        className={`relative block ${scale.box[size]} ${className}`.trim()}
      >
        {/* The frame's middle holds the picture: it sits 14% in from each edge. */}
        <span className={`absolute inset-[14%] overflow-hidden ${radius}`}>
          {picture(`size-full ${natural ? 'object-contain' : 'object-cover'}`)}
        </span>
        <ImageFrame
          frame={{ kind: 'custom', url: border.url, colour: 'accent', inset: 0 }}
          colour={colour}
        />
      </span>
    )
  }

  if (border?.kind === 'ring') {
    const offset = border.widthPx + border.gapPx
    const style = {
      '--ring-width': `${border.widthPx}px`,
      '--ring-offset': `${offset}px`,
      '--ring-fill': border.gradient ?? colour ?? 'var(--color-accent)',
      borderRadius:
        shape === 'circle'
          ? '9999px'
          : `calc(var(--radius-${natural ? 'control' : 'card'}) + ${offset}px)`,
    } as CSSProperties
    return (
      <span
        data-profile-image={shape}
        data-profile-border={border.gradient ? 'gradient' : 'line'}
        className={`relative block w-fit p-(--ring-offset) ${className}`.trim()}
        style={style}
      >
        {picture()}
        <span aria-hidden="true" className="image-ring" />
      </span>
    )
  }

  return (
    <span data-profile-image={shape} className={`block w-fit ${className}`.trim()}>
      {picture()}
    </span>
  )
}
