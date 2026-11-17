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

/** Arch ratios, width to height. Unset is 4:5, the ratio an arch has always had. */
export const IMAGE_ARCH_RATIOS = ['4/5', '3/4', '2/3'] as const
export type ImageArchRatio = (typeof IMAGE_ARCH_RATIOS)[number]
export const IMAGE_ARCH_RATIO_TITLES: Record<ImageArchRatio, string> = {
  '4/5': '4:5 (default)',
  '3/4': '3:4',
  '2/3': '2:3',
}

/** `none` draws no frame; `custom` uses approved artwork from a `frame` document. */
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

/** Upload budget, not the visitor download: raster masks are resized by the image CDN. */
export const CUSTOM_FRAME_PICTURE_MAX_BYTES = 5 * 1024 * 1024
export const CUSTOM_FRAME_PICTURE_MIN_SIZE = 1600

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

// --- Which frame is chosen --------------------------------------------------------------------

export const movesPicture = (motion: string | undefined): boolean =>
  motion === 'subtle' || motion === 'medium'

export interface ImageDesignShape {
  appearance?: string | null
  motion?: string | null
  /** The older frame field: it counts only beside the older Framed appearance. */
  frame?: string | null
  /** The frame, for any shape (task 177). Set, it wins over `frame`. */
  frameStyle?: string | null
  frameInset?: number | null
  custom?: boolean | null
}

/**
 * The frame a design draws, whatever its shape. Shape and frame are separate choices: `frameStyle`
 * holds the frame for any shape. Content saved before that keeps its look: the older Framed
 * appearance draws its `frame` (the Simple line when none was chosen) over Standard corners, and a
 * `frame` left over on any other shape is still ignored, as it always was.
 */
export function chosenFrame(design: ImageDesignShape | null | undefined): ImageFrame {
  const chosen = pick(IMAGE_FRAMES, design?.frameStyle)
  if (chosen) return chosen
  if (design?.appearance !== 'framed') return 'none'
  return pick(IMAGE_FRAMES, design.frame) ?? IMAGE_FRAME_PRESETS[0]
}

/** A built-in frame's inset when none is stored. An approved custom frame fills the picture (0). */
export function defaultFrameInset(frame: ImageFrame): number {
  return frame === 'none' || frame === 'custom' ? 0 : FRAME_INSET_DEFAULTS[frame]
}

/**
 * Whether a frame draws anything past the picture's edge. The offset border always does (down and to
 * the right, by its inset). A line drawn exactly on the edge (inset 0) reaches half its stroke past
 * it. An approved frame and the Organic brush stay inside.
 */
export function frameReachesOut(frame: ImageFrame, inset: number): boolean {
  if (frame === 'offset-border') return true
  if (frame === 'thin-line' || frame === 'double-line' || frame === 'corner-brackets') {
    return inset === 0
  }
  return false
}

/** Which Advanced controls apply to the current choices (the fieldset disappears when none do). */
export function imageDesignUses(design: ImageDesignShape | null | undefined) {
  const moving = movesPicture(design?.motion ?? undefined)
  const frame = chosenFrame(design)
  const framed = frame !== 'none'
  const inset =
    range(design?.frameInset, FRAME_INSET.min, FRAME_INSET.max) ?? defaultFrameInset(frame)
  const arch = design?.appearance === 'arch'
  const overlap = framed && frameReachesOut(frame, inset)
  return {
    /** The Custom switch: exact motion values. */
    custom: moving,
    travel: moving && design?.custom === true,
    direction: moving && design?.custom === true,
    scale: moving && design?.custom === true,
    archRatio: arch,
    frameColour: framed,
    frameInset: framed,
    frameOverlap: overlap,
    any: moving || framed || arch,
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
  frameStyle?: string | null
  frameColour?: string | null
  frameInset?: number | null
  /** An Arch's ratio (IMAGE_ARCH_RATIOS); unset is 4:5. */
  archRatio?: string | null
  /** The frame may run into the space around the picture; unset, the layout keeps room for it. */
  frameOverlap?: boolean | null
  /** The CDN URL of the chosen `frame` document's artwork. */
  customFrameUrl?: string | null
}

export type ResolvedFrame =
  | { kind: 'preset'; preset: ImageFramePreset; colour: ImageFrameColour; inset: number }
  | { kind: 'custom'; url: string; colour: ImageFrameColour; inset: number }

export interface ResolvedImageDesign {
  shape: ImageAppearance
  /** The ratio the shape forces (Circle 1:1, Arch 4:5 or its chosen ratio), if it forces one. */
  ratio: ForcedAspect | undefined
  motion: ImageMotion | null
  frame: ResolvedFrame | null
  /**
   * How a line frame (Simple, Double, Offset) is drawn: along the shape's outline on Rounded, Circle
   * and Arch, or as the built-in artwork's rectangle, as Standard and Framed always have.
   */
  outline: 'shape' | 'artwork'
  /** Room the layout keeps for the frame past the picture's edge; null when it needs none or may overlap. */
  reach: FrameReach | null
}

export interface ImageDesignContext {
  /** The shape for a picture whose design names none: a hero's older "Image shape" value. Standard if unset. */
  fallbackShape?: ImageAppearance
  /** A section's own Parallax preset (README, "Section animation"), used while the picture's Motion is None. */
  sectionTravel?: number
  /** The first section of the page: its picture rests unshifted at scroll 0. */
  isFirst?: boolean
  /** The picture's ratio when its shape forces none (FramedImage's `aspect`), for the frame's reach. */
  aspect?: string
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

export type ForcedAspect = '1/1' | ImageArchRatio

/** The ratio a shape forces, if it does: a circle is always square, an arch is tall (4:5 unless chosen). */
export function forcedAspect(
  shape: ImageAppearance,
  archRatio?: string | null,
): ForcedAspect | undefined {
  if (shape === 'circle') return '1/1'
  if (shape === 'arch') return pick(IMAGE_ARCH_RATIOS, archRatio) ?? '4/5'
  return undefined
}

/** A ratio such as '4/3' as a number (width over height). */
export function aspectValue(ratio: string): number {
  const [width = 1, height = 1] = ratio.split('/').map(Number)
  return width / height
}

/** Shapes whose own outline a line frame follows. Standard, Square corners and Framed keep the artwork. */
const OUTLINED_SHAPES: readonly ImageAppearance[] = ['rounded', 'circle', 'arch']
const OUTLINE_FRAMES: readonly ImageFramePreset[] = ['thin-line', 'double-line', 'offset-border']

/**
 * One side's reach past the picture's edge: `share` of the picture's width plus `px` CSS pixels. A
 * vertical side's share is already converted from the picture's height through its ratio.
 */
export interface SideReach {
  share: number
  px: number
}
export interface FrameReach {
  top: SideReach
  right: SideReach
  bottom: SideReach
  left: SideReach
}

/** Half of each built-in frame's widest stroke, in CSS pixels (components/ui/image-frames.tsx). */
const HALF_STROKE: Record<ImageFramePreset, number> = {
  'thin-line': 1,
  'double-line': 1,
  'offset-border': 1,
  'organic-brush': 1.5,
  'corner-brackets': 1.5,
}

/**
 * How far a frame's drawing reaches past the picture, per side, for a picture of `aspect` (width over
 * height). Null when it stays inside. The offset border reaches its inset down and to the right, plus
 * half its stroke; a line drawn on the edge (inset 0) reaches half its stroke on every side.
 */
export function frameReach(frame: ResolvedFrame | null, aspect: number): FrameReach | null {
  if (!frame || frame.kind === 'custom') return null
  const { preset, inset } = frame
  if (!frameReachesOut(preset, inset)) return null
  const edge: SideReach = inset === 0 ? { share: 0, px: HALF_STROKE[preset] } : { share: 0, px: 0 }
  if (preset !== 'offset-border') return { top: edge, right: edge, bottom: edge, left: edge }
  const px = HALF_STROKE[preset]
  return {
    top: edge,
    right: { share: inset / 100, px },
    bottom: { share: round(inset / 100 / aspect), px },
    left: edge,
  }
}

/**
 * The picture box's width and margins that keep a frame's reach inside the space the layout gives
 * it, so a gap between pictures stays the gap that was set. Margins in percent are of the containing
 * block's width on every side, which is what the shares are in. The parent must contain the margins
 * (`display: flow-root`).
 */
export function reserveStyle(reach: FrameReach): {
  width: string
  marginTop: string
  marginRight: string
  marginBottom: string
  marginLeft: string
} {
  const fixed = reach.left.px + reach.right.px
  const scale = 1 + reach.left.share + reach.right.share
  const width = `(100% - ${fixed}px) / ${round(scale)}`
  const side = ({ share, px }: SideReach) =>
    share === 0 ? `${px}px` : `calc((${width}) * ${round(share)} + ${px}px)`
  return {
    width: `calc(${width})`,
    marginTop: side(reach.top),
    marginRight: side(reach.right),
    marginBottom: side(reach.bottom),
    marginLeft: side(reach.left),
  }
}

const round = (value: number) => Math.round(value * 1e6) / 1e6

/**
 * What to draw for a picture's design. Rules, all applied here so no caller repeats them:
 * - An unknown or missing appearance falls back to the context's shape, then Standard.
 * - The frame is `chosenFrame`: Frame (`frameStyle`) on any shape, else the older Framed's own frame
 *   (the Simple line if none was chosen). A custom frame whose file is missing (or not on the CDN)
 *   falls back to the Simple line.
 * - Circle is 1:1; Arch is 4:5 unless another Arch ratio is chosen.
 * - A frame that reaches past the picture gets room in the layout (`reach`), unless Allow frame
 *   overlap is on.
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
  const chosen = chosenFrame({ ...design, appearance: shape })
  if (chosen !== 'none') {
    const colour = pick(IMAGE_FRAME_COLOURS, design.frameColour) ?? 'accent'
    const insetOf = (fallback: number) =>
      range(design.frameInset, FRAME_INSET.min, FRAME_INSET.max) ?? fallback
    if (chosen === 'custom' && isCdnUrl(design.customFrameUrl)) {
      frame = { kind: 'custom', url: design.customFrameUrl, colour, inset: insetOf(0) }
    } else {
      const presetName = chosen === 'custom' ? IMAGE_FRAME_PRESETS[0] : chosen
      frame = {
        kind: 'preset',
        preset: presetName,
        colour,
        inset: insetOf(FRAME_INSET_DEFAULTS[presetName]),
      }
    }
  }

  const ratio = forcedAspect(shape, design.archRatio)
  const outline =
    frame?.kind === 'preset' &&
    OUTLINED_SHAPES.includes(shape) &&
    OUTLINE_FRAMES.includes(frame.preset)
      ? 'shape'
      : 'artwork'
  // The box's own ratio: forced by the shape, else the caller's (4:3 for a framed picture).
  const reach =
    design.frameOverlap === true
      ? null
      : frameReach(frame, aspectValue(ratio ?? context.aspect ?? '4/3'))

  return { shape, ratio, motion, frame, outline, reach }
}
