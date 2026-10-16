import type { Transition, Variants } from 'motion/react'

import { motion as tokens } from '@/config/tokens.generated'
import { PART_DELAYS, PART_PRESETS } from '@/lib/sanity/section-style-options'

import {
  DELAY_S,
  STAGGER,
  resolveMotion,
  revealOnLoad,
  type FloatPlan,
  type MotionPlan,
  type ParallaxPlan,
} from './presets'

/*
 * Per-part animation (README, "Animating individual parts"). A section declares its animatable parts
 * in code (`PartSpec`; the hero's are in features/pages/utils/hero-parts.ts); an editor may then give
 * each part that exists its own preset and delay. `resolvePartMotion` is the one place that turns that
 * into what to draw, and it is pure, so it is unit-tested. Three levels, each overriding the one before:
 *   1. The component default (`PartSpec.default`): what a part does with nothing chosen.
 *   2. The section's animation (`resolveMotion`, task 84): an entrance on the section's content moves
 *      every part with it, so they add nothing of their own; Float and Parallax belong to the picture parts.
 *   3. The part's override, honoured only while "Animate individual parts" is on.
 * The first section's LCP candidates (`PartSpec.lcp`: the heading and the pictures) must paint whole with
 * the page, so they ignore Fade, Reveal and Scale, which start with less of the part showing, and Rise and
 * Slide start at opacity 1. A combination that makes no sense (Parallax on text) is ignored, never drawn.
 */

export type PartEntrance = 'fade' | 'rise' | 'reveal' | 'slide' | 'scale'
export type PartPreset = (typeof PART_PRESETS)[number]

export interface PartSpec {
  /** A picture: the only kind of part Parallax can move. `beside` the text or `background` behind it. */
  media: 'beside' | 'background' | false
  /** Takes a step in the Auto timing sequence (text parts do; pictures play from the start). */
  sequenced: boolean
  /** An LCP candidate: in the first section it never starts at opacity 0. */
  lcp: boolean
  /** What the part does with nothing chosen. */
  default: 'none' | PartEntrance
}

/** One part's stored choice: untrusted, so each value is checked before use. */
export interface PartOverride {
  preset?: string | null
  delay?: string | null
}

export interface PartContext {
  /** The first section of the page: its heading and picture are LCP candidates. */
  isFirst: boolean
  /** The visitor's setting, where it is known (the server cannot know it: CSS covers that case). */
  reducedMotion: boolean
}

export interface PartEnterPlan {
  kind: 'enter'
  preset: PartEntrance
  variants: Variants
  /** Seconds before it starts. */
  delayS: number
}
/** What a part does. Float and Parallax are the section's own plans, passed on to its pictures. */
export type PartPlan = { kind: 'none' } | PartEnterPlan | FloatPlan | ParallaxPlan

const NONE: PartPlan = { kind: 'none' }

const SLIDE_DISTANCE_PX = 32
const SCALE_FROM = 0.95
/** The wipe: the part is uncovered from the start edge to the end, with room around it for descenders. */
const REVEAL_HIDDEN = 'inset(-10% 100% -10% -5%)'
const REVEAL_SHOWN = 'inset(-10% -5% -10% -5%)'

const ease = [...tokens.easeOut] as [number, number, number, number]
const ENTRANCES: readonly PartEntrance[] = ['fade', 'rise', 'reveal', 'slide', 'scale']

const isEntrance = (value: string): value is PartEntrance =>
  ENTRANCES.some((entrance) => entrance === value)

/** The presets an editor is offered for a part: Parallax only for pictures. */
export function partPresetsFor(spec: PartSpec): readonly PartPreset[] {
  return spec.media ? PART_PRESETS : PART_PRESETS.filter((preset) => preset !== 'parallax')
}

/**
 * Entrances that start with less of the part showing (nothing, or a smaller or clipped version of it).
 * Chrome counts a heading toward LCP again whenever more of it is painted, so on an LCP candidate these
 * would move the LCP to when JavaScript has finished playing them (Lighthouse: 1.5 s became 4 s).
 */
const SHRINKS_PART: readonly PartEntrance[] = ['fade', 'reveal', 'scale']

/**
 * Hidden and visible states of an entrance. Opacity starts at `startOpacity` (0, or 1 for an LCP
 * candidate in the first section, which then only moves); Reveal never touches opacity, it is a clip-path.
 */
export function entranceVariants(
  entrance: PartEntrance,
  delayS: number,
  startOpacity: 0 | 1,
): Variants {
  const transition: Transition = { duration: tokens.durationSlow, ease, delay: delayS }
  switch (entrance) {
    case 'fade':
      return { hidden: { opacity: 0 }, visible: { opacity: 1, transition } }
    case 'slide':
      return {
        hidden: { opacity: startOpacity, x: -SLIDE_DISTANCE_PX },
        visible: { opacity: 1, x: 0, transition },
      }
    case 'scale':
      return {
        hidden: { opacity: startOpacity, scale: SCALE_FROM },
        visible: { opacity: 1, scale: 1, transition },
      }
    case 'reveal':
      return {
        hidden: { clipPath: REVEAL_HIDDEN },
        visible: { clipPath: REVEAL_SHOWN, transition },
      }
    default:
      return {
        hidden: { opacity: startOpacity, y: tokens.revealDistance },
        visible: { opacity: 1, y: 0, transition },
      }
  }
}

type Choice = { kind: 'entrance'; entrance: PartEntrance } | { kind: 'plan'; plan: PartPlan }

const entranceOf = (entrance: PartEntrance): Choice => ({ kind: 'entrance', entrance })
const round = (seconds: number) => Math.round(seconds * 1000) / 1000

const pick = <T extends string>(allowed: readonly T[], value: unknown): T | undefined =>
  allowed.find((option) => option === value)

/**
 * What each part that exists does. `present` is the parts the chosen layout and content have; a part
 * not in it has no entry. `enabled` is "Animate individual parts": off, the overrides are ignored and
 * the parts follow the section. `section` is the section's own plan from `resolveMotion`.
 */
export function resolvePartMotion<P extends string>({
  specs,
  present,
  enabled,
  overrides,
  section,
  context,
}: {
  specs: Record<P, PartSpec>
  present: readonly P[]
  enabled: boolean
  overrides?: Partial<Record<P, PartOverride | null | undefined>> | null
  section: MotionPlan
  context: PartContext
}): Partial<Record<P, PartPlan>> {
  const parts = (Object.keys(specs) as P[]).filter((part) => present.includes(part))
  const result: Partial<Record<P, PartPlan>> = {}
  if (context.reducedMotion) {
    for (const part of parts) result[part] = NONE
    return result
  }

  // Levels 1 to 3: which entrance (or inherited plan) each part ends up with.
  const choices = new Map<P, Choice>()
  const delays = new Map<P, (typeof PART_DELAYS)[number]>()
  for (const part of parts) {
    const spec = specs[part]
    const override = enabled ? overrides?.[part] : undefined
    const preset = pick(PART_PRESETS, override?.preset) ?? 'inherit'
    delays.set(part, pick(PART_DELAYS, override?.delay) ?? 'auto')

    let choice: Choice
    if (section.kind === 'enter') {
      // The section's content is already moving as one; a part adds nothing unless it is told to.
      choice = { kind: 'plan', plan: NONE }
    } else if ((section.kind === 'float' || section.kind === 'parallax') && spec.media) {
      choice = { kind: 'plan', plan: section }
    } else {
      choice = spec.default === 'none' ? { kind: 'plan', plan: NONE } : entranceOf(spec.default)
    }

    if (preset === 'none') {
      choice = { kind: 'plan', plan: NONE }
    } else if (preset === 'parallax') {
      // Only a picture can drift; on any other part the choice is ignored.
      if (spec.media) {
        const parallax = resolveMotion('parallax', null, {
          isFirst: context.isFirst,
          hasMedia: true,
          reducedMotion: false,
          placement: spec.media,
        })
        if (parallax.kind === 'parallax') choice = { kind: 'plan', plan: parallax }
      }
    } else if (preset !== 'inherit' && isEntrance(preset)) {
      choice = entranceOf(preset)
    }

    // The first section's LCP candidates paint whole with the page, whatever was chosen.
    if (
      choice.kind === 'entrance' &&
      SHRINKS_PART.includes(choice.entrance) &&
      spec.lcp &&
      context.isFirst
    ) {
      choice = { kind: 'plan', plan: NONE }
    }
    choices.set(part, choice)
  }

  // Auto delays: the text parts that animate take turns, in the order the section declares them.
  let step = 0
  for (const part of parts) {
    const spec = specs[part]
    const choice = choices.get(part)
    if (!choice) continue
    if (choice.kind === 'plan') {
      result[part] = choice.plan
      continue
    }
    const delay = delays.get(part) ?? 'auto'
    let delayS = 0
    if (delay !== 'auto') delayS = DELAY_S[delay]
    else if (spec.sequenced) delayS = tokens.durationFast + step * STAGGER
    if (spec.sequenced) step += 1

    result[part] = {
      kind: 'enter',
      preset: choice.entrance,
      variants: entranceVariants(
        choice.entrance,
        round(delayS),
        spec.lcp && context.isFirst ? 1 : 0,
      ),
      delayS: round(delayS),
    }
  }
  return result
}

/** Props to spread on the Motion element that wraps a part with an `enter` plan: it plays on load. */
export const partEnterProps = (plan: PartEnterPlan) => revealOnLoad(plan.variants)

/** The same for any plan: nothing to spread unless the part enters. */
export const partProps = (plan: PartPlan | undefined) =>
  plan?.kind === 'enter' ? partEnterProps(plan) : undefined
