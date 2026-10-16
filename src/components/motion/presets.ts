import type { Transition, Variants } from 'motion/react'

import { motion as tokens } from '@/config/tokens.generated'
import {
  MOTION_CUSTOM,
  MOTION_DELAYS,
  MOTION_DIRECTIONS,
  MOTION_DURATIONS,
  MOTION_EASINGS,
  MOTION_INTENSITIES,
  MOTION_TRIGGERS,
  SECTION_MOTIONS,
} from '@/lib/sanity/section-style-options'

/*
 * Shared variants. Every preset has a `hidden` and a `visible` state, so they compose with
 * staggerContainer/staggerItem. Durations, easing and distance come from the design tokens
 * (tokens.json). Reduced motion: MotionConfig removes the transforms, and globals.css forces
 * `[data-reveal]` elements to their final state at once, so these never fade for those visitors.
 */

const ease = [...tokens.easeOut] as [number, number, number, number]

const transition: Transition = { duration: tokens.duration, ease }
const slowTransition: Transition = { duration: tokens.durationSlow, ease }

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: tokens.revealDistance },
  visible: { opacity: 1, y: 0, transition: slowTransition },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition },
}

export const STAGGER = 0.08

/** On the parent: reveals its `staggerItem` children one after another. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER, delayChildren: tokens.durationFast } },
}

export const staggerItem: Variants = fadeUp

/**
 * Props to spread on a Motion element so it plays `variants` on load. `data-reveal` is the hook
 * globals.css uses to show the element without JavaScript and for reduced motion; never start
 * content hidden without it. On the h1 or the first image (the LCP candidates) the variants must keep
 * opacity at 1 (the hero's parts do, see part-motion.ts).
 */
export const revealOnLoad = (variants: Variants) =>
  ({ 'data-reveal': '', variants, initial: 'hidden', animate: 'visible' }) as const

/** For the children of a `staggerContainer`: they follow the parent's `hidden`/`visible` state. */
export const revealChild = (variants: Variants = staggerItem) =>
  ({ 'data-reveal': '', variants }) as const

/** The same, played when the element scrolls into view (once). For content below the fold. */
export const revealInView = (
  variants: Variants,
  viewport: { once: true; margin?: string; amount?: number } = {
    once: true,
    margin: '0px 0px -10% 0px',
  },
) =>
  ({
    'data-reveal': '',
    variants,
    initial: 'hidden',
    whileInView: 'visible',
    viewport,
  }) as const

/*
 * The section animation library (README, "Section animation"). Three levels:
 *   1. Defaults, by kind of section (`MOTION_DEFAULTS`): what a section does with no configuration.
 *   2. Presets (`SECTION_MOTIONS`): named, typed data below.
 *   3. Advanced options (`MOTION_USES`): intensity, duration, delay, direction, trigger and exact
 *      values ("Custom"), each offered, and each read, only by the presets that use it.
 * `resolveMotion` is the one place that turns a preset and its options into what to draw. It is
 * pure, so it is unit-tested, and the Studio form reads the same tables to decide what to show.
 */

export type MotionPreset = (typeof SECTION_MOTIONS)[number]
export type MotionOption = 'intensity' | 'duration' | 'delay' | 'direction' | 'trigger' | 'custom'

/** What a section does when its style names no animation. Sections pick the kind that fits them. */
export const MOTION_DEFAULTS = {
  /** The hero's text enters by itself, after the LCP-safe elements (hero-text.tsx), so the section stays still. */
  hero: 'none',
  /** Content sections fade up as they scroll into view. */
  content: 'reveal',
  /** Logo strips and other quiet furniture stay still. */
  still: 'none',
} as const satisfies Record<string, MotionPreset>

const PARALLAX_PRESETS = ['parallax', 'parallaxMedium', 'parallaxStrong'] as const
/** Presets that move a picture, so they need one. */
export const PICTURE_PRESETS: readonly MotionPreset[] = ['float', ...PARALLAX_PRESETS]

const ENTRANCE_OPTIONS = ['duration', 'delay', 'trigger', 'custom'] as const

/** Which Advanced options each preset reads. An option not listed here is neither shown nor applied. */
export const MOTION_USES: Record<MotionPreset, readonly MotionOption[]> = {
  none: [],
  reveal: ENTRANCE_OPTIONS,
  subtle: ENTRANCE_OPTIONS,
  fade: ENTRANCE_OPTIONS,
  slide: ['duration', 'delay', 'direction', 'trigger', 'custom'],
  stagger: ENTRANCE_OPTIONS,
  float: ['duration', 'custom'],
  parallax: ['intensity'],
  parallaxMedium: ['intensity'],
  parallaxStrong: ['intensity'],
}

/** The exact values "Custom" offers a preset: a fade has no distance, a float no viewport threshold. */
export type MotionCustomField = 'duration' | 'distance' | 'easing' | 'threshold'
export function customFieldsFor(preset: MotionPreset): readonly MotionCustomField[] {
  if (!MOTION_USES[preset].includes('custom')) return []
  if (preset === 'fade') return ['duration', 'easing', 'threshold']
  if (preset === 'float') return ['duration', 'distance']
  return ['duration', 'distance', 'easing', 'threshold']
}

/** The allowed range of an exact value for a preset (a float loop is far slower and shorter-travelled than an entrance). */
export function customRange(
  preset: MotionPreset,
  field: Exclude<MotionCustomField, 'easing'>,
): { min: number; max: number } {
  if (field === 'threshold') return MOTION_CUSTOM.thresholdPercent
  if (preset === 'float') {
    return field === 'duration' ? MOTION_CUSTOM.loopMs : { min: 0, max: FLOAT_MAX_DISTANCE_PX }
  }
  return field === 'duration' ? MOTION_CUSTOM.durationMs : MOTION_CUSTOM.distancePx
}

/** Whether an Advanced option applies to a preset (and, for the exact values, whether Custom is on). */
export function motionUses(preset: MotionPreset, option: MotionOption): boolean {
  return MOTION_USES[preset].includes(option)
}

export function isMotionPreset(value: unknown): value is MotionPreset {
  return SECTION_MOTIONS.some((preset) => preset === value)
}

/** The Advanced options as stored: untrusted, so every one is checked before it is used. */
export interface MotionAdvancedInput {
  intensity?: string | null
  duration?: string | null
  delay?: string | null
  direction?: string | null
  trigger?: string | null
  custom?: boolean | null
  durationMs?: number | null
  distancePx?: number | null
  easing?: string | null
  thresholdPercent?: number | null
}

export interface MotionContext {
  /** The first section of the page: its heading and picture are LCP candidates and never start hidden. */
  isFirst: boolean
  /** Whether the section has a picture for Float and Parallax to move. */
  hasMedia: boolean
  /** The visitor's setting, where it is known (the server cannot know it: CSS covers that case). */
  reducedMotion: boolean
  /** Where the picture sits: behind the content (a hero) or beside it. Backgrounds travel further. */
  placement?: 'beside' | 'background'
}

export interface EnterPlan {
  kind: 'enter'
  /** `container` animates the whole section content once; `children` staggers its direct children. */
  target: 'container' | 'children'
  trigger: 'view' | 'load'
  /** For the container (and, with `children`, the parent whose state the children follow). */
  variants: Variants
  /** Only with `children`. */
  childVariants?: Variants
  /** `whileInView` options, when the trigger is `view`. */
  viewport: { once: true; margin?: string; amount?: number }
}
export interface FloatPlan {
  kind: 'float'
  /** The picture's total travel from the top of its drift to the bottom, in px at md and up (half of it below). */
  distancePx: number
  /** One full loop. */
  durationMs: number
}
export interface ParallaxPlan {
  kind: 'parallax'
  /** See Parallax. Positive drifts with the scroll but slower. */
  speed: number
  /** A first section is on screen at scroll 0, so it rests unshifted at the top of the page. */
  from: 'viewport' | 'top'
}
export type MotionPlan = { kind: 'none' } | EnterPlan | FloatPlan | ParallaxPlan

const NONE: MotionPlan = { kind: 'none' }

const pick = <T extends string>(allowed: readonly T[], value: unknown): T | undefined =>
  allowed.find((option) => option === value)

const clamp = (value: unknown, { min, max }: { min: number; max: number }): number | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : undefined

/** Seconds for Fast, Normal and Slow. Normal is the original Fade up (0.6 s). */
const DURATION_S = { fast: 0.35, normal: tokens.durationSlow, slow: 0.9 } as const
export const DELAY_S = { none: 0, short: 0.15, long: 0.4 } as const
/** One float loop, in ms, for Fast, Normal and Slow. */
const LOOP_MS = { fast: 6000, normal: 9000, slow: 13000 } as const
const FLOAT_DISTANCE_PX = 16
const FLOAT_MAX_DISTANCE_PX = 40
const SLIDE_DISTANCE_PX = 32
const SUBTLE_DISTANCE_PX = 12
const STAGGER_GAP_S = 0.08
const EASINGS: Record<(typeof MOTION_EASINGS)[number], [number, number, number, number]> = {
  easeOut: [...tokens.easeOut] as [number, number, number, number],
  easeInOut: [...tokens.easeInOut] as [number, number, number, number],
  easeIn: [0.4, 0, 1, 1],
  linear: [0, 0, 1, 1],
}
/** Parallax speeds by strength: [picture beside the text, picture behind it]. Subtle is the original. */
const PARALLAX_SPEEDS = {
  parallax: [0.15, 0.25],
  parallaxMedium: [0.3, 0.4],
  parallaxStrong: [0.45, 0.55],
} as const
const INTENSITY_FACTOR = { subtle: 0.6, normal: 1, bold: 1.5 } as const
const PARALLAX_SPEED_RANGE = { min: 0.05, max: 0.6 }

interface Offset {
  x?: number
  y?: number
}

/** The hidden state's offset for an entrance, before any custom distance. */
function offsetFor(preset: MotionPreset, direction: string): Offset {
  switch (preset) {
    case 'fade':
      return {}
    case 'subtle':
      return { y: SUBTLE_DISTANCE_PX }
    case 'slide':
      return direction === 'end'
        ? { x: SLIDE_DISTANCE_PX }
        : direction === 'up'
          ? { y: SLIDE_DISTANCE_PX }
          : direction === 'down'
            ? { y: -SLIDE_DISTANCE_PX }
            : { x: -SLIDE_DISTANCE_PX }
    default:
      return { y: tokens.revealDistance }
  }
}

/** Scales an offset to a chosen distance (px), keeping its axis and sign. */
function withDistance(offset: Offset, distance: number): Offset {
  const sign = (value: number) => (value < 0 ? -1 : 1)
  return {
    ...(offset.x !== undefined && { x: sign(offset.x) * distance }),
    ...(offset.y !== undefined && { y: sign(offset.y) * distance }),
  }
}

/**
 * What a section does for a preset and its Advanced options.
 *
 * - Options a preset does not use (`MOTION_USES`) are ignored, and values that are unknown or out
 *   of range fall back or clamp, so stored leftovers can never make a nonsensical animation.
 * - Float and Parallax need a picture: without one the section stays still.
 * - The first section never starts at opacity 0 (its heading and picture are what the page is
 *   judged on). It stays still unless the editor chose "On load", and then plays as a transform
 *   only; Fade, which has nothing but opacity to animate, still does nothing there.
 * - With reduced motion nothing moves.
 */
export function resolveMotion(
  preset: MotionPreset,
  advanced: MotionAdvancedInput | null | undefined,
  context: MotionContext,
): MotionPlan {
  if (preset === 'none' || context.reducedMotion) return NONE
  const options = advanced ?? {}

  if (preset === 'float') {
    if (!context.hasMedia) return NONE
    const custom = options.custom === true
    const duration = pick(MOTION_DURATIONS, options.duration) ?? 'normal'
    return {
      kind: 'float',
      durationMs: Math.round(
        (custom ? clamp(options.durationMs, customRange('float', 'duration')) : undefined) ??
          LOOP_MS[duration],
      ),
      distancePx: Math.round(
        (custom ? clamp(options.distancePx, { min: 0, max: FLOAT_MAX_DISTANCE_PX }) : undefined) ??
          FLOAT_DISTANCE_PX,
      ),
    }
  }

  if (preset === 'parallax' || preset === 'parallaxMedium' || preset === 'parallaxStrong') {
    if (!context.hasMedia) return NONE
    const [beside, background] = PARALLAX_SPEEDS[preset]
    const intensity = pick(MOTION_INTENSITIES, options.intensity) ?? 'normal'
    const speed =
      (context.placement === 'background' ? background : beside) * INTENSITY_FACTOR[intensity]
    return {
      kind: 'parallax',
      speed:
        Math.round(
          Math.min(PARALLAX_SPEED_RANGE.max, Math.max(PARALLAX_SPEED_RANGE.min, speed)) * 1000,
        ) / 1000,
      from: context.isFirst ? 'top' : 'viewport',
    }
  }

  const custom = options.custom === true
  const direction = pick(MOTION_DIRECTIONS, options.direction) ?? 'start'
  const duration = pick(MOTION_DURATIONS, options.duration) ?? 'normal'
  const delay = pick(MOTION_DELAYS, options.delay) ?? 'none'
  const fields = custom ? customFieldsFor(preset) : []

  let offset = offsetFor(preset, direction)
  const distance = fields.includes('distance')
    ? clamp(options.distancePx, customRange(preset, 'distance'))
    : undefined
  if (distance !== undefined) offset = withDistance(offset, distance)
  const customMs = fields.includes('duration')
    ? clamp(options.durationMs, customRange(preset, 'duration'))
    : undefined
  const easing = fields.includes('easing') ? pick(MOTION_EASINGS, options.easing) : undefined
  const threshold = fields.includes('threshold')
    ? clamp(options.thresholdPercent, customRange(preset, 'threshold'))
    : undefined

  const hasOffset = Boolean(offset.x) || Boolean(offset.y)
  // Nothing but opacity to animate, and opacity may not start at 0 on the first section.
  if (context.isFirst && !hasOffset) return NONE
  // The first section is already on screen, so "when it scrolls into view" would be a flash at
  // load: it stays still unless the editor asked for it to play on load.
  if (context.isFirst && pick(MOTION_TRIGGERS, options.trigger) !== 'load') return NONE

  const ease = EASINGS[easing ?? 'easeOut']
  const seconds = customMs !== undefined ? customMs / 1000 : DURATION_S[duration]
  const transition: Transition = { duration: seconds, ease }
  const startOpacity = context.isFirst ? 1 : 0
  const trigger = pick(MOTION_TRIGGERS, options.trigger) ?? 'view'
  const viewport =
    threshold !== undefined
      ? ({ once: true, amount: threshold / 100 } as const)
      : ({ once: true, margin: '0px 0px -10% 0px' } as const)
  const startDelay = DELAY_S[delay]
  const hidden = { opacity: startOpacity, ...offset }
  const visible = { opacity: 1, x: 0, y: 0 }

  if (preset === 'stagger') {
    return {
      kind: 'enter',
      target: 'children',
      trigger,
      viewport,
      variants: {
        hidden: {},
        visible: { transition: { staggerChildren: STAGGER_GAP_S, delayChildren: startDelay } },
      },
      childVariants: { hidden, visible: { ...visible, transition } },
    }
  }
  return {
    kind: 'enter',
    target: 'container',
    trigger,
    viewport,
    variants: { hidden, visible: { ...visible, transition: { ...transition, delay: startDelay } } },
  }
}

/** Props for the element an `enter` plan animates: the section's content, or (staggered) its parent. */
export function enterProps(plan: EnterPlan) {
  return plan.trigger === 'load'
    ? revealOnLoad(plan.variants)
    : revealInView(plan.variants, plan.viewport)
}
