import type { CSSProperties } from 'react'

import { profileFrameShape, type FrameCorner } from '@/lib/sanity/image-frame-geometry'
import type { ProfileImageSize, ResolvedProfileImage } from '@/lib/sanity/profile-image-options'
import type { SanityImageData } from '@/types/sanity'

import { ImageFrame } from './image-frames'
import { SanityImage } from './sanity-image'

/** A layout's three sizes, as full class names so Tailwind's scanner sees them. */
export interface ProfileImageScale {
  /** `size-*` for the square shapes. */
  box: Record<ProfileImageSize, string>
  /** `h-*` for a logo drawn at its own proportions. */
  height: Record<ProfileImageSize, string>
  /**
   * Each size's drawn width in CSS pixels, for pictures smaller than the Link list's (an avatar):
   * the image CDN is then asked for 2x this instead of the Link list's widths.
   */
  pixels?: Record<ProfileImageSize, number>
}

/** The `sizes` hint and the width asked of the image CDN, per size (2x the largest drawn width). */
const SIZES: Record<ProfileImageSize, { sizes: string; request: number }> = {
  small: { sizes: '80px', request: 192 },
  medium: { sizes: '128px', request: 256 },
  large: { sizes: '160px', request: 384 },
}

/** The classes for the corners the shared geometry (lib/sanity/image-frame-geometry.ts) describes. */
const CORNER_RADIUS: Partial<Record<FrameCorner, string>> = {
  circle: 'rounded-full',
  card: 'rounded-card',
}

/**
 * A small portrait or logo with an optional ring or decorative frame, drawn with CSS only.
 *
 * - The shape comes from the shared geometry (`profileFrameShape`), as the Studio's "Adjust picture"
 *   draws it. Circle and Rounded square crop to a square on the picture's crop and hotspot; Logo,
 *   uncropped keeps the whole upload's proportions at the size's height (for marks and wordmarks
 *   with transparent backgrounds), whatever crop or hotspot is stored.
 * - A ring is one decorative layer (`.image-ring` in globals.css): a solid colour or a gradient,
 *   masked to a band, with a see-through gap so it works over a photo or glass. The wrapper pads by
 *   the ring's width and gap, so the ring never overlaps the picture or the text below.
 * - A frame is approved artwork (Design > Image frames) masked in a theme colour, as Image design
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
  style,
}: {
  image: SanityImageData | null | undefined
  design: ResolvedProfileImage
  scale: ProfileImageScale
  /** The ring or frame colour, as CSS (a theme-colour field); Primary when unset. */
  colour?: string
  preload?: boolean
  /** Placement classes: alignment and the space below (and a Depth and glow filter). */
  className?: string
  /** Custom properties for those classes, on the outer element. */
  style?: CSSProperties
}) {
  if (!image?.asset) return null
  const { size, shape, border } = design
  const frameShape = profileFrameShape(design)
  const natural = !frameShape
  const radius = frameShape ? (CORNER_RADIUS[frameShape.corner] ?? '') : 'rounded-control'
  // A logo is shown whole: a saved adjustment stays stored for when a cropping shape is chosen again.
  const shown = natural ? { ...image, crop: null, hotspot: null } : image
  const drawn = scale.pixels?.[size]
  const { sizes, request } = drawn ? { sizes: `${drawn}px`, request: drawn * 2 } : SIZES[size]
  const imageClass = natural
    ? `w-auto max-w-full object-contain ${scale.height[size]}`
    : `object-cover ${scale.box[size]}`

  const picture = (extra = '') => (
    <SanityImage
      image={shown}
      whole={natural}
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
        style={style}
      >
        {/* The frame's middle holds the picture: it sits 14% in from each edge. */}
        <span className={`absolute inset-[14%] overflow-hidden ${radius}`}>
          {picture(`size-full ${natural ? 'object-contain' : 'object-cover'}`)}
        </span>
        <ImageFrame
          frame={{ kind: 'custom', url: border.url, colour: 'accent', inset: 0 }}
          colour={colour}
          width={request}
        />
      </span>
    )
  }

  if (border?.kind === 'ring') {
    const offset = border.widthPx + border.gapPx
    const ringStyle = {
      ...style,
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
        style={ringStyle}
      >
        {picture()}
        <span aria-hidden="true" className="image-ring" />
      </span>
    )
  }

  return (
    <span data-profile-image={shape} className={`block w-fit ${className}`.trim()} style={style}>
      {picture()}
    </span>
  )
}
