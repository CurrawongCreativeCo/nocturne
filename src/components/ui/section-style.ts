import { stegaClean } from 'next-sanity'

import {
  MOTION_DEFAULTS,
  resolveMotion,
  type MotionAdvancedInput,
  type MotionContext,
} from '@/components/motion/presets'
import { GRADIENT_SLUG_PATTERN } from '@/lib/color/gradients'
import {
  SECTION_ALIGNS,
  SECTION_IMAGE_HORIZONTALS,
  SECTION_IMAGE_REPEATS,
  SECTION_IMAGE_SIZES,
  imageStrengthOpacity,
  SECTION_IMAGE_VERTICALS,
  SECTION_WASHES,
  imageSizeUsesFixed,
  imageSizeUsesPosition,
  imageSizeUsesRepeat,
  SECTION_EDGES,
  SECTION_EDGE_ACCENTS,
  SECTION_EDGE_HEIGHTS,
  SECTION_EDGE_LAYERS,
  SECTION_MOTIONS,
  SECTION_OVERLAYS,
  SECTION_SPACINGS,
  SECTION_TONES,
  SECTION_WIDTHS,
  defaultOverlayFor,
  edgeAllowsFlip,
  edgeAllowsInvert,
} from '@/lib/sanity/section-style-options'
import type { SanityImageData } from '@/types/sanity'

import { customEdgeHeight, type ResolvedEdge } from './section-edges'

/**
 * Turns a section's `style` object (schema: lib/sanity/schema/section-style.ts) into the classes and
 * attributes SectionFrame renders. Pure, so it is unit-tested. Values it doesn't recognise (a
 * dataset newer than this deployment) and unset ones fall back to the section's `defaults`, which is
 * what makes a section without a style look exactly as it did before styles existed.
 */

export type SectionTone = (typeof SECTION_TONES)[number]
export type SectionSpacing = (typeof SECTION_SPACINGS)[number]
export type SectionWidth = (typeof SECTION_WIDTHS)[number]
export type SectionAlign = (typeof SECTION_ALIGNS)[number]
export type SectionMotion = (typeof SECTION_MOTIONS)[number]
export type SectionOverlay = (typeof SECTION_OVERLAYS)[number]
export type SectionImageSize = (typeof SECTION_IMAGE_SIZES)[number]
export type SectionImageRepeat = (typeof SECTION_IMAGE_REPEATS)[number]
export type SectionWash = (typeof SECTION_WASHES)[number]

/** A section's `style` as a query returns it: every field optional, possibly with edit markers. */
export interface SectionStyleInput {
  tone?: string | null
  spacing?: string | null
  width?: string | null
  align?: string | null
  anchorId?: string | null
  motion?: string | null
  /** The Advanced animation options (README, "Section animation"); each applies only to the presets that use it. */
  motionIntensity?: string | null
  motionDuration?: string | null
  motionDelay?: string | null
  motionDirection?: string | null
  motionTrigger?: string | null
  motionCustom?: boolean | null
  motionDurationMs?: number | null
  motionDistancePx?: number | null
  motionEasing?: string | null
  motionThreshold?: number | null
  /** The slug of one of the brand gradients in Design settings (`--gradient-<slug>`). */
  gradient?: string | null
  /** A picture behind the content, with `overlay` laying the tone's colour over it. */
  image?: SanityImageData | null
  overlay?: string | null
  /** How the picture sits (README, "Section backgrounds"); each applies only to the sizes that use it. */
  imageSize?: string | null
  imageVertical?: string | null
  imageHorizontal?: string | null
  imageRepeat?: string | null
  imageStrength?: string | null
  /** An exact strength in percent; wins over `imageStrength`. */
  imageStrengthPercent?: number | null
  overlayColor?: string | null
  imageFixed?: boolean | null
  /** The section is at least as tall as the screen, its content centred (README, "Section height"). */
  fillScreen?: boolean | null
  /** The shape of the bottom edge (section dividers); unset or 'none' for a straight one. */
  edge?: string | null
  edgeHeight?: string | null
  edgeFlip?: boolean | null
  edgeAccent?: string | null
  edgeLayer?: string | null
  edgeInvert?: boolean | null
  edgeHeightMobile?: number | null
  edgeHeightTablet?: number | null
  edgeHeightDesktop?: number | null
}

/** How one kind of section looks when its style is empty. Keep it equal to its schema's `initial`. */
export interface SectionDefaults {
  tone?: SectionTone
  /** What "Default" means for this section: its usual space above and below. */
  spacing?: SectionSpacing
  /** Classes for "Default" width: its usual `max-w-*`. */
  container?: string
  align?: SectionAlign
  /** What this kind of section does with no animation chosen: `MOTION_DEFAULTS.hero | content | still` (content when left out). */
  motion?: SectionMotion
}

export interface ResolvedSectionStyle {
  tone: SectionTone
  align: SectionAlign
  motion: SectionMotion
  anchorId: string | undefined
  /** The brand gradient behind the content, as a CSS variable name without `--gradient-`. */
  gradient: string | undefined
  /** The background picture; undefined when there is none (an image without an asset counts as none). */
  image: SanityImageData | undefined
  /** How strongly the tone covers the picture; meaningful only with an `image`. */
  overlay: SectionOverlay
  /** How the picture is placed, sized and washed (see `resolveBackgroundImage`). */
  backgroundImage: ResolvedBackgroundImage
  /** The bottom edge; undefined for a straight one. */
  edge: ResolvedEdge | undefined
  /** Which spacing choice the section uses, so the edge's padding maths can follow it. */
  spacing: SectionSpacing
  /** On the <section>: spacing and gutters. The tone is carried by `data-tone`. */
  sectionClass: string
  /** On the element inside it that holds the content: width and centring. */
  containerClass: string
}

// Full class names so Tailwind's scanner sees them.
const SPACING_CLASSES: Record<SectionSpacing, string> = {
  compact: 'py-section-compact',
  default: 'py-section',
  spacious: 'py-section-spacious',
}

const WIDTH_CLASSES: Record<Exclude<SectionWidth, 'default'>, string> = {
  narrow: 'max-w-measure-narrow',
  wide: 'max-w-content',
  full: 'max-w-none',
}

const DEFAULT_CONTAINER = 'max-w-content'

/**
 * "At least the screen's height": at least the viewport tall (dvh, so a phone's address bar does not
 * cut it), content centred. A min-height, never a height, so long content grows the section and scrolls.
 */
const FILL_SCREEN_CLASS = 'min-h-dvh flex flex-col justify-center'
/** A Cover the screen picture needs a section at least the window's height to cover it; the content stays put. */
const SCREEN_PICTURE_CLASS = 'min-h-dvh'

/** Where each choice puts the picture: CSS positions for object-position and background-position. */
const VERTICAL_POSITION: Record<(typeof SECTION_IMAGE_VERTICALS)[number], string> = {
  top: '0%',
  middle: '50%',
  bottom: '100%',
}
const HORIZONTAL_POSITION: Record<(typeof SECTION_IMAGE_HORIZONTALS)[number], string> = {
  left: '0%',
  center: '50%',
  right: '100%',
}
/** The same nine places as flex alignment, for a picture drawn at its own size inside the layer. */
const VERTICAL_ALIGN_CLASS: Record<(typeof SECTION_IMAGE_VERTICALS)[number], string> = {
  top: 'items-start',
  middle: 'items-center',
  bottom: 'items-end',
}
const HORIZONTAL_ALIGN_CLASS: Record<(typeof SECTION_IMAGE_HORIZONTALS)[number], string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}
const REPEAT_CSS: Record<SectionImageRepeat, 'no-repeat' | 'repeat-x' | 'repeat-y' | 'repeat'> = {
  none: 'no-repeat',
  x: 'repeat-x',
  y: 'repeat-y',
  both: 'repeat',
}

export interface ResolvedBackgroundImage {
  size: SectionImageSize
  /** `object-position` / `background-position`; undefined for Fill the section, where the hotspot decides. */
  position: string | undefined
  /** Flex alignment of a picture drawn at its own size; empty unless the size is Actual size. */
  alignClass: string
  repeat: SectionImageRepeat
  /** `background-repeat` for the tiled layer. */
  repeatCss: (typeof REPEAT_CSS)[SectionImageRepeat]
  /** The picture's opacity, 0 to 1. */
  strength: number
  wash: SectionWash
  /** Stays put while the page scrolls (large screens, no reduced motion). */
  fixed: boolean
  /** Cover the screen: the picture is the window's size and stays in view while the section scrolls. */
  screen: boolean
  /** Drawn as a CSS background so it can repeat; every other mode uses SanityImage. */
  tiled: boolean
}

/**
 * The background picture's placement, strength and wash. Options that don't apply to the chosen
 * size (Position for Fill the section, Repeat for anything but Actual size) are ignored, so a value
 * left behind after the editor changed size cannot produce a nonsensical background. Unset, it is
 * today's picture: Fill the section, the hotspot, Full, the background colour.
 */
export function resolveBackgroundImage(
  style: SectionStyleInput | null | undefined,
): ResolvedBackgroundImage {
  const size = pick(SECTION_IMAGE_SIZES, style?.imageSize) ?? 'cover'
  const vertical = pick(SECTION_IMAGE_VERTICALS, style?.imageVertical) ?? 'middle'
  const horizontal = pick(SECTION_IMAGE_HORIZONTALS, style?.imageHorizontal) ?? 'center'
  const positioned = imageSizeUsesPosition(size)
  const repeat = imageSizeUsesRepeat(size)
    ? (pick(SECTION_IMAGE_REPEATS, style?.imageRepeat) ?? 'none')
    : 'none'

  return {
    size,
    position: positioned
      ? `${HORIZONTAL_POSITION[horizontal]} ${VERTICAL_POSITION[vertical]}`
      : undefined,
    alignClass:
      size === 'actual'
        ? `${VERTICAL_ALIGN_CLASS[vertical]} ${HORIZONTAL_ALIGN_CLASS[horizontal]}`
        : '',
    repeat,
    repeatCss: REPEAT_CSS[repeat],
    strength: imageStrengthOpacity(style?.imageStrength, style?.imageStrengthPercent),
    wash: pick(SECTION_WASHES, style?.overlayColor) ?? 'background',
    fixed: style?.imageFixed === true && imageSizeUsesFixed(size),
    screen: size === 'screen',
    tiled: repeat !== 'none',
  }
}

function pick<T extends string>(
  allowed: readonly T[],
  value: string | null | undefined,
): T | undefined {
  const clean = stegaClean(value)
  return allowed.find((option) => option === clean)
}

/**
 * A section's bottom edge. Options that don't apply to the chosen shape (Flip on a symmetrical curve,
 * Invert on a diagonal, a back-wave colour on anything but the layered wave) are ignored, so a value
 * left behind after the editor changed shape can't produce a nonsensical edge.
 */
export function resolveEdge(style: SectionStyleInput | null | undefined): ResolvedEdge | undefined {
  const edge = pick(SECTION_EDGES, style?.edge)
  if (!edge || edge === 'none') return undefined
  const size = pick(SECTION_EDGE_HEIGHTS, style?.edgeHeight) ?? 'medium'
  const custom = customEdgeHeight({
    mobile: style?.edgeHeightMobile,
    tablet: style?.edgeHeightTablet,
    desktop: style?.edgeHeightDesktop,
  })

  return {
    shape: edge,
    flip: edgeAllowsFlip(edge) && style?.edgeFlip === true,
    invert: edgeAllowsInvert(edge) && style?.edgeInvert === true,
    height: custom ?? { kind: 'token', size },
    accent: pick(SECTION_EDGE_ACCENTS, style?.edgeAccent) ?? 'none',
    layer: pick(SECTION_EDGE_LAYERS, style?.edgeLayer) ?? 'accent-2',
  }
}

/** The stored Advanced animation options, cleaned of edit markers. */
export function motionAdvancedOf(style: SectionStyleInput | null | undefined): MotionAdvancedInput {
  return {
    intensity: stegaClean(style?.motionIntensity),
    duration: stegaClean(style?.motionDuration),
    delay: stegaClean(style?.motionDelay),
    direction: stegaClean(style?.motionDirection),
    trigger: stegaClean(style?.motionTrigger),
    custom: style?.motionCustom,
    durationMs: style?.motionDurationMs,
    distancePx: style?.motionDistancePx,
    easing: stegaClean(style?.motionEasing),
    thresholdPercent: style?.motionThreshold,
  }
}

/**
 * What a section's animation does: the chosen preset (or the section's default) and its Advanced
 * options through `resolveMotion`. `hasMedia` is whether the section has a picture to move;
 * `reducedMotion` is left false on the server, where CSS covers visitors who ask for less motion.
 */
export function sectionMotion(
  style: SectionStyleInput | null | undefined,
  defaults: SectionDefaults | undefined,
  context: Pick<MotionContext, 'isFirst' | 'hasMedia' | 'placement'> &
    Partial<Pick<MotionContext, 'reducedMotion'>>,
) {
  const { motion } = resolveSectionStyle(style, defaults)
  return resolveMotion(motion, motionAdvancedOf(style), { reducedMotion: false, ...context })
}

export function resolveSectionStyle(
  style: SectionStyleInput | null | undefined,
  defaults: SectionDefaults = {},
): ResolvedSectionStyle {
  const spacing = pick(SECTION_SPACINGS, style?.spacing)
  const width = pick(SECTION_WIDTHS, style?.width)
  const anchorId = stegaClean(style?.anchorId) || undefined
  const tone = pick(SECTION_TONES, style?.tone) ?? defaults.tone ?? 'surface'
  const gradient = stegaClean(style?.gradient)

  const resolvedSpacing =
    !spacing || spacing === 'default' ? (defaults.spacing ?? 'default') : spacing
  const container =
    !width || width === 'default' ? (defaults.container ?? DEFAULT_CONTAINER) : WIDTH_CLASSES[width]
  const image = style?.image?.asset ? style.image : undefined
  const backgroundImage = resolveBackgroundImage(style)
  // Height and picture are separate choices: centring is only ever "At least the screen's height".
  const height =
    style?.fillScreen === true
      ? ` ${FILL_SCREEN_CLASS}`
      : image && backgroundImage.screen
        ? ` ${SCREEN_PICTURE_CLASS}`
        : ''

  return {
    tone,
    align: pick(SECTION_ALIGNS, style?.align) ?? defaults.align ?? 'start',
    motion: pick(SECTION_MOTIONS, style?.motion) ?? defaults.motion ?? MOTION_DEFAULTS.content,
    anchorId,
    // Only a slug the schema could have produced reaches a style attribute.
    gradient: gradient && GRADIENT_SLUG_PATTERN.test(gradient) ? gradient : undefined,
    image,
    overlay: pick(SECTION_OVERLAYS, style?.overlay) ?? defaultOverlayFor(tone),
    backgroundImage,
    edge: resolveEdge(style),
    spacing: resolvedSpacing,
    // A full-width section runs edge to edge, so it keeps no gutters of its own.
    // The site header is sticky, so a linked-to section needs room above it.
    sectionClass: `relative isolate ${SPACING_CLASSES[resolvedSpacing]}${width === 'full' ? '' : ' px-gutter'}${anchorId ? ' scroll-mt-24' : ''}${height}`,
    containerClass: `mx-auto w-full ${container}`,
  }
}

/** Classes that follow a section's alignment, for the parts it aligns (headings, intro text, buttons). */
const ALIGN_CLASSES = {
  start: { block: '', text: '', justify: '' },
  center: { block: 'mx-auto', text: 'text-center', justify: 'justify-center' },
} as const

/** What a section's own markup needs from its style: its tone (for buttons), alignment classes and motion preset. */
export function sectionTraits(
  style: SectionStyleInput | null | undefined,
  defaults: SectionDefaults = {},
) {
  const { align, tone, motion } = resolveSectionStyle(style, defaults)
  return { tone, align, motion, ...ALIGN_CLASSES[align] }
}

/** Buttons are drawn for a dark or a light background; the dark tones need the dark set. */
export function ctaSurfaceFor(tone: SectionTone): 'dark' | 'light' {
  return tone === 'inverse' || tone === 'accent' ? 'dark' : 'light'
}
