import { stegaClean } from 'next-sanity'

import type { FrameShape } from './image-frame-geometry'
import type { Placement } from './image-framing'

/**
 * Where a Link list thumbnail is drawn, as data: the ratio and size the site asks the CDN for, and
 * the shapes "Adjust picture" shows. One map for both, so the editor's preview and the page can't
 * drift (the components in features/pages/components/sections/link-list call `thumbnailSpot`; the
 * Studio resolver in image-frame-geometry.ts calls `thumbnailShapes`). Kept free of Studio code.
 *
 * Every thumbnail is served at the ratio it is drawn at, at 2x its largest drawn width, and never as
 * the original upload. A picture with no framing keeps showing what it showed when every thumbnail
 * was asked for as 600 × 450 and cut again by CSS: `DEFAULT_ASPECT` is that old request.
 */
export const THUMBNAIL_DEFAULT_ASPECT = 4 / 3

/** The strip is 30% of the row up to 128 px wide, as tall as the row (56 px, or 80 px for the featured link, and up). */
const GLASS_STRIP_PX = 128
const GLASS_ROW_PX = { standard: 56, featured: 80, tallest: 128 } as const

/** The largest an Image-focused card's picture is drawn: a single column just under the 768 px breakpoint. */
const CARD_DRAWN_PX = 720

export type ThumbnailKey = 'minimal' | 'cards' | 'image' | 'featured' | 'glass'

type ServedKey = ThumbnailKey | 'strip' | 'stripFeatured'

/** What the site asks the CDN for. */
export interface ThumbnailServed extends Placement {
  /** 2x the largest drawn width, in CSS pixels. */
  width: number
  height: number
  sizes: string
}

export interface ThumbnailSpot {
  key: ThumbnailKey
  served: ThumbnailServed
}

// Not a bare `100vw`: next/image drops every candidate narrower than the smallest device size
// when `sizes` has a plain vw width, so a 300 px tile would be offered nothing under 640 px.
const FLUID_384 = '(min-width: 768px) 384px, calc(100vw - 2rem)'
const FLUID_720 = '(min-width: 768px) 720px, calc(100vw - 2rem)'

const SERVED: Record<ServedKey, ThumbnailServed> = {
  // Minimal: the 40 px tile on the left of the button.
  minimal: {
    aspect: 1,
    defaultAspect: THUMBNAIL_DEFAULT_ASPECT,
    width: 80,
    height: 80,
    sizes: '40px',
  },
  // Cards: the 64 px tile beside the text.
  cards: {
    aspect: 1,
    defaultAspect: THUMBNAIL_DEFAULT_ASPECT,
    width: 128,
    height: 128,
    sizes: '64px',
  },
  // Image-focused: a 4:3 picture across the card, one column below 768 px and two from there.
  image: {
    aspect: 4 / 3,
    defaultAspect: THUMBNAIL_DEFAULT_ASPECT,
    width: CARD_DRAWN_PX * 2,
    height: CARD_DRAWN_PX * 1.5,
    sizes: FLUID_384,
  },
  // The featured link spans both columns from 768 px and is 16:9.
  featured: {
    aspect: 16 / 9,
    defaultAspect: THUMBNAIL_DEFAULT_ASPECT,
    width: CARD_DRAWN_PX * 2,
    height: CARD_DRAWN_PX * 1.125,
    sizes: FLUID_720,
  },
  // Glass rows: the strip's ratio follows the row's text. With no framing the CDN gets the 4:3 cut
  // thumbnails always had, and CSS centres the strip in it (so nothing moves).
  glass: {
    aspect: 4 / 3,
    defaultAspect: THUMBNAIL_DEFAULT_ASPECT,
    width: 256,
    height: 192,
    sizes: '128px',
  },
  // With framing the CDN gets the shortest row's own area at the strip's largest width (128 px), which
  // is the widest the strip gets: taller rows show a narrower slice of it, placed by the hotspot.
  strip: {
    aspect: GLASS_STRIP_PX / GLASS_ROW_PX.standard,
    defaultAspect: THUMBNAIL_DEFAULT_ASPECT,
    width: 256,
    height: 112,
    sizes: '128px',
  },
  stripFeatured: {
    aspect: GLASS_STRIP_PX / GLASS_ROW_PX.featured,
    defaultAspect: THUMBNAIL_DEFAULT_ASPECT,
    width: 256,
    height: 160,
    sizes: '128px',
  },
}

export interface ThumbnailLooks {
  /** The section's layout (`variant`); unset is Minimal. */
  layout?: string | null
  /** `glass` for Glass rows; unset is solid. */
  rowStyle?: string | null
  /** `large` for Image-focused cards; unset is standard. */
  thumbnailSize?: string | null
  /** The link's featured flag. */
  featured?: boolean | null
  /** Whether the picture has a crop or hotspot (Glass rows serve those at the strip's own shape). */
  framed?: boolean
}

const clean = (value: string | null | undefined) => (value ? stegaClean(value) : undefined)

/** Which thumbnail shape a link takes; null where the layout draws no thumbnails (Editorial, Compact). */
export function thumbnailKey(looks: ThumbnailLooks): ThumbnailKey | null {
  const layout = clean(looks.layout) ?? 'stacked'
  if (layout === 'stacked') return clean(looks.rowStyle) === 'glass' ? 'glass' : 'minimal'
  if (layout !== 'cards') return null
  if (clean(looks.thumbnailSize) !== 'large') return 'cards'
  return looks.featured ? 'featured' : 'image'
}

/**
 * What the site asks the CDN for a thumbnail drawn this way. For the components that draw one: a
 * layout with no thumbnails (which never calls this) falls back to Minimal's.
 */
export function servedThumbnail(looks: ThumbnailLooks): ThumbnailServed {
  return (thumbnailSpot(looks) ?? thumbnailSpot({ layout: 'stacked' }))?.served ?? SERVED.minimal
}

/** What the site asks the CDN for, for a link drawn this way. */
export function thumbnailSpot(looks: ThumbnailLooks): ThumbnailSpot | null {
  const key = thumbnailKey(looks)
  if (!key) return null
  const strip = key === 'glass' && looks.framed
  return { key, served: SERVED[strip ? (looks.featured ? 'stripFeatured' : 'strip') : key] }
}

const shape = (
  label: string,
  aspect: number,
  drawnPx: number,
  corner: FrameShape['corner'] = 'control',
): FrameShape => ({
  label,
  aspect,
  defaultAspect: THUMBNAIL_DEFAULT_ASPECT,
  corner,
  insetPct: 0,
  drawnPx,
})

/**
 * The shapes "Adjust picture" shows, main shape first: the one this section draws for the link,
 * then outlines for the other shapes the same link can take. None where no thumbnail shows.
 */
export function thumbnailShapes(looks: ThumbnailLooks): FrameShape[] {
  const key = thumbnailKey(looks)
  switch (key) {
    case null:
      return []
    case 'minimal':
      return [shape('Thumbnail', 1, 40)]
    case 'cards':
      return [shape('Thumbnail', 1, 64)]
    case 'image':
      return [
        shape('Card picture', 4 / 3, CARD_DRAWN_PX),
        shape('Featured link', 16 / 9, CARD_DRAWN_PX),
      ]
    case 'featured':
      return [
        shape('Featured card picture', 16 / 9, CARD_DRAWN_PX),
        shape('Other links', 4 / 3, CARD_DRAWN_PX),
      ]
    case 'glass': {
      const shortest = looks.featured ? GLASS_ROW_PX.featured : GLASS_ROW_PX.standard
      return [
        shape('Shortest row', GLASS_STRIP_PX / shortest, GLASS_STRIP_PX, 'none'),
        shape('Tallest row', GLASS_STRIP_PX / GLASS_ROW_PX.tallest, GLASS_STRIP_PX, 'none'),
      ]
    }
  }
}
