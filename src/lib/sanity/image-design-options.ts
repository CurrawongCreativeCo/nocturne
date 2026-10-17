import {
  MOTION_TRAVEL,
  SCALE_MAX,
  SCALE_MIN,
  TRAVEL_MAX,
  TRAVEL_MIN,
  resolveImageMotion,
  type ImageMotion,
} from '@/components/motion/image-travel'

/**
 * The shared `imageDesign` object (schema: lib/sanity/schema/image-design.ts) and what the site makes
 * of it (components/ui/framed-image.tsx). The value lists are the contract with the schema; the
 * rules decide which fields the Studio shows and which stored values count, so a leftover value
 * (a frame on a circle, a travel on a still picture) can never make a nonsensical picture.
 * Kept free of Studio code so the site can import it.
 */

/** `square` is only reachable through a hero's older "Image shape" field; the schema offers the rest. */
export const IMAGE_APPEARANCES = [
  'standard',
  'rounded',
  'square',
  'circle',
  'arch',
  'framed',
] as const
export type ImageAppearance = (typeof IMAGE_APPEARANCES)[number]

export const IMAGE_APPEARANCE_TITLES: Record<ImageAppearance, string> = {
  standard: 'Standard',
  rounded: 'Rounded',
  square: 'Square corners',
  circle: 'Circle',
  arch: 'Arch',
  framed: 'Framed',
}

export const IMAGE_MOTIONS = ['none', 'subtle', 'medium'] as const
export type ImageMotionPreset = (typeof IMAGE_MOTIONS)[number]

export const IMAGE_MOTION_TITLES: Record<ImageMotionPreset, string> = {
  none: 'None',
  subtle: 'Subtle parallax',
  medium: 'Medium parallax',
}

export const IMAGE_DIRECTIONS = ['down', 'up'] as const
export type ImageDirection = (typeof IMAGE_DIRECTIONS)[number]
export const IMAGE_DIRECTION_TITLES: Record<ImageDirection, string> = {
  down: 'Down (drifts with the scroll)',
  up: 'Up (moves against the scroll)',
}

/** The built-in frames (components/ui/image-frames.tsx). The first is the default for a Framed picture. */
export const IMAGE_FRAME_PRESETS = [
  'thin-line',
  'double-line',
  'offset-border',
  'organic-brush',
  'corner-brackets',
] as const
export type ImageFramePreset = (typeof IMAGE_FRAME_PRESETS)[number]

/** `none` draws no frame; `custom` uses an approved SVG from a `frame` document. */
export const IMAGE_FRAMES = ['none', ...IMAGE_FRAME_PRESETS, 'custom'] as const
export type ImageFrame = (typeof IMAGE_FRAMES)[number]

export const IMAGE_FRAME_TITLES: Record<ImageFrame, string> = {
  none: 'No frame',
  'thin-line': 'Simple line',
  'double-line': 'Double line',
  'offset-border': 'Offset border',
  'organic-brush': 'Organic brush',
  'corner-brackets': 'Corner brackets',
  custom: 'Approved custom frame',
}

/** Colour tokens a frame may use. Classes are written out in full (components/ui/framed-image.tsx) for Tailwind's scanner. */
export const IMAGE_FRAME_COLOURS = ['accent', 'accent-2', 'highlight', 'ink'] as const
export type ImageFrameColour = (typeof IMAGE_FRAME_COLOURS)[number]
export const IMAGE_FRAME_COLOUR_TITLES: Record<ImageFrameColour, string> = {
  accent: 'Accent',
  'accent-2': 'Second accent',
  highlight: 'Highlight',
  ink: 'Text colour',
}

/** How far a frame sits in from the picture's edge (or, for the offset border, out from it), as a percentage of its size. */
export const FRAME_INSET = { min: 0, max: 12 } as const
export const FRAME_INSET_DEFAULTS: Record<ImageFramePreset, number> = {
  'thin-line': 4,
  'double-line': 3,
  'offset-border': 5,
  'organic-brush': 2,
  'corner-brackets': 4,
}

/** A custom frame's SVG: only an SVG with a viewBox, no bigger than this. */
export const CUSTOM_FRAME_MAX_BYTES = 50 * 1024

/** The only place an uploaded frame may be loaded from: the Sanity image and file CDN. */
const CDN_PREFIX = 'https://cdn.sanity.io/'
export function isCdnUrl(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(CDN_PREFIX) && !/["'()\s\\]/.test(value)
}

const pick = <T extends string>(allowed: readonly T[], value: unknown): T | undefined =>
  allowed.find((option) => option === value)

const range = (value: unknown, min: number, max: number): number | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : undefined

// --- Which fields the Studio shows -----------------------------------------------------------

/** Frames belong to the Framed appearance only. */
export const showsFrame = (appearance: string | undefined): boolean => appearance === 'framed'

export const movesPicture = (motion: string | undefined): boolean =>
  motion === 'subtle' || motion === 'medium'

export interface ImageDesignShape {
  appearance?: string | null
  motion?: string | null
  frame?: string | null
  custom?: boolean | null
}

/** Which Advanced controls apply to the current choices (the fieldset disappears when none do). */
export function imageDesignUses(design: ImageDesignShape | null | undefined) {
  const moving = movesPicture(design?.motion ?? undefined)
  const framed = showsFrame(design?.appearance ?? undefined) && design?.frame !== 'none'
  return {
    /** The Custom switch: exact motion values. */
    custom: moving,
    travel: moving && design?.custom === true,
    direction: moving && design?.custom === true,
    scale: moving && design?.custom === true,
    frameColour: framed,
    frameInset: framed,
    any: moving || framed,
  }
}

// --- What the site draws ----------------------------------------------------------------------

/** An `imageDesign` as a query returns it: untrusted, so every value is checked. */
export interface ImageDesignInput {
  appearance?: string | null
  motion?: string | null
  custom?: boolean | null
  travel?: number | null
  direction?: string | null
  scale?: number | null
  frame?: string | null
  frameColour?: string | null
  frameInset?: number | null
  /** The CDN URL of the chosen `frame` document's SVG. */
  customFrameUrl?: string | null
}

export type ResolvedFrame =
  | { kind: 'preset'; preset: ImageFramePreset; colour: ImageFrameColour; inset: number }
  | { kind: 'custom'; url: string; colour: ImageFrameColour; inset: number }

export interface ResolvedImageDesign {
  shape: ImageAppearance
  motion: ImageMotion | null
  frame: ResolvedFrame | null
}

export interface ImageDesignContext {
  /** The shape for a picture whose design names none: a hero's older "Image shape" value. Standard if unset. */
  fallbackShape?: ImageAppearance
  /** A section's own Parallax preset (README, "Section animation"), used while the picture's Motion is None. */
  sectionTravel?: number
  /** The first section of the page: its picture rests unshifted at scroll 0. */
  isFirst?: boolean
}

export function imageAppearance(value: string | null | undefined): ImageAppearance | undefined {
  return pick(IMAGE_APPEARANCES, value)
}

/**
 * A hero's older "Image shape" (`rounded`, `square`, `circle`, `arch`) as an appearance: `rounded`
 * there was the card corner, which is now `standard`. Content that names no shape is Standard.
 */
export function appearanceFromHeroShape(shape: string | null | undefined): ImageAppearance {
  return shape === 'rounded' ? 'standard' : (imageAppearance(shape) ?? 'standard')
}

/** The ratio a shape forces, if it does: a circle is always square, an arch is tall. */
export function forcedAspect(shape: ImageAppearance): '1/1' | '4/5' | undefined {
  return shape === 'circle' ? '1/1' : shape === 'arch' ? '4/5' : undefined
}

/**
 * What to draw for a picture's design. Rules, all applied here so no caller repeats them:
 * - An unknown or missing appearance falls back to the context's shape, then Standard.
 * - A frame exists only for Framed; Framed with no frame chosen gets the Simple line, and a custom
 *   frame whose file is missing (or not on the CDN) falls back to it too.
 * - Travel, direction and scale count only for Custom motion; a frame's colour and inset only for a frame.
 * - Motion None falls back to the section's own Parallax, when it has one.
 */
export function resolveImageDesign(
  input: ImageDesignInput | null | undefined,
  context: ImageDesignContext = {},
): ResolvedImageDesign {
  const design = input ?? {}
  const shape = imageAppearance(design.appearance) ?? context.fallbackShape ?? 'standard'

  const preset = pick(IMAGE_MOTIONS, design.motion) ?? 'none'
  let travel: number | undefined
  let direction: ImageDirection = 'down'
  let scale: number | undefined
  if (movesPicture(preset)) {
    travel = MOTION_TRAVEL[preset === 'medium' ? 'medium' : 'subtle']
    if (design.custom === true) {
      // Stored as a percentage of the picture's height.
      const percent = range(design.travel, TRAVEL_MIN * 100, TRAVEL_MAX * 100)
      travel = percent === undefined ? travel : percent / 100
      direction = pick(IMAGE_DIRECTIONS, design.direction) ?? direction
      scale = range(design.scale, SCALE_MIN, SCALE_MAX)
    }
  } else if (context.sectionTravel !== undefined) {
    travel = context.sectionTravel
  }
  const motion =
    travel === undefined
      ? null
      : resolveImageMotion({ travel, direction, scale, isFirst: context.isFirst })

  let frame: ResolvedFrame | null = null
  if (showsFrame(shape)) {
    const chosen = pick(IMAGE_FRAMES, design.frame) ?? IMAGE_FRAME_PRESETS[0]
    const colour = pick(IMAGE_FRAME_COLOURS, design.frameColour) ?? 'accent'
    const insetOf = (fallback: number) =>
      range(design.frameInset, FRAME_INSET.min, FRAME_INSET.max) ?? fallback
    if (chosen === 'custom' && isCdnUrl(design.customFrameUrl)) {
      frame = { kind: 'custom', url: design.customFrameUrl, colour, inset: insetOf(0) }
    } else if (chosen !== 'none') {
      const presetName = chosen === 'custom' ? IMAGE_FRAME_PRESETS[0] : chosen
      frame = {
        kind: 'preset',
        preset: presetName,
        colour,
        inset: insetOf(FRAME_INSET_DEFAULTS[presetName]),
      }
    }
  }

  return { shape, motion, frame }
}
