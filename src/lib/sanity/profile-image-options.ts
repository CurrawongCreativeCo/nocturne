import { stegaClean } from 'next-sanity'

import { GRADIENT_SLUG_PATTERN } from '@/lib/color/gradients'

import { isCdnUrl } from './image-design-options'

/**
 * A small portrait or logo at the top of a section (components/ui/profile-image.tsx): the Link
 * list's profile picture today, and the shape a team or testimonial avatar could share. Sizes are
 * relative to the layout's own (Medium is what each layout always drew), so they stay in proportion.
 * Kept free of Studio code so the site can import it.
 */
export const PROFILE_IMAGE_SIZES = ['small', 'medium', 'large'] as const
export type ProfileImageSize = (typeof PROFILE_IMAGE_SIZES)[number]
export const PROFILE_IMAGE_SIZE_TITLES: Record<ProfileImageSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}

/** `natural` keeps a logo's own proportions, uncropped: for wordmarks and marks that aren't round. */
export const PROFILE_IMAGE_SHAPES = ['circle', 'rounded', 'natural'] as const
export type ProfileImageShape = (typeof PROFILE_IMAGE_SHAPES)[number]
export const PROFILE_IMAGE_SHAPE_TITLES: Record<ProfileImageShape, string> = {
  circle: 'Circle',
  rounded: 'Rounded square',
  natural: 'Logo, uncropped',
}

/**
 * `line` and `gradient` draw a ring around the picture, with a see-through gap; `frame` lays an
 * approved custom frame (Design > Image frames, the same SVG frames as Image design) around it.
 */
export const PROFILE_BORDERS = ['none', 'line', 'gradient', 'frame'] as const
export type ProfileBorder = (typeof PROFILE_BORDERS)[number]
export const PROFILE_BORDER_TITLES: Record<ProfileBorder, string> = {
  none: 'None',
  line: 'Solid ring',
  gradient: 'Gradient ring',
  frame: 'Decorative frame',
}

export const BORDER_WIDTHS = ['thin', 'medium', 'thick'] as const
export type BorderWidth = (typeof BORDER_WIDTHS)[number]
export const BORDER_WIDTH_TITLES: Record<BorderWidth, string> = {
  thin: 'Thin',
  medium: 'Medium',
  thick: 'Thick',
}
/** In pixels: rings are hairline-to-bold accents, not frames, so they don't scale with the picture. */
export const BORDER_WIDTH_PX: Record<BorderWidth, number> = { thin: 2, medium: 4, thick: 6 }

export const BORDER_GAPS = ['none', 'small', 'large'] as const
export type BorderGap = (typeof BORDER_GAPS)[number]
export const BORDER_GAP_TITLES: Record<BorderGap, string> = {
  none: 'None',
  small: 'Small',
  large: 'Large',
}
export const BORDER_GAP_PX: Record<BorderGap, number> = { none: 0, small: 3, large: 6 }

const pick = <T extends string>(allowed: readonly T[], value: unknown): T | undefined => {
  const clean = typeof value === 'string' ? stegaClean(value) : value
  return allowed.find((option) => option === clean)
}

/** A section's profile design as a query returns it: untrusted, so every value is checked. */
export interface ProfileImageDesignInput {
  imageSize?: string | null
  imageShape?: string | null
  border?: string | null
  borderWidth?: string | null
  borderGap?: string | null
  /** The slug of a Brand colours gradient, for the gradient ring. */
  borderGradient?: string | null
  /** The CDN URL of the chosen `frame` document's SVG. */
  frameUrl?: string | null
}

export type ResolvedProfileBorder =
  | { kind: 'ring'; widthPx: number; gapPx: number; gradient: string | null }
  | { kind: 'frame'; url: string }

export interface ResolvedProfileImage {
  size: ProfileImageSize
  shape: ProfileImageShape
  border: ResolvedProfileBorder | null
}

/**
 * What to draw. Unset everywhere is Medium, Circle, no border: the original picture. A gradient
 * ring with no gradient chosen runs from Primary to Secondary; a frame whose file is missing (or not
 * on the CDN) draws no border rather than a broken one.
 */
export function resolveProfileImage(
  input: ProfileImageDesignInput | null | undefined,
): ResolvedProfileImage {
  const size = pick(PROFILE_IMAGE_SIZES, input?.imageSize) ?? 'medium'
  const shape = pick(PROFILE_IMAGE_SHAPES, input?.imageShape) ?? 'circle'
  const kind = pick(PROFILE_BORDERS, input?.border) ?? 'none'
  const frameUrl = input?.frameUrl
  let border: ResolvedProfileBorder | null = null
  if (kind === 'line' || kind === 'gradient') {
    const slug = stegaClean(input?.borderGradient)
    border = {
      kind: 'ring',
      widthPx: BORDER_WIDTH_PX[pick(BORDER_WIDTHS, input?.borderWidth) ?? 'thin'],
      gapPx: BORDER_GAP_PX[pick(BORDER_GAPS, input?.borderGap) ?? 'small'],
      gradient:
        kind === 'gradient'
          ? slug && GRADIENT_SLUG_PATTERN.test(slug)
            ? `var(--gradient-${slug}, linear-gradient(135deg, var(--color-accent), var(--color-accent-2)))`
            : 'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))'
          : null,
    }
  } else if (kind === 'frame' && isCdnUrl(frameUrl)) {
    border = { kind: 'frame', url: frameUrl }
  }
  return { size, shape, border }
}
