import type { Placement } from './image-framing'
import {
  resolveProfileImage,
  type ProfileImageDesignInput,
  type ProfileImageSize,
  type ResolvedProfileBorder,
} from './profile-image-options'

/**
 * The shapes a picture is drawn in, as data, for "Adjust picture" (features/studio/components/
 * picture-framing) and for the components that draw the picture. Plain TypeScript with no React
 * and no Studio imports. A placement's resolver turns the component's design into descriptors, so
 * the editor's stage and the page come from the same answer and can't drift.
 */
export type FrameCorner = 'none' | 'card' | 'control' | 'circle' | 'arch'

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

export interface FramingResolver {
  /** Where the design sits, relative to the image field: drop this many segments off its path, then add `field`. */
  designPath: { drop: number; field: string }
  /** The decorative frame document the design points at, if any: the Studio fetches its artwork. */
  frameRef?: (design: unknown) => string | undefined
  /** The main shape first, then any others the picture is also drawn in; none when nothing is cropped. */
  resolve: (design: unknown, frameUrl?: string | null) => FrameShape[]
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
    const resolved = resolveProfileImage({
      ...(design as ProfileImageDesignInput | null | undefined),
      frameUrl,
    })
    // A logo keeps its own proportions, uncropped: nothing to adjust.
    if (resolved.shape === 'natural') return []
    const frame = resolved.border?.kind === 'frame' ? resolved.border : undefined
    const inset = frame ? PROFILE_FRAME_INSET_PCT : 0
    return [
      {
        label: 'Profile picture',
        aspect: 1,
        corner: resolved.shape === 'circle' ? 'circle' : 'card',
        insetPct: inset,
        ...(resolved.border?.kind === 'ring' && { ring: resolved.border }),
        ...(frame && { frameUrl: frame.url }),
        drawnPx: Math.round(PROFILE_DRAWN_PX[resolved.size] * (1 - (inset * 2) / 100)),
      },
    ]
  },
}

/** Registry keys, set on an image field with `framing('…')` (lib/sanity/schema/image-framing-option.ts). */
export const FRAMING_RESOLVERS = {
  linkListProfile,
  // new-framing: resolver
} satisfies Record<string, FramingResolver>

export type FramingKey = keyof typeof FRAMING_RESOLVERS

export function isFramingKey(key: unknown): key is FramingKey {
  return typeof key === 'string' && Object.hasOwn(FRAMING_RESOLVERS, key)
}
