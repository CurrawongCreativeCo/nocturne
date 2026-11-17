import {
  aspectValue,
  resolveImageDesign,
  type ImageAppearance,
  type ImageDesignInput,
} from './image-design-options'
import type { Placement } from './image-framing'
import { thumbnailShapes } from './link-thumbnail-framing'
import {
  resolveProfileImage,
  type ProfileImageDesignInput,
  type ProfileImageSize,
  type ResolvedProfileBorder,
  type ResolvedProfileImage,
} from './profile-image-options'

/**
 * The shapes a picture is drawn in, as data, for "Adjust picture" (features/studio/components/
 * picture-framing) and for the components that draw the picture. Plain TypeScript with no React
 * and no Studio imports. A placement's resolver turns the component's design into descriptors, so
 * the editor's stage and the page come from the same answer and can't drift.
 */
export type FrameCorner = 'none' | 'card' | 'control' | 'rounded' | 'circle' | 'arch'

/**
 * The corner each Image design shape is cut with: the one place FramedImage's clip, a frame that
 * follows the shape (components/ui/image-frames.tsx) and the Studio's "Adjust picture" mask read it.
 * Standard and the older Framed use the site's card corner; Rounded is 24px (1.5rem).
 */
export function appearanceCorner(shape: ImageAppearance): FrameCorner {
  switch (shape) {
    case 'rounded':
    case 'circle':
    case 'arch':
      return shape
    case 'square':
      return 'none'
    default:
      return 'card'
  }
}

/** CSS pixels of the fixed corners (`--radius-card`, `--radius-control`, Tailwind's rounded-3xl). */
export const CORNER_PX = { card: 16, control: 8, rounded: 24 } as const

export type FrameRing = Extract<ResolvedProfileBorder, { kind: 'ring' }>

export interface FrameShape extends Placement {
  /** Shown in "Also shown as: …" when this is not the main shape. */
  label: string
  corner: FrameCorner
  /** How far a decorative frame's artwork insets the picture, as a percentage of each side. */
  insetPct: number
  /** A solid or gradient ring drawn around the picture. */
  ring?: FrameRing
  /** The CDN URL of a decorative frame's artwork, drawn over the picture. */
  frameUrl?: string
  /** The picture's largest drawn width in CSS pixels, for the zoom limit. */
  drawnPx: number
}

/** A frame's picture sits 14% in from each edge (components/ui/profile-image.tsx). */
export const PROFILE_FRAME_INSET_PCT = 14

/** Each size's largest drawn width in CSS pixels: the width asked of the CDN (components/ui/profile-image.tsx) at 1x. */
export const PROFILE_DRAWN_PX: Record<ProfileImageSize, number> = {
  small: 96,
  medium: 128,
  large: 192,
}

/** The shapes a picture is drawn in: the main shape first, then any others. */
export type FrameShapes = [FrameShape, ...FrameShape[]]

/** A Studio form path: strings, indexes and `{ _key }` segments. */
type FormPath = readonly unknown[]

export interface FramingResolver {
  /**
   * Where the design sits, relative to the image field: drop this many segments off its path, then
   * add `field` (or, without one, read the object at the dropped path).
   */
  designPath: { drop: number; field?: string }
  /** The decorative frame document the design points at, if any: the Studio fetches its artwork. */
  frameRef?: (design: unknown) => string | undefined
  /**
   * The main shape first, then any others the picture is also drawn in; none when nothing is
   * cropped. `path` is the image field's own path, for placements that depend on which item it sits in.
   */
  resolve: (design: unknown, frameUrl?: string | null, path?: FormPath) => FrameShape[]
  /** What the field says when `resolve` returns no shape, if not the profile picture's uncropped wording. */
  wholeNote?: WholeNote
}

/** The field's line when a picture has no shape to adjust: with a positioning saved, and without. */
export interface WholeNote {
  saved: string
  unsaved: string
}

/**
 * The shape a profile picture is drawn in, or null for "Logo, uncropped", which keeps the upload's
 * own proportions. `ProfileImage` draws from this too, so the page and the editor agree.
 */
export function profileFrameShape(resolved: ResolvedProfileImage): FrameShape | null {
  if (resolved.shape === 'natural') return null
  const frame = resolved.border?.kind === 'frame' ? resolved.border : undefined
  const inset = frame ? PROFILE_FRAME_INSET_PCT : 0
  return {
    label: 'Profile picture',
    aspect: 1,
    corner: resolved.shape === 'circle' ? 'circle' : 'card',
    insetPct: inset,
    ...(resolved.border?.kind === 'ring' && { ring: resolved.border }),
    ...(frame && { frameUrl: frame.url }),
    drawnPx: Math.round(PROFILE_DRAWN_PX[resolved.size] * (1 - (inset * 2) / 100)),
  }
}

/** The Link list's profile picture: Circle or Rounded square, with a ring or an approved frame. */
const linkListProfile: FramingResolver = {
  designPath: { drop: 2, field: 'profileDesign' },
  frameRef: (design) => {
    const reference = design as { border?: unknown; frame?: { _ref?: unknown } } | null | undefined
    return reference?.border === 'frame' && typeof reference.frame?._ref === 'string'
      ? reference.frame._ref
      : undefined
  },
  resolve: (design, frameUrl) => {
    const shape = profileFrameShape(
      resolveProfileImage({
        ...(design as ProfileImageDesignInput | null | undefined),
        frameUrl,
      }),
    )
    // A logo keeps its own proportions, uncropped: nothing to adjust.
    return shape ? [shape] : []
  },
}

interface StoredLinkListSection {
  variant?: string | null
  rowStyle?: string | null
  thumbnailSize?: string | null
  links?: { _key?: string; featured?: boolean | null; visibility?: string | null }[] | null
}

/**
 * A Link list link's thumbnail: the section's layout, row style and Image-focused size say which
 * shape it is drawn in, and the link's own featured flag picks the featured card's 16:9
 * (lib/sanity/link-thumbnail-framing.ts). The section is three segments up: `links[_key].thumbnail`.
 */
const linkListThumbnail: FramingResolver = {
  designPath: { drop: 3 },
  resolve: (design, _frameUrl, path = []) => {
    const section = design as StoredLinkListSection | null | undefined
    const key = (path[path.length - 2] as { _key?: string } | undefined)?._key
    // Only the first ticked, shown link is drawn large (features/pages/utils/link-list.ts, `featuredKey`).
    const large = section?.links?.find((item) => item.featured && item.visibility !== 'hide')
    return thumbnailShapes({
      layout: section?.variant,
      rowStyle: section?.rowStyle,
      thumbnailSize: section?.thumbnailSize,
      featured: Boolean(key) && large?._key === key,
    })
  },
}

interface StoredGallerySection {
  variant?: string | null
  imageDesign?: ImageDesignInput | null
}

/** A Grid or Slider tile's widest drawn width: one of two columns of the 80rem container (columnSizes). */
const GALLERY_TILE_PX = 640

/**
 * A Gallery photo, drawn as a tile (task 177). Grid and Slider cut every tile to the section's Image
 * design: 4:3, or the ratio its shape forces (Circle 1:1, Arch 4:5 or its chosen ratio). Masonry
 * keeps each photo's own shape, and the lightbox always shows the whole photo, so neither is
 * cropped. The section is two segments up: `images[_key]`.
 */
const galleryTile: FramingResolver = {
  designPath: { drop: 2 },
  // Masonry draws each photo at its own proportions: nothing to adjust, but a stored crop still trims it.
  wholeNote: {
    saved:
      'Masonry shows each photo at its own proportions, so there’s nothing to adjust here. The saved positioning still applies to this photo.',
    unsaved: 'Masonry shows each photo at its own proportions, so there’s nothing to adjust.',
  },
  resolve: (design) => {
    const section = design as StoredGallerySection | null | undefined
    if (section?.variant === 'masonry') return []
    const { shape, ratio } = resolveImageDesign(section?.imageDesign, { aspect: '4/3' })
    return [
      {
        label: 'Gallery tile',
        aspect: aspectValue(ratio ?? '4/3'),
        corner: appearanceCorner(shape),
        insetPct: 0,
        drawnPx: GALLERY_TILE_PX,
      },
    ]
  },
}

/** The Featured card's picture column: 3fr of 5 across the 80rem container (events/featured.tsx). */
const EVENT_IMAGE_PX = 768

/**
 * An event's picture (task 177): 16:9 on the Events section's Featured card and on the event's own page,
 * both requested from the CDN at 1200 x 675, so the CDN cuts exactly the area this editor shows
 * (`servedRect`). One shape, whichever section shows the event. The List and Agenda layouts draw no
 * picture. The field sits on the event document, so the design path is the document itself.
 */
const eventImage: FramingResolver = {
  designPath: { drop: 1 },
  resolve: () => [
    {
      label: 'Featured card and event page',
      aspect: 16 / 9,
      corner: 'card',
      insetPct: 0,
      drawnPx: EVENT_IMAGE_PX,
    },
  ],
}

/** Registry keys, set on an image field with `framing('…')` (lib/sanity/schema/image-framing-option.ts). */
export const FRAMING_RESOLVERS = {
  linkListProfile,
  linkListThumbnail,
  galleryTile,
  eventImage,
  // new-framing: resolver
} satisfies Record<string, FramingResolver>

export type FramingKey = keyof typeof FRAMING_RESOLVERS

export function isFramingKey(key: unknown): key is FramingKey {
  return typeof key === 'string' && Object.hasOwn(FRAMING_RESOLVERS, key)
}
